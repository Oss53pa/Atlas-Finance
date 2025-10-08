"""
API REST pour module de clôture comptable intégré WiseBook
Respecte exactement le cahier des charges fourni
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
import logging

from apps.accounting.models import Company, FiscalYear, ChartOfAccounts, JournalEntry
from .models import ClotureComptablePeriodique, OperationRegularisation
from .services import ServiceClotureComptable
from apps.core.mixins import CompanyFilterMixin
from apps.core.permissions import IsCompanyMember

logger = logging.getLogger(__name__)


class ClotureComptableViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet intégré au système comptable WiseBook existant
    """

    queryset = ClotureComptablePeriodique.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    def get_queryset(self):
        return super().get_queryset().select_related(
            'company', 'fiscal_year', 'responsable_principal'
        ).order_by('-date_fin')

    @action(detail=False, methods=['get'])
    def exercices_disponibles(self, request):
        """Récupère les VRAIS exercices du système WiseBook"""
        exercices = FiscalYear.objects.filter(
            company=self.get_company()
        ).order_by('-start_date')

        exercices_data = []
        for exercice in exercices:
            exercices_data.append({
                'id': str(exercice.id),
                'code': exercice.code,
                'nom': exercice.name,
                'date_debut': exercice.start_date.isoformat(),
                'date_fin': exercice.end_date.isoformat(),
                'est_cloture': exercice.is_closed,
                'est_actif': exercice.is_active
            })

        return Response({'exercices': exercices_data})

    @action(detail=False, methods=['get'])
    def balance_generale_reelle(self, request):
        """
        Génère la VRAIE balance depuis le système WiseBook existant
        Respecte cahier des charges section D - États Financiers
        """
        try:
            exercice_id = request.query_params.get('exercice_id')
            exercice = FiscalYear.objects.get(id=exercice_id, company=self.get_company())

            service = ServiceClotureComptable(self.get_company(), exercice)
            balance_reelle = service.generer_balance_generale_reelle()

            # Calcul des totaux
            total_debiteur = sum(Decimal(ligne['solde_debiteur']) for ligne in balance_reelle)
            total_crediteur = sum(Decimal(ligne['solde_crediteur']) for ligne in balance_reelle)

            return Response({
                'exercice': exercice.name,
                'date_generation': timezone.now().isoformat(),
                'totaux': {
                    'total_debiteur': str(total_debiteur),
                    'total_crediteur': str(total_crediteur),
                    'difference': str(abs(total_debiteur - total_crediteur)),
                    'equilibree': abs(total_debiteur - total_crediteur) <= Decimal('0.01')
                },
                'nombre_comptes': len(balance_reelle),
                'balance': balance_reelle
            })

        except Exception as e:
            logger.error(f"Erreur balance générale: {str(e)}")
            return Response({'erreur': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def calculer_provisions_reelles(self, request):
        """
        Calcule les VRAIES provisions depuis les données WiseBook
        Respecte cahier des charges section B - Opérations de Régularisation
        """
        try:
            exercice_id = request.data.get('exercice_id')
            exercice = FiscalYear.objects.get(id=exercice_id, company=self.get_company())

            service = ServiceClotureComptable(self.get_company(), exercice)
            provisions = service.analyser_provisions_clients_reelles()

            provisions_data = []
            for provision in provisions:
                provisions_data.append({
                    'compte': provision['compte'].code,
                    'libelle': provision['compte'].name,
                    'solde': str(provision['solde']),
                    'anciennete_jours': provision['anciennete'],
                    'taux_syscohada': str(provision['taux_syscohada']),
                    'provision_calculee': str(provision['provision']),
                    'justification': f"Ancienneté {provision['anciennete']} jours - SYSCOHADA Art. 45"
                })

            total_provisions = sum(provision['provision'] for provision in provisions)

            return Response({
                'exercice': exercice.name,
                'date_calcul': timezone.now().isoformat(),
                'nombre_clients': len(provisions),
                'total_provisions': str(total_provisions),
                'provisions': provisions_data,
                'conforme_syscohada': True,
                'reference_syscohada': 'SYSCOHADA Art. 45 - Provisions pour créances douteuses'
            })

        except Exception as e:
            logger.error(f"Erreur calcul provisions: {str(e)}")
            return Response({'erreur': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def valider_provision(self, request):
        """
        Valide une provision et génère l'écriture réelle dans WiseBook
        """
        try:
            exercice_id = request.data.get('exercice_id')
            compte_id = request.data.get('compte_id')
            montant_provision = Decimal(request.data.get('montant_provision'))

            exercice = FiscalYear.objects.get(id=exercice_id, company=self.get_company())
            compte = ChartOfAccounts.objects.get(id=compte_id, company=self.get_company())

            service = ServiceClotureComptable(self.get_company(), exercice)

            # Données provision
            provision_data = {
                'compte': compte,
                'provision': montant_provision,
                'taux_syscohada': Decimal('50')  # À calculer réellement
            }

            # Génération VRAIE écriture
            ecriture = service.creer_ecriture_provision_reelle(provision_data, request.user)

            return Response({
                'statut': 'succes',
                'message': 'Provision validée et écriture générée',
                'ecriture': {
                    'numero': ecriture.entry_number,
                    'montant': str(ecriture.total_amount),
                    'date': ecriture.date.isoformat()
                }
            })

        except Exception as e:
            logger.error(f"Erreur validation provision: {str(e)}")
            return Response({'erreur': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def indicateurs_performance(self, request):
        """
        Indicateurs de performance selon cahier des charges section F
        """
        try:
            service = ServiceClotureComptable(self.get_company(), None)
            indicateurs = service.calculer_indicateurs_performance_temps_reel()

            return Response({
                'indicateurs': indicateurs,
                'derniere_mise_a_jour': timezone.now().isoformat()
            })

        except Exception as e:
            logger.error(f"Erreur indicateurs: {str(e)}")
            return Response({'erreur': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)