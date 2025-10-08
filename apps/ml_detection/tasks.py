"""
Tâches Celery pour l'apprentissage automatique
"""
import logging
from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def train_model_task(self, modele_id: int, campagne_id: int = None):
    """
    Tâche d'entraînement d'un modèle ML

    Args:
        modele_id: ID du modèle à entraîner
        campagne_id: ID de la campagne d'entraînement (optionnel)
    """
    from .models import ModeleML, CampagneEntrainement
    from .services.lstm_service import LSTMService
    from .services.random_forest_service import RandomForestService
    from .services.xgboost_service import XGBoostService

    try:
        logger.info(f"Démarrage entraînement modèle ID: {modele_id}")

        # Récupère le modèle
        modele = ModeleML.objects.get(id=modele_id)
        modele.statut = 'ENTRAINEMENT'
        modele.save()

        # Récupère ou crée la campagne
        if campagne_id:
            campagne = CampagneEntrainement.objects.get(id=campagne_id)
        else:
            campagne = CampagneEntrainement.objects.create(
                societe=modele.societe,
                modele=modele,
                nom=f"Entraînement automatique {timezone.now().strftime('%Y-%m-%d %H:%M')}",
                type_campagne='REENTRAINEMENT',
                periode_donnees_debut=timezone.now().date() - timedelta(days=365),
                periode_donnees_fin=timezone.now().date(),
                strategie_echantillonnage='TEMPORAL'
            )

        campagne.statut = 'EN_COURS'
        campagne.date_debut = timezone.now()
        campagne.save()

        # Collecte les données d'entraînement
        X, y = collect_training_data(modele)

        if X is None or len(X) == 0:
            raise ValueError(f"Pas de données d'entraînement pour {modele.nom}")

        # Sélectionne le service approprié
        service = get_service_for_model(modele)
        service.modele = modele

        # Entraîne le modèle
        metrics = service.train(X, y)

        if 'error' in metrics:
            raise Exception(metrics['error'])

        # Met à jour le modèle et la campagne
        service.update_modele_django(campagne, metrics)

        # Sauvegarde le modèle sur disque
        model_path = f"ml_models/{modele.societe_id}/{modele.id}/model_latest.pkl"
        service.save_model(model_path)

        # Calcule l'amélioration
        if campagne.modele_precedent_score:
            amelioration = Decimal(str(metrics.get('f1_score', 0))) - campagne.modele_precedent_score
            campagne.amelioration = amelioration
            campagne.save()

        logger.info(f"Modèle {modele.nom} entraîné avec succès - Score: {metrics.get('f1_score', 0):.2%}")

        return {
            'success': True,
            'modele_id': modele_id,
            'campagne_id': campagne.id,
            'metrics': metrics
        }

    except Exception as e:
        logger.error(f"Erreur entraînement modèle {modele_id}: {e}")

        # Met à jour les statuts en erreur
        try:
            modele = ModeleML.objects.get(id=modele_id)
            modele.statut = 'ERREUR'
            modele.save()

            if campagne_id:
                campagne = CampagneEntrainement.objects.get(id=campagne_id)
                campagne.statut = 'ECHEC'
                campagne.date_fin = timezone.now()
                campagne.erreurs = str(e)
                campagne.save()
        except:
            pass

        # Réessaye avec backoff exponentiel
        raise self.retry(exc=e, countdown=60 * (2 ** self.request.retries))


@shared_task
def auto_retrain_models():
    """
    Tâche périodique pour réentraîner automatiquement les modèles
    qui en ont besoin
    """
    from .models import ModeleML

    logger.info("Démarrage réentraînement automatique des modèles")

    # Trouve les modèles qui ont besoin d'être réentraînés
    modeles_a_reentrainer = ModeleML.objects.filter(
        actif=True,
        reentrainement_auto=True,
        statut__in=['PRET', 'OBSOLETE']
    )

    count_scheduled = 0

    for modele in modeles_a_reentrainer:
        if modele.besoin_reentrainement:
            # Lance l'entraînement en tâche asynchrone
            train_model_task.delay(modele.id)
            count_scheduled += 1
            logger.info(f"Réentraînement planifié pour: {modele.nom}")

    logger.info(f"{count_scheduled} modèles planifiés pour réentraînement")

    return {
        'success': True,
        'models_scheduled': count_scheduled
    }


@shared_task
def detect_model_drift():
    """
    Tâche pour détecter le drift dans les modèles
    """
    from .models import ModeleML
    from .services.lstm_service import LSTMService
    from .services.random_forest_service import RandomForestService
    from .services.xgboost_service import XGBoostService

    logger.info("Démarrage détection de drift")

    modeles_actifs = ModeleML.objects.filter(
        actif=True,
        statut='PRET'
    )

    drift_detected = []

    for modele in modeles_actifs:
        try:
            # Collecte les données récentes et de référence
            X_recent = collect_recent_data(modele, days=7)
            X_reference = collect_reference_data(modele)

            if X_recent is None or X_reference is None:
                continue

            # Sélectionne le service
            service = get_service_for_model(modele)
            service.modele = modele

            # Détecte le drift
            drift_info = service.detect_drift(X_recent, X_reference)

            if drift_info['has_drift']:
                logger.warning(f"Drift détecté pour {modele.nom}: {len(drift_info['drift_features'])} features")

                # Marque le modèle comme obsolète
                modele.statut = 'OBSOLETE'
                modele.save()

                drift_detected.append({
                    'modele_id': modele.id,
                    'modele_nom': modele.nom,
                    'drift_features': drift_info['drift_features']
                })

                # Planifie un réentraînement
                train_model_task.delay(modele.id)

        except Exception as e:
            logger.error(f"Erreur détection drift pour {modele.nom}: {e}")

    logger.info(f"Drift détecté dans {len(drift_detected)} modèles")

    return {
        'success': True,
        'drift_detected': drift_detected
    }


