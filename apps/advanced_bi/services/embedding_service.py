"""
Service de génération d'embeddings pour la recherche sémantique
Utilise des modèles français optimisés
"""
import logging
from typing import List, Dict, Any
import numpy as np
from sentence_transformers import SentenceTransformer
import torch

logger = logging.getLogger(__name__)


class EmbeddingService:
    """
    Service de génération d'embeddings avec modèles multilingues/français
    """

    # Modèles supportés (dimensions d'embeddings)
    SUPPORTED_MODELS = {
        'camembert-base': 768,  # Meilleur pour le français
        'distiluse-base-multilingual-cased-v2': 512,  # Rapide et multilingue
        'paraphrase-multilingual-mpnet-base-v2': 768,  # Excellent qualité
        'sentence-camembert-base': 768,  # Spécifique français
    }

    def __init__(self, model_name: str = 'paraphrase-multilingual-mpnet-base-v2'):
        """
        Initialise le service avec un modèle spécifique

        Args:
            model_name: Nom du modèle d'embeddings à utiliser
        """
        self.model_name = model_name
        self.model = None
        self.embedding_dimension = self.SUPPORTED_MODELS.get(model_name, 768)
        self._load_model()

    def _load_model(self):
        """Charge le modèle d'embeddings"""
        try:
            logger.info(f"Chargement du modèle d'embeddings: {self.model_name}")

            # Utiliser CUDA si disponible
            device = 'cuda' if torch.cuda.is_available() else 'cpu'

            self.model = SentenceTransformer(self.model_name)
            self.model.to(device)

            logger.info(f"Modèle chargé avec succès sur {device}")
            logger.info(f"Dimension d'embeddings: {self.embedding_dimension}")

        except Exception as e:
            logger.error(f"Erreur lors du chargement du modèle: {e}")
            raise

    def generate_embedding(self, text: str) -> List[float]:
        """
        Génère l'embedding pour un texte

        Args:
            text: Texte à encoder

        Returns:
            Vecteur d'embedding (liste de floats)
        """
        if not self.model:
            raise ValueError("Modèle non chargé")

        if not text or not text.strip():
            # Retourner un vecteur nul pour texte vide
            return [0.0] * self.embedding_dimension

        try:
            # Nettoyage du texte
            text_clean = text.strip()

            # Génération de l'embedding
            embedding = self.model.encode(
                text_clean,
                convert_to_numpy=True,
                normalize_embeddings=True  # Normalisation L2
            )

            # Conversion en liste
            return embedding.tolist()

        except Exception as e:
            logger.error(f"Erreur génération embedding: {e}")
            raise

    def generate_embeddings_batch(
        self,
        texts: List[str],
        batch_size: int = 32,
        show_progress: bool = False
    ) -> List[List[float]]:
        """
        Génère des embeddings pour plusieurs textes en batch

        Args:
            texts: Liste de textes à encoder
            batch_size: Taille des batchs
            show_progress: Afficher la progression

        Returns:
            Liste d'embeddings
        """
        if not self.model:
            raise ValueError("Modèle non chargé")

        if not texts:
            return []

        try:
            # Nettoyage des textes
            texts_clean = [text.strip() if text else "" for text in texts]

            # Génération en batch
            embeddings = self.model.encode(
                texts_clean,
                batch_size=batch_size,
                convert_to_numpy=True,
                normalize_embeddings=True,
                show_progress_bar=show_progress
            )

            # Conversion en liste de listes
            return embeddings.tolist()

        except Exception as e:
            logger.error(f"Erreur génération embeddings batch: {e}")
            raise

    def compute_similarity(
        self,
        embedding1: List[float],
        embedding2: List[float]
    ) -> float:
        """
        Calcule la similarité cosinus entre deux embeddings

        Args:
            embedding1: Premier vecteur
            embedding2: Deuxième vecteur

        Returns:
            Score de similarité [0, 1]
        """
        try:
            vec1 = np.array(embedding1)
            vec2 = np.array(embedding2)

            # Cosine similarity
            similarity = np.dot(vec1, vec2) / (
                np.linalg.norm(vec1) * np.linalg.norm(vec2)
            )

            return float(similarity)

        except Exception as e:
            logger.error(f"Erreur calcul similarité: {e}")
            return 0.0

    def find_most_similar(
        self,
        query_embedding: List[float],
        candidate_embeddings: List[List[float]],
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Trouve les embeddings les plus similaires à une requête

        Args:
            query_embedding: Embedding de la requête
            candidate_embeddings: Liste d'embeddings candidats
            top_k: Nombre de résultats à retourner

        Returns:
            Liste de dicts avec index et score
        """
        try:
            query_vec = np.array(query_embedding)
            candidates_matrix = np.array(candidate_embeddings)

            # Calcul similarités
            similarities = np.dot(candidates_matrix, query_vec)

            # Top-K
            top_indices = np.argsort(similarities)[::-1][:top_k]

            results = [
                {
                    'index': int(idx),
                    'similarity_score': float(similarities[idx])
                }
                for idx in top_indices
            ]

            return results

        except Exception as e:
            logger.error(f"Erreur recherche similarité: {e}")
            return []

    def get_model_info(self) -> Dict[str, Any]:
        """
        Retourne les informations sur le modèle

        Returns:
            Dict avec infos du modèle
        """
        return {
            'model_name': self.model_name,
            'embedding_dimension': self.embedding_dimension,
            'device': str(self.model.device) if self.model else 'unknown',
            'loaded': self.model is not None,
        }


# Instance globale (singleton pattern)
_embedding_service_instance = None


def get_embedding_service(model_name: str = None) -> EmbeddingService:
    """
    Récupère l'instance singleton du service d'embeddings

    Args:
        model_name: Nom du modèle (optionnel, utilise le défaut si None)

    Returns:
        Instance EmbeddingService
    """
    global _embedding_service_instance

    if _embedding_service_instance is None:
        if model_name is None:
            model_name = 'paraphrase-multilingual-mpnet-base-v2'
        _embedding_service_instance = EmbeddingService(model_name)

    return _embedding_service_instance
