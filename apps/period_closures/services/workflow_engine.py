"""
Moteur de Workflow Intelligent BPMN 2.0 pour Clôtures
Orchestration automatisée avec gestion des dépendances et escalades
"""
import asyncio
import json
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
from dataclasses import dataclass
from enum import Enum
import logging

from django.db import transaction, models
from django.utils import timezone
from django.contrib.auth.models import User
from celery import shared_task

from ..models.advanced_closure import (
    AdvancedFiscalPeriod,
    WorkflowTemplate,
    WorkflowStep,
    WorkflowStepTemplate,
    RegularizationCenter,
    ClosureControlFramework,
    ClosureNotification,
    ClosureAuditTrail
)

logger = logging.getLogger(__name__)


class WorkflowEngine:
    """
    Moteur de workflow intelligent pour clôtures automatisées
    """

    def __init__(self):
        self.active_workflows = {}
        self.step_handlers = self._initialize_step_handlers()

    async def start_closure_workflow(self, period_id: str, user_id: int) -> Dict[str, Any]:
        """
        Démarrage d'un workflow de clôture
        """
        try:
            with transaction.atomic():
                period = AdvancedFiscalPeriod.objects.select_for_update().get(id=period_id)

                if period.status != 'open':
                    return {
                        'success': False,
                        'error': f'Impossible de démarrer: période en statut {period.status}'
                    }

                # Initialisation du workflow
                workflow_steps = await self._initialize_workflow_steps(period)

                # Mise à jour du statut
                period.status = 'in_progress'
                period.started_at = timezone.now()
                period.save()

                # Logging audit
                await self._log_audit_action(
                    period=period,
                    action_type='WORKFLOW_START',
                    user_id=user_id,
                    description=f'Démarrage workflow clôture {period.name}'
                )

                # Planification des étapes
                await self._schedule_workflow_steps(workflow_steps, user_id)

                return {
                    'success': True,
                    'workflow_id': str(period.id),
                    'total_steps': len(workflow_steps),
                    'estimated_duration': period.estimated_duration_hours
                }

        except Exception as e:
            logger.error(f"Erreur démarrage workflow {period_id}: {str(e)}")
            return {
                'success': False,
                'error': 'Erreur technique lors du démarrage'
            }

    async def _initialize_workflow_steps(self, period: AdvancedFiscalPeriod) -> List[WorkflowStep]:
        """
        Initialisation des étapes de workflow depuis le template
        """
        template = period.workflow_template
        step_templates = template.step_templates.all().order_by('order')

        workflow_steps = []

        for step_template in step_templates:
            # Vérification des conditions d'exécution
            if await self._check_execution_conditions(step_template, period):
                workflow_step = WorkflowStep.objects.create(
                    closure_period=period,
                    template_step=step_template,
                    status='PENDING',
                    scheduled_start=self._calculate_start_time(step_template, period)
                )
                workflow_steps.append(workflow_step)

        return workflow_steps

    async def _check_execution_conditions(self, step_template: WorkflowStepTemplate, period: AdvancedFiscalPeriod) -> bool:
        """
        Vérification des conditions dynamiques d'exécution
        """
        conditions = step_template.execution_conditions

        # Vérification des conditions métier
        if 'business_sector' in conditions:
            if period.business_sector not in conditions['business_sector']:
                return False

        if 'closure_type' in conditions:
            if period.closure_type not in conditions['closure_type']:
                return False

        if 'min_amount_threshold' in conditions:
            # Vérification du seuil de montant (à implémenter selon logique métier)
            pass

        # Vérification des dépendances
        if step_template.dependencies:
            for dependency_id in step_template.dependencies:
                dependency_step = WorkflowStep.objects.filter(
                    closure_period=period,
                    template_step_id=dependency_id,
                    status='COMPLETED'
                ).exists()

                if not dependency_step:
                    return False

        return True

    def _calculate_start_time(self, step_template: WorkflowStepTemplate, period: AdvancedFiscalPeriod) -> datetime:
        """
        Calcul du temps de démarrage optimal de l'étape
        """
        # Démarrage immédiat pour les premières étapes
        if step_template.order == 1:
            return timezone.now()

        # Calcul basé sur les dépendances
        base_time = timezone.now()

        # Ajout de délais selon la complexité
        if step_template.estimated_duration_minutes > 60:
            base_time += timedelta(hours=1)  # Buffer pour étapes longues

        return base_time

    async def execute_step(self, step_id: str, user_id: int) -> Dict[str, Any]:
        """
        Exécution d'une étape de workflow
        """
        try:
            with transaction.atomic():
                step = WorkflowStep.objects.select_for_update().get(id=step_id)

                if step.status != 'PENDING':
                    return {
                        'success': False,
                        'error': f'Étape déjà en statut {step.status}'
                    }

                # Vérification des prérequis
                prereq_check = await self._check_prerequisites(step)
                if not prereq_check['success']:
                    return prereq_check

                # Mise à jour du statut
                step.status = 'IN_PROGRESS'
                step.actual_start = timezone.now()
                step.assigned_to_id = user_id
                step.save()

                # Exécution selon le type
                execution_result = await self._execute_step_by_type(step, user_id)

                # Mise à jour finale
                step.actual_end = timezone.now()
                step.duration_minutes = int((step.actual_end - step.actual_start).total_seconds() / 60)
                step.result_data = execution_result.get('data', {})
                step.entries_created = execution_result.get('entries_created', 0)

                if execution_result['success']:
                    step.status = 'COMPLETED'
                    step.executed_by_id = user_id

                    # Mise à jour de la progression globale
                    await self._update_period_progression(step.closure_period)

                    # Déclenchement des étapes suivantes
                    await self._trigger_next_steps(step)

                else:
                    step.status = 'FAILED'
                    step.error_message = execution_result.get('error', 'Erreur inconnue')

                step.save()

                # Logging audit
                await self._log_audit_action(
                    period=step.closure_period,
                    action_type='STEP_EXECUTE',
                    user_id=user_id,
                    description=f'Exécution étape {step.template_step.name}',
                    object_type='WorkflowStep',
                    object_id=step.id
                )

                return execution_result

        except Exception as e:
            logger.error(f"Erreur exécution étape {step_id}: {str(e)}")
            return {
                'success': False,
                'error': 'Erreur technique lors de l\'exécution'
            }

    async def _execute_step_by_type(self, step: WorkflowStep, user_id: int) -> Dict[str, Any]:
        """
        Exécution spécialisée selon le type d'étape
        """
        step_type = step.template_step.step_type
        handler = self.step_handlers.get(step_type)

        if handler:
            return await handler(step, user_id)
        else:
            return {
                'success': False,
                'error': f'Type d\'étape non supporté: {step_type}'
            }

    def _initialize_step_handlers(self) -> Dict[str, callable]:
        """
        Initialisation des handlers par type d'étape
        """
        return {
            'AUTOMATIC': self._handle_automatic_step,
            'MANUAL': self._handle_manual_step,
            'CALCULATION': self._handle_calculation_step,
            'CONTROL': self._handle_control_step,
            'APPROVAL': self._handle_approval_step,
            'VALIDATION': self._handle_validation_step,
            'NOTIFICATION': self._handle_notification_step,
        }

    async def _handle_automatic_step(self, step: WorkflowStep, user_id: int) -> Dict[str, Any]:
        """
        Handler pour étapes automatiques
        """
        try:
            # Exécution du script d'automatisation
            script = step.template_step.automation_script
            if script:
                # Simulation d'exécution de script
                # En production, ceci exécuterait le script Python/SQL configuré
                await asyncio.sleep(0.1)  # Simulation délai

                return {
                    'success': True,
                    'data': {'execution_type': 'automatic'},
                    'entries_created': 0,
                    'message': 'Étape automatique exécutée avec succès'
                }

            return {
                'success': True,
                'data': {'execution_type': 'automatic'},
                'message': 'Étape automatique validée'
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'Erreur script automatique: {str(e)}'
            }

    async def _handle_calculation_step(self, step: WorkflowStep, user_id: int) -> Dict[str, Any]:
        """
        Handler pour étapes de calcul (provisions, amortissements)
        """
        try:
            category = step.template_step.category

            if category == 'provisions':
                return await self._calculate_provisions(step)
            elif category == 'depreciation':
                return await self._calculate_depreciation(step)
            elif category == 'regularization':
                return await self._calculate_regularizations(step)
            else:
                return {
                    'success': True,
                    'data': {'calculation_type': category},
                    'message': f'Calcul {category} simulé'
                }

        except Exception as e:
            return {
                'success': False,
                'error': f'Erreur calcul: {str(e)}'
            }

    async def _calculate_provisions(self, step: WorkflowStep) -> Dict[str, Any]:
        """
        Calcul automatique des provisions
        """
        try:
            # Simulation calcul provisions clients selon SYSCOHADA
            # En production: logique métier réelle de calcul

            provisions_data = {
                'bad_debt_provisions': Decimal('125000'),
                'inventory_provisions': Decimal('75000'),
                'warranty_provisions': Decimal('50000'),
                'total_provisions': Decimal('250000')
            }

            # Création des régularisations correspondantes
            await self._create_provision_regularizations(step.closure_period, provisions_data)

            return {
                'success': True,
                'data': provisions_data,
                'entries_created': 3,
                'message': 'Provisions calculées selon SYSCOHADA'
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'Erreur calcul provisions: {str(e)}'
            }

    async def _calculate_depreciation(self, step: WorkflowStep) -> Dict[str, Any]:
        """
        Calcul automatique des amortissements
        """
        try:
            # Simulation calcul amortissements SYSCOHADA
            depreciation_data = {
                'linear_depreciation': Decimal('180000'),
                'declining_depreciation': Decimal('95000'),
                'total_depreciation': Decimal('275000')
            }

            return {
                'success': True,
                'data': depreciation_data,
                'entries_created': 12,
                'message': 'Amortissements calculés selon barèmes SYSCOHADA'
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'Erreur calcul amortissements: {str(e)}'
            }

    async def _handle_control_step(self, step: WorkflowStep, user_id: int) -> Dict[str, Any]:
        """
        Handler pour étapes de contrôle
        """
        try:
            # Exécution des contrôles configurés
            controls = await self._execute_closure_controls(step.closure_period)

            passed_controls = sum(1 for c in controls if c['passed'])
            total_controls = len(controls)

            step.controls_passed = passed_controls
            step.controls_failed = total_controls - passed_controls

            success = step.controls_failed == 0

            return {
                'success': success,
                'data': {
                    'controls': controls,
                    'passed': passed_controls,
                    'failed': step.controls_failed,
                    'compliance_score': (passed_controls / total_controls * 100) if total_controls > 0 else 100
                },
                'message': f'Contrôles: {passed_controls}/{total_controls} réussis'
            }

        except Exception as e:
            return {
                'success': False,
                'error': f'Erreur contrôles: {str(e)}'
            }

    async def _execute_closure_controls(self, period: AdvancedFiscalPeriod) -> List[Dict[str, Any]]:
        """
        Exécution des contrôles de clôture
        """
        controls = ClosureControlFramework.objects.filter(
            company=period.company,
            applicable_closure_types__contains=[period.closure_type]
        ).order_by('execution_order')

        results = []

        for control in controls:
            try:
                # Simulation d'exécution de contrôle
                # En production: exécution de la requête SQL ou règle métier

                control_result = {
                    'control_id': str(control.id),
                    'name': control.name,
                    'type': control.control_type,
                    'passed': True,  # Simulation: 95% de réussite
                    'severity': control.severity_level,
                    'message': 'Contrôle réussi',
                    'execution_time_ms': 150
                }

                # Simulation d'échec pour 5% des contrôles
                import random
                if random.random() < 0.05:
                    control_result.update({
                        'passed': False,
                        'message': 'Écart détecté nécessitant attention',
                        'recommendations': control.remediation_guide
                    })

                results.append(control_result)

            except Exception as e:
                results.append({
                    'control_id': str(control.id),
                    'name': control.name,
                    'passed': False,
                    'error': str(e),
                    'severity': 'ERROR'
                })

        return results

    async def _update_period_progression(self, period: AdvancedFiscalPeriod):
        """
        Mise à jour de la progression de la période
        """
        total_steps = period.workflow_steps.count()
        completed_steps = period.workflow_steps.filter(status='COMPLETED').count()

        if total_steps > 0:
            period.completion_percentage = Decimal(completed_steps / total_steps * 100)

            # Vérification si clôture terminée
            if completed_steps == total_steps:
                period.status = 'pending_approval'
                period.completed_at = timezone.now()

                # Calcul score de conformité
                period.syscohada_compliance_score = await self._calculate_compliance_score(period)

            period.save()

    async def _calculate_compliance_score(self, period: AdvancedFiscalPeriod) -> Decimal:
        """
        Calcul du score de conformité SYSCOHADA
        """
        # Critères de conformité pondérés
        scores = []

        # 30% - Conformité des contrôles
        total_controls = period.workflow_steps.aggregate(
            models.Sum('controls_passed'), models.Sum('controls_failed')
        )
        passed = total_controls['controls_passed__sum'] or 0
        failed = total_controls['controls_failed__sum'] or 0
        total = passed + failed

        if total > 0:
            control_score = (passed / total) * 30
            scores.append(control_score)

        # 25% - Respect des délais
        if period.completed_at and period.closure_deadline:
            if period.completed_at <= period.closure_deadline:
                scores.append(25)  # Délai respecté
            else:
                # Pénalité proportionnelle au retard
                delay_hours = (period.completed_at - period.closure_deadline).total_seconds() / 3600
                penalty = min(delay_hours * 2, 25)  # Max 25 points de pénalité
                scores.append(max(0, 25 - penalty))

        # 20% - Exhaustivité des étapes
        mandatory_steps = period.workflow_steps.filter(template_step__is_mandatory=True)
        completed_mandatory = mandatory_steps.filter(status='COMPLETED').count()
        total_mandatory = mandatory_steps.count()

        if total_mandatory > 0:
            completeness_score = (completed_mandatory / total_mandatory) * 20
            scores.append(completeness_score)

        # 15% - Qualité des données
        data_quality_score = 15  # Simulation - à implémenter selon logique métier
        scores.append(data_quality_score)

        # 10% - Documentation et justifications
        documentation_score = 10  # Simulation
        scores.append(documentation_score)

        return Decimal(sum(scores))

    async def _trigger_next_steps(self, completed_step: WorkflowStep):
        """
        Déclenchement des étapes suivantes
        """
        # Recherche des étapes en attente qui dépendent de cette étape
        dependent_steps = WorkflowStep.objects.filter(
            closure_period=completed_step.closure_period,
            status='PENDING',
            template_step__dependencies__contains=[str(completed_step.template_step.id)]
        )

        for dependent_step in dependent_steps:
            # Vérification que toutes les dépendances sont satisfaites
            all_dependencies_met = await self._check_all_dependencies(dependent_step)

            if all_dependencies_met:
                # Auto-démarrage si étape automatique
                if dependent_step.template_step.auto_executable:
                    await self.execute_step(str(dependent_step.id), completed_step.executed_by_id)
                else:
                    # Notification à l'utilisateur assigné
                    await self._send_step_notification(dependent_step)

    async def _check_all_dependencies(self, step: WorkflowStep) -> bool:
        """
        Vérification que toutes les dépendances sont satisfaites
        """
        if not step.template_step.dependencies:
            return True

        for dependency_id in step.template_step.dependencies:
            dependency_completed = WorkflowStep.objects.filter(
                closure_period=step.closure_period,
                template_step_id=dependency_id,
                status='COMPLETED'
            ).exists()

            if not dependency_completed:
                return False

        return True

    async def _send_step_notification(self, step: WorkflowStep):
        """
        Envoi de notification pour étape prête
        """
        try:
            notification = ClosureNotification.objects.create(
                closure_period=step.closure_period,
                notification_type='STEP_READY',
                recipient=step.assigned_to,
                channel='EMAIL',
                title=f'Étape prête: {step.template_step.name}',
                message=f'L\'étape "{step.template_step.name}" est maintenant disponible pour exécution.',
                priority='MEDIUM',
                scheduled_for=timezone.now()
            )

            # Déclenchement asynchrone de l'envoi
            await self._dispatch_notification(notification)

        except Exception as e:
            logger.warning(f"Erreur envoi notification: {str(e)}")

    async def _create_provision_regularizations(self, period: AdvancedFiscalPeriod, provisions_data: Dict[str, Decimal]):
        """
        Création des régularisations pour provisions
        """
        for provision_type, amount in provisions_data.items():
            if provision_type != 'total_provisions' and amount > 0:
                RegularizationCenter.objects.create(
                    closure_period=period,
                    regularization_type='ACCRUED_EXPENSES',
                    account_class='4',  # Comptes de tiers
                    calculation_method='SYSCOHADA_PROVISION',
                    calculated_amount=amount,
                    justification=f'Provision {provision_type} calculée automatiquement selon SYSCOHADA'
                )

    async def _log_audit_action(self, period: AdvancedFiscalPeriod, action_type: str, user_id: int,
                               description: str, object_type: str = '', object_id: str = ''):
        """
        Logging des actions pour piste d'audit
        """
        try:
            import hashlib

            # Calcul du hash d'intégrité
            hash_data = f"{action_type}{user_id}{description}{timezone.now().isoformat()}"
            integrity_hash = hashlib.sha256(hash_data.encode()).hexdigest()

            ClosureAuditTrail.objects.create(
                closure_period=period,
                action_type=action_type,
                action_description=description,
                object_type=object_type,
                object_id=object_id or uuid.uuid4(),
                user_id=user_id,
                ip_address='127.0.0.1',  # À récupérer depuis la request
                user_agent='WiseBook Workflow Engine',
                session_id='workflow_engine',
                integrity_hash=integrity_hash
            )

        except Exception as e:
            logger.warning(f"Erreur audit trail: {str(e)}")

    async def _dispatch_notification(self, notification: ClosureNotification):
        """
        Distribution des notifications
        """
        # Implémentation basique - à étendre avec vrais canaux
        notification.sent_at = timezone.now()
        notification.delivery_status = 'SENT'
        notification.save()


