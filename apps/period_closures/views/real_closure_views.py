"""
API pour Moteur de Clôture Comptable Réel WiseBook
Génération d'écritures comptables réelles selon SYSCOHADA
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
import logging

from apps.accounting.models import Company, FiscalYear, JournalEntry, JournalEntryLine
from ..services.real_closure_engine import RealClosureEngine
from apps.core.mixins import CompanyFilterMixin
from apps.core.permissions import IsCompanyMember

logger = logging.getLogger(__name__)


class RealClosureViewSet(CompanyFilterMixin, viewsets.ViewSet):
    """
    ViewSet pour clôture comptable réelle avec génération d'écritures
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    @action(detail=False, methods=['post'])
    def start_real_closure(self, request):
        """Démarrage d'une clôture comptable réelle"""
        try:
            fiscal_year_id = request.data.get('fiscal_year_id')
            if not fiscal_year_id:
                return Response({
                    'error': 'ID exercice fiscal requis'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Récupération de l'exercice
            fiscal_year = FiscalYear.objects.get(
                id=fiscal_year_id,
                company=self.get_company()
            )

            if fiscal_year.is_closed:
                return Response({
                    'error': 'Exercice déjà clôturé'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Initialisation du moteur de clôture
            closure_engine = RealClosureEngine(self.get_company(), fiscal_year)

            # Exécution de la clôture complète
            closure_result = closure_engine.run_complete_closure()

            if closure_result['success']:
                return Response({
                    'status': 'success',
                    'message': 'Clôture comptable exécutée avec succès',
                    'closure_data': closure_result
                })
            else:
                return Response({
                    'error': closure_result['error']
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except FiscalYear.DoesNotExist:
            return Response({
                'error': 'Exercice fiscal non trouvé'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur clôture réelle: {str(e)}")
            return Response({
                'error': 'Erreur technique lors de la clôture'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def calculate_provisions(self, request):
        """Calcul des provisions clients selon SYSCOHADA"""
        try:
            fiscal_year_id = request.data.get('fiscal_year_id')
            fiscal_year = FiscalYear.objects.get(
                id=fiscal_year_id,
                company=self.get_company()
            )

            closure_engine = RealClosureEngine(self.get_company(), fiscal_year)
            provisions_result = closure_engine.calculate_and_post_provisions()

            return Response(provisions_result)

        except Exception as e:
            logger.error(f"Erreur calcul provisions: {str(e)}")
            return Response({
                'error': 'Erreur lors du calcul des provisions'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def calculate_depreciation(self, request):
        """Calcul des amortissements selon barèmes SYSCOHADA"""
        try:
            fiscal_year_id = request.data.get('fiscal_year_id')
            fiscal_year = FiscalYear.objects.get(
                id=fiscal_year_id,
                company=self.get_company()
            )

            closure_engine = RealClosureEngine(self.get_company(), fiscal_year)
            depreciation_result = closure_engine.calculate_and_post_depreciation()

            return Response(depreciation_result)

        except Exception as e:
            logger.error(f"Erreur calcul amortissements: {str(e)}")
            return Response({
                'error': 'Erreur lors du calcul des amortissements'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def generate_accruals(self, request):
        """Génération des écritures de régularisation"""
        try:
            fiscal_year_id = request.data.get('fiscal_year_id')
            fiscal_year = FiscalYear.objects.get(
                id=fiscal_year_id,
                company=self.get_company()
            )

            closure_engine = RealClosureEngine(self.get_company(), fiscal_year)
            accruals_result = closure_engine.calculate_and_post_accruals()

            return Response(accruals_result)

        except Exception as e:
            logger.error(f"Erreur régularisations: {str(e)}")
            return Response({
                'error': 'Erreur lors des régularisations'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def trial_balance(self, request):
        """Génération de la balance générale"""
        try:
            fiscal_year_id = request.query_params.get('fiscal_year_id')
            if not fiscal_year_id:
                return Response({
                    'error': 'ID exercice fiscal requis'
                }, status=status.HTTP_400_BAD_REQUEST)

            fiscal_year = FiscalYear.objects.get(
                id=fiscal_year_id,
                company=self.get_company()
            )

            closure_engine = RealClosureEngine(self.get_company(), fiscal_year)
            balance_result = closure_engine.generate_trial_balance()

            return Response(balance_result)

        except Exception as e:
            logger.error(f"Erreur balance: {str(e)}")
            return Response({
                'error': 'Erreur lors de la génération de la balance'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def closure_entries(self, request):
        """Liste des écritures de clôture générées"""
        try:
            fiscal_year_id = request.query_params.get('fiscal_year_id')
            fiscal_year = FiscalYear.objects.get(
                id=fiscal_year_id,
                company=self.get_company()
            )

            # Récupération des écritures de clôture
            closure_entries = JournalEntry.objects.filter(
                company=self.get_company(),
                fiscal_year=fiscal_year,
                journal__code='CL'  # Journal de clôture
            ).prefetch_related('lines', 'lines__account').order_by('-date', '-entry_number')

            entries_data = []
            for entry in closure_entries:
                lines_data = []
                for line in entry.lines.all():
                    lines_data.append({
                        'account_number': line.account.account_number,
                        'account_name': line.account.account_name,
                        'description': line.description,
                        'debit_amount': str(line.debit_amount),
                        'credit_amount': str(line.credit_amount)
                    })

                entries_data.append({
                    'id': str(entry.id),
                    'entry_number': entry.entry_number,
                    'date': entry.date.isoformat(),
                    'description': entry.description,
                    'reference': entry.reference,
                    'total_amount': str(entry.total_amount),
                    'lines': lines_data
                })

            return Response({
                'success': True,
                'entries_count': len(entries_data),
                'entries': entries_data
            })

        except Exception as e:
            logger.error(f"Erreur récupération écritures: {str(e)}")
            return Response({
                'error': 'Erreur lors de la récupération des écritures'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def closure_status(self, request):
        """Statut de la clôture pour un exercice"""
        try:
            fiscal_year_id = request.query_params.get('fiscal_year_id')
            fiscal_year = FiscalYear.objects.get(
                id=fiscal_year_id,
                company=self.get_company()
            )

            # Vérification des écritures de clôture existantes
            closure_entries = JournalEntry.objects.filter(
                company=self.get_company(),
                fiscal_year=fiscal_year,
                journal__code='CL'
            )

            # Analyse des types d'écritures générées
            provisions_entries = closure_entries.filter(reference__startswith='PROV').count()
            depreciation_entries = closure_entries.filter(reference__startswith='AMORT').count()
            accrual_entries = closure_entries.filter(reference__startswith='REG').count()

            total_closure_amount = closure_entries.aggregate(
                total=models.Sum('total_amount')
            )['total'] or Decimal('0')

            return Response({
                'fiscal_year': fiscal_year.name,
                'is_closed': fiscal_year.is_closed,
                'closure_entries_count': closure_entries.count(),
                'provisions_entries': provisions_entries,
                'depreciation_entries': depreciation_entries,
                'accrual_entries': accrual_entries,
                'total_closure_amount': str(total_closure_amount),
                'last_closure_date': closure_entries.order_by('-date').first().date.isoformat() if closure_entries.exists() else None
            })

        except Exception as e:
            logger.error(f"Erreur statut clôture: {str(e)}")
            return Response({
                'error': 'Erreur lors de la vérification du statut'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)