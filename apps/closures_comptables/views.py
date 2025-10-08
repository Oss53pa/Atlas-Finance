"""
API REST pour Module Clôture Comptable Périodique WiseBook
Endpoint complets pour toutes les opérations comptables
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction
from django.db.models import Sum, Count
import logging

from apps.accounting.models import Company, FiscalYear, JournalEntry
from .models import (
    PeriodeClotureComptable, OperationClotureComptable,
    ProvisionClient, AmortissementImmobilisation,
    BalanceGenerale, LigneBalanceGenerale
)
from .services.moteur_cloture import MoteurClotureComptable
from apps.core.mixins import CompanyFilterMixin
from apps.core.permissions import IsCompanyMember

logger = logging.getLogger(__name__)


class ClotureComptableViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet principal pour clôtures comptables périodiques
    """

    queryset = PeriodeClotureComptable.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['type_cloture', 'statut', 'mois_cloture']

    def get_queryset(self):
        return super().get_queryset().select_related(
            'societe', 'exercice', 'responsable'
        ).order_by('-date_fin_periode')

    @action(detail=False, methods=['post'])
    def demarrer_cloture_mensuelle(self, request):
        """Démarre une clôture mensuelle complète"""
        try:
            exercice_id = request.data.get('exercice_id')
            mois = request.data.get('mois')

            if not exercice_id or not mois:
                return Response({
                    'erreur': 'exercice_id et mois requis'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Récupération exercice
            exercice = FiscalYear.objects.get(
                id=exercice_id,
                company=self.get_company()
            )

            if exercice.is_closed:
                return Response({
                    'erreur': 'Exercice déjà clôturé'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Vérification si clôture déjà existante
            cloture_existante = PeriodeClotureComptable.objects.filter(
                societe=self.get_company(),
                exercice=exercice,
                mois_cloture=mois
            ).first()

            if cloture_existante:
                return Response({
                    'erreur': f'Clôture M{mois} déjà existante',
                    'periode_existante': {
                        'id': str(cloture_existante.id),
                        'statut': cloture_existante.statut,
                        'nom': cloture_existante.nom_periode
                    }
                }, status=status.HTTP_400_BAD_REQUEST)

            # Démarrage clôture
            moteur = MoteurClotureComptable(self.get_company(), exercice)
            resultat = moteur.demarrer_cloture_mensuelle(mois, request.user.id)

            if resultat['succes']:
                return Response({
                    'statut': 'succes',
                    'message': f'Clôture mensuelle M{mois} démarrée avec succès',
                    'periode_id': resultat['periode_id'],
                    'nom_periode': resultat['nom_periode'],
                    'operations': resultat['resultats']['operations_executees'],
                    'ecritures_generees': resultat['resultats']['total_ecritures'],
                    'montants': {
                        'provisions': str(resultat['resultats']['total_provisions']),
                        'amortissements': str(resultat['resultats']['total_amortissements']),
                        'regularisations': str(resultat['resultats']['total_regularisations'])
                    }
                })
            else:
                return Response({
                    'erreur': resultat['erreur']
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        except FiscalYear.DoesNotExist:
            return Response({
                'erreur': 'Exercice fiscal non trouvé'
            }, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            logger.error(f"Erreur clôture mensuelle: {str(e)}")
            return Response({
                'erreur': 'Erreur technique lors de la clôture'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def calculer_provisions_clients(self, request):
        """Calcul des provisions créances clients"""
        try:
            exercice_id = request.data.get('exercice_id')
            exercice = FiscalYear.objects.get(id=exercice_id, company=self.get_company())

            moteur = MoteurClotureComptable(self.get_company(), exercice)

            # Création opération temporaire pour le calcul
            operation = OperationClotureComptable(
                type_operation='PROVISION_CLIENTS',
                nom_operation='Calcul Provisions Clients',
                execute_par=request.user
            )

            resultat = moteur._calculer_provisions_clients(operation)

            return Response(resultat)

        except Exception as e:
            logger.error(f"Erreur calcul provisions: {str(e)}")
            return Response({
                'succes': False,
                'erreur': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def calculer_amortissements(self, request):
        """Calcul des amortissements"""
        try:
            exercice_id = request.data.get('exercice_id')
            exercice = FiscalYear.objects.get(id=exercice_id, company=self.get_company())

            moteur = MoteurClotureComptable(self.get_company(), exercice)

            operation = OperationClotureComptable(
                type_operation='AMORTISSEMENT',
                nom_operation='Calcul Amortissements',
                execute_par=request.user
            )

            resultat = moteur._calculer_amortissements(operation)

            return Response(resultat)

        except Exception as e:
            logger.error(f"Erreur calcul amortissements: {str(e)}")
            return Response({
                'succes': False,
                'erreur': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def balance_generale(self, request):
        """Génération balance générale"""
        try:
            periode_id = request.query_params.get('periode_id')
            if not periode_id:
                return Response({
                    'erreur': 'periode_id requis'
                }, status=status.HTTP_400_BAD_REQUEST)

            periode = PeriodeClotureComptable.objects.get(
                id=periode_id,
                societe=self.get_company()
            )

            # Récupération de la balance
            balance = periode.balances.order_by('-date_generation').first()

            if not balance:
                return Response({
                    'erreur': 'Aucune balance générée pour cette période'
                }, status=status.HTTP_404_NOT_FOUND)

            # Sérialisation des lignes de balance
            lignes_data = []
            for ligne in balance.lignes.select_related('compte'):
                lignes_data.append({
                    'numero_compte': ligne.compte.account_number,
                    'libelle_compte': ligne.compte.account_name,
                    'total_debit': str(ligne.total_debit_periode),
                    'total_credit': str(ligne.total_credit_periode),
                    'solde_debiteur': str(ligne.solde_debiteur),
                    'solde_crediteur': str(ligne.solde_crediteur),
                    'nombre_ecritures': ligne.nombre_ecritures
                })

            return Response({
                'periode': periode.nom_periode,
                'type_balance': balance.type_balance,
                'date_generation': balance.date_generation.isoformat(),
                'totaux': {
                    'total_debit': str(balance.total_debit),
                    'total_credit': str(balance.total_credit),
                    'difference': str(balance.difference),
                    'equilibree': balance.est_equilibree
                },
                'compteurs': {
                    'comptes_actifs': balance.nombre_comptes_actifs,
                    'comptes_debiteurs': balance.nombre_comptes_debiteurs,
                    'comptes_crediteurs': balance.nombre_comptes_crediteurs
                },
                'lignes': lignes_data
            })

        except Exception as e:
            logger.error(f"Erreur balance générale: {str(e)}")
            return Response({
                'erreur': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def ecritures_cloture(self, request):
        """Liste des écritures de clôture générées"""
        try:
            periode_id = request.query_params.get('periode_id')
            periode = PeriodeClotureComptable.objects.get(
                id=periode_id,
                societe=self.get_company()
            )

            # Récupération des écritures via les opérations
            ecritures_cloture = JournalEntry.objects.filter(
                company=self.get_company(),
                fiscal_year=periode.exercice,
                journal__code='CL',
                date__gte=periode.date_debut_periode,
                date__lte=periode.date_fin_periode
            ).prefetch_related('lines', 'lines__account').order_by('-date', '-entry_number')

            ecritures_data = []
            for ecriture in ecritures_cloture:
                lignes_data = []
                for ligne in ecriture.lines.all():
                    lignes_data.append({
                        'numero_compte': ligne.account.account_number,
                        'libelle_compte': ligne.account.account_name,
                        'description': ligne.description,
                        'debit': str(ligne.debit_amount),
                        'credit': str(ligne.credit_amount)
                    })

                ecritures_data.append({
                    'id': str(ecriture.id),
                    'numero': ecriture.entry_number,
                    'date': ecriture.date.isoformat(),
                    'libelle': ecriture.description,
                    'reference': ecriture.reference,
                    'montant': str(ecriture.total_amount),
                    'lignes': lignes_data
                })

            return Response({
                'periode': periode.nom_periode,
                'nombre_ecritures': len(ecritures_data),
                'montant_total': str(sum(float(e['montant']) for e in ecritures_data)),
                'ecritures': ecritures_data
            })

        except Exception as e:
            logger.error(f"Erreur récupération écritures: {str(e)}")
            return Response({
                'erreur': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def detail_periode(self, request, pk=None):
        """Détail complet d'une période de clôture"""
        try:
            periode = self.get_object()

            # Statistiques des opérations
            operations_stats = periode.operations.aggregate(
                total_operations=Count('id'),
                operations_terminees=Count('id', filter=models.Q(statut='TERMINEE')),
                operations_erreur=Count('id', filter=models.Q(statut='ERREUR')),
                total_ecritures=Sum('nombre_ecritures_creees'),
                montant_total=Sum('montant_calcule')
            )

            # Détail des opérations
            operations_detail = []
            for operation in periode.operations.all():
                operations_detail.append({
                    'id': str(operation.id),
                    'nom': operation.nom_operation,
                    'type': operation.type_operation,
                    'statut': operation.statut,
                    'montant': str(operation.montant_calcule),
                    'ecritures': operation.nombre_ecritures_creees,
                    'message': operation.message_resultat or operation.message_erreur,
                    'conforme_syscohada': operation.conforme_syscohada,
                    'date_execution': operation.date_execution.isoformat() if operation.date_execution else None
                })

            # Contrôles exécutés
            controles_detail = []
            for controle in periode.controles.all():
                controles_detail.append({
                    'nom': controle.nom_controle,
                    'type': controle.type_controle,
                    'resultat': controle.resultat_controle,
                    'message': controle.message_succes or controle.message_erreur,
                    'obligatoire': controle.obligatoire,
                    'reference_syscohada': controle.reference_syscohada
                })

            return Response({
                'periode': {
                    'id': str(periode.id),
                    'nom': periode.nom_periode,
                    'type': periode.type_cloture,
                    'statut': periode.statut,
                    'avancement': str(periode.pourcentage_avancement),
                    'date_debut': periode.date_debut_periode.isoformat(),
                    'date_fin': periode.date_fin_periode.isoformat(),
                    'date_limite': periode.date_limite_cloture.isoformat(),
                    'date_cloture_reelle': periode.date_cloture_reelle.isoformat() if periode.date_cloture_reelle else None
                },
                'responsables': {
                    'cree_par': periode.cree_par.get_full_name(),
                    'responsable': periode.responsable.get_full_name() if periode.responsable else None,
                    'valide_par': periode.valide_par.get_full_name() if periode.valide_par else None
                },
                'statistiques': {
                    'ecritures_generees': periode.nombre_ecritures_generees,
                    'montant_provisions': str(periode.montant_total_provisions),
                    'montant_amortissements': str(periode.montant_total_amortissements),
                    'montant_regularisations': str(periode.montant_total_regularisations),
                    'balance_equilibree': periode.balance_equilibree,
                    'controles_passes': periode.controles_passes,
                    'controles_echecs': periode.controles_echecs
                },
                'operations': operations_detail,
                'controles': controles_detail
            })

        except Exception as e:
            logger.error(f"Erreur détail période: {str(e)}")
            return Response({
                'erreur': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def valider_periode(self, request, pk=None):
        """Validation d'une période de clôture"""
        try:
            periode = self.get_object()

            if periode.statut != 'TERMINEE':
                return Response({
                    'erreur': 'Seules les périodes terminées peuvent être validées'
                }, status=status.HTTP_400_BAD_REQUEST)

            commentaires = request.data.get('commentaires', '')

            with transaction.atomic():
                periode.statut = 'VALIDEE'
                periode.valide_par = request.user
                periode.save()

                # Log de validation
                logger.info(f"Période {periode.nom_periode} validée par {request.user.get_full_name()}")

                return Response({
                    'statut': 'succes',
                    'message': 'Période validée avec succès',
                    'validee_par': request.user.get_full_name(),
                    'date_validation': timezone.now().isoformat()
                })

        except Exception as e:
            logger.error(f"Erreur validation: {str(e)}")
            return Response({
                'erreur': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def statistiques_globales(self, request):
        """Statistiques globales des clôtures"""
        try:
            company = self.get_company()

            # Statistiques générales
            stats = PeriodeClotureComptable.objects.filter(societe=company).aggregate(
                total_periodes=Count('id'),
                periodes_terminees=Count('id', filter=models.Q(statut='TERMINEE')),
                periodes_validees=Count('id', filter=models.Q(statut='VALIDEE')),
                total_ecritures=Sum('nombre_ecritures_generees'),
                total_provisions=Sum('montant_total_provisions'),
                total_amortissements=Sum('montant_total_amortissements')
            )

            # Périodes récentes
            periodes_recentes = PeriodeClotureComptable.objects.filter(
                societe=company
            ).order_by('-date_fin_periode')[:5]

            periodes_data = []
            for periode in periodes_recentes:
                periodes_data.append({
                    'id': str(periode.id),
                    'nom': periode.nom_periode,
                    'type': periode.type_cloture,
                    'statut': periode.statut,
                    'date_fin': periode.date_fin_periode.isoformat(),
                    'ecritures': periode.nombre_ecritures_generees,
                    'avancement': str(periode.pourcentage_avancement)
                })

            return Response({
                'statistiques': {
                    'total_periodes': stats['total_periodes'] or 0,
                    'periodes_terminees': stats['periodes_terminees'] or 0,
                    'periodes_validees': stats['periodes_validees'] or 0,
                    'total_ecritures_generees': stats['total_ecritures'] or 0,
                    'total_provisions': str(stats['total_provisions'] or 0),
                    'total_amortissements': str(stats['total_amortissements'] or 0),
                    'taux_reussite': round((stats['periodes_terminees'] or 0) / max(stats['total_periodes'] or 1, 1) * 100, 1)
                },
                'periodes_recentes': periodes_data
            })

        except Exception as e:
            logger.error(f"Erreur statistiques: {str(e)}")
            return Response({
                'erreur': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def exercices_disponibles(self, request):
        """Liste des exercices disponibles pour clôture"""
        try:
            exercices = FiscalYear.objects.filter(
                company=self.get_company()
            ).order_by('-start_date')

            exercices_data = []
            for exercice in exercices:
                # Comptage des clôtures existantes
                clotures_count = PeriodeClotureComptable.objects.filter(
                    societe=self.get_company(),
                    exercice=exercice
                ).count()

                exercices_data.append({
                    'id': str(exercice.id),
                    'code': exercice.code,
                    'nom': exercice.name,
                    'date_debut': exercice.start_date.isoformat(),
                    'date_fin': exercice.end_date.isoformat(),
                    'est_cloture': exercice.is_closed,
                    'est_actif': exercice.is_active,
                    'nombre_clotures': clotures_count
                })

            return Response({
                'exercices': exercices_data
            })

        except Exception as e:
            logger.error(f"Erreur exercices: {str(e)}")
            return Response({
                'erreur': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)