"""
Service de gestion des LLMs (Large Language Models)
Support pour Claude (Anthropic), GPT (OpenAI), et modèles locaux
"""
import logging
import time
from typing import List, Dict, Any, Optional
import anthropic
import openai
from django.conf import settings

from apps.advanced_bi.models import AIModelConfiguration

logger = logging.getLogger(__name__)


class LLMService:
    """
    Service pour interagir avec différents LLMs
    """

    def __init__(self, provider: str = 'anthropic', model_name: Optional[str] = None):
        """
        Initialise le service LLM

        Args:
            provider: 'anthropic', 'openai', ou 'local'
            model_name: Nom spécifique du modèle
        """
        self.provider = provider.lower()
        self.model_name = model_name

        # Clients API
        self.anthropic_client = None
        self.openai_client = None

        self._initialize_client()

    def _initialize_client(self):
        """Initialise le client API approprié"""
        try:
            if self.provider == 'anthropic':
                api_key = getattr(settings, 'ANTHROPIC_API_KEY', None)
                if api_key:
                    self.anthropic_client = anthropic.Anthropic(api_key=api_key)
                    if not self.model_name:
                        self.model_name = 'claude-3-5-sonnet-20241022'
                    logger.info(f"Client Anthropic initialisé: {self.model_name}")
                else:
                    logger.warning("ANTHROPIC_API_KEY non configurée")

            elif self.provider == 'openai':
                api_key = getattr(settings, 'OPENAI_API_KEY', None)
                if api_key:
                    self.openai_client = openai.OpenAI(api_key=api_key)
                    if not self.model_name:
                        self.model_name = 'gpt-4-turbo-preview'
                    logger.info(f"Client OpenAI initialisé: {self.model_name}")
                else:
                    logger.warning("OPENAI_API_KEY non configurée")

        except Exception as e:
            logger.error(f"Erreur initialisation LLM client: {e}")

    def generate_response(
        self,
        query: str,
        context: str,
        system_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        temperature: float = 0.7,
        max_tokens: int = 2000
    ) -> Dict[str, Any]:
        """
        Génère une réponse en utilisant le LLM configuré

        Args:
            query: Question de l'utilisateur
            context: Contexte récupéré par RAG
            system_prompt: Instructions système
            conversation_history: Historique de conversation
            temperature: Température de génération
            max_tokens: Nombre maximum de tokens

        Returns:
            Dict avec réponse et métadonnées
        """
        start_time = time.time()

        try:
            # Construire le prompt utilisateur avec contexte
            user_prompt = f"""{context}

=== QUESTION ===
{query}

Réponds en te basant sur le contexte SYSCOHADA fourni ci-dessus. Si l'information n'est pas dans le contexte, dis-le clairement."""

            # Générer selon le provider
            if self.provider == 'anthropic' and self.anthropic_client:
                response = self._generate_anthropic(
                    user_prompt=user_prompt,
                    system_prompt=system_prompt,
                    conversation_history=conversation_history,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
            elif self.provider == 'openai' and self.openai_client:
                response = self._generate_openai(
                    user_prompt=user_prompt,
                    system_prompt=system_prompt,
                    conversation_history=conversation_history,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
            else:
                # Fallback: réponse par défaut
                response = {
                    'response': "Désolée, aucun modèle LLM n'est configuré. Veuillez configurer ANTHROPIC_API_KEY ou OPENAI_API_KEY dans les settings.",
                    'tokens_used': 0,
                    'model_name': 'none'
                }

            # Calcul du temps de traitement
            processing_time = int((time.time() - start_time) * 1000)  # en ms
            response['processing_time_ms'] = processing_time

            return response

        except Exception as e:
            logger.error(f"Erreur génération LLM: {e}")
            return {
                'response': f"Erreur lors de la génération: {str(e)}",
                'error': str(e),
                'tokens_used': 0,
                'model_name': self.model_name,
                'processing_time_ms': int((time.time() - start_time) * 1000)
            }

    def _generate_anthropic(
        self,
        user_prompt: str,
        system_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]],
        temperature: float,
        max_tokens: int
    ) -> Dict[str, Any]:
        """Génère une réponse avec Claude (Anthropic)"""

        # Construire les messages
        messages = []

        # Ajouter l'historique si présent
        if conversation_history:
            for msg in conversation_history[-10:]:  # Limiter à 10 derniers messages
                role = msg['role']
                # Anthropic utilise 'user' et 'assistant'
                if role in ['user', 'assistant']:
                    messages.append({
                        'role': role,
                        'content': msg['content']
                    })

        # Ajouter le message courant
        messages.append({
            'role': 'user',
            'content': user_prompt
        })

        # Appel API
        response = self.anthropic_client.messages.create(
            model=self.model_name,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=messages
        )

        # Extraire la réponse
        response_text = response.content[0].text
        tokens_used = response.usage.input_tokens + response.usage.output_tokens

        return {
            'response': response_text,
            'tokens_used': tokens_used,
            'model_name': self.model_name
        }

    def _generate_openai(
        self,
        user_prompt: str,
        system_prompt: str,
        conversation_history: Optional[List[Dict[str, str]]],
        temperature: float,
        max_tokens: int
    ) -> Dict[str, Any]:
        """Génère une réponse avec GPT (OpenAI)"""

        # Construire les messages
        messages = [{'role': 'system', 'content': system_prompt}]

        # Ajouter l'historique si présent
        if conversation_history:
            for msg in conversation_history[-10:]:
                messages.append({
                    'role': msg['role'],
                    'content': msg['content']
                })

        # Ajouter le message courant
        messages.append({'role': 'user', 'content': user_prompt})

        # Appel API
        response = self.openai_client.chat.completions.create(
            model=self.model_name,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens
        )

        # Extraire la réponse
        response_text = response.choices[0].message.content
        tokens_used = response.usage.total_tokens

        return {
            'response': response_text,
            'tokens_used': tokens_used,
            'model_name': self.model_name
        }

    def classify_intent(self, query: str) -> Dict[str, Any]:
        """
        Classifie l'intention d'une requête utilisateur

        Args:
            query: Requête utilisateur

        Returns:
            Dict avec intention et confiance
        """
        try:
            system_prompt = """Tu es un classificateur d'intentions pour un système comptable SYSCOHADA.

Classe la requête utilisateur dans l'une de ces catégories:
- SYSCOHADA_QUESTION: Questions sur les normes et articles SYSCOHADA
- ACCOUNT_BALANCE: Demandes de soldes de comptes
- TRANSACTION_INQUIRY: Recherche de transactions
- ANOMALY_DETECTION: Détection d'erreurs ou anomalies
- CODE_ANALYSIS: Analyse de code/erreurs techniques
- HELP_TUTORIAL: Demande d'aide ou tutoriel
- OTHER: Autre type de requête

Réponds UNIQUEMENT au format JSON:
{"intent": "CATEGORY", "confidence": 0.95, "explanation": "courte explication"}"""

            if self.anthropic_client:
                response = self.anthropic_client.messages.create(
                    model='claude-3-haiku-20240307',  # Modèle rapide pour classification
                    max_tokens=200,
                    temperature=0.3,
                    system=system_prompt,
                    messages=[{'role': 'user', 'content': query}]
                )
                result_text = response.content[0].text

                # Parser le JSON
                import json
                result = json.loads(result_text)
                return result

            else:
                # Classification basique par mots-clés si pas de LLM
                return self._basic_intent_classification(query)

        except Exception as e:
            logger.error(f"Erreur classification intention: {e}")
            return self._basic_intent_classification(query)

    def _basic_intent_classification(self, query: str) -> Dict[str, Any]:
        """Classification d'intention basique par mots-clés"""
        query_lower = query.lower()

        intent_keywords = {
            'SYSCOHADA_QUESTION': ['article', 'syscohada', 'norme', 'réglementation', 'ohada'],
            'ACCOUNT_BALANCE': ['solde', 'balance', 'compte'],
            'TRANSACTION_INQUIRY': ['transaction', 'écriture', 'mouvement'],
            'ANOMALY_DETECTION': ['erreur', 'anomalie', 'problème', 'incorrect'],
            'CODE_ANALYSIS': ['code', 'bug', 'fonction', 'erreur technique'],
            'HELP_TUTORIAL': ['aide', 'comment', 'tutoriel', 'apprendre'],
        }

        best_intent = 'OTHER'
        best_score = 0

        for intent, keywords in intent_keywords.items():
            score = sum(1 for keyword in keywords if keyword in query_lower)
            if score > best_score:
                best_score = score
                best_intent = intent

        confidence = min(0.5 + (best_score * 0.15), 0.95)

        return {
            'intent': best_intent,
            'confidence': confidence,
            'explanation': f"Basé sur {best_score} mots-clés détectés"
        }


# Instance globale
_llm_service_instance = None


def get_llm_service(provider: str = 'anthropic') -> LLMService:
    """
    Récupère l'instance du service LLM

    Args:
        provider: Provider à utiliser

    Returns:
        Instance LLMService
    """
    global _llm_service_instance

    if _llm_service_instance is None:
        _llm_service_instance = LLMService(provider=provider)

    return _llm_service_instance
