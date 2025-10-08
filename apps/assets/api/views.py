from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from decimal import Decimal
from datetime import date, datetime

from ..models import (
    Immobilisation, 
    PlanAmortissement, 
    EcritureAmortissement,
    CategorieImmobilisation,
    VirementPoste,
    Sortie,
    SortieComptable,
    Reparation,
    ReevaluationImmobilisation
)
from ..services.amortissement_service import AmortissementService
from ..serializers import (
    ImmobilisationSerializer,
    PlanAmortissementSerializer,
    EcritureAmortissementSerializer,
    CategorieImmobilisationSerializer,
    VirementPosteSerializer,
    SortieSerializer,
    SortieComptableSerializer,
    ReparationSerializer,
    ReevaluationImmobilisationSerializer,
    AmortissementSimulationSerializer,
    AmortissementCalculResultSerializer
)


class CategorieImmobilisationViewSet(viewsets.ModelViewSet):
    queryset = CategorieImmobilisation.objects.all()
    serializer_class = CategorieImmobilisationSerializer
    permission_classes = [IsAuthenticated]


class ImmobilisationViewSet(viewsets.ModelViewSet):
    queryset = Immobilisation.objects.all().select_related(
        'categorie', 'compte_immobilisation', 'compte_amortissement', 
        'fournisseur', 'localisatiom', 'responsable'
    ).prefetch_related('plan_amortissements', 'ecritures_amortissement')
    serializer_class = ImmobilisationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filtres
        categorie = self.request.query_params.get('categorie')
        if categorie:
            queryset = queryset.filter(categorie_id=categorie)
            
        statut = self.request.query_params.get('statut')
        if statut:
            queryset = queryset.filter(statut=statut)
            
        date_acquisition_debut = self.request.query_params.get('date_acquisition_debut')
        if date_acquisition_debut:
            queryset = queryset.filter(date_acquisition__gte=date_acquisition_debut)
            
        date_acquisition_fin = self.request.query_params.get('date_acquisition_fin')
        if date_acquisition_fin:
            queryset = queryset.filter(date_acquisition__lte=date_acquisition_fin)
            
        return queryset

    @action(detail=True, methods=['post'])
    def calculer_amortissement(self, request, pk=None):
        immobilisation = self.get_object()
        service = AmortissementService()
        
        try:
            result = service.calculer_amortissement(immobilisation)
            serializer = AmortissementCalculResultSerializer(result)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Erreur lors du calcul d\'amortissement: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def simuler_amortissement(self, request, pk=None):
        immobilisation = self.get_object()
        service = AmortissementService()
        
        data = request.data
        methode = data.get('methode')
        duree_annees = data.get('duree_annees')
        
        if methode:
            immobilisation.methode_amortissement = methode
        if duree_annees:
            immobilisation.duree_amortissement_annees = duree_annees
            
        try:
            simulation = service.simuler_amortissement(
                immobilisation,
                methode_alternative=methode,
                duree_alternative=duree_annees
            )
            serializer = AmortissementSimulationSerializer(simulation)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la simulation: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def generer_ecritures(self, request, pk=None):
        immobilisation = self.get_object()
        service = AmortissementService()
        
        exercice = request.data.get('exercice', date.today().year)
        
        try:
            with transaction.atomic():
                ecritures = service.generer_ecritures_amortissement(immobilisation, exercice)
                serializer = EcritureAmortissementSerializer(ecritures, many=True)
                return Response({
                    'message': f'{len(ecritures)} écriture(s) générée(s)',
                    'ecritures': serializer.data
                })
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la génération des écritures: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['get'])
    def tableau_amortissement(self, request, pk=None):
        immobilisation = self.get_object()
        service = AmortissementService()
        
        try:
            tableau = service.generer_tableau_amortissement(immobilisation)
            return Response(tableau)
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la génération du tableau: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def reevaluer(self, request, pk=None):
        immobilisation = self.get_object()
        data = request.data
        
        nouvelle_valeur = Decimal(str(data.get('nouvelle_valeur')))
        methode_reevaluation = data.get('methode_reevaluation')
        commentaire = data.get('commentaire', '')
        
        try:
            with transaction.atomic():
                reevaluation = ReevaluationImmobilisation.objects.create(
                    immobilisation=immobilisation,
                    ancienne_valeur=immobilisation.valeur_acquisition,
                    nouvelle_valeur=nouvelle_valeur,
                    methode_reevaluation=methode_reevaluation,
                    commentaire=commentaire,
                    date_reevaluation=date.today(),
                    utilisateur=request.user
                )
                
                # Mettre à jour l'immobilisation
                immobilisation.valeur_acquisition = nouvelle_valeur
                immobilisation.save()
                
                # Recalculer les amortissements
                service = AmortissementService()
                service.calculer_amortissement(immobilisation)
                
                serializer = ReevaluationImmobilisationSerializer(reevaluation)
                return Response(serializer.data)
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de la réévaluation: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PlanAmortissementViewSet(viewsets.ModelViewSet):
    queryset = PlanAmortissement.objects.all().select_related('immobilisation')
    serializer_class = PlanAmortissementSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        immobilisation_id = self.request.query_params.get('immobilisation')
        if immobilisation_id:
            queryset = queryset.filter(immobilisation_id=immobilisation_id)
        return queryset


class EcritureAmortissementViewSet(viewsets.ModelViewSet):
    queryset = EcritureAmortissement.objects.all().select_related('immobilisation')
    serializer_class = EcritureAmortissementSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        immobilisation_id = self.request.query_params.get('immobilisation')
        if immobilisation_id:
            queryset = queryset.filter(immobilisation_id=immobilisation_id)
            
        exercice = self.request.query_params.get('exercice')
        if exercice:
            queryset = queryset.filter(exercice=exercice)
            
        return queryset


class VirementPosteViewSet(viewsets.ModelViewSet):
    queryset = VirementPoste.objects.all().select_related(
        'immobilisation', 'ancien_compte', 'nouveau_compte'
    )
    serializer_class = VirementPosteSerializer
    permission_classes = [IsAuthenticated]


class SortieViewSet(viewsets.ModelViewSet):
    queryset = Sortie.objects.all().select_related('immobilisation')
    serializer_class = SortieSerializer
    permission_classes = [IsAuthenticated]


class SortieComptableViewSet(viewsets.ModelViewSet):
    queryset = SortieComptable.objects.all().select_related('sortie', 'compte_credit', 'compte_debit')
    serializer_class = SortieComptableSerializer
    permission_classes = [IsAuthenticated]


class ReparationViewSet(viewsets.ModelViewSet):
    queryset = Reparation.objects.all().select_related('immobilisation', 'fournisseur')
    serializer_class = ReparationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = super().get_queryset()
        immobilisation_id = self.request.query_params.get('immobilisation')
        if immobilisation_id:
            queryset = queryset.filter(immobilisation_id=immobilisation_id)
        return queryset


class ReevaluationImmobilisationViewSet(viewsets.ModelViewSet):
    queryset = ReevaluationImmobilisation.objects.all().select_related('immobilisation', 'utilisateur')
    serializer_class = ReevaluationImmobilisationSerializer
    permission_classes = [IsAuthenticated]