@shared_task
def calculate_model_statistics():
    """
    Calcule les statistiques agrégées des modèles
    """
    from .models import ModeleML, DetectionAnomalie, StatistiqueDetection
    from django.db.models import Count, Avg

    logger.info("Calcul des statistiques des modèles")

    today = timezone.now().date()

    for modele in ModeleML.objects.filter(actif=True):
        try:
            # Compte les détections du jour
            detections_jour = DetectionAnomalie.objects.filter(
                modele=modele,
                date_anomalie__date=today
            ).aggregate(
                total=Count('id'),
                critiques=Count('id', filter=models.Q(niveau_severite='CRITIQUE')),
                elevees=Count('id', filter=models.Q(niveau_severite='ELEVE')),
                moyennes=Count('id', filter=models.Q(niveau_severite='MOYEN')),
                faibles=Count('id', filter=models.Q(niveau_severite='FAIBLE')),
                resolues=Count('id', filter=models.Q(statut='RESOLUE')),
                faux_positifs=Count('id', filter=models.Q(statut='FAUX_POSITIF')),
                vrais_positifs=Count('id', filter=models.Q(statut='VALIDEE'))
            )

            # Crée ou met à jour les statistiques
            stats, created = StatistiqueDetection.objects.update_or_create(
                societe=modele.societe,
                modele=modele,
                periode='JOUR',
                date_periode=today,
                defaults={
                    'total_detections': detections_jour['total'],
                    'detections_critiques': detections_jour['critiques'],
                    'detections_elevees': detections_jour['elevees'],
                    'detections_moyennes': detections_jour['moyennes'],
                    'detections_faibles': detections_jour['faibles'],
                    'detections_resolues': detections_jour['resolues'],
                    'faux_positifs': detections_jour['faux_positifs'],
                    'vrais_positifs': detections_jour['vrais_positifs'],
                }
            )

            # Calcule le taux de faux positifs
            if detections_jour['total'] > 0:
                taux_fp = detections_jour['faux_positifs'] / detections_jour['total']
                stats.taux_faux_positifs = Decimal(str(taux_fp))
                stats.save()

        except Exception as e:
            logger.error(f"Erreur calcul stats pour {modele.nom}: {e}")

    return {'success': True}


def get_service_for_model(modele):
    """
    Retourne le service approprié pour un modèle

    Args:
        modele: Instance ModeleML

    Returns:
        Service instance
    """
    from .services.lstm_service import LSTMService
    from .services.random_forest_service import RandomForestService
    from .services.xgboost_service import XGBoostService

    service_map = {
        'LSTM': LSTMService,
        'RANDOM_FOREST': RandomForestService,
        'XGBOOST': XGBoostService,
        'GRADIENT_BOOSTING': XGBoostService,  # Similaire à XGBoost
    }

    service_class = service_map.get(modele.type_modele)

    if service_class is None:
        raise ValueError(f"Type de modèle non supporté: {modele.type_modele}")

    return service_class(modele)


def collect_training_data(modele):
    """
    Collecte les données d'entraînement pour un modèle

    Args:
        modele: Instance ModeleML

    Returns:
        X, y (DataFrames)
    """
    import pandas as pd

    # TODO: Implémenter la collecte de données selon le domaine d'application
    # Pour l'instant, retourne des données simulées

    logger.info(f"Collecte données pour {modele.domaine_application}")

    # Simulation de données
    n_samples = 1000

    if modele.domaine_application == 'FLUX_TRESORERIE':
        # Données temporelles pour LSTM
        X = pd.DataFrame({
            'solde': np.random.randn(n_samples) * 10000 + 50000,
            'entrees': np.random.randn(n_samples) * 5000 + 20000,
            'sorties': np.random.randn(n_samples) * 5000 + 15000,
        })
        y = None  # LSTM est unsupervised pour prédiction

    elif modele.domaine_application == 'ECRITURES_COMPTABLES':
        # Données pour Random Forest
        X = pd.DataFrame({
            'montant': np.random.randn(n_samples) * 1000 + 5000,
            'tiers_id': np.random.randint(1, 100, n_samples),
            'jour_mois': np.random.randint(1, 31, n_samples),
        })
        y = pd.Series(np.random.randint(0, 10, n_samples))  # 10 comptes possibles

    else:
        # Données génériques
        X = pd.DataFrame(np.random.randn(n_samples, 10))
        y = pd.Series(np.random.randint(0, 2, n_samples))

    return X, y


def collect_recent_data(modele, days=7):
    """
    Collecte les données récentes pour détection de drift

    Args:
        modele: Instance ModeleML
        days: Nombre de jours

    Returns:
        DataFrame
    """
    # TODO: Implémenter collecte réelle
    import pandas as pd
    return pd.DataFrame(np.random.randn(100, 10))


def collect_reference_data(modele):
    """
    Collecte les données de référence pour détection de drift

    Args:
        modele: Instance ModeleML

    Returns:
        DataFrame
    """
    # TODO: Implémenter collecte réelle
    import pandas as pd
    return pd.DataFrame(np.random.randn(100, 10))