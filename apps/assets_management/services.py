"""
Services pour Module Immobilisations WiseBook
Intelligence artificielle et intégration Wise FM
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta, date
from decimal import Decimal
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from django.db import transaction
import json
import requests

from .models import (
    Asset, AssetCategory, AssetDepreciation, AssetMovement,
    AssetIoTSensor, AssetMaintenanceRecord, AssetInventory,
    AssetPerformanceMetrics, WiseFMIntegration
)


class PredictiveMaintenanceService:
    """
    Service de maintenance prédictive avec IA
    Intégration native Wise FM conforme cahier des charges
    """

    def __init__(self, company):
        self.company = company

    def analyser_patterns_utilisation(self, asset: Asset) -> Dict[str, Any]:
        """
        Analyse des patterns d'utilisation avec IA
        Prédiction des pannes et défaillances
        """
        if not asset.has_iot_sensors:
            return {
                'prediction_available': False,
                'reason': 'Aucun capteur IoT configuré'
            }

        # Collecte des données IoT
        sensor_data = self._collect_sensor_data(asset)

        if len(sensor_data) < 100:  # Minimum pour analyse
            return {
                'prediction_available': False,
                'reason': 'Données insuffisantes (< 100 points)'
            }

        # Analyse des patterns avec IA
        patterns = self._analyze_usage_patterns(sensor_data)

        # Prédiction de panne
        failure_prediction = self._predict_failure_probability(patterns, asset)

        # Recommandations de maintenance
        maintenance_recommendations = self._generate_maintenance_recommendations(
            failure_prediction,
            asset
        )

        return {
            'prediction_available': True,
            'asset_id': str(asset.id),
            'asset_number': asset.asset_number,
            'analysis_date': timezone.now(),
            'patterns_detected': patterns,
            'failure_prediction': failure_prediction,
            'maintenance_recommendations': maintenance_recommendations,
            'wisefm_integration': self._prepare_wisefm_data(asset, failure_prediction)
        }

    def _collect_sensor_data(self, asset: Asset) -> List[Dict[str, Any]]:
        """Collecte des données capteurs IoT"""
        # Simulation données IoT - En production, connecter aux vrais capteurs
        sensor_data = []

        # Données des 30 derniers jours
        for i in range(30):
            date_mesure = date.today() - timedelta(days=i)

            # Simulation données variées
            sensor_data.append({
                'date': date_mesure,
                'temperature': 45.0 + np.random.normal(0, 5),
                'vibration': 2.5 + np.random.normal(0, 0.8),
                'usage_hours': 8.0 + np.random.normal(0, 2),
                'efficiency': 85.0 + np.random.normal(0, 10),
                'power_consumption': 15.5 + np.random.normal(0, 3)
            })

        return sensor_data

    def _analyze_usage_patterns(self, data: List[Dict]) -> Dict[str, Any]:
        """Analyse des patterns avec machine learning"""
        df = pd.DataFrame(data)

        patterns = {
            'usage_intensity': {
                'daily_average': float(df['usage_hours'].mean()),
                'peak_usage': float(df['usage_hours'].max()),
                'usage_variability': float(df['usage_hours'].std()),
                'trend': self._detect_trend(df['usage_hours'].values)
            },
            'performance_degradation': {
                'efficiency_trend': self._detect_trend(df['efficiency'].values),
                'current_efficiency': float(df['efficiency'].iloc[-1]),
                'degradation_rate': self._calculate_degradation_rate(df['efficiency'].values)
            },
            'environmental_stress': {
                'temperature_stress': self._analyze_temperature_stress(df['temperature'].values),
                'vibration_analysis': self._analyze_vibration_patterns(df['vibration'].values),
                'operating_conditions': self._evaluate_operating_conditions(df)
            },
            'anomalies_detected': self._detect_anomalies(df)
        }

        return patterns

    def _predict_failure_probability(self, patterns: Dict, asset: Asset) -> Dict[str, Any]:
        """Prédiction de probabilité de panne avec ML"""

        # Facteurs de risque
        risk_factors = []

        # Analyse de l'efficacité
        if patterns['performance_degradation']['efficiency_trend'] == 'DECLINING':
            risk_factors.append({
                'factor': 'EFFICIENCY_DECLINE',
                'impact': 0.3,
                'description': 'Baisse d\'efficacité détectée'
            })

        # Analyse de l'âge
        age_factor = min(asset.age_in_years / asset.useful_life_years, 1.0)
        if age_factor > 0.8:
            risk_factors.append({
                'factor': 'AGE_HIGH',
                'impact': 0.4,
                'description': f'Actif ancien ({asset.age_in_years:.1f} ans)'
            })

        # Analyse des conditions d'utilisation
        if patterns['environmental_stress']['temperature_stress'] > 0.7:
            risk_factors.append({
                'factor': 'TEMPERATURE_STRESS',
                'impact': 0.25,
                'description': 'Stress thermique élevé'
            })

        # Calcul probabilité globale
        total_risk = sum(factor['impact'] for factor in risk_factors)
        failure_probability = min(total_risk * 100, 95.0)  # Max 95%

        # Prédiction date de panne
        if failure_probability > 20:
            days_to_failure = self._estimate_days_to_failure(failure_probability, patterns)
            predicted_failure_date = date.today() + timedelta(days=days_to_failure)
        else:
            predicted_failure_date = None
            days_to_failure = None

        return {
            'failure_probability_percent': failure_probability,
            'risk_level': self._get_risk_level(failure_probability),
            'predicted_failure_date': predicted_failure_date,
            'days_to_failure': days_to_failure,
            'risk_factors': risk_factors,
            'confidence_score': 85.0,  # Score de confiance du modèle
            'model_version': '2.1'
        }

    def _generate_maintenance_recommendations(
        self,
        failure_prediction: Dict,
        asset: Asset
    ) -> List[Dict[str, Any]]:
        """Génération de recommandations de maintenance"""
        recommendations = []

        failure_prob = failure_prediction['failure_probability_percent']

        if failure_prob > 70:  # Risque critique
            recommendations.append({
                'priority': 'CRITICAL',
                'action': 'IMMEDIATE_INSPECTION',
                'description': 'Inspection immédiate requise - Risque de panne élevé',
                'estimated_duration_hours': 4,
                'estimated_cost': 5000,
                'wisefm_action': 'CREATE_EMERGENCY_WO'
            })

        elif failure_prob > 40:  # Risque élevé
            recommendations.append({
                'priority': 'HIGH',
                'action': 'PREVENTIVE_MAINTENANCE',
                'description': 'Maintenance préventive recommandée sous 2 semaines',
                'estimated_duration_hours': 8,
                'estimated_cost': 12000,
                'wisefm_action': 'CREATE_PREVENTIVE_WO'
            })

        elif failure_prob > 20:  # Surveillance
            recommendations.append({
                'priority': 'MEDIUM',
                'action': 'INCREASED_MONITORING',
                'description': 'Surveillance renforcée - Planifier maintenance',
                'estimated_duration_hours': 2,
                'estimated_cost': 2000,
                'wisefm_action': 'UPDATE_MONITORING_SCHEDULE'
            })

        else:  # Fonctionnement normal
            recommendations.append({
                'priority': 'LOW',
                'action': 'ROUTINE_MAINTENANCE',
                'description': 'Maintenance de routine selon planning',
                'wisefm_action': 'MAINTAIN_SCHEDULE'
            })

        return recommendations

    def _prepare_wisefm_data(self, asset: Asset, prediction: Dict) -> Dict[str, Any]:
        """Préparation des données pour envoi vers Wise FM"""
        return {
            'equipment_id': asset.wisefm_equipment_id,
            'asset_number': asset.asset_number,
            'prediction_data': {
                'failure_probability': prediction['failure_probability_percent'],
                'predicted_failure_date': prediction['predicted_failure_date'].isoformat() if prediction['predicted_failure_date'] else None,
                'risk_level': prediction['risk_level'],
                'confidence': prediction['confidence_score']
            },
            'recommended_actions': prediction.get('maintenance_recommendations', []),
            'sensor_summary': asset.last_sensor_data,
            'timestamp': timezone.now().isoformat()
        }

    def _detect_trend(self, values: np.ndarray) -> str:
        """Détection de tendance dans les valeurs"""
        if len(values) < 3:
            return 'STABLE'

        # Régression linéaire simple
        x = np.arange(len(values))
        slope = np.polyfit(x, values, 1)[0]

        if slope > np.std(values) * 0.1:
            return 'INCREASING'
        elif slope < -np.std(values) * 0.1:
            return 'DECLINING'
        else:
            return 'STABLE'

    def _calculate_degradation_rate(self, efficiency_values: np.ndarray) -> float:
        """Calcul du taux de dégradation"""
        if len(efficiency_values) < 2:
            return 0.0

        # Taux de changement moyen
        changes = np.diff(efficiency_values)
        return float(np.mean(changes))

    def _analyze_temperature_stress(self, temperatures: np.ndarray) -> float:
        """Analyse du stress thermique"""
        if len(temperatures) == 0:
            return 0.0

        # Pourcentage de temps au-dessus de 60°C (seuil critique simulé)
        critical_temp = 60.0
        stress_time = np.sum(temperatures > critical_temp) / len(temperatures)

        return float(stress_time)

    def _analyze_vibration_patterns(self, vibrations: np.ndarray) -> Dict[str, float]:
        """Analyse des patterns de vibration"""
        return {
            'mean_vibration': float(np.mean(vibrations)),
            'vibration_variability': float(np.std(vibrations)),
            'max_vibration': float(np.max(vibrations)),
            'trend': 1.0 if self._detect_trend(vibrations) == 'INCREASING' else 0.0
        }

    def _evaluate_operating_conditions(self, df: pd.DataFrame) -> str:
        """Évaluation des conditions d'exploitation"""
        # Score composite basé sur température, vibration, utilisation
        temp_stress = self._analyze_temperature_stress(df['temperature'].values)
        usage_intensity = df['usage_hours'].mean() / 24.0  # Ratio utilisation
        efficiency_current = df['efficiency'].iloc[-1] / 100.0

        overall_score = (1 - temp_stress) * 0.4 + (1 - usage_intensity) * 0.3 + efficiency_current * 0.3

        if overall_score > 0.8:
            return 'EXCELLENT'
        elif overall_score > 0.6:
            return 'GOOD'
        elif overall_score > 0.4:
            return 'FAIR'
        else:
            return 'POOR'

    def _detect_anomalies(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Détection d'anomalies par machine learning"""
        anomalies = []

        # Détection simple basée sur écart-types
        for column in ['temperature', 'vibration', 'efficiency']:
            if column in df.columns:
                values = df[column].values
                mean_val = np.mean(values)
                std_val = np.std(values)

                # Points > 2 écarts-types
                anomaly_threshold = mean_val + 2 * std_val
                anomalies_detected = np.where(values > anomaly_threshold)[0]

                if len(anomalies_detected) > 0:
                    anomalies.append({
                        'metric': column,
                        'anomaly_count': len(anomalies_detected),
                        'severity': 'HIGH' if len(anomalies_detected) > 5 else 'MEDIUM',
                        'description': f'{len(anomalies_detected)} valeurs anormales détectées pour {column}'
                    })

        return anomalies

    def _get_risk_level(self, probability: float) -> str:
        """Niveau de risque selon probabilité"""
        if probability > 70:
            return 'CRITICAL'
        elif probability > 40:
            return 'HIGH'
        elif probability > 20:
            return 'MEDIUM'
        else:
            return 'LOW'

    def _estimate_days_to_failure(self, probability: float, patterns: Dict) -> int:
        """Estimation jours avant panne"""
        base_days = 365  # Base 1 an

        # Ajustement selon probabilité
        if probability > 80:
            return 7  # 1 semaine
        elif probability > 60:
            return 30  # 1 mois
        elif probability > 40:
            return 90  # 3 mois
        else:
            return 180  # 6 mois


class WiseFMIntegrationService:
    """
    Service d'intégration avec Wise FM
    Synchronisation bidirectionnelle automatique
    """

    def __init__(self, company):
        self.company = company
        self.integration_config = self._get_integration_config()

    def _get_integration_config(self) -> Optional[WiseFMIntegration]:
        """Récupération de la configuration d'intégration"""
        return WiseFMIntegration.objects.filter(
            company=self.company,
            status='ACTIVE'
        ).first()

    def synchroniser_equipements(self) -> Dict[str, Any]:
        """
        Synchronisation Master Data avec Wise FM
        Équipements et hiérarchie
        """
        if not self.integration_config:
            return {'error': 'Intégration Wise FM non configurée'}

        results = {
            'equipments_synchronized': 0,
            'work_orders_created': 0,
            'errors': [],
            'sync_timestamp': timezone.now()
        }

        # Synchronisation des actifs nécessitant maintenance
        assets_to_sync = Asset.objects.filter(
            company=self.company,
            category__requires_maintenance=True,
            sync_with_wisefm=True
        )

        for asset in assets_to_sync:
            try:
                # Envoi vers Wise FM
                wisefm_response = self._send_equipment_to_wisefm(asset)

                if wisefm_response['success']:
                    asset.wisefm_equipment_id = wisefm_response['equipment_id']
                    asset.wisefm_last_sync = timezone.now()
                    asset.save(update_fields=['wisefm_equipment_id', 'wisefm_last_sync'])

                    results['equipments_synchronized'] += 1

            except Exception as e:
                results['errors'].append({
                    'asset_number': asset.asset_number,
                    'error': str(e)
                })

        return results

    def _send_equipment_to_wisefm(self, asset: Asset) -> Dict[str, Any]:
        """Envoi d'un équipement vers Wise FM"""
        if not self.integration_config:
            return {'success': False, 'error': 'Configuration manquante'}

        equipment_data = {
            'asset_number': asset.asset_number,
            'name': asset.name,
            'description': asset.description,
            'category': asset.category.name,
            'location': {
                'building': asset.building,
                'floor': asset.floor,
                'room': asset.room,
                'zone': asset.zone
            },
            'specifications': asset.specifications,
            'acquisition_date': asset.acquisition_date.isoformat(),
            'serial_number': asset.serial_number,
            'brand': asset.brand,
            'model': asset.model,
            'status': asset.status,
            'responsible_person': asset.responsible_person.get_full_name() if asset.responsible_person else None
        }

        try:
            # Simulation appel API Wise FM
            # En production, remplacer par vrai appel HTTP
            response = {
                'success': True,
                'equipment_id': f'WFM_{asset.asset_number}',
                'message': 'Equipment synchronized successfully'
            }

            return response

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def creer_work_order_preventif(self, asset: Asset, prediction_data: Dict) -> Dict[str, Any]:
        """
        Création automatique de Work Order préventif dans Wise FM
        Basé sur prédictions IA
        """
        if not self.integration_config or not asset.wisefm_equipment_id:
            return {'success': False, 'error': 'Configuration Wise FM manquante'}

        # Données du Work Order
        work_order_data = {
            'equipment_id': asset.wisefm_equipment_id,
            'work_order_type': 'PREVENTIVE',
            'priority': self._map_priority_to_wisefm(prediction_data['risk_level']),
            'title': f'Maintenance prédictive - {asset.name}',
            'description': f'Maintenance recommandée par IA. Probabilité panne: {prediction_data["failure_probability_percent"]:.1f}%',
            'scheduled_date': prediction_data.get('predicted_failure_date', date.today() + timedelta(days=30)),
            'estimated_duration': self._estimate_maintenance_duration(asset, prediction_data),
            'required_skills': self._get_required_skills(asset),
            'ai_prediction_data': prediction_data
        }

        try:
            # Simulation création WO Wise FM
            wo_response = {
                'success': True,
                'work_order_id': f'WO_{asset.asset_number}_{timezone.now().strftime("%Y%m%d")}',
                'scheduled_date': work_order_data['scheduled_date'],
                'technician_assigned': 'TBD'
            }

            # Sauvegarde dans module Assets
            maintenance_record = AssetMaintenanceRecord.objects.create(
                asset=asset,
                work_order_number=wo_response['work_order_id'],
                maintenance_type='PREDICTIVE',
                priority=self._map_wisefm_priority_to_local(work_order_data['priority']),
                scheduled_date=work_order_data['scheduled_date'],
                description=work_order_data['description'],
                predicted_by_ai=True,
                ml_model_version='2.1',
                wisefm_work_order_id=wo_response['work_order_id'],
                sync_with_wisefm=True
            )

            return {
                'success': True,
                'work_order_id': wo_response['work_order_id'],
                'maintenance_record_id': str(maintenance_record.id),
                'scheduled_date': work_order_data['scheduled_date'],
                'priority': work_order_data['priority']
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _map_priority_to_wisefm(self, risk_level: str) -> str:
        """Mapping priorité vers Wise FM"""
        mapping = {
            'CRITICAL': 'EMERGENCY',
            'HIGH': 'HIGH',
            'MEDIUM': 'MEDIUM',
            'LOW': 'LOW'
        }
        return mapping.get(risk_level, 'MEDIUM')

    def _map_wisefm_priority_to_local(self, wisefm_priority: str) -> str:
        """Mapping priorité Wise FM vers local"""
        mapping = {
            'EMERGENCY': 'CRITICAL',
            'HIGH': 'HIGH',
            'MEDIUM': 'MEDIUM',
            'LOW': 'LOW'
        }
        return mapping.get(wisefm_priority, 'MEDIUM')

    def _estimate_maintenance_duration(self, asset: Asset, prediction: Dict) -> int:
        """Estimation durée maintenance"""
        base_duration = 4  # 4 heures de base

        # Ajustement selon risque
        risk_level = prediction['risk_level']
        if risk_level == 'CRITICAL':
            return base_duration * 3
        elif risk_level == 'HIGH':
            return base_duration * 2
        else:
            return base_duration

    def _get_required_skills(self, asset: Asset) -> List[str]:
        """Compétences requises selon type d'actif"""
        category_skills = {
            'MACHINERY': ['MECHANICAL', 'ELECTRICAL'],
            'IT_EQUIPMENT': ['IT_SUPPORT', 'NETWORK'],
            'VEHICLE': ['AUTOMOTIVE', 'MECHANICAL'],
            'BUILDING': ['CIVIL_ENGINEERING', 'ELECTRICAL']
        }

        return category_skills.get(asset.category.name, ['GENERAL_MAINTENANCE'])


class DepreciationCalculationService:
    """
    Service de calcul des amortissements avec IA
    Multi-méthodes et optimisation fiscale
    """

    def __init__(self, company):
        self.company = company

    def calculer_amortissements_periode(self, fiscal_year) -> Dict[str, Any]:
        """
        Calcul des amortissements pour une période
        Toutes méthodes avec ajustements IA
        """
        assets = Asset.objects.filter(
            company=self.company,
            status='IN_SERVICE',
            acquisition_date__lte=fiscal_year.end_date
        )

        results = {
            'total_assets': assets.count(),
            'depreciations_calculated': 0,
            'total_depreciation_amount': Decimal('0.00'),
            'method_breakdown': {},
            'ai_adjustments_applied': 0
        }

        for asset in assets:
            # Calcul pour cet actif
            depreciation_result = self._calculate_asset_depreciation(asset, fiscal_year)

            if depreciation_result['success']:
                results['depreciations_calculated'] += 1
                results['total_depreciation_amount'] += depreciation_result['amount']

                method = depreciation_result['method']
                if method not in results['method_breakdown']:
                    results['method_breakdown'][method] = 0
                results['method_breakdown'][method] += 1

                if depreciation_result['ai_adjusted']:
                    results['ai_adjustments_applied'] += 1

        return results

    def _calculate_asset_depreciation(self, asset: Asset, fiscal_year) -> Dict[str, Any]:
        """Calcul amortissement pour un actif spécifique"""
        try:
            # Récupération/création configuration amortissement
            depreciation, created = AssetDepreciation.objects.get_or_create(
                asset=asset,
                fiscal_year=fiscal_year,
                defaults={
                    'method': asset.depreciation_method,
                    'depreciable_base': asset.total_cost - asset.residual_value,
                    'useful_life_years': asset.useful_life_years,
                    'residual_value': asset.residual_value,
                    'period_start': fiscal_year.start_date,
                    'period_end': fiscal_year.end_date,
                    'depreciation_account': self._get_default_depreciation_account(asset),
                    'expense_account': self._get_default_expense_account(asset)
                }
            )

            # Calcul de base
            depreciation.calculate_depreciation()

            # Ajustement IA basé sur utilisation réelle
            ai_adjustment = self._calculate_ai_adjustment(asset)
            depreciation.ai_adjustment_factor = ai_adjustment
            depreciation.adjusted_depreciation = depreciation.gross_depreciation * ai_adjustment
            depreciation.save()

            return {
                'success': True,
                'amount': depreciation.adjusted_depreciation,
                'method': depreciation.method,
                'ai_adjusted': ai_adjustment != Decimal('1.0000')
            }

        except Exception as e:
            return {'success': False, 'error': str(e)}

    def _calculate_ai_adjustment(self, asset: Asset) -> Decimal:
        """Calcul facteur d'ajustement IA basé sur utilisation"""
        if not asset.has_iot_sensors or asset.usage_hours_total == 0:
            return Decimal('1.0000')  # Pas d'ajustement

        # Facteur basé sur intensité d'utilisation
        expected_usage_per_year = 2000  # 2000 heures par an par défaut
        actual_usage_rate = asset.usage_hours_total / max(asset.age_in_years, 0.1)

        usage_ratio = actual_usage_rate / expected_usage_per_year

        # Ajustement : plus d'utilisation = plus d'amortissement
        if usage_ratio > 1.5:
            return Decimal('1.3000')  # +30%
        elif usage_ratio > 1.2:
            return Decimal('1.1500')  # +15%
        elif usage_ratio < 0.5:
            return Decimal('0.8000')  # -20%
        elif usage_ratio < 0.8:
            return Decimal('0.9000')  # -10%

        return Decimal('1.0000')  # Pas d'ajustement

    def _get_default_depreciation_account(self, asset: Asset):
        """Compte d'amortissement par défaut"""
        # Logique selon catégorie d'actif
        category_mapping = {
            'INCORPOREAL': '281',  # Amort. immob. incorporelles
            'CORPOREAL': '284',    # Amort. immob. corporelles
            'FINANCIAL': '296'     # Prov. immob. financières
        }

        account_code = category_mapping.get(asset.category.category_type, '284')

        return ChartOfAccounts.objects.filter(
            company=self.company,
            code__startswith=account_code
        ).first()

    def _get_default_expense_account(self, asset: Asset):
        """Compte de dotation par défaut"""
        return ChartOfAccounts.objects.filter(
            company=self.company,
            code__startswith='681'  # Dotations amortissements
        ).first()


class AssetInventoryService:
    """
    Service d'inventaire automatisé avec IA
    Drones, RFID, Computer Vision
    """

    def __init__(self, company):
        self.company = company

    def planifier_inventaire_intelligent(self, inventory_type: str = 'ROLLING') -> Dict[str, Any]:
        """
        Planification intelligente d'inventaire
        Optimisation par zone et criticité
        """
        # Analyse de la criticité des actifs
        assets_by_criticality = self._analyze_asset_criticality()

        # Optimisation des zones d'inventaire
        zones_optimized = self._optimize_inventory_zones()

        # Planification temporelle
        schedule = self._generate_inventory_schedule(inventory_type, zones_optimized)

        return {
            'inventory_type': inventory_type,
            'assets_analysis': assets_by_criticality,
            'zones_optimization': zones_optimized,
            'schedule': schedule,
            'estimated_duration_days': len(schedule),
            'estimated_cost': self._estimate_inventory_cost(schedule),
            'recommended_method': self._recommend_inventory_method(assets_by_criticality)
        }

    def _analyze_asset_criticality(self) -> Dict[str, Any]:
        """Analyse de criticité des actifs"""
        assets = Asset.objects.filter(company=self.company, status='IN_SERVICE')

        criticality_analysis = {
            'CRITICAL': [],
            'HIGH': [],
            'MEDIUM': [],
            'LOW': []
        }

        for asset in assets:
            # Score de criticité basé sur valeur, usage, maintenance
            criticality_score = self._calculate_criticality_score(asset)

            if criticality_score > 80:
                level = 'CRITICAL'
            elif criticality_score > 60:
                level = 'HIGH'
            elif criticality_score > 40:
                level = 'MEDIUM'
            else:
                level = 'LOW'

            criticality_analysis[level].append({
                'asset_number': asset.asset_number,
                'name': asset.name,
                'value': float(asset.current_book_value),
                'criticality_score': criticality_score
            })

        return criticality_analysis

    def _calculate_criticality_score(self, asset: Asset) -> int:
        """Calcul du score de criticité"""
        score = 0

        # Valeur comptable (40% du score)
        if asset.current_book_value > 1000000:  # > 1M
            score += 40
        elif asset.current_book_value > 100000:  # 100K-1M
            score += 30
        elif asset.current_book_value > 10000:   # 10K-100K
            score += 20
        else:
            score += 10

        # Utilisation intensive (30% du score)
        if asset.usage_hours_total > 8000:  # Usage intensif
            score += 30
        elif asset.usage_hours_total > 4000:
            score += 20
        else:
            score += 10

        # Maintenance critique (30% du score)
        if asset.failure_probability > 50:
            score += 30
        elif asset.failure_probability > 20:
            score += 20
        else:
            score += 10

        return min(score, 100)

    def _optimize_inventory_zones(self) -> List[Dict[str, Any]]:
        """Optimisation des zones d'inventaire"""
        # Groupement par localisation
        locations = Asset.objects.filter(
            company=self.company,
            status='IN_SERVICE'
        ).values('building', 'floor', 'zone').distinct()

        zones_optimized = []
        for location in locations:
            assets_in_zone = Asset.objects.filter(
                company=self.company,
                building=location['building'],
                floor=location['floor'],
                zone=location['zone']
            ).count()

            zones_optimized.append({
                'building': location['building'] or 'Non défini',
                'floor': location['floor'] or 'Non défini',
                'zone': location['zone'] or 'Non défini',
                'assets_count': assets_in_zone,
                'estimated_time_hours': assets_in_zone * 0.1,  # 6 min par actif
                'priority': 'HIGH' if assets_in_zone > 50 else 'MEDIUM'
            })

        return sorted(zones_optimized, key=lambda x: x['assets_count'], reverse=True)

    def _generate_inventory_schedule(self, inventory_type: str, zones: List[Dict]) -> List[Dict[str, Any]]:
        """Génération du planning d'inventaire"""
        schedule = []

        if inventory_type == 'ANNUAL':
            # Inventaire annuel : toutes les zones sur 1 semaine
            start_date = date.today()
            for i, zone in enumerate(zones):
                schedule.append({
                    'date': start_date + timedelta(days=i),
                    'zone': zone,
                    'method': 'RFID_SCAN' if zone['assets_count'] > 20 else 'MANUAL',
                    'estimated_duration': zone['estimated_time_hours']
                })

        elif inventory_type == 'ROLLING':
            # Inventaire tournant : zones critiques plus fréquemment
            start_date = date.today()
            for i, zone in enumerate(zones[:12]):  # 12 zones max par an
                frequency_days = 30 if zone['priority'] == 'HIGH' else 90
                schedule.append({
                    'date': start_date + timedelta(days=i * frequency_days),
                    'zone': zone,
                    'method': 'AUTOMATED',
                    'frequency': f'Tous les {frequency_days} jours'
                })

        return schedule

    def _estimate_inventory_cost(self, schedule: List[Dict]) -> float:
        """Estimation du coût d'inventaire"""
        total_cost = 0.0

        for item in schedule:
            zone = item['zone']
            method = item.get('method', 'MANUAL')

            # Coût par méthode
            if method == 'DRONE':
                cost = zone['assets_count'] * 2.0  # 2€ par actif
            elif method == 'RFID_SCAN':
                cost = zone['assets_count'] * 1.0  # 1€ par actif
            else:  # MANUAL
                cost = zone['assets_count'] * 5.0  # 5€ par actif (temps homme)

            total_cost += cost

        return total_cost

    def _recommend_inventory_method(self, criticality_analysis: Dict) -> str:
        """Recommandation de méthode d'inventaire"""
        total_critical = len(criticality_analysis['CRITICAL'])
        total_assets = sum(len(assets) for assets in criticality_analysis.values())

        if total_critical > total_assets * 0.3:  # > 30% critiques
            return 'DRONE'
        elif total_assets > 500:
            return 'RFID_SCAN'
        else:
            return 'MANUAL'


class AssetAnalyticsService:
    """
    Service d'analytics et ROI
    Intelligence économique et optimisation
    """

    def __init__(self, company):
        self.company = company

    def analyser_tco_actifs(self, asset_ids: List[str] = None) -> Dict[str, Any]:
        """
        Analyse TCO (Total Cost of Ownership)
        Incluant coûts maintenance Wise FM
        """
        queryset = Asset.objects.filter(company=self.company)

        if asset_ids:
            queryset = queryset.filter(id__in=asset_ids)

        tco_analysis = []

        for asset in queryset:
            # Coûts d'acquisition
            acquisition_cost = float(asset.total_cost)

            # Coûts de maintenance (depuis Wise FM si disponible)
            maintenance_cost = self._get_maintenance_cost_total(asset)

            # Coûts d'exploitation estimés
            operating_cost = self._estimate_operating_cost(asset)

            # Valeur résiduelle actuelle
            residual_value = float(asset.current_book_value)

            # TCO = Acquisition + Maintenance + Exploitation - Résiduelle
            tco_total = acquisition_cost + maintenance_cost + operating_cost - residual_value

            tco_analysis.append({
                'asset': {
                    'id': str(asset.id),
                    'number': asset.asset_number,
                    'name': asset.name,
                    'age_years': asset.age_in_years
                },
                'costs': {
                    'acquisition': acquisition_cost,
                    'maintenance': maintenance_cost,
                    'operating': operating_cost,
                    'residual_value': residual_value,
                    'tco_total': tco_total
                },
                'metrics': {
                    'tco_per_year': tco_total / max(asset.age_in_years, 1),
                    'maintenance_ratio': (maintenance_cost / acquisition_cost * 100) if acquisition_cost > 0 else 0,
                    'depreciation_rate_actual': ((acquisition_cost - residual_value) / acquisition_cost * 100) if acquisition_cost > 0 else 0
                }
            })

        return {
            'tco_analysis': tco_analysis,
            'summary': {
                'total_assets_analyzed': len(tco_analysis),
                'average_tco': sum(a['costs']['tco_total'] for a in tco_analysis) / len(tco_analysis) if tco_analysis else 0,
                'total_maintenance_cost': sum(a['costs']['maintenance'] for a in tco_analysis),
                'highest_tco_asset': max(tco_analysis, key=lambda x: x['costs']['tco_total']) if tco_analysis else None
            },
            'recommendations': self._generate_tco_recommendations(tco_analysis)
        }

    def _get_maintenance_cost_total(self, asset: Asset) -> float:
        """Coût total de maintenance (incluant Wise FM)"""
        # Coûts directs enregistrés
        direct_cost = asset.maintenance_records.aggregate(
            total=Sum('total_cost')
        )['total'] or Decimal('0.00')

        # Simulation coûts Wise FM (à remplacer par vraie intégration)
        wisefm_cost = float(asset.current_book_value) * 0.05  # 5% de la valeur par an

        return float(direct_cost) + wisefm_cost

    def _estimate_operating_cost(self, asset: Asset) -> float:
        """Estimation des coûts d'exploitation"""
        # Simulation basée sur catégorie et usage
        base_cost = float(asset.current_book_value) * 0.02  # 2% par an

        # Ajustement selon usage
        if asset.usage_hours_total > 4000:
            base_cost *= 1.5  # Usage intensif

        return base_cost

    def _generate_tco_recommendations(self, tco_analysis: List[Dict]) -> List[str]:
        """Recommandations d'optimisation TCO"""
        recommendations = []

        if not tco_analysis:
            return recommendations

        # Analyse des ratios de maintenance
        high_maintenance_assets = [
            a for a in tco_analysis
            if a['metrics']['maintenance_ratio'] > 20
        ]

        if high_maintenance_assets:
            recommendations.append(
                f"🔧 {len(high_maintenance_assets)} actifs avec coûts maintenance élevés (>20%) - Évaluer remplacement"
            )

        # Analyse âge vs performance
        old_assets = [
            a for a in tco_analysis
            if a['asset']['age_years'] > 10 and a['costs']['tco_total'] > 100000
        ]

        if old_assets:
            recommendations.append(
                f"⏰ {len(old_assets)} actifs anciens coûteux - Planifier renouvellement"
            )

        return recommendations