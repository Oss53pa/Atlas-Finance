"""
Vues API REST pour Module Fournisseur WiseBook
Conforme au cahier des charges sections 2.1-2.5
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from django.http import HttpResponse
from django.core.exceptions import ValidationError
import csv
import json
from datetime import timedelta, date

from apps.core.mixins import CompanyFilterMixin
from apps.core.permissions import IsCompanyMember
from .models import (
    Supplier, SupplierContact, SupplierDocument, SupplierInvoice,
    SupplierPayment, SupplierAnalytics, SupplierEvaluation
)
from .services import (
    SupplierService, SupplierAnalyticsService, SupplierPaymentService,
    SupplierMatchingService
)


class SupplierViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet principal pour gestion fournisseurs
    Conforme section 2.1 - Liste Fournisseurs
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    def get_queryset(self):
        return Supplier.objects.filter(company=self.get_company()).select_related(
            'account', 'analytics'
        ).prefetch_related(
            'contacts', 'documents', 'invoices'
        )

    def perform_create(self, serializer):
        """Création avec initialisation automatique"""
        supplier = serializer.save(company=self.get_company())

        # Initialisation complète
        SupplierService._initialiser_fournisseur(supplier, self.request.user)

    @action(detail=False, methods=['post'])
    def search_advanced(self, request):
        """
        Recherche avancée de fournisseurs
        Conforme section 2.1.2 - Recherche et filtrage
        """
        query = request.data.get('query', '')
        filters = request.data.get('filters', {})

        queryset = self.get_queryset()

        # Recherche textuelle
        if query:
            queryset = queryset.filter(
                Q(legal_name__icontains=query) |
                Q(commercial_name__icontains=query) |
                Q(code__icontains=query) |
                Q(numero_siret__icontains=query) |
                Q(email__icontains=query)
            )

        # Filtres spécialisés
        if supplier_type := filters.get('supplier_type'):
            queryset = queryset.filter(supplier_type=supplier_type)

        if legal_form := filters.get('legal_form'):
            queryset = queryset.filter(legal_form=legal_form)

        if status_filter := filters.get('status'):
            queryset = queryset.filter(status=status_filter)

        if city := filters.get('city'):
            queryset = queryset.filter(city__icontains=city)

        if rating := filters.get('rating'):
            queryset = queryset.filter(supplier_rating=rating)

        # Filtres par montant d'encours
        if encours_min := filters.get('encours_min'):
            queryset = queryset.filter(current_outstanding__gte=encours_min)

        if encours_max := filters.get('encours_max'):
            queryset = queryset.filter(current_outstanding__lte=encours_max)

        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def evaluer_performance(self, request, pk=None):
        """
        Évaluation de performance fournisseur
        Conforme section 2.4.1 - Indicateurs clés
        """
        supplier = self.get_object()

        service = SupplierService(supplier)
        performance = service.calculer_performance_globale()

        # Mise à jour du scoring
        supplier.calculate_performance_metrics()

        return Response({
            'supplier': {
                'code': supplier.code,
                'name': supplier.legal_name,
                'rating': supplier.supplier_rating
            },
            'performance': performance,
            'derniere_evaluation': timezone.now()
        })

    @action(detail=True, methods=['post'])
    def valider_siret(self, request, pk=None):
        """Validation SIRET via API externe"""
        supplier = self.get_object()

        service = SupplierService(supplier)
        validation = service.valider_siret_externe()

        return Response(validation)

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """
        Statistiques pour dashboard fournisseurs
        """
        queryset = self.get_queryset()

        stats = {
            'total_fournisseurs': queryset.count(),
            'fournisseurs_actifs': queryset.filter(status='ACTIVE').count(),
            'fournisseurs_bloques': queryset.filter(status='BLOCKED').count(),
            'fournisseurs_evalues': queryset.filter(
                evaluations__isnull=False
            ).distinct().count(),

            # Encours
            'encours_total': queryset.aggregate(
                total=Sum('current_outstanding')
            )['total'] or 0,

            # Performance
            'performance_moyenne': queryset.aggregate(
                avg=Avg('overall_performance')
            )['avg'] or 0,

            # Répartition par type
            'repartition_type': dict(
                queryset.values('supplier_type').annotate(
                    count=Count('id')
                ).values_list('supplier_type', 'count')
            ),

            # Top 5 fournisseurs par encours
            'top_encours': list(
                queryset.filter(current_outstanding__gt=0)
                .order_by('-current_outstanding')[:5]
                .values('code', 'legal_name', 'current_outstanding')
            )
        }

        return Response(stats)

    @action(detail=False, methods=['post'])
    def import_fournisseurs(self, request):
        """
        Import en masse de fournisseurs
        """
        # Logique d'import similaire au module clients
        return Response({'message': 'Import en cours de développement'})

    @action(detail=False, methods=['post'])
    def export_fournisseurs(self, request):
        """Export de fournisseurs"""
        format_export = request.data.get('format', 'CSV')

        if format_export == 'CSV':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="fournisseurs_{timezone.now().strftime("%Y%m%d")}.csv"'

            writer = csv.writer(response)
            writer.writerow([
                'Code', 'Raison Sociale', 'Type', 'Ville', 'Téléphone',
                'Email', 'Encours', 'Performance', 'Statut'
            ])

            for supplier in self.get_queryset():
                writer.writerow([
                    supplier.code,
                    supplier.legal_name,
                    supplier.get_supplier_type_display(),
                    supplier.city,
                    supplier.main_phone,
                    supplier.email,
                    supplier.current_outstanding,
                    supplier.overall_performance,
                    supplier.get_status_display()
                ])

            return response

        return Response({'erreur': 'Format non supporté'})


class SupplierEcheancesViewSet(CompanyFilterMixin, viewsets.ViewSet):
    """
    ViewSet pour gestion des échéances
    Conforme section 2.3 - Gestion des Échéances
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    @action(detail=False, methods=['get'])
    def tableau_bord(self, request):
        """
        Tableau de bord des échéances
        Conforme section 2.3.1 - Tableau de bord des échéances
        """
        analytics_service = SupplierAnalyticsService(self.get_company())
        dashboard_data = analytics_service.generer_dashboard_echeances()

        return Response(dashboard_data)

    @action(detail=False, methods=['post'])
    def planifier_paiements(self, request):
        """
        Planification optimale des paiements
        Conforme section 2.3.2 - Planification des paiements
        """
        date_limite = request.data.get('date_limite')
        if not date_limite:
            return Response(
                {'erreur': 'Date limite requise'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment_service = SupplierPaymentService(self.get_company())
        planification = payment_service.planifier_paiements_optimaux(
            date.fromisoformat(date_limite)
        )

        return Response(planification)

    @action(detail=False, methods=['post'])
    def generer_virement_sepa(self, request):
        """
        Génération fichier SEPA
        Conforme section 2.3.2 - Génération de fichiers de virement SEPA
        """
        paiements_ids = request.data.get('paiements_ids', [])

        if not paiements_ids:
            return Response(
                {'erreur': 'Liste des paiements requise'},
                status=status.HTTP_400_BAD_REQUEST
            )

        payment_service = SupplierPaymentService(self.get_company())
        fichier_sepa = payment_service.generer_fichier_virement_sepa(paiements_ids)

        return Response(fichier_sepa)

    @action(detail=False, methods=['get'])
    def echeances_jour(self, request):
        """Échéances du jour"""
        aujourd_hui = date.today()

        factures = SupplierInvoice.objects.filter(
            supplier__company=self.get_company(),
            due_date=aujourd_hui,
            status__in=['VALIDATED', 'ACCOUNTING_OK', 'APPROVED']
        ).select_related('supplier')

        echeances = []
        for facture in factures:
            echeances.append({
                'fournisseur': {
                    'code': facture.supplier.code,
                    'name': facture.supplier.legal_name
                },
                'facture': {
                    'numero': facture.invoice_number,
                    'montant': facture.amount_incl_tax,
                    'date_facture': facture.invoice_date,
                    'date_echeance': facture.due_date
                },
                'retard_jours': (aujourd_hui - facture.due_date).days
            })

        montant_total = sum(e['facture']['montant'] for e in echeances)

        return Response({
            'date': aujourd_hui,
            'nombre_echeances': len(echeances),
            'montant_total': montant_total,
            'echeances': echeances
        })


class SupplierAnalyticsViewSet(CompanyFilterMixin, viewsets.ViewSet):
    """
    ViewSet pour analyses fournisseurs
    Conforme section 2.4 - Analyse Fournisseurs
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    @action(detail=False, methods=['get'])
    def analyse_abc(self, request):
        """
        Analyse ABC des fournisseurs
        Conforme section 2.4.2 - Analyses comparatives
        """
        analytics_service = SupplierAnalyticsService(self.get_company())
        analyse = analytics_service.generer_analyse_abc()

        return Response(analyse)

    @action(detail=False, methods=['get'])
    def matrice_risques(self, request):
        """
        Matrice risques fournisseurs
        Criticité vs Performance
        """
        analytics_service = SupplierAnalyticsService(self.get_company())
        matrice = analytics_service.generer_matrice_risques()

        return Response(matrice)

    @action(detail=False, methods=['get'])
    def indicateurs_cles(self, request):
        """
        Indicateurs clés de performance
        """
        # Période d'analyse
        periode = request.query_params.get('periode', '12')  # mois
        fin_periode = date.today()
        debut_periode = fin_periode - timedelta(days=int(periode) * 30)

        # Calculs sur la période
        suppliers = Supplier.objects.filter(company=self.get_company())
        factures = SupplierInvoice.objects.filter(
            supplier__company=self.get_company(),
            invoice_date__range=[debut_periode, fin_periode]
        )

        indicateurs = {
            'volume_achats': {
                'total': factures.aggregate(Sum('amount_incl_tax'))['total'] or 0,
                'nombre_factures': factures.count(),
                'fournisseurs_actifs': factures.values('supplier').distinct().count(),
                'montant_moyen_facture': factures.aggregate(Avg('amount_incl_tax'))['avg'] or 0,
            },

            'performance_paiement': {
                'delai_moyen': self._calculer_delai_paiement_moyen(factures),
                'factures_en_retard': factures.filter(
                    due_date__lt=date.today(),
                    status__in=['VALIDATED', 'ACCOUNTING_OK']
                ).count(),
                'taux_respect_delais': self._calculer_taux_respect_delais(factures),
            },

            'top_fournisseurs': list(
                factures.values('supplier__code', 'supplier__legal_name')
                .annotate(montant_total=Sum('amount_incl_tax'))
                .order_by('-montant_total')[:10]
            ),

            'repartition_statuts': dict(
                suppliers.values('status').annotate(count=Count('id'))
                .values_list('status', 'count')
            ),
        }

        return Response({
            'periode': {
                'debut': debut_periode,
                'fin': fin_periode,
                'duree_mois': int(periode)
            },
            'indicateurs': indicateurs,
            'genere_le': timezone.now()
        })

    def _calculer_delai_paiement_moyen(self, factures) -> float:
        """Calcul délai moyen de paiement"""
        factures_payees = factures.filter(
            status='PAID',
            payment_date__isnull=False
        )

        if not factures_payees.exists():
            return 0.0

        delais = []
        for facture in factures_payees:
            delai = (facture.payment_date - facture.due_date).days
            delais.append(delai)

        return sum(delais) / len(delais)

    def _calculer_taux_respect_delais(self, factures) -> float:
        """Taux de respect des délais de paiement"""
        factures_payees = factures.filter(status='PAID')
        total = factures_payees.count()

        if total == 0:
            return 100.0

        payees_a_temps = factures_payees.filter(
            payment_date__lte=models.F('due_date')
        ).count()

        return (payees_a_temps / total) * 100

    @action(detail=False, methods=['post'])
    def rapport_personnalise(self, request):
        """
        Génération de rapport personnalisé
        Conforme section 2.4.3 - Rapports personnalisables
        """
        config_rapport = request.data

        # Configuration par défaut
        periode_jours = config_rapport.get('periode_jours', 365)
        groupement = config_rapport.get('groupement', 'fournisseur')
        metriques = config_rapport.get('metriques', ['montant', 'nombre_factures'])

        # Génération du rapport
        debut = date.today() - timedelta(days=periode_jours)
        factures = SupplierInvoice.objects.filter(
            supplier__company=self.get_company(),
            invoice_date__gte=debut
        )

        rapport_data = []

        if groupement == 'fournisseur':
            # Groupement par fournisseur
            for supplier in Supplier.objects.filter(company=self.get_company()):
                factures_supplier = factures.filter(supplier=supplier)

                if factures_supplier.exists():
                    donnees = {
                        'fournisseur': {
                            'code': supplier.code,
                            'name': supplier.legal_name,
                            'type': supplier.supplier_type
                        }
                    }

                    if 'montant' in metriques:
                        donnees['montant_total'] = factures_supplier.aggregate(
                            total=Sum('amount_incl_tax')
                        )['total']

                    if 'nombre_factures' in metriques:
                        donnees['nombre_factures'] = factures_supplier.count()

                    if 'delai_moyen' in metriques:
                        donnees['delai_paiement_moyen'] = self._calculer_delai_paiement_moyen(
                            factures_supplier
                        )

                    rapport_data.append(donnees)

        return Response({
            'configuration': config_rapport,
            'periode': {
                'debut': debut,
                'fin': date.today(),
                'jours': periode_jours
            },
            'donnees': rapport_data,
            'genere_le': timezone.now()
        })


class SupplierInvoiceViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet pour factures fournisseurs
    Conforme section 2.2.5 - Factures d'achat
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    def get_queryset(self):
        return SupplierInvoice.objects.filter(
            supplier__company=self.get_company()
        ).select_related('supplier')

    @action(detail=True, methods=['post'])
    def valider_technique(self, request, pk=None):
        """Validation technique de facture"""
        facture = self.get_object()

        if facture.technical_validation != 'PENDING':
            return Response(
                {'erreur': 'Facture déjà validée techniquement'},
                status=status.HTTP_400_BAD_REQUEST
            )

        facture.technical_validation = 'APPROVED'
        facture.technical_validator = request.user
        facture.technical_validation_date = timezone.now()
        facture.technical_comments = request.data.get('commentaires', '')

        # Passage au statut suivant si validations OK
        if facture.accounting_validation == 'APPROVED':
            facture.status = 'APPROVED'

        facture.save()

        return Response({
            'message': 'Validation technique effectuée',
            'nouveau_statut': facture.status
        })

    @action(detail=True, methods=['post'])
    def valider_comptable(self, request, pk=None):
        """Validation comptable de facture"""
        facture = self.get_object()

        facture.accounting_validation = 'APPROVED'
        facture.accounting_validator = request.user
        facture.accounting_validation_date = timezone.now()
        facture.accounting_comments = request.data.get('commentaires', '')

        # Passage au statut suivant si validations OK
        if facture.technical_validation == 'APPROVED':
            facture.status = 'APPROVED'

        facture.save()

        return Response({
            'message': 'Validation comptable effectuée',
            'nouveau_statut': facture.status
        })

    @action(detail=True, methods=['post'])
    def comptabiliser(self, request, pk=None):
        """
        Comptabilisation automatique
        Génération écriture comptable
        """
        facture = self.get_object()

        if facture.status != 'APPROVED':
            return Response(
                {'erreur': 'Facture non approuvée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            ecriture = facture.create_accounting_entry()

            return Response({
                'message': 'Facture comptabilisée',
                'ecriture': {
                    'numero': ecriture.entry_number,
                    'montant': ecriture.total_amount,
                    'date': ecriture.entry_date
                }
            })

        except Exception as e:
            return Response(
                {'erreur': f'Erreur comptabilisation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupplierMatchingViewSet(CompanyFilterMixin, viewsets.ViewSet):
    """
    ViewSet pour lettrage fournisseurs
    Conforme section 2.5 - Lettrage Fournisseurs
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    @action(detail=False, methods=['post'])
    def lettrage_automatique_global(self, request):
        """
        Lettrage automatique pour tous les fournisseurs
        Conforme section 2.5.2 - Lettrage automatique
        """
        matching_service = SupplierMatchingService(self.get_company())
        resultats = matching_service.lettrage_automatique_global()

        return Response({
            'message': 'Lettrage automatique terminé',
            'resultats': resultats,
            'execute_le': timezone.now()
        })

    @action(detail=False, methods=['post'])
    def lettrage_fournisseur(self, request):
        """Lettrage pour un fournisseur spécifique"""
        supplier_id = request.data.get('supplier_id')

        if not supplier_id:
            return Response(
                {'erreur': 'ID fournisseur requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            supplier = Supplier.objects.get(
                id=supplier_id,
                company=self.get_company()
            )

            matching_service = SupplierMatchingService(self.get_company())
            resultat = matching_service.lettrage_automatique_supplier(supplier)

            return Response(resultat)

        except Supplier.DoesNotExist:
            return Response(
                {'erreur': 'Fournisseur non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def propositions_lettrage(self, request):
        """
        Propositions de lettrage manuel
        Conforme section 2.5.1 - Lettrage manuel
        """
        supplier_id = request.data.get('supplier_id')

        try:
            supplier = Supplier.objects.get(
                id=supplier_id,
                company=self.get_company()
            )

            matching_service = SupplierMatchingService(self.get_company())
            propositions = matching_service.proposer_lettrage_manuel(supplier)

            return Response(propositions)

        except Supplier.DoesNotExist:
            return Response(
                {'erreur': 'Fournisseur non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['post'])
    def executer_lettrage_manuel(self, request):
        """Exécution d'un lettrage manuel validé"""
        ecritures_ids = request.data.get('ecritures_ids', [])

        if len(ecritures_ids) < 2:
            return Response(
                {'erreur': 'Minimum 2 écritures pour lettrage'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            with transaction.atomic():
                # Génération code lettrage
                matching_service = SupplierMatchingService(self.get_company())
                code_lettrage = matching_service._generer_code_lettrage()

                # Application du lettrage
                from apps.accounting.models import JournalEntryLine

                ecritures = JournalEntryLine.objects.filter(
                    id__in=ecritures_ids,
                    is_reconciled=False
                )

                for ecriture in ecritures:
                    ecriture.is_reconciled = True
                    ecriture.reconciliation_code = code_lettrage
                    ecriture.save()

                return Response({
                    'message': 'Lettrage manuel effectué',
                    'code_lettrage': code_lettrage,
                    'ecritures_lettrees': ecritures.count()
                })

        except Exception as e:
            return Response(
                {'erreur': f'Erreur lors du lettrage: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SupplierDocumentViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet pour documents fournisseurs
    Gestion documentaire intégrée
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return SupplierDocument.objects.filter(
            supplier__company=self.get_company()
        )

    @action(detail=False, methods=['get'])
    def documents_expires(self, request):
        """Documents qui expirent bientôt"""
        limite = int(request.query_params.get('jours', 30))
        date_limite = date.today() + timedelta(days=limite)

        documents = self.get_queryset().filter(
            expiry_date__isnull=False,
            expiry_date__lte=date_limite,
            is_expired=False
        ).select_related('supplier')

        docs_expires = []
        for doc in documents:
            docs_expires.append({
                'fournisseur': {
                    'code': doc.supplier.code,
                    'name': doc.supplier.legal_name
                },
                'document': {
                    'type': doc.get_document_type_display(),
                    'titre': doc.title,
                    'expiration': doc.expiry_date,
                    'jours_restants': (doc.expiry_date - date.today()).days
                }
            })

        return Response({
            'documents_expires': docs_expires,
            'limite_jours': limite,
            'verifie_le': timezone.now()
        })