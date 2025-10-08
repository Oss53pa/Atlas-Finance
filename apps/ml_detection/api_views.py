"""
API REST pour l'apprentissage automatique et l'inférence
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from decimal import Decimal

from .models import ModeleML, DetectionAnomalie, CampagneEntrainement, StatistiqueDetection
from .tasks import train_model_task, detect_model_drift
from .services.lstm_service import LSTMService
from .services.random_forest_service import RandomForestService
from .services.xgboost_service import XGBoostService

logger = logging.getLogger(__name__)


class ModeleMLViewSet(viewsets.ModelViewSet):
    """
    API pour gérer les modèles ML
    """
    queryset = ModeleML.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtre par société de l'utilisateur"""
        if hasattr(self.request.user, 'societe'):
            return self.queryset.filter(societe=self.request.user.societe)
        return self.queryset.none()

    @action(detail=True, methods=['post'])
    def train(self, request, pk=None):
        """
        Lance l'entraînement d'un modèle

        POST /api/ml/modeles/{id}/train/
        """
        modele = self.get_object()

        try:
            # Lance l'entraînement en tâche asynchrone
            task = train_model_task.delay(modele.id)

            return Response({
                'success': True,
                'message': f"Entraînement du modèle '{modele.nom}' démarré",
                'task_id': task.id,
                'modele_id': modele.id
            }, status=status.HTTP_202_ACCEPTED)

        except Exception as e:
            logger.error(f"Erreur lancement entraînement: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'])
    def predict(self, request, pk=None):
        """
        Effectue des prédictions avec un modèle

        POST /api/ml/modeles/{id}/predict/
        Body: { "data": [...] }
        """
        modele = self.get_object()

        if modele.statut != 'PRET':
            return Response({
                'success': False,
                'error': f"Modèle non prêt (statut: {modele.statut})"
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            import pandas as pd

            # Récupère les données depuis le body
            data = request.data.get('data')
            if not data:
                return Response({
                    'success': False,
                    'error': 'Aucune donnée fournie'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Convertit en DataFrame
            X = pd.DataFrame(data)

            # Sélectionne le service approprié
            if modele.type_modele == 'LSTM':
                service = LSTMService(modele)
            elif modele.type_modele == 'RANDOM_FOREST':
                service = RandomForestService(modele)
            elif modele.type_modele in ['XGBOOST', 'GRADIENT_BOOSTING']:
                service = XGBoostService(modele)
            else:
                return Response({
                    'success': False,
                    'error': f"Type de modèle non supporté: {modele.type_modele}"
                }, status=status.HTTP_400_BAD_REQUEST)

            # Charge le modèle
            model_path = f"ml_models/{modele.societe_id}/{modele.id}/model_latest.pkl"
            if not service.load_model(model_path):
                return Response({
                    'success': False,
                    'error': 'Erreur chargement du modèle'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Effectue la prédiction
            predictions = service.predict(X)

            # Met à jour les statistiques
            modele.nombre_predictions += len(predictions)
            modele.derniere_utilisation = timezone.now()
            modele.save()

            return Response({
                'success': True,
                'predictions': predictions.tolist(),
                'model_info': {
                    'nom': modele.nom,
                    'type': modele.type_modele,
                    'accuracy': float(modele.score_performance) if modele.score_performance else None,
                    'last_trained': modele.date_entrainement.isoformat() if modele.date_entrainement else None
                }
            })

        except Exception as e:
            logger.error(f"Erreur prédiction: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def performance(self, request, pk=None):
        """
        Récupère les performances d'un modèle

        GET /api/ml/modeles/{id}/performance/
        """
        modele = self.get_object()

        try:
            # Statistiques récentes
            stats_recent = StatistiqueDetection.objects.filter(
                modele=modele,
                periode='JOUR'
            ).order_by('-date_periode')[:30]

            performance_data = {
                'modele': {
                    'id': modele.id,
                    'nom': modele.nom,
                    'type': modele.type_modele,
                    'statut': modele.statut,
                    'accuracy': float(modele.score_performance) if modele.score_performance else None,
                    'last_trained': modele.date_entrainement.isoformat() if modele.date_entrainement else None,
                    'age_days': modele.age_jours,
                    'total_predictions': modele.nombre_predictions
                },
                'metrics': modele.metriques_evaluation,
                'statistics': [
                    {
                        'date': stat.date_periode.isoformat(),
                        'total_detections': stat.total_detections,
                        'false_positive_rate': float(stat.taux_faux_positifs),
                        'resolved': stat.detections_resolues
                    }
                    for stat in stats_recent
                ],
                'needs_retraining': modele.besoin_reentrainement,
                'next_retraining': modele.prochaine_reentrainement.isoformat() if modele.prochaine_reentrainement else None
            }

            return Response(performance_data)

        except Exception as e:
            logger.error(f"Erreur récupération performance: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'])
    def feature_importance(self, request, pk=None):
        """
        Récupère l'importance des features

        GET /api/ml/modeles/{id}/feature_importance/
        """
        modele = self.get_object()

        if modele.statut != 'PRET':
            return Response({
                'success': False,
                'error': 'Modèle non prêt'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Sélectionne le service
            if modele.type_modele == 'RANDOM_FOREST':
                service = RandomForestService(modele)
            elif modele.type_modele in ['XGBOOST', 'GRADIENT_BOOSTING']:
                service = XGBoostService(modele)
            else:
                return Response({
                    'success': False,
                    'error': 'Feature importance non disponible pour ce type de modèle'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Charge le modèle
            model_path = f"ml_models/{modele.societe_id}/{modele.id}/model_latest.pkl"
            if not service.load_model(model_path):
                return Response({
                    'success': False,
                    'error': 'Erreur chargement du modèle'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

            # Récupère l'importance
            importance = service.get_feature_importance()

            return Response({
                'success': True,
                'feature_importance': importance,
                'model_name': modele.nom
            })

        except Exception as e:
            logger.error(f"Erreur feature importance: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def dashboard(self, request):
        """
        Dashboard général des modèles ML

        GET /api/ml/modeles/dashboard/
        """
        try:
            modeles = self.get_queryset()

            dashboard_data = {
                'summary': {
                    'total_models': modeles.count(),
                    'active_models': modeles.filter(actif=True).count(),
                    'ready_models': modeles.filter(statut='PRET').count(),
                    'training_models': modeles.filter(statut='ENTRAINEMENT').count(),
                    'needs_retraining': sum(1 for m in modeles if m.besoin_reentrainement)
                },
                'models_by_type': {
                    type_code: modeles.filter(type_modele=type_code).count()
                    for type_code, _ in ModeleML.TYPES_MODELE
                },
                'recent_trainings': [
                    {
                        'modele_nom': camp.modele.nom,
                        'date': camp.date_fin.isoformat() if camp.date_fin else None,
                        'score': float(camp.score_final) if camp.score_final else None,
                        'improvement': float(camp.amelioration) if camp.amelioration else None
                    }
                    for camp in CampagneEntrainement.objects.filter(
                        modele__in=modeles,
                        statut='TERMINEE'
                    ).order_by('-date_fin')[:10]
                ]
            }

            return Response(dashboard_data)

        except Exception as e:
            logger.error(f"Erreur dashboard: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def detect_drift(self, request):
        """
        Lance la détection de drift sur tous les modèles

        POST /api/ml/modeles/detect_drift/
        """
        try:
            task = detect_model_drift.delay()

            return Response({
                'success': True,
                'message': 'Détection de drift lancée',
                'task_id': task.id
            }, status=status.HTTP_202_ACCEPTED)

        except Exception as e:
            logger.error(f"Erreur lancement détection drift: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DetectionAnomalieViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API pour consulter les détections d'anomalies
    """
    queryset = DetectionAnomalie.objects.all()
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        """Filtre par société"""
        if hasattr(self.request.user, 'societe'):
            return self.queryset.filter(societe=self.request.user.societe)
        return self.queryset.none()

    @action(detail=False, methods=['get'])
    def recent(self, request):
        """
        Récupère les détections récentes

        GET /api/ml/detections/recent/?days=7
        """
        try:
            days = int(request.query_params.get('days', 7))
            date_limite = timezone.now() - timezone.timedelta(days=days)

            detections = self.get_queryset().filter(
                date_anomalie__gte=date_limite
            ).order_by('-date_anomalie')[:100]

            data = [
                {
                    'id': det.id,
                    'titre': det.titre,
                    'type': det.type_anomalie,
                    'severite': det.niveau_severite,
                    'score': float(det.score_anomalie),
                    'date': det.date_anomalie.isoformat(),
                    'statut': det.statut,
                    'modele': det.modele.nom
                }
                for det in detections
            ]

            return Response({
                'success': True,
                'count': len(data),
                'detections': data
            })

        except Exception as e:
            logger.error(f"Erreur récupération détections: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)