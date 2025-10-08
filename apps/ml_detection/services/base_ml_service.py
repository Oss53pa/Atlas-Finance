"""
Service de base pour les modèles ML
"""
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from abc import ABC, abstractmethod
from datetime import datetime, timedelta
from django.utils import timezone
from decimal import Decimal

logger = logging.getLogger(__name__)


class BaseMLService(ABC):
    """
    Classe de base abstraite pour tous les services ML
    """

    def __init__(self, modele_instance=None):
        """
        Initialise le service ML

        Args:
            modele_instance: Instance du modèle Django ModeleML
        """
        self.modele = modele_instance
        self.model = None  # Le modèle sklearn/tensorflow
        self.scaler = None
        self.feature_names = []
        self.is_trained = False

    @abstractmethod
    def train(self, X: pd.DataFrame, y: Optional[pd.Series] = None) -> Dict[str, Any]:
        """
        Entraîne le modèle ML

        Args:
            X: Features d'entraînement
            y: Labels (optionnel pour unsupervised learning)

        Returns:
            Dict avec métriques d'entraînement
        """
        pass

    @abstractmethod
    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Effectue des prédictions

        Args:
            X: Features pour prédiction

        Returns:
            Prédictions
        """
        pass

    @abstractmethod
    def get_feature_importance(self) -> Dict[str, float]:
        """
        Retourne l'importance des features

        Returns:
            Dict {feature_name: importance_score}
        """
        pass

    def preprocess_data(self, data: pd.DataFrame) -> pd.DataFrame:
        """
        Prétraite les données

        Args:
            data: DataFrame brut

        Returns:
            DataFrame prétraité
        """
        # Supprime les valeurs manquantes
        data = data.fillna(0)

        # Convertit les dates en timestamps
        for col in data.select_dtypes(include=['datetime64']).columns:
            data[col] = data[col].astype('int64') // 10**9

        # Encode les variables catégorielles
        for col in data.select_dtypes(include=['object', 'category']).columns:
            data[col] = pd.factorize(data[col])[0]

        return data

    def split_data(
        self,
        X: pd.DataFrame,
        y: Optional[pd.Series] = None,
        test_size: float = 0.2
    ) -> Tuple[pd.DataFrame, pd.DataFrame, Optional[pd.Series], Optional[pd.Series]]:
        """
        Divise les données en train/test

        Args:
            X: Features
            y: Labels (optionnel)
            test_size: Proportion du test set

        Returns:
            X_train, X_test, y_train, y_test
        """
        from sklearn.model_selection import train_test_split

        if y is not None:
            return train_test_split(X, y, test_size=test_size, random_state=42)
        else:
            X_train, X_test = train_test_split(X, test_size=test_size, random_state=42)
            return X_train, X_test, None, None

    def calculate_metrics(
        self,
        y_true: np.ndarray,
        y_pred: np.ndarray,
        y_proba: Optional[np.ndarray] = None
    ) -> Dict[str, float]:
        """
        Calcule les métriques de performance

        Args:
            y_true: Vraies valeurs
            y_pred: Prédictions
            y_proba: Probabilités (optionnel)

        Returns:
            Dict de métriques
        """
        from sklearn.metrics import (
            accuracy_score, precision_score, recall_score,
            f1_score, roc_auc_score
        )

        metrics = {
            'accuracy': float(accuracy_score(y_true, y_pred)),
            'precision': float(precision_score(y_true, y_pred, average='weighted', zero_division=0)),
            'recall': float(recall_score(y_true, y_pred, average='weighted', zero_division=0)),
            'f1_score': float(f1_score(y_true, y_pred, average='weighted', zero_division=0))
        }

        if y_proba is not None and len(np.unique(y_true)) == 2:
            try:
                metrics['roc_auc'] = float(roc_auc_score(y_true, y_proba[:, 1]))
            except:
                pass

        return metrics

    def save_model(self, file_path: str) -> bool:
        """
        Sauvegarde le modèle sur disque

        Args:
            file_path: Chemin du fichier

        Returns:
            True si succès
        """
        import joblib

        try:
            joblib.dump({
                'model': self.model,
                'scaler': self.scaler,
                'feature_names': self.feature_names,
                'metadata': {
                    'trained_at': datetime.now().isoformat(),
                    'model_type': self.__class__.__name__
                }
            }, file_path)
            return True
        except Exception as e:
            logger.error(f"Erreur sauvegarde modèle: {e}")
            return False

    def load_model(self, file_path: str) -> bool:
        """
        Charge le modèle depuis le disque

        Args:
            file_path: Chemin du fichier

        Returns:
            True si succès
        """
        import joblib

        try:
            data = joblib.load(file_path)
            self.model = data['model']
            self.scaler = data.get('scaler')
            self.feature_names = data.get('feature_names', [])
            self.is_trained = True
            return True
        except Exception as e:
            logger.error(f"Erreur chargement modèle: {e}")
            return False

    def detect_drift(self, X_new: pd.DataFrame, X_reference: pd.DataFrame) -> Dict[str, Any]:
        """
        Détecte le drift dans les données

        Args:
            X_new: Nouvelles données
            X_reference: Données de référence

        Returns:
            Dict avec informations sur le drift
        """
        from scipy.stats import ks_2samp

        drift_results = {
            'has_drift': False,
            'drift_features': [],
            'drift_scores': {}
        }

        for col in X_new.columns:
            if col in X_reference.columns:
                # Test de Kolmogorov-Smirnov
                statistic, p_value = ks_2samp(X_reference[col], X_new[col])

                drift_results['drift_scores'][col] = {
                    'statistic': float(statistic),
                    'p_value': float(p_value)
                }

                # Seuil de détection: p < 0.05
                if p_value < 0.05:
                    drift_results['has_drift'] = True
                    drift_results['drift_features'].append(col)

        return drift_results

    def update_modele_django(self, campagne_instance, metrics: Dict[str, Any]):
        """
        Met à jour l'instance Django du modèle avec les résultats

        Args:
            campagne_instance: Instance CampagneEntrainement
            metrics: Métriques calculées
        """
        if not self.modele:
            return

        try:
            # Met à jour le modèle
            self.modele.statut = 'PRET'
            self.modele.date_entrainement = timezone.now()
            self.modele.score_performance = Decimal(str(metrics.get('f1_score', 0)))
            self.modele.metriques_evaluation = metrics
            self.modele.derniere_utilisation = timezone.now()

            # Calcule la prochaine date de réentraînement
            if self.modele.reentrainement_auto:
                self.modele.prochaine_reentrainement = (
                    timezone.now() +
                    timedelta(days=self.modele.frequence_reentrainement)
                )

            self.modele.save()

            # Met à jour la campagne
            if campagne_instance:
                campagne_instance.statut = 'TERMINEE'
                campagne_instance.date_fin = timezone.now()
                campagne_instance.score_final = Decimal(str(metrics.get('f1_score', 0)))
                campagne_instance.metriques_finales = metrics
                campagne_instance.modele_valide = True
                campagne_instance.save()

        except Exception as e:
            logger.error(f"Erreur mise à jour modèle Django: {e}")