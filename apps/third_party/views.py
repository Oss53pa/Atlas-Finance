"""
Vues API pour le module Third Party (Tiers)
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Count, Q

from .models import Tiers, AdresseTiers, ContactTiers, CategorieAnalytique
from .serializers import (
    TiersListSerializer, TiersDetailSerializer, TiersCreateSerializer,
    AdresseTiersSerializer, ContactTiersSerializer, CategorieAnalytiqueSerializer
)


class TiersViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des tiers"""
    queryset = Tiers.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['code', 'raison_sociale', 'nom_commercial', 'email', 'telephone', 'nif', 'rccm']
    filterset_fields = ['type_tiers', 'statut', 'societe', 'forme_juridique']
    ordering_fields = ['code', 'raison_sociale', 'created_at', 'encours_actuel']
    ordering = ['code']

    def get_serializer_class(self):
        if self.action == 'list':
            return TiersListSerializer
        elif self.action == 'create':
            return TiersCreateSerializer
        return TiersDetailSerializer

    def get_queryset(self):
        queryset = super().get_queryset()

        # Filtre par type
        type_filter = self.request.query_params.get('type')
        if type_filter == 'client':
            queryset = queryset.filter(Q(type_tiers='CLIENT') | Q(type_tiers='CLIENT_FOURNISSEUR'))
        elif type_filter == 'fournisseur':
            queryset = queryset.filter(Q(type_tiers='FOURNISSEUR') | Q(type_tiers='CLIENT_FOURNISSEUR'))

        return queryset.select_related('societe', 'devise')

    @action(detail=False, methods=['get'])
    def clients(self, request):
        """Liste des clients uniquement"""
        queryset = self.get_queryset().filter(
            Q(type_tiers='CLIENT') | Q(type_tiers='CLIENT_FOURNISSEUR')
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = TiersListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = TiersListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def fournisseurs(self, request):
        """Liste des fournisseurs uniquement"""
        queryset = self.get_queryset().filter(
            Q(type_tiers='FOURNISSEUR') | Q(type_tiers='CLIENT_FOURNISSEUR')
        )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = TiersListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = TiersListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Statistiques des tiers"""
        queryset = self.get_queryset()

        stats = {
            'total': queryset.count(),
            'clients': queryset.filter(Q(type_tiers='CLIENT') | Q(type_tiers='CLIENT_FOURNISSEUR')).count(),
            'fournisseurs': queryset.filter(Q(type_tiers='FOURNISSEUR') | Q(type_tiers='CLIENT_FOURNISSEUR')).count(),
            'actifs': queryset.filter(statut='ACTIF').count(),
            'bloques': queryset.filter(statut='BLOQUE').count(),
            'encours_total_clients': queryset.filter(
                Q(type_tiers='CLIENT') | Q(type_tiers='CLIENT_FOURNISSEUR')
            ).aggregate(total=Sum('encours_actuel'))['total'] or 0,
        }

        return Response(stats)

    @action(detail=True, methods=['post'])
    def bloquer(self, request, pk=None):
        """Bloquer un tiers"""
        tiers = self.get_object()
        motif = request.data.get('motif', 'Non spécifié')

        tiers.statut = 'BLOQUE'
        tiers.motif_blocage = motif
        tiers.bloque_par = request.user
        tiers.save()

        return Response({
            'success': True,
            'message': f'Tiers {tiers.code} bloqué avec succès'
        })

    @action(detail=True, methods=['post'])
    def debloquer(self, request, pk=None):
        """Débloquer un tiers"""
        tiers = self.get_object()

        tiers.statut = 'ACTIF'
        tiers.motif_blocage = None
        tiers.date_blocage = None
        tiers.bloque_par = None
        tiers.save()

        return Response({
            'success': True,
            'message': f'Tiers {tiers.code} débloqué avec succès'
        })

    @action(detail=True, methods=['get'])
    def balance(self, request, pk=None):
        """Solde du tiers"""
        tiers = self.get_object()
        tiers.update_encours()

        return Response({
            'code': tiers.code,
            'raison_sociale': tiers.raison_sociale,
            'encours_actuel': float(tiers.encours_actuel),
            'limite_credit': float(tiers.limite_credit),
            'disponible': float(tiers.disponible_credit),
            'score_credit': tiers.score_credit
        })


class AdresseTiersViewSet(viewsets.ModelViewSet):
    """ViewSet pour les adresses des tiers"""
    queryset = AdresseTiers.objects.all()
    serializer_class = AdresseTiersSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['tiers', 'type_adresse', 'is_active']

    def get_queryset(self):
        queryset = super().get_queryset()
        tiers_id = self.request.query_params.get('tiers_id')
        if tiers_id:
            queryset = queryset.filter(tiers_id=tiers_id)
        return queryset


class ContactTiersViewSet(viewsets.ModelViewSet):
    """ViewSet pour les contacts des tiers"""
    queryset = ContactTiers.objects.all()
    serializer_class = ContactTiersSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['nom', 'prenom', 'email']
    filterset_fields = ['tiers', 'fonction', 'is_active', 'is_principal']

    def get_queryset(self):
        queryset = super().get_queryset()
        tiers_id = self.request.query_params.get('tiers_id')
        if tiers_id:
            queryset = queryset.filter(tiers_id=tiers_id)
        return queryset


class CategorieAnalytiqueViewSet(viewsets.ModelViewSet):
    """ViewSet pour les catégories analytiques"""
    queryset = CategorieAnalytique.objects.all()
    serializer_class = CategorieAnalytiqueSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    search_fields = ['code', 'libelle']
    filterset_fields = ['societe', 'is_active']