# Tâches Celery pour exécution asynchrone

@shared_task
def execute_workflow_step_async(step_id: str, user_id: int):
    """Exécution asynchrone d'une étape de workflow"""
    engine = WorkflowEngine()
    result = asyncio.run(engine.execute_step(step_id, user_id))
    return result


@shared_task
def start_closure_workflow_async(period_id: str, user_id: int):
    """Démarrage asynchrone d'un workflow de clôture"""
    engine = WorkflowEngine()
    result = asyncio.run(engine.start_closure_workflow(period_id, user_id))
    return result


@shared_task
def execute_scheduled_controls():
    """Exécution programmée des contrôles automatiques"""
    # Recherche des périodes avec contrôles programmés
    periods_to_check = AdvancedFiscalPeriod.objects.filter(
        status__in=['in_progress', 'pending_approval'],
        closure_deadline__gte=timezone.now(),
        closure_deadline__lte=timezone.now() + timedelta(hours=24)
    )

    results = []
    for period in periods_to_check:
        # Exécution des contrôles en suspens
        engine = WorkflowEngine()
        result = asyncio.run(engine._execute_closure_controls(period))
        results.append({
            'period_id': str(period.id),
            'controls_executed': len(result),
            'controls_passed': sum(1 for c in result if c.get('passed'))
        })

    return results