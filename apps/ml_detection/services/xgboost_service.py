"""
Service XGBoost pour optimisation prédictive
"""
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from .base_ml_service import BaseMLService

logger = logging.getLogger(__name__)


class XGBoostService(BaseMLService):
    """
    Service pour XGBoost - Optimisation prédictive multi-usages
    """

    def __init__(self, modele_instance=None):
        super().__init__(modele_instance)
        self.max_depth = 8
        self.learning_rate = 0.05
        self.n_estimators = 300

    def train(self, X: pd.DataFrame, y: Optional[pd.Series] = None) -> Dict[str, Any]:
        """
        Entraîne le modèle XGBoost

        Args:
            X: Features (historique paiements, scores, etc.)
            y: Target (défaut de paiement, risque, etc.)

        Returns:
            Métriques d'entraînement
        """
        try:
            import xgboost as xgb
            from sklearn.preprocessing import StandardScaler

            logger.info(f"Démarrage entraînement XGBoost - {len(X)} échantillons")

            if y is None:
                raise ValueError("XGBoost nécessite des labels (y)")

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

            # Détermine si classification ou régression
            is_classification = len(np.unique(y)) < 50

            if is_classification:
                # Classification
                self.model = xgb.XGBClassifier(
                    max_depth=self.max_depth,
                    learning_rate=self.learning_rate,
                    n_estimators=self.n_estimators,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    objective='binary:logistic' if len(np.unique(y)) == 2 else 'multi:softprob',
                    random_state=42,
                    n_jobs=-1,
                    eval_metric='logloss'
                )

                self.model.fit(
                    X_train, y_train,
                    eval_set=[(X_test, y_test)],
                    verbose=False
                )

                # Prédictions
                y_pred = self.model.predict(X_test)
                y_proba = self.model.predict_proba(X_test)

                # Métriques
                metrics = self.calculate_metrics(y_test, y_pred, y_proba)

            else:
                # Régression
                self.model = xgb.XGBRegressor(
                    max_depth=self.max_depth,
                    learning_rate=self.learning_rate,
                    n_estimators=self.n_estimators,
                    subsample=0.8,
                    colsample_bytree=0.8,
                    objective='reg:squarederror',
                    random_state=42,
                    n_jobs=-1
                )

                self.model.fit(
                    X_train, y_train,
                    eval_set=[(X_test, y_test)],
                    verbose=False
                )

                # Prédictions
                y_pred = self.model.predict(X_test)

                # Métriques de régression
                from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score

                mse = mean_squared_error(y_test, y_pred)
                mae = mean_absolute_error(y_test, y_pred)
                r2 = r2_score(y_test, y_pred)

                metrics = {
                    'mse': float(mse),
                    'mae': float(mae),
                    'rmse': float(np.sqrt(mse)),
                    'r2_score': float(r2),
                    'f1_score': float(r2)  # Pour compatibilité
                }

            # Métriques communes
            metrics.update({
                'n_estimators': self.n_estimators,
                'max_depth': self.max_depth,
                'n_features': len(self.feature_names),
                'task_type': 'classification' if is_classification else 'regression'
            })

            self.is_trained = True
            score_key = 'accuracy' if is_classification else 'r2_score'
            logger.info(f"XGBoost entraîné - {score_key}: {metrics.get(score_key, 0):.2%}")

            return metrics

        except Exception as e:
            logger.error(f"Erreur entraînement XGBoost: {e}")
            return {'error': str(e)}

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Effectue des prédictions

        Args:
            X: Features

        Returns:
            Prédictions
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Modèle non entraîné")

        try:
            X_processed = self.preprocess_data(X)
            X_scaled = self.scaler.transform(X_processed)

            predictions = self.model.predict(X_scaled)
            return predictions

        except Exception as e:
            logger.error(f"Erreur prédiction XGBoost: {e}")
            return np.array([])

    def predict_proba(self, X: pd.DataFrame) -> Optional[np.ndarray]:
        """
        Prédit les probabilités (classification uniquement)

        Args:
            X: Features

        Returns:
            Probabilités ou None si régression
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Modèle non entraîné")

        try:
            if hasattr(self.model, 'predict_proba'):
                X_processed = self.preprocess_data(X)
                X_scaled = self.scaler.transform(X_processed)

                probabilities = self.model.predict_proba(X_scaled)
                return probabilities

            return None

        except Exception as e:
            logger.error(f"Erreur prédiction probabilités: {e}")
            return None

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

    def get_shap_values(self, X: pd.DataFrame) -> Optional[np.ndarray]:
        """
        Calcule les valeurs SHAP pour l'explainability

        Args:
            X: Features

        Returns:
            Valeurs SHAP ou None
        """
        try:
            import shap

            X_processed = self.preprocess_data(X)
            X_scaled = self.scaler.transform(X_processed)

            # Créé l'explainer SHAP
            explainer = shap.TreeExplainer(self.model)
            shap_values = explainer.shap_values(X_scaled)

            return shap_values

        except ImportError:
            logger.warning("SHAP non installé. Installer avec: pip install shap")
            return None
        except Exception as e:
            logger.error(f"Erreur calcul SHAP: {e}")
            return None

    def predict_risk_scores(self, X: pd.DataFrame) -> pd.DataFrame:
        """
        Prédit les scores de risque avec détails

        Args:
            X: Features clients

        Returns:
            DataFrame avec scores et catégories de risque
        """
        if not self.is_trained:
            raise ValueError("Modèle non entraîné")

        try:
            predictions = self.predict(X)
            probabilities = self.predict_proba(X)

            results = pd.DataFrame({
                'risk_score': predictions
            })

            # Catégorise les risques
            if probabilities is not None and len(probabilities.shape) > 1:
                results['risk_probability'] = probabilities[:, 1]  # Probabilité classe 1 (risque)

                # Catégories de risque
                results['risk_category'] = pd.cut(
                    results['risk_probability'],
                    bins=[0, 0.3, 0.6, 0.9, 1.0],
                    labels=['Faible', 'Moyen', 'Élevé', 'Critique']
                )
            else:
                # Régression: utilise les valeurs prédites
                results['risk_category'] = pd.cut(
                    results['risk_score'],
                    bins=4,
                    labels=['Faible', 'Moyen', 'Élevé', 'Critique']
                )

            return results

        except Exception as e:
            logger.error(f"Erreur prédiction scores de risque: {e}")
            return pd.DataFrame()