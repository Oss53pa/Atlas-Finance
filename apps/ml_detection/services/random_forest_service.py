"""
Service Random Forest pour recommandations comptables
"""
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from .base_ml_service import BaseMLService

logger = logging.getLogger(__name__)


class RandomForestService(BaseMLService):
    """
    Service pour Random Forest - Recommandations comptables
    """

    def __init__(self, modele_instance=None):
        super().__init__(modele_instance)
        self.n_estimators = 500
        self.max_depth = 15

    def train(self, X: pd.DataFrame, y: Optional[pd.Series] = None) -> Dict[str, Any]:
        """
        Entraîne le modèle Random Forest

        Args:
            X: Features (libellé, montant, tiers, etc.)
            y: Comptes comptables (labels)

        Returns:
            Métriques d'entraînement
        """
        try:
            from sklearn.ensemble import RandomForestClassifier
            from sklearn.preprocessing import StandardScaler

            logger.info(f"Démarrage entraînement Random Forest - {len(X)} échantillons")

            if y is None:
                raise ValueError("Random Forest nécessite des labels (y)")

            # Prétraitement
            X_processed = self.preprocess_data(X)
            self.feature_names = list(X_processed.columns)

            # Normalisation
            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X_processed)

            # Split train/test
            X_train, X_test, y_train, y_test = self.split_data(
                pd.DataFrame(X_scaled, columns=self.feature_names),
                y,
                test_size=0.2
            )

            # Entraînement Random Forest
            self.model = RandomForestClassifier(
                n_estimators=self.n_estimators,
                max_depth=self.max_depth,
                max_features='sqrt',
                min_samples_leaf=10,
                random_state=42,
                n_jobs=-1,
                class_weight='balanced'
            )

            self.model.fit(X_train, y_train)

            # Prédictions
            y_pred = self.model.predict(X_test)
            y_proba = self.model.predict_proba(X_test)

            # Calcul des métriques
            metrics = self.calculate_metrics(y_test, y_pred, y_proba)

            # Ajout des métriques spécifiques
            metrics.update({
                'n_estimators': self.n_estimators,
                'n_classes': len(np.unique(y_train)),
                'n_features': len(self.feature_names),
                'oob_score': float(self.model.oob_score_) if hasattr(self.model, 'oob_score_') else 0.0
            })

            self.is_trained = True
            logger.info(f"Random Forest entraîné - Accuracy: {metrics['accuracy']:.2%}")

            return metrics

        except Exception as e:
            logger.error(f"Erreur entraînement Random Forest: {e}")
            return {'error': str(e)}

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Prédit les comptes comptables

        Args:
            X: Features de transaction

        Returns:
            Comptes prédits
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Modèle non entraîné")

        try:
            X_processed = self.preprocess_data(X)
            X_scaled = self.scaler.transform(X_processed)

            predictions = self.model.predict(X_scaled)
            return predictions

        except Exception as e:
            logger.error(f"Erreur prédiction Random Forest: {e}")
            return np.array([])

    def predict_proba(self, X: pd.DataFrame) -> np.ndarray:
        """
        Prédit les probabilités pour chaque classe

        Args:
            X: Features de transaction

        Returns:
            Probabilités par classe
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Modèle non entraîné")

        try:
            X_processed = self.preprocess_data(X)
            X_scaled = self.scaler.transform(X_processed)

            probabilities = self.model.predict_proba(X_scaled)
            return probabilities

        except Exception as e:
            logger.error(f"Erreur prédiction probabilités: {e}")
            return np.array([])

    def get_feature_importance(self) -> Dict[str, float]:
        """
        Retourne l'importance des features

        Returns:
            Dict {feature_name: importance}
        """
        if not self.is_trained or self.model is None:
            return {}

        try:
            importances = self.model.feature_importances_
            feature_importance = {
                name: float(imp)
                for name, imp in zip(self.feature_names, importances)
            }

            # Trie par importance décroissante
            feature_importance = dict(
                sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
            )

            return feature_importance

        except Exception as e:
            logger.error(f"Erreur calcul importance: {e}")
            return {}

    def get_top_recommendations(
        self,
        X: pd.DataFrame,
        n_recommendations: int = 3
    ) -> List[Dict[str, Any]]:
        """
        Retourne les top N recommandations avec confiance

        Args:
            X: Features de transaction
            n_recommendations: Nombre de recommandations

        Returns:
            Liste de recommandations avec probabilités
        """
        if not self.is_trained:
            return []

        try:
            probabilities = self.predict_proba(X)
            classes = self.model.classes_

            recommendations = []
            for i, probs in enumerate(probabilities):
                # Trie par probabilité décroissante
                top_indices = np.argsort(probs)[::-1][:n_recommendations]

                recommendation = {
                    'transaction_index': i,
                    'recommendations': [
                        {
                            'account': str(classes[idx]),
                            'confidence': float(probs[idx]),
                            'rank': rank + 1
                        }
                        for rank, idx in enumerate(top_indices)
                    ]
                }
                recommendations.append(recommendation)

            return recommendations

        except Exception as e:
            logger.error(f"Erreur génération recommandations: {e}")
            return []