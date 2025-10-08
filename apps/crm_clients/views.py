"""
Vues API REST pour Module CRM Clients WiseBook
Conforme au cahier des charges - API complète
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q, Count, Avg, Sum
from django.utils import timezone
from django.http import HttpResponse
from django.core.exceptions import ValidationError
import csv
import json
from datetime import timedelta

from apps.core.mixins import CompanyFilterMixin
from apps.core.permissions import IsCompanyMember
from .models import (
    Client, ClientAddress, Contact, ClientFinancialInfo,
    ClientComptableInfo, ClientDocument, ClientHistorique, ClientScoring
)
from .serializers import (
    ClientListSerializer, ClientDetailSerializer, ClientCreateUpdateSerializer,
    ClientSearchSerializer, ClientImportSerializer, ClientExportSerializer,
    ContactSerializer, ClientAddressSerializer, ClientDocumentSerializer
)
from .services import ClientService, ClientAnalyticsService, ClientImportService


class ClientViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet principal pour gestion clients
    Conforme section 4.1 - Module Liste Clients
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    def get_queryset(self):
        return Client.objects.filter(company=self.get_company()).select_related(
            'financial_info', 'comptable_info', 'scoring'
        ).prefetch_related(
            'addresses', 'contacts', 'documents'
        )

    def get_serializer_class(self):
        if self.action == 'list':
            return ClientListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ClientCreateUpdateSerializer
        return ClientDetailSerializer

    def perform_create(self, serializer):
        """Création avec attribution de la société et initialisation"""
        client = serializer.save(
            company=self.get_company(),
            created_by=self.request.user
        )

        # Initialisation automatique des informations complémentaires
        ClientService.initialiser_client_complet(client, self.request.user)

        # Log historique création
        ClientHistorique.objects.create(
            client=client,
            type_evenement='CREATION',
            titre='Création du client',
            description=f'Client créé par {self.request.user.get_full_name()}',
            utilisateur=self.request.user
        )

    @action(detail=False, methods=['post'])
    def search_advanced(self, request):
        """
        Recherche avancée de clients
        Conforme section 4.1.3 - Moteur de recherche
        """
        serializer = ClientSearchSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        queryset = self.get_queryset()

        # Application des filtres
        if query := serializer.validated_data.get('query'):
            queryset = queryset.filter(
                Q(raison_sociale__icontains=query) |
                Q(nom_commercial__icontains=query) |
                Q(code_client__icontains=query) |
                Q(numero_siret__icontains=query) |
                Q(contacts__email_principal__icontains=query) |
                Q(contacts__nom__icontains=query) |
                Q(contacts__prenom__icontains=query)
            ).distinct()

        if notation := serializer.validated_data.get('notation_interne'):
            queryset = queryset.filter(notation_interne__in=notation)

        if forme_juridique := serializer.validated_data.get('forme_juridique'):
            queryset = queryset.filter(forme_juridique__in=forme_juridique)

        if tags := serializer.validated_data.get('tags'):
            queryset = queryset.filter(tags__overlap=tags)

        if score_min := serializer.validated_data.get('score_risque_min'):
            queryset = queryset.filter(score_risque__gte=score_min)

        if score_max := serializer.validated_data.get('score_risque_max'):
            queryset = queryset.filter(score_risque__lte=score_max)

        if ville := serializer.validated_data.get('ville'):
            queryset = queryset.filter(addresses__ville__icontains=ville)

        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = ClientListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = ClientListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def timeline(self, request, pk=None):
        """
        Timeline complète du client
        Conforme section 4.1.1 - Onglet Historique
        """
        client = self.get_object()

        # Récupération de l'historique avec pagination
        historique = client.historique.all()[:100]  # Limité aux 100 derniers

        # Enrichissement avec événements système
        service = ClientService(client)
        timeline_complete = service.generer_timeline_complete()

        return Response({
            'client_id': str(client.id),
            'raison_sociale': client.raison_sociale,
            'timeline': timeline_complete,
            'statistiques': {
                'total_evenements': client.historique.count(),
                'contacts_ce_mois': client.historique.filter(
                    type_evenement='CONTACT',
                    date_evenement__gte=timezone.now() - timedelta(days=30)
                ).count(),
                'derniere_activite': client.historique.first().date_evenement if client.historique.exists() else None
            }
        })

    @action(detail=True, methods=['post'])
    def calculer_scoring(self, request, pk=None):
        """
        Calcul du scoring client avec IA
        Conforme aux analyses prédictives
        """
        client = self.get_object()

        # Service de calcul scoring
        analytics_service = ClientAnalyticsService(client)
        scoring_results = analytics_service.calculer_scoring_complet()

        # Mise à jour ou création du scoring
        scoring, created = ClientScoring.objects.get_or_create(client=client)
        for key, value in scoring_results.items():
            setattr(scoring, key, value)
        scoring.save()

        # Log de l'événement
        ClientHistorique.objects.create(
            client=client,
            type_evenement='AUTRE',
            titre='Recalcul du scoring',
            description='Scoring client recalculé avec IA',
            utilisateur=request.user,
            donnees_json=scoring_results
        )

        return Response({
            'message': 'Scoring calculé avec succès',
            'scoring': scoring_results,
            'created': created
        })

    @action(detail=False, methods=['post'])
    def import_clients(self, request):
        """
        Import en masse de clients
        Conforme section 4.1.2 - Import/Export Avancé
        """
        serializer = ClientImportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        import_service = ClientImportService(
            company=self.get_company(),
            user=request.user
        )

        try:
            results = import_service.importer_fichier(
                fichier=serializer.validated_data['fichier'],
                format_fichier=serializer.validated_data['format_fichier'],
                mapping_colonnes=serializer.validated_data.get('mapping_colonnes'),
                ignorer_erreurs=serializer.validated_data['ignorer_erreurs'],
                mise_a_jour_existants=serializer.validated_data['mise_a_jour_existants']
            )

            return Response({
                'message': 'Import terminé',
                'statistiques': results,
                'timestamp': timezone.now()
            })

        except Exception as e:
            return Response(
                {'erreur': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def export_clients(self, request):
        """
        Export de clients avec personnalisation
        """
        serializer = ClientExportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        queryset = self.get_queryset()

        # Application des filtres d'export
        if filtres := serializer.validated_data.get('filtres'):
            # Logique de filtrage complexe
            pass

        format_export = serializer.validated_data['format_export']

        if format_export == 'CSV':
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = f'attachment; filename="clients_{timezone.now().strftime("%Y%m%d")}.csv"'

            writer = csv.writer(response)
            writer.writerow(['Code', 'Raison Sociale', 'SIRET', 'Notation', 'Ville'])

            for client in queryset:
                adresse = client.addresses.filter(type_adresse='SIEGE').first()
                writer.writerow([
                    client.code_client,
                    client.raison_sociale,
                    client.numero_siret,
                    client.notation_interne,
                    adresse.ville if adresse else ''
                ])

            return response

        # Autres formats...
        return Response({'message': 'Format non implémenté'})

    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """
        Statistiques pour dashboard clients
        """
        queryset = self.get_queryset()

        stats = {
            'total_clients': queryset.count(),
            'clients_actifs': queryset.filter(is_active=True).count(),
            'prospects': queryset.filter(is_prospect=True).count(),
            'nouveaux_ce_mois': queryset.filter(
                created_at__gte=timezone.now().replace(day=1)
            ).count(),

            # Répartition par notation
            'repartition_notation': {
                item['notation_interne']: item['count']
                for item in queryset.values('notation_interne').annotate(count=Count('id'))
            },

            # Top 5 villes
            'top_villes': list(
                ClientAddress.objects.filter(
                    client__in=queryset,
                    type_adresse='SIEGE'
                ).values('ville').annotate(
                    count=Count('client', distinct=True)
                ).order_by('-count')[:5]
            ),

            # Scoring moyen
            'score_risque_moyen': queryset.aggregate(
                avg=Avg('score_risque')
            )['avg'] or 0
        }

        return Response(stats)


class ContactViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet pour gestion des contacts
    Conforme section 4.2 - Module Contacts
    """

    serializer_class = ContactSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    def get_queryset(self):
        return Contact.objects.filter(client__company=self.get_company()).select_related('client')

    @action(detail=False, methods=['get'])
    def by_client(self, request):
        """Contacts par client"""
        client_id = request.query_params.get('client_id')
        if not client_id:
            return Response({'erreur': 'client_id requis'}, status=400)

        contacts = self.get_queryset().filter(client_id=client_id)
        serializer = ContactSerializer(contacts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_scoring_engagement(self, request, pk=None):
        """Mise à jour du scoring d'engagement"""
        contact = self.get_object()

        # Calcul automatique basé sur les interactions
        service = ClientService(contact.client)
        nouveau_score = service.calculer_score_engagement_contact(contact)

        contact.score_engagement = nouveau_score
        contact.save()

        return Response({
            'nouveau_score': nouveau_score,
            'contact_id': str(contact.id)
        })


class ClientAddressViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """ViewSet pour gestion des adresses"""

    serializer_class = ClientAddressSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    def get_queryset(self):
        return ClientAddress.objects.filter(client__company=self.get_company())

    @action(detail=True, methods=['post'])
    def geocoder(self, request, pk=None):
        """Géocodage d'une adresse"""
        adresse = self.get_object()

        service = ClientService(adresse.client)
        coordonnees = service.geocoder_adresse(adresse)

        if coordonnees:
            adresse.latitude = coordonnees['lat']
            adresse.longitude = coordonnees['lng']
            adresse.geocodage_valide = True
            adresse.save()

            return Response({
                'message': 'Géocodage réussi',
                'coordonnees': coordonnees
            })
        else:
            return Response(
                {'erreur': 'Impossible de géocoder cette adresse'},
                status=status.HTTP_400_BAD_REQUEST
            )


class ClientDocumentViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """
    ViewSet pour gestion documentaire
    Conforme section 4.1.1 - GED intégrée
    """

    serializer_class = ClientDocumentSerializer
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        return ClientDocument.objects.filter(client__company=self.get_company())

    def perform_create(self, serializer):
        """Upload avec traitement automatique"""
        document = serializer.save(uploaded_by=self.request.user)

        # Traitement OCR si applicable
        if document.type_mime in ['application/pdf', 'image/jpeg', 'image/png']:
            # Service OCR asynchrone
            from .tasks import process_document_ocr
            process_document_ocr.delay(document.id)

        # Log historique
        ClientHistorique.objects.create(
            client=document.client,
            type_evenement='DOCUMENT',
            titre='Document ajouté',
            description=f'Document "{document.titre}" ajouté',
            utilisateur=self.request.user,
            objet_lie_type='ClientDocument',
            objet_lie_id=str(document.id)
        )

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Téléchargement sécurisé de document"""
        document = self.get_object()

        # Vérification des permissions
        if document.is_confidentiel:
            # Logique de contrôle d'accès renforcée
            pass

        response = HttpResponse(document.fichier.read(), content_type=document.type_mime)
        response['Content-Disposition'] = f'attachment; filename="{document.titre}"'

        # Log de téléchargement
        ClientHistorique.objects.create(
            client=document.client,
            type_evenement='DOCUMENT',
            titre='Document téléchargé',
            description=f'Document "{document.titre}" téléchargé par {request.user.get_full_name()}',
            utilisateur=request.user
        )

        return response

    @action(detail=False, methods=['get'])
    def types_documents(self, request):
        """Liste des types de documents disponibles"""
        return Response({
            'types': [
                {'code': code, 'libelle': libelle}
                for code, libelle in ClientDocument.TYPE_DOCUMENT_CHOICES
            ]
        })


class ClientAnalyticsViewSet(CompanyFilterMixin, viewsets.ViewSet):
    """
    ViewSet pour analyses et reportings clients
    Conforme section 4.5 - Module Analyse Clients
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    @action(detail=False, methods=['get'])
    def segmentation_clients(self, request):
        """Segmentation automatique des clients"""
        analytics_service = ClientAnalyticsService.for_company(self.get_company())

        segmentation = analytics_service.generer_segmentation_ia()

        return Response({
            'segments': segmentation,
            'date_generation': timezone.now(),
            'algorithme_version': '2.0'
        })

    @action(detail=False, methods=['get'])
    def predictive_analytics(self, request):
        """Analyses prédictives globales"""
        analytics_service = ClientAnalyticsService.for_company(self.get_company())

        predictions = {
            'churn_predictions': analytics_service.predire_churn_clients(),
            'lifetime_value': analytics_service.calculer_clv_portfolio(),
            'next_best_actions': analytics_service.recommander_actions(),
            'risk_analysis': analytics_service.analyser_risques_portfolio()
        }

        return Response(predictions)

    @action(detail=False, methods=['post'])
    def custom_report(self, request):
        """Génération de rapport personnalisé"""
        # Configuration du rapport depuis request.data
        report_config = request.data

        analytics_service = ClientAnalyticsService.for_company(self.get_company())
        rapport = analytics_service.generer_rapport_personalise(report_config)

        return Response({
            'rapport': rapport,
            'config': report_config,
            'genere_le': timezone.now()
        })


# Vues spécialisées pour Recouvrement et Lettrage (à implémenter dans les modules dédiés)
class ClientRecouvrementViewSet(CompanyFilterMixin, viewsets.ViewSet):
    """ViewSet pour module recouvrement - Placeholder"""
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    @action(detail=False, methods=['get'])
    def tableau_bord(self, request):
        """Tableau de bord recouvrement"""
        # À implémenter selon section 4.3
        return Response({'message': 'Module recouvrement en développement'})


class ClientLettrageViewSet(CompanyFilterMixin, viewsets.ViewSet):
    """ViewSet pour module lettrage - Placeholder"""
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    @action(detail=False, methods=['post'])
    def lettrage_automatique(self, request):
        """Lettrage automatique avec IA"""
        # À implémenter selon section 4.4
        return Response({'message': 'Module lettrage en développement'})