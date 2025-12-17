"""
Vues pour le module fiscalité et conformité OHADA.
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, F, Sum, Count
from django.utils import timezone
from datetime import datetime, date, timedelta
from decimal import Decimal
import logging

from .models import (
    RegimeFiscal, TypeDeclaration, DeclarationFiscale, 
    LigneDeclaration, EvenementFiscal, ObligationFiscale,
    PlanificationDeclaration, ControlesFiscaux, DocumentFiscal, AlerteFiscale
)
from .serializers import (
    RegimeFiscalSerializer, TypeDeclarationSerializer, DeclarationFiscaleSerializer,
    LigneDeclarationSerializer, EvenementFiscalSerializer, ObligationFiscaleSerializer,
    PlanificationDeclarationSerializer, ControlesFiscauxSerializer, DocumentFiscalSerializer,
    AlerteFiscaleSerializer, DeclarationCreateSerializer
)
from .services.taxation_service import TaxationService
from rest_framework.permissions import IsAuthenticated
from ..core.permissions import IsCompanyMember
from ..core.views import BaseCompanyViewSet

logger = logging.getLogger(__name__)


class RegimeFiscalViewSet(BaseCompanyViewSet):
    """ViewSet pour la gestion des régimes fiscaux."""
    queryset = RegimeFiscal.objects.all()
    serializer_class = RegimeFiscalSerializer
    permission_classes = [IsAuthenticated, IsCompanyMember]
    
    def get_queryset(self):
        return super().get_queryset().filter(
            societe=self.get_company()
        ).order_by('-date_debut_validite')
    
    @action(detail=False, methods=['get'])
    def actif(self, request):
        """Récupère le régime fiscal actif."""
        regime = self.get_queryset().filter(is_active=True).first()
        if regime:
            serializer = self.get_serializer(regime)
            return Response(serializer.data)
        return Response({'detail': 'Aucun régime fiscal actif'}, status=404)
    
    @action(detail=True, methods=['post'])
    def activer(self, request, pk=None):
        """Active un régime fiscal."""
        regime = self.get_object()
        
        # Désactiver tous les autres régimes
        self.get_queryset().update(is_active=False)
        
        # Activer le régime sélectionné
        regime.is_active = True
        regime.save()
        
        serializer = self.get_serializer(regime)
        return Response(serializer.data)


class TypeDeclarationViewSet(BaseCompanyViewSet):
    """ViewSet pour les types de déclarations fiscales."""
    queryset = TypeDeclaration.objects.all()
    serializer_class = TypeDeclarationSerializer
    permission_classes = [IsAuthenticated, IsCompanyMember]
    filterset_fields = ['frequence', 'statut', 'is_active']
    search_fields = ['code', 'libelle', 'description']
    ordering_fields = ['ordre_affichage', 'libelle']
    
    @action(detail=False, methods=['get'])
    def obligatoires(self, request):
        """Récupère les déclarations obligatoires pour la société."""
        company = self.get_company()
        regime_fiscal = RegimeFiscal.objects.filter(societe=company, is_active=True).first()
        
        if not regime_fiscal:
            return Response({'detail': 'Aucun régime fiscal actif'}, status=400)
        
        declarations = regime_fiscal.declarations_obligatoires
        types_declarations = self.queryset.filter(code__in=declarations, is_active=True)
        serializer = self.get_serializer(types_declarations, many=True)
        return Response(serializer.data)


class DeclarationFiscaleViewSet(BaseCompanyViewSet):
    """ViewSet pour les déclarations fiscales."""
    queryset = DeclarationFiscale.objects.all()
    serializer_class = DeclarationFiscaleSerializer
    permission_classes = [IsAuthenticated, IsCompanyMember]
    filterset_fields = ['type_declaration', 'exercice', 'statut']
    search_fields = ['numero_declaration', 'reference_administration']
    ordering_fields = ['-date_limite_depot', '-created_at']
    
    def get_queryset(self):
        return super().get_queryset().filter(
            societe=self.get_company()
        ).select_related('type_declaration', 'regime_fiscal')
    
    def get_serializer_class(self):
        if self.action == 'create':
            return DeclarationCreateSerializer
        return super().get_serializer_class()
    
    @action(detail=False, methods=['get'])
    def dashboard_stats(self, request):
        """Statistiques pour le dashboard des déclarations."""
        queryset = self.get_queryset()
        
        # Statistiques générales
        total_declarations = queryset.count()
        total_amount = queryset.aggregate(total=Sum('montant_impot'))['total'] or 0
        total_paid = queryset.aggregate(total=Sum('acompte_verse'))['total'] or 0
        pending_amount = total_amount - total_paid
        
        # Déclarations en retard
        overdue_declarations = queryset.filter(
            date_limite_depot__lt=date.today(),
            statut__in=['BROUILLON', 'EN_COURS', 'VALIDEE']
        ).count()
        
        # Par statut
        by_status = {}
        for status_choice in DeclarationFiscale.STATUT_CHOICES:
            status_code = status_choice[0]
            count = queryset.filter(statut=status_code).count()
            by_status[status_code] = count
        
        # Évolution mensuelle (12 derniers mois)
        monthly_evolution = []
        for i in range(12):
            month_date = date.today().replace(day=1) - timedelta(days=30 * i)
            count = queryset.filter(
                periode_debut__year=month_date.year,
                periode_debut__month=month_date.month
            ).count()
            monthly_evolution.append({
                'month': month_date.strftime('%Y-%m'),
                'count': count
            })
        
        return Response({
            'total_declarations': total_declarations,
            'total_amount': float(total_amount),
            'total_paid': float(total_paid),
            'pending_amount': float(pending_amount),
            'overdue_count': overdue_declarations,
            'by_status': by_status,
            'monthly_evolution': list(reversed(monthly_evolution))
        })
    
    @action(detail=False, methods=['post'])
    def generer_automatique(self, request):
        """Génère automatiquement une déclaration."""
        serializer = DeclarationCreateSerializer(data=request.data)
        if serializer.is_valid():
            company = self.get_company()
            service = TaxationService(company)
            
            try:
                declaration = service.generer_declaration_automatique(
                    type_declaration_id=serializer.validated_data['type_declaration'].id,
                    periode_debut=serializer.validated_data['periode_debut'],
                    periode_fin=serializer.validated_data['periode_fin'],
                    exercice=serializer.validated_data['exercice']
                )
                
                response_serializer = DeclarationFiscaleSerializer(declaration)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)
            
            except Exception as e:
                logger.error(f"Erreur génération déclaration: {str(e)}")
                return Response(
                    {'detail': f'Erreur lors de la génération: {str(e)}'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        """Valide une déclaration."""
        declaration = self.get_object()
        
        if declaration.statut != 'EN_COURS':
            return Response(
                {'detail': 'Seules les déclarations en cours peuvent être validées'}, 
                status=400
            )
        
        declaration.statut = 'VALIDEE'
        declaration.date_validation = timezone.now()
        declaration.valide_par = request.user
        declaration.save()
        
        serializer = self.get_serializer(declaration)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def transmettre(self, request, pk=None):
        """Transmet une déclaration à l'administration."""
        declaration = self.get_object()
        
        if declaration.statut != 'VALIDEE':
            return Response(
                {'detail': 'Seules les déclarations validées peuvent être transmises'}, 
                status=400
            )
        
        # Ici on intégrerait l'API de télédéclaration
        # Pour l'instant, on simule la transmission
        declaration.statut = 'TRANSMISE'
        declaration.date_transmission = timezone.now()
        declaration.transmise_par = request.user
        declaration.reference_administration = f"ADM-{declaration.numero_declaration}-{timezone.now().strftime('%Y%m%d')}"
        declaration.save()
        
        # Créer un événement fiscal
        EvenementFiscal.objects.create(
            societe=declaration.societe,
            type_evenement='TRANSMISSION_DECLARATION',
            date_evenement=date.today(),
            date_effet_fiscal=date.today(),
            libelle=f'Transmission déclaration {declaration.numero_declaration}',
            description=f'Déclaration {declaration.type_declaration.libelle} transmise avec succès'
        )
        
        serializer = self.get_serializer(declaration)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def export_pdf(self, request, pk=None):
        """Exporte une déclaration en PDF."""
        declaration = self.get_object()
        
        # Ici on génèrerait le PDF de la déclaration
        # Pour l'instant, on retourne l'URL de téléchargement
        return Response({
            'download_url': f'/api/taxation/declarations/{pk}/pdf/',
            'filename': f'{declaration.numero_declaration}.pdf'
        })


