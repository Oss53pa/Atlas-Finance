"""
Service LSTM pour prédiction de séries temporelles
"""
import logging
import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Any, Optional
from .base_ml_service import BaseMLService

logger = logging.getLogger(__name__)


class LSTMService(BaseMLService):
    """
    Service pour LSTM Neural Network - Prédiction de trésorerie
    """

    def __init__(self, modele_instance=None):
        super().__init__(modele_instance)
        self.sequence_length = 90  # 90 jours de fenêtre
        self.n_features = None

    def create_sequences(self, data: np.ndarray, seq_length: int) -> Tuple[np.ndarray, np.ndarray]:
        """
        Crée des séquences pour LSTM

        Args:
            data: Données temporelles
            seq_length: Longueur des séquences

        Returns:
            X, y pour entraînement
        """
        X, y = [], []
        for i in range(len(data) - seq_length):
            X.append(data[i:i + seq_length])
            y.append(data[i + seq_length])

        return np.array(X), np.array(y)

    def train(self, X: pd.DataFrame, y: Optional[pd.Series] = None) -> Dict[str, Any]:
        """
        Entraîne le modèle LSTM

        Args:
            X: Features temporelles (flux de trésorerie, etc.)
            y: Target (montants futurs)

        Returns:
            Métriques d'entraînement
        """
        try:
            from tensorflow.keras.models import Sequential
            from tensorflow.keras.layers import LSTM, Dense, Dropout
            from tensorflow.keras.optimizers import Adam
            from sklearn.preprocessing import MinMaxScaler

            logger.info(f"Démarrage entraînement LSTM - {len(X)} échantillons")

            # Prétraitement
            X_processed = self.preprocess_data(X)

            # Normalisation
            self.scaler = MinMaxScaler()
            X_scaled = self.scaler.fit_transform(X_processed)

            # Création des séquences
            X_seq, y_seq = self.create_sequences(X_scaled, self.sequence_length)

            self.n_features = X_seq.shape[2]

            # Split train/test
            split_idx = int(len(X_seq) * 0.8)
            X_train, X_test = X_seq[:split_idx], X_seq[split_idx:]
            y_train, y_test = y_seq[:split_idx], y_seq[split_idx:]

            # Construction du modèle LSTM
            self.model = Sequential([
                LSTM(128, return_sequences=True, input_shape=(self.sequence_length, self.n_features)),
                Dropout(0.2),
                LSTM(64, return_sequences=True),
                Dropout(0.2),
                LSTM(32, return_sequences=False),
                Dropout(0.2),
                Dense(self.n_features)
            ])

            self.model.compile(
                optimizer=Adam(learning_rate=0.001),
                loss='mse',
                metrics=['mae']
            )

            # Entraînement
            history = self.model.fit(
                X_train, y_train,
                validation_data=(X_test, y_test),
                epochs=50,
                batch_size=32,
                verbose=0
            )

            # Évaluation
            y_pred = self.model.predict(X_test, verbose=0)
            mse = np.mean((y_test - y_pred) ** 2)
            mae = np.mean(np.abs(y_test - y_pred))
            rmse = np.sqrt(mse)

            # Calcul de l'accuracy (% de prédictions dans 5% d'erreur)
            relative_errors = np.abs((y_test - y_pred) / (y_test + 1e-8))
            accuracy = np.mean(relative_errors < 0.05)

            metrics = {
                'mse': float(mse),
                'mae': float(mae),
                'rmse': float(rmse),
                'accuracy': float(accuracy),
                'training_loss': float(history.history['loss'][-1]),
                'validation_loss': float(history.history['val_loss'][-1]),
                'f1_score': float(accuracy)  # Pour compatibilité
            }

            self.is_trained = True
            logger.info(f"LSTM entraîné - Accuracy: {accuracy:.2%}")

            return metrics

        except Exception as e:
            logger.error(f"Erreur entraînement LSTM: {e}")
            return {'error': str(e)}

    def predict(self, X: pd.DataFrame) -> np.ndarray:
        """
        Prédit les flux de trésorerie futurs

        Args:
            X: Données récentes

        Returns:
            Prédictions
        """
        if not self.is_trained or self.model is None:
            raise ValueError("Modèle non entraîné")

        try:
            X_processed = self.preprocess_data(X)
            X_scaled = self.scaler.transform(X_processed)

            # Prend les dernières séquences
            X_seq = X_scaled[-self.sequence_length:].reshape(1, self.sequence_length, self.n_features)

            predictions = self.model.predict(X_seq, verbose=0)
            predictions_original = self.scaler.inverse_transform(predictions)

            return predictions_original

        except Exception as e:
            logger.error(f"Erreur prédiction LSTM: {e}")
            return np.array([])

    def get_feature_importance(self) -> Dict[str, float]:
        """
        LSTM n'a pas d'importance de features directe

        Returns:
            Dict vide (pas applicable)
        """
        return {
            'info': 'Feature importance not directly available for LSTM',
            'note': 'Use attention mechanisms or SHAP values for interpretation'
        }

    def predict_future(self, X: pd.DataFrame, n_periods: int = 30) -> np.ndarray:
        """
        Prédit n périodes dans le futur

        Args:
            X: Données historiques
            n_periods: Nombre de périodes à prédire

        Returns:
            Prédictions futures
        """
        if not self.is_trained:
            raise ValueError("Modèle non entraîné")

        X_processed = self.preprocess_data(X)
        X_scaled = self.scaler.transform(X_processed)

        # Démarre avec les dernières données
        current_sequence = X_scaled[-self.sequence_length:].copy()
        predictions = []

        for _ in range(n_periods):
            # Prédit le prochain point
            X_input = current_sequence.reshape(1, self.sequence_length, self.n_features)
            pred = self.model.predict(X_input, verbose=0)[0]
            predictions.append(pred)

            # Met à jour la séquence
            current_sequence = np.vstack([current_sequence[1:], pred])

        predictions = np.array(predictions)
        predictions_original = self.scaler.inverse_transform(predictions)

        return predictions_original