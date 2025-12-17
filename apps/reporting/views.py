"""
Vues API pour le module Reporting
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.http import HttpResponse
from django.utils import timezone

from .models import CategorieRapport, ModeleRapport


class CategorieRapportViewSet(viewsets.ModelViewSet):
    """ViewSet pour les catégories de rapports"""
    queryset = CategorieRapport.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'libelle']
    filterset_fields = ['type_categorie', 'actif']
    ordering = ['ordre_affichage']

    def get_serializer_class(self):
        from rest_framework import serializers

        class CategorieRapportSerializer(serializers.ModelSerializer):
            class Meta:
                model = CategorieRapport
                fields = '__all__'

        return CategorieRapportSerializer


class ModeleRapportViewSet(viewsets.ModelViewSet):
    """ViewSet pour les modèles de rapports"""
    queryset = ModeleRapport.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'libelle']
    filterset_fields = ['company', 'type_rapport', 'actif']
    ordering = ['ordre_affichage', 'code']

    def get_serializer_class(self):
        from rest_framework import serializers

        class ModeleRapportSerializer(serializers.ModelSerializer):
            class Meta:
                model = ModeleRapport
                fields = '__all__'

        return ModeleRapportSerializer

    @action(detail=True, methods=['post'])
    def generer(self, request, pk=None):
        """Génère un rapport"""
        modele = self.get_object()
        format_sortie = request.data.get('format', 'PDF')
        parametres = request.data.get('parametres', {})

        # Simulation de génération
        return Response({
            'success': True,
            'message': f'Rapport {modele.code} généré avec succès',
            'format': format_sortie,
            'generated_at': timezone.now().isoformat(),
            'download_url': f'/api/v1/reports/{modele.pk}/download/'
        })

    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """Télécharge un rapport généré"""
        modele = self.get_object()
        format_sortie = request.query_params.get('format', 'PDF')

        # Simulation de téléchargement
        response = HttpResponse(
            content_type='application/pdf' if format_sortie == 'PDF' else 'application/octet-stream'
        )
        response['Content-Disposition'] = f'attachment; filename="{modele.code}.{format_sortie.lower()}"'
        return response

    @action(detail=False, methods=['get'])
    def types_disponibles(self, request):
        """Liste des types de rapports disponibles"""
        return Response({
            'types_rapport': dict(ModeleRapport.TYPES_RAPPORT),
            'formats_sortie': dict(ModeleRapport.FORMATS_SORTIE),
            'frequences': dict(ModeleRapport.FREQUENCES)
        })


class ReportingDashboardViewSet(viewsets.ViewSet):
    """ViewSet pour le tableau de bord reporting"""
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques des rapports"""
        return Response({
            'total_categories': CategorieRapport.objects.count(),
            'categories_actives': CategorieRapport.objects.filter(actif=True).count(),
            'total_modeles': ModeleRapport.objects.count(),
            'modeles_actifs': ModeleRapport.objects.filter(actif=True).count(),
            'rapports_generes_aujourd_hui': 0,  # À implémenter
            'rapports_programmes': 0  # À implémenter
        })

    @action(detail=False, methods=['get'])
    def rapports_recents(self, request):
        """Liste des rapports récemment générés"""
        # Simulation
        return Response({
            'rapports': []
        })

    @action(detail=False, methods=['post'])
    def generer_rapport_personnalise(self, request):
        """Génère un rapport personnalisé"""
        type_rapport = request.data.get('type_rapport')
        parametres = request.data.get('parametres', {})
        format_sortie = request.data.get('format', 'PDF')

        return Response({
            'success': True,
            'message': f'Rapport personnalisé généré avec succès',
            'type': type_rapport,
            'format': format_sortie,
            'generated_at': timezone.now().isoformat()
        })