class LigneDeclarationViewSet(BaseCompanyViewSet):
    """ViewSet pour les lignes de déclarations."""
    queryset = LigneDeclaration.objects.all()
    serializer_class = LigneDeclarationSerializer
    permission_classes = [IsAuthenticated, IsCompanyMember]
    
    def get_queryset(self):
        return super().get_queryset().filter(
            declaration__societe=self.get_company()
        ).select_related('declaration', 'compte')


class ObligationFiscaleViewSet(BaseCompanyViewSet):
    """ViewSet pour les obligations fiscales."""
    queryset = ObligationFiscale.objects.all()
    serializer_class = ObligationFiscaleSerializer
    permission_classes = [IsAuthenticated, IsCompanyMember]
    filterset_fields = ['statut', 'type_declaration']
    
    def get_queryset(self):
        return super().get_queryset().filter(
            societe=self.get_company()
        ).select_related('type_declaration', 'regime_fiscal', 'responsable')
    
    @action(detail=False, methods=['get'])
    def echeances_prochaines(self, request):
        """Récupère les prochaines échéances fiscales."""
        company = self.get_company()
        
        # Récupérer les obligations actives
        obligations = self.get_queryset().filter(statut='ACTIVE')
        
        echeances = []
        for obligation in obligations:
            prochaines_echeances = obligation.generer_prochaines_echeances(6)  # 6 prochaines échéances
            
            for date_echeance in prochaines_echeances[:3]:  # Limiter à 3 par obligation
                echeances.append({
                    'obligation_id': obligation.id,
                    'type_declaration': obligation.type_declaration.libelle,
                    'date_echeance': date_echeance,
                    'jours_restants': (date_echeance - date.today()).days,
                    'responsable': obligation.responsable.username if obligation.responsable else None
                })
        
        # Trier par date d'échéance
        echeances.sort(key=lambda x: x['date_echeance'])
        
        return Response(echeances[:10])  # Top 10 des prochaines échéances


