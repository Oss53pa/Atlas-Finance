from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from django.db.models import Sum, Count, Q
from datetime import datetime, timedelta
from .models import Exercise, ClotureMensuelle, ClotureAnnuelle, HistoriqueCloture
from .serializers import (
    ExerciseSerializer, ClotureMensuelleSerializer,
    ClotureAnnuelleSerializer, HistoriqueClotureSerializer
)


class ClotureMensuelleViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des clôtures mensuelles"""
    queryset = ClotureMensuelle.objects.all()
    serializer_class = ClotureMensuelleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        exercice_id = self.request.query_params.get('exercice', None)
        if exercice_id:
            queryset = queryset.filter(exercice_id=exercice_id)
        return queryset

    @action(detail=True, methods=['post'])
    def demarrer(self, request, pk=None):
        """Démarre le processus de clôture mensuelle"""
        cloture = self.get_object()

        if cloture.statut not in ['en_attente', 'annulee']:
            return Response(
                {'error': 'Cette clôture ne peut pas être démarrée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cloture.statut = 'en_cours'
        cloture.date_ouverture = timezone.now()
        cloture.save()

        # Créer un historique
        HistoriqueCloture.objects.create(
            type_cloture='mensuelle',
            cloture_mensuelle=cloture,
            action='Démarrage',
            description=f'Démarrage de la clôture mensuelle {cloture}',
            utilisateur=request.user
        )

        return Response({'message': 'Clôture démarrée avec succès'})

    @action(detail=True, methods=['post'])
    def valider_etape(self, request, pk=None):
        """Valide une étape de la clôture"""
        cloture = self.get_object()
        etape = request.data.get('etape')

        if not etape:
            return Response(
                {'error': 'Étape non spécifiée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Valider l'étape
        if hasattr(cloture, etape):
            setattr(cloture, etape, True)
            cloture.save()

            # Créer un historique
            HistoriqueCloture.objects.create(
                type_cloture='mensuelle',
                cloture_mensuelle=cloture,
                action=f'Validation étape: {etape}',
                description=f'Étape {etape} validée',
                utilisateur=request.user
            )

            # Vérifier si toutes les étapes sont complètes
            if cloture.get_progression() == 100:
                cloture.statut = 'validation'
                cloture.save()

            return Response({
                'message': f'Étape {etape} validée',
                'progression': cloture.get_progression()
            })

        return Response(
            {'error': 'Étape invalide'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def cloturer(self, request, pk=None):
        """Finalise la clôture mensuelle"""
        cloture = self.get_object()

        if cloture.statut != 'validation':
            return Response(
                {'error': 'La clôture doit être validée avant finalisation'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if cloture.get_progression() < 100:
            return Response(
                {'error': 'Toutes les étapes doivent être complétées'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cloture.statut = 'cloturee'
        cloture.date_cloture = timezone.now()
        cloture.valide_par = request.user
        cloture.save()

        # Créer un historique
        HistoriqueCloture.objects.create(
            type_cloture='mensuelle',
            cloture_mensuelle=cloture,
            action='Clôture finalisée',
            description=f'Clôture mensuelle {cloture} finalisée',
            utilisateur=request.user
        )

        return Response({'message': 'Clôture finalisée avec succès'})

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """Retourne les statistiques pour le dashboard"""
        exercice_id = request.query_params.get('exercice')

        if not exercice_id:
            return Response(
                {'error': 'Exercice non spécifié'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Récupérer les clôtures de l'exercice
        clotures = ClotureMensuelle.objects.filter(exercice_id=exercice_id)

        # Calculer les statistiques
        stats = {
            'total': clotures.count(),
            'cloturees': clotures.filter(statut='cloturee').count(),
            'en_cours': clotures.filter(statut__in=['en_cours', 'validation']).count(),
            'en_attente': clotures.filter(statut='en_attente').count(),
            'progression_moyenne': 0,
            'derniere_cloture': None
        }

        # Progression moyenne
        if clotures.exists():
            progressions = [c.get_progression() for c in clotures]
            stats['progression_moyenne'] = sum(progressions) / len(progressions)

        # Dernière clôture
        derniere = clotures.filter(statut='cloturee').order_by('-date_cloture').first()
        if derniere:
            stats['derniere_cloture'] = {
                'mois': derniere.mois,
                'annee': derniere.annee,
                'date': derniere.date_cloture
            }

        return Response(stats)


class ClotureAnnuelleViewSet(viewsets.ModelViewSet):
    """ViewSet pour la gestion des clôtures annuelles"""
    queryset = ClotureAnnuelle.objects.all()
    serializer_class = ClotureAnnuelleSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def demarrer(self, request, pk=None):
        """Démarre le processus de clôture annuelle"""
        cloture = self.get_object()

        if cloture.statut != 'preparation':
            return Response(
                {'error': 'Cette clôture a déjà été démarrée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Vérifier que toutes les clôtures mensuelles sont terminées
        clotures_mensuelles = ClotureMensuelle.objects.filter(exercice=cloture.exercice)
        non_cloturees = clotures_mensuelles.exclude(statut='cloturee').count()

        if non_cloturees > 0:
            return Response(
                {'error': f'{non_cloturees} clôtures mensuelles non terminées'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cloture.statut = 'inventaire'
        cloture.date_debut_cloture = timezone.now()
        cloture.responsable_cloture = request.user
        cloture.save()

        # Créer un historique
        HistoriqueCloture.objects.create(
            type_cloture='annuelle',
            cloture_annuelle=cloture,
            action='Démarrage',
            description=f'Démarrage de la clôture annuelle {cloture.exercice.code}',
            utilisateur=request.user
        )

        return Response({'message': 'Clôture annuelle démarrée'})

    @action(detail=True, methods=['post'])
    def valider_etape(self, request, pk=None):
        """Valide une étape de la clôture annuelle"""
        cloture = self.get_object()
        etape = request.data.get('etape')

        if not etape:
            return Response(
                {'error': 'Étape non spécifiée'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Valider l'étape
        if hasattr(cloture, etape):
            setattr(cloture, etape, True)

            # Mettre à jour le statut selon l'étape
            if etape == 'inventaire_physique':
                cloture.statut = 'regularisation'
                cloture.date_inventaire = timezone.now().date()
            elif etape == 'ecritures_regularisation':
                cloture.statut = 'provisionnement'
            elif etape == 'provisions_fin_exercice':
                cloture.statut = 'amortissement'
            elif etape == 'amortissements_fin_exercice':
                cloture.statut = 'controle'
            elif etape == 'controle_coherence':
                cloture.statut = 'validation'
            elif etape == 'audit_trail_complete':
                cloture.statut = 'generation_etats'

            cloture.save()

            # Créer un historique
            HistoriqueCloture.objects.create(
                type_cloture='annuelle',
                cloture_annuelle=cloture,
                action=f'Validation: {etape}',
                description=f'Étape {etape} validée',
                utilisateur=request.user
            )

            return Response({
                'message': f'Étape {etape} validée',
                'statut': cloture.statut,
                'progression': cloture.get_progression()
            })

        return Response(
            {'error': 'Étape invalide'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def generer_etats(self, request, pk=None):
        """Génère les états financiers"""
        cloture = self.get_object()

        if cloture.statut != 'generation_etats':
            return Response(
                {'error': 'La clôture doit être en phase de génération des états'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Simuler la génération des états (ici vous intégreriez la vraie logique)
        cloture.bilan_genere = True
        cloture.compte_resultat_genere = True
        cloture.tafire_genere = True
        cloture.annexes_generees = True

        # Calculer les totaux (simulation)
        cloture.resultat_net = 535000
        cloture.total_actif = 5670000
        cloture.total_passif = 5670000
        cloture.capitaux_propres = 3250000

        cloture.save()

        # Créer un historique
        HistoriqueCloture.objects.create(
            type_cloture='annuelle',
            cloture_annuelle=cloture,
            action='Génération états',
            description='États financiers SYSCOHADA générés',
            utilisateur=request.user
        )

        return Response({
            'message': 'États financiers générés',
            'etats': {
                'bilan': cloture.bilan_genere,
                'compte_resultat': cloture.compte_resultat_genere,
                'tafire': cloture.tafire_genere,
                'annexes': cloture.annexes_generees
            }
        })

    @action(detail=True, methods=['post'])
    def cloturer_definitivement(self, request, pk=None):
        """Clôture définitive de l'exercice"""
        cloture = self.get_object()

        if cloture.get_progression() < 100:
            return Response(
                {'error': 'Toutes les étapes doivent être complétées'},
                status=status.HTTP_400_BAD_REQUEST
            )

        cloture.statut = 'cloturee'
        cloture.date_arrete_comptes = timezone.now().date()
        cloture.save()

        # Mettre à jour l'exercice
        exercice = cloture.exercice
        exercice.statut = 'cloture'
        exercice.save()

        # Créer un historique
        HistoriqueCloture.objects.create(
            type_cloture='annuelle',
            cloture_annuelle=cloture,
            action='Clôture définitive',
            description=f'Exercice {exercice.code} clôturé définitivement',
            utilisateur=request.user
        )

        return Response({
            'message': 'Exercice clôturé définitivement',
            'exercice': exercice.code,
            'resultat_net': str(cloture.resultat_net)
        })

    @action(detail=False, methods=['get'])
    def statistiques(self, request):
        """Retourne les statistiques des clôtures annuelles"""
        stats = {
            'total': ClotureAnnuelle.objects.count(),
            'en_cours': ClotureAnnuelle.objects.exclude(
                statut__in=['cloturee', 'archivee', 'preparation']
            ).count(),
            'cloturees': ClotureAnnuelle.objects.filter(statut='cloturee').count(),
            'derniere_cloture': None,
            'prochaine_echeance': None
        }

        # Dernière clôture
        derniere = ClotureAnnuelle.objects.filter(
            statut='cloturee'
        ).order_by('-date_arrete_comptes').first()

        if derniere:
            stats['derniere_cloture'] = {
                'exercice': derniere.exercice.code,
                'date': derniere.date_arrete_comptes,
                'resultat_net': str(derniere.resultat_net)
            }

        # Prochaine échéance
        en_cours = ClotureAnnuelle.objects.exclude(
            statut__in=['cloturee', 'archivee']
        ).first()

        if en_cours:
            stats['prochaine_echeance'] = {
                'exercice': en_cours.exercice.code,
                'statut': en_cours.statut,
                'progression': en_cours.get_progression()
            }

        return Response(stats)