"""
Vues pour le module Paramètres WiseBook ERP V3.0
ViewSets REST pour la configuration système
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q

from .models import (
    ParametreSysteme,
    ConfigurationSociete,
    JournalParametres,
    NotificationParametres
)
from .serializers import (
    ParametreSystemeSerializer,
    ConfigurationSocieteSerializer,
    JournalParametresSerializer,
    NotificationParametresSerializer,
    BulkParameterUpdateSerializer
)


class ParametreSystemeViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les paramètres système

    Endpoints:
    - GET /parametres-systeme/ : Liste tous les paramètres
    - GET /parametres-systeme/{id}/ : Détails d'un paramètre
    - POST /parametres-systeme/ : Créer un paramètre
    - PUT /parametres-systeme/{id}/ : Modifier un paramètre
    - DELETE /parametres-systeme/{id}/ : Supprimer un paramètre
    - GET /parametres-systeme/by-category/{categorie}/ : Paramètres par catégorie
    - POST /parametres-systeme/bulk-update/ : Mise à jour en masse
    - POST /parametres-systeme/reset-to-default/{id}/ : Réinitialiser aux valeurs par défaut
    """
    queryset = ParametreSysteme.objects.all()
    serializer_class = ParametreSystemeSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categorie', 'type_valeur', 'requis', 'modifiable_runtime', 'visible_interface']
    search_fields = ['cle', 'nom', 'description']
    ordering_fields = ['categorie', 'groupe', 'ordre', 'nom']
    ordering = ['categorie', 'groupe', 'ordre']

    @action(detail=False, methods=['get'], url_path='by-category/(?P<categorie>[^/.]+)')
    def by_category(self, request, categorie=None):
        """Récupère les paramètres par catégorie"""
        parametres = self.get_queryset().filter(categorie=categorie)
        serializer = self.get_serializer(parametres, many=True)
        return Response({
            'categorie': categorie,
            'count': parametres.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def categories(self, request):
        """Liste toutes les catégories disponibles"""
        categories = ParametreSysteme.CATEGORIES
        return Response({
            'count': len(categories),
            'categories': [{'value': cat[0], 'label': cat[1]} for cat in categories]
        })

    @action(detail=False, methods=['get'], url_path='by-group/(?P<groupe>[^/.]+)')
    def by_group(self, request, groupe=None):
        """Récupère les paramètres par groupe"""
        parametres = self.get_queryset().filter(groupe=groupe)
        serializer = self.get_serializer(parametres, many=True)
        return Response({
            'groupe': groupe,
            'count': parametres.count(),
            'results': serializer.data
        })

    @action(detail=True, methods=['post'])
    def reset_to_default(self, request, pk=None):
        """Réinitialise un paramètre à sa valeur par défaut"""
        parametre = self.get_object()
        parametre.valeur = parametre.valeur_par_defaut
        parametre.save()

        serializer = self.get_serializer(parametre)
        return Response({
            'message': f'Paramètre "{parametre.nom}" réinitialisé à sa valeur par défaut',
            'parametre': serializer.data
        })

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Mise à jour en masse des paramètres"""
        serializer = BulkParameterUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        parametres_data = serializer.validated_data['parametres']
        updated_count = 0
        errors = []

        for cle, valeur in parametres_data.items():
            try:
                parametre = ParametreSysteme.objects.get(
                    cle=cle,
                    modifiable_runtime=True
                )
                parametre.valeur = valeur
                parametre.full_clean()
                parametre.save()
                updated_count += 1
            except ParametreSysteme.DoesNotExist:
                errors.append(f"Paramètre non trouvé: {cle}")
            except Exception as e:
                errors.append(f"Erreur pour {cle}: {str(e)}")

        return Response({
            'message': f'{updated_count} paramètre(s) mis à jour',
            'updated_count': updated_count,
            'errors': errors if errors else None
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def visible_only(self, request):
        """Récupère uniquement les paramètres visibles dans l'interface"""
        parametres = self.get_queryset().filter(visible_interface=True)
        serializer = self.get_serializer(parametres, many=True)
        return Response({
            'count': parametres.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def get_by_key(self, request):
        """Récupère un paramètre par sa clé"""
        cle = request.query_params.get('cle')
        if not cle:
            return Response(
                {'error': 'Paramètre "cle" requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            parametre = ParametreSysteme.objects.get(cle=cle)
            serializer = self.get_serializer(parametre)
            return Response(serializer.data)
        except ParametreSysteme.DoesNotExist:
            return Response(
                {'error': f'Paramètre "{cle}" non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )


class ConfigurationSocieteViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les configurations société

    Endpoints:
    - GET /configurations-societe/ : Liste toutes les configurations
    - GET /configurations-societe/{id}/ : Détails d'une configuration
    - POST /configurations-societe/ : Créer une configuration
    - PUT /configurations-societe/{id}/ : Modifier une configuration
    - DELETE /configurations-societe/{id}/ : Supprimer une configuration
    - GET /configurations-societe/by-company/{societe_id}/ : Configuration par société
    - POST /configurations-societe/{id}/upload-logo/ : Upload du logo
    """
    queryset = ConfigurationSociete.objects.select_related('societe', 'devise_principale').all()
    serializer_class = ConfigurationSocieteSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['societe', 'plan_comptable_type', 'regime_fiscal', 'assujetti_tva', 'theme']
    search_fields = ['societe__nom', 'numero_rccm', 'numero_contribuable']

    @action(detail=False, methods=['get'], url_path='by-company/(?P<societe_id>[^/.]+)')
    def by_company(self, request, societe_id=None):
        """Récupère la configuration d'une société"""
        try:
            configuration = self.get_queryset().get(societe_id=societe_id)
            serializer = self.get_serializer(configuration)
            return Response(serializer.data)
        except ConfigurationSociete.DoesNotExist:
            return Response(
                {'error': f'Configuration non trouvée pour la société {societe_id}'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=['post'])
    def upload_logo(self, request, pk=None):
        """Upload du logo de la société"""
        configuration = self.get_object()

        if 'logo' not in request.FILES:
            return Response(
                {'error': 'Fichier logo requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        logo_file = request.FILES['logo']

        # Validation du type de fichier
        allowed_types = ['image/jpeg', 'image/png', 'image/svg+xml']
        if logo_file.content_type not in allowed_types:
            return Response(
                {'error': 'Format de fichier non supporté. Utilisez JPG, PNG ou SVG'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validation de la taille (max 2MB)
        if logo_file.size > 2 * 1024 * 1024:
            return Response(
                {'error': 'La taille du fichier ne doit pas dépasser 2MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        configuration.logo = logo_file
        configuration.save()

        serializer = self.get_serializer(configuration)
        return Response({
            'message': 'Logo uploadé avec succès',
            'configuration': serializer.data
        })

    @action(detail=True, methods=['delete'])
    def delete_logo(self, request, pk=None):
        """Supprime le logo de la société"""
        configuration = self.get_object()

        if configuration.logo:
            configuration.logo.delete()
            configuration.save()

            return Response({
                'message': 'Logo supprimé avec succès'
            })
        else:
            return Response(
                {'error': 'Aucun logo à supprimer'},
                status=status.HTTP_404_NOT_FOUND
            )


class JournalParametresViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les paramètres des journaux

    Endpoints:
    - GET /journaux-parametres/ : Liste tous les paramètres de journaux
    - GET /journaux-parametres/{id}/ : Détails d'un paramètre journal
    - POST /journaux-parametres/ : Créer un paramètre journal
    - PUT /journaux-parametres/{id}/ : Modifier un paramètre journal
    - DELETE /journaux-parametres/{id}/ : Supprimer un paramètre journal
    - GET /journaux-parametres/by-company/{societe_id}/ : Paramètres par société
    - GET /journaux-parametres/by-type/{type_journal}/ : Paramètres par type
    """
    queryset = JournalParametres.objects.select_related('societe').all()
    serializer_class = JournalParametresSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['societe', 'type_journal', 'numerotation_auto', 'lettrage_auto']
    search_fields = ['code', 'libelle']
    ordering_fields = ['code', 'libelle', 'type_journal']
    ordering = ['code']

    @action(detail=False, methods=['get'], url_path='by-company/(?P<societe_id>[^/.]+)')
    def by_company(self, request, societe_id=None):
        """Récupère les paramètres de journaux d'une société"""
        journaux = self.get_queryset().filter(societe_id=societe_id)
        serializer = self.get_serializer(journaux, many=True)
        return Response({
            'societe_id': societe_id,
            'count': journaux.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'], url_path='by-type/(?P<type_journal>[^/.]+)')
    def by_type(self, request, type_journal=None):
        """Récupère les paramètres de journaux par type"""
        journaux = self.get_queryset().filter(type_journal=type_journal)
        serializer = self.get_serializer(journaux, many=True)
        return Response({
            'type_journal': type_journal,
            'count': journaux.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def types(self, request):
        """Liste tous les types de journaux disponibles"""
        types = JournalParametres.TYPES_JOURNAL
        return Response({
            'count': len(types),
            'types': [{'value': t[0], 'label': t[1]} for t in types]
        })

    @action(detail=True, methods=['post'])
    def increment_counter(self, request, pk=None):
        """Incrémente le compteur du journal"""
        journal = self.get_object()
        journal.compteur += 1
        journal.save()

        serializer = self.get_serializer(journal)
        return Response({
            'message': 'Compteur incrémenté',
            'compteur': journal.compteur,
            'journal': serializer.data
        })


class NotificationParametresViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour les paramètres de notifications

    Endpoints:
    - GET /notifications-parametres/ : Liste tous les paramètres de notifications
    - GET /notifications-parametres/{id}/ : Détails d'un paramètre notification
    - POST /notifications-parametres/ : Créer un paramètre notification
    - PUT /notifications-parametres/{id}/ : Modifier un paramètre notification
    - DELETE /notifications-parametres/{id}/ : Supprimer un paramètre notification
    - GET /notifications-parametres/by-company/{societe_id}/ : Paramètres par société
    - GET /notifications-parametres/active/ : Notifications actives uniquement
    """
    queryset = NotificationParametres.objects.select_related('societe').all()
    serializer_class = NotificationParametresSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['societe', 'evenement', 'type_notification', 'actif']
    search_fields = ['evenement', 'modele_message']
    ordering_fields = ['evenement', 'type_notification']
    ordering = ['evenement']

    @action(detail=False, methods=['get'], url_path='by-company/(?P<societe_id>[^/.]+)')
    def by_company(self, request, societe_id=None):
        """Récupère les paramètres de notifications d'une société"""
        notifications = self.get_queryset().filter(societe_id=societe_id)
        serializer = self.get_serializer(notifications, many=True)
        return Response({
            'societe_id': societe_id,
            'count': notifications.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Récupère uniquement les notifications actives"""
        notifications = self.get_queryset().filter(actif=True)
        serializer = self.get_serializer(notifications, many=True)
        return Response({
            'count': notifications.count(),
            'results': serializer.data
        })

    @action(detail=False, methods=['get'])
    def events(self, request):
        """Liste tous les événements disponibles"""
        evenements = NotificationParametres.EVENEMENTS
        return Response({
            'count': len(evenements),
            'events': [{'value': e[0], 'label': e[1]} for e in evenements]
        })

    @action(detail=False, methods=['get'])
    def notification_types(self, request):
        """Liste tous les types de notifications disponibles"""
        types = NotificationParametres.TYPES_NOTIFICATION
        return Response({
            'count': len(types),
            'types': [{'value': t[0], 'label': t[1]} for t in types]
        })

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Active/désactive une notification"""
        notification = self.get_object()
        notification.actif = not notification.actif
        notification.save()

        serializer = self.get_serializer(notification)
        return Response({
            'message': f'Notification {"activée" if notification.actif else "désactivée"}',
            'notification': serializer.data
        })