class AlerteFiscaleViewSet(BaseCompanyViewSet):
    """ViewSet pour les alertes fiscales."""
    queryset = AlerteFiscale.objects.all()
    serializer_class = AlerteFiscaleSerializer
    permission_classes = [IsAuthenticated, IsCompanyMember]
    filterset_fields = ['type_alerte', 'niveau', 'statut']
    ordering = ['-date_creation']
    
    def get_queryset(self):
        return super().get_queryset().filter(
            societe=self.get_company()
        )
    
    @action(detail=False, methods=['get'])
    def non_lues(self, request):
        """Récupère les alertes non lues."""
        alertes = self.get_queryset().filter(statut='ACTIVE')[:5]
        serializer = self.get_serializer(alertes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def acquitter(self, request, pk=None):
        """Acquitte une alerte."""
        alerte = self.get_object()
        alerte.statut = 'ACQUITTEE'
        alerte.date_acquittement = timezone.now()
        alerte.acquittee_par = request.user
        alerte.save()
        
        serializer = self.get_serializer(alerte)
        return Response(serializer.data)


class ControlesFiscauxViewSet(BaseCompanyViewSet):
    """ViewSet pour les contrôles fiscaux."""
    queryset = ControlesFiscaux.objects.all()
    serializer_class = ControlesFiscauxSerializer
    permission_classes = [IsAuthenticated, IsCompanyMember]
    filterset_fields = ['type_controle', 'statut']
    search_fields = ['numero_controle', 'service_controleur']
    ordering = ['-date_debut_controle']
    
    def get_queryset(self):
        return super().get_queryset().filter(
            societe=self.get_company()
        )


class DocumentFiscalViewSet(BaseCompanyViewSet):
    """ViewSet pour les documents fiscaux."""
    queryset = DocumentFiscal.objects.all()
    serializer_class = DocumentFiscalSerializer
    permission_classes = [IsAuthenticated, IsCompanyMember]
    filterset_fields = ['type_document', 'confidentiel']
    search_fields = ['nom_document', 'numero_reference']
    ordering = ['-date_document']
    
    def get_queryset(self):
        return super().get_queryset().filter(
            societe=self.get_company()
        )


class EvenementFiscalViewSet(BaseCompanyViewSet):
    """ViewSet pour les événements fiscaux."""
    queryset = EvenementFiscal.objects.all()
    serializer_class = EvenementFiscalSerializer
    permission_classes = [IsAuthenticated, IsCompanyMember]
    filterset_fields = ['type_evenement', 'traite']
    ordering = ['-date_evenement']
    
    def get_queryset(self):
        return super().get_queryset().filter(
            societe=self.get_company()
        )
    
    @action(detail=True, methods=['post'])
    def marquer_traite(self, request, pk=None):
        """Marque un événement comme traité."""
        evenement = self.get_object()
        evenement.traite = True
        evenement.date_traitement = timezone.now()
        evenement.traite_par = request.user
        evenement.save()
        
        serializer = self.get_serializer(evenement)
        return Response(serializer.data)


class TaxationAnalyticsViewSet(BaseCompanyViewSet):
    """ViewSet pour les analyses fiscales."""
    permission_classes = [IsAuthenticated, IsCompanyMember]
    
    @action(detail=False, methods=['get'])
    def rapport_conformite(self, request):
        """Génère un rapport de conformité fiscale."""
        company = self.get_company()
        service = TaxationService(company)
        
        # Paramètres de période (par défaut: année en cours)
        annee = int(request.query_params.get('annee', date.today().year))
        periode_debut = date(annee, 1, 1)
        periode_fin = date(annee, 12, 31)
        
        try:
            rapport = service.generer_rapport_conformite(periode_debut, periode_fin)
            return Response(rapport)
        except Exception as e:
            logger.error(f"Erreur génération rapport conformité: {str(e)}")
            return Response(
                {'detail': f'Erreur lors de la génération du rapport: {str(e)}'}, 
                status=400
            )
    
    @action(detail=False, methods=['get'])
    def detecter_anomalies(self, request):
        """Détecte les anomalies fiscales."""
        company = self.get_company()
        service = TaxationService(company)
        
        # Paramètres de période (par défaut: 3 derniers mois)
        periode_fin = date.today()
        periode_debut = periode_fin - timedelta(days=90)
        
        try:
            anomalies = service.detecter_anomalies_fiscales(periode_debut, periode_fin)
            return Response(anomalies)
        except Exception as e:
            logger.error(f"Erreur détection anomalies: {str(e)}")
            return Response(
                {'detail': f'Erreur lors de la détection: {str(e)}'}, 
                status=400
            )
    
    @action(detail=False, methods=['get'])
    def obligations_fiscales(self, request):
        """Vérifie les obligations fiscales."""
        company = self.get_company()
        service = TaxationService(company)
        
        try:
            obligations = service.verifier_obligations_fiscales()
            return Response(obligations)
        except Exception as e:
            logger.error(f"Erreur vérification obligations: {str(e)}")
            return Response(
                {'detail': f'Erreur lors de la vérification: {str(e)}'}, 
                status=400
            )