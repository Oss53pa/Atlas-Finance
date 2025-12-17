"""
Service RAG (Retrieval Augmented Generation) pour Paloma
Recherche vectorielle + Génération de réponses avec LLM
"""
import logging
from typing import List, Dict, Any, Optional
from django.db.models import F
from pgvector.django import CosineDistance

from apps.advanced_bi.models import (
    DocumentChunk,
    DocumentSource,
    ConversationSession,
    ConversationMessage,
    AIModelConfiguration
)
from apps.advanced_bi.services.embedding_service import get_embedding_service
from apps.advanced_bi.services.llm_service import get_llm_service

logger = logging.getLogger(__name__)


class RAGService:
    """
    Service principal de Retrieval Augmented Generation
    Combine recherche vectorielle et génération LLM
    """

    def __init__(self):
        self.embedding_service = get_embedding_service()
        self.llm_service = None  # Chargé à la demande

    def search_similar_chunks(
        self,
        query: str,
        top_k: int = 5,
        document_type: Optional[str] = None,
        min_similarity: float = 0.5
    ) -> List[Dict[str, Any]]:
        """
        Recherche les chunks les plus similaires à une requête

        Args:
            query: Question/requête de l'utilisateur
            top_k: Nombre de résultats à retourner
            document_type: Filtrer par type de document (optionnel)
            min_similarity: Score minimum de similarité

        Returns:
            Liste de chunks pertinents avec métadonnées
        """
        try:
            # Générer l'embedding de la requête
            query_embedding = self.embedding_service.generate_embedding(query)

            # Construire la requête de recherche vectorielle
            queryset = DocumentChunk.objects.filter(
                embedding__isnull=False
            ).annotate(
                similarity=1 - CosineDistance('embedding', query_embedding)
            ).filter(
                similarity__gte=min_similarity
            )

            # Filtrer par type de document si spécifié
            if document_type:
                queryset = queryset.filter(
                    document_source__document_type=document_type
                )

            # Récupérer les top-K résultats
            results = queryset.select_related('document_source').order_by(
                '-similarity'
            )[:top_k]

            # Formater les résultats
            chunks = []
            for chunk in results:
                chunks.append({
                    'id': chunk.id,
                    'content': chunk.content,
                    'similarity_score': float(chunk.similarity),
                    'page_number': chunk.page_number,
                    'section_title': chunk.section_title,
                    'article_number': chunk.article_number,
                    'document_title': chunk.document_source.title,
                    'document_type': chunk.document_source.document_type,
                    'metadata': chunk.metadata
                })

                # Incrémenter compteur d'utilisation
                chunk.retrieval_count = F('retrieval_count') + 1
                chunk.save(update_fields=['retrieval_count'])

            logger.info(f"Trouvé {len(chunks)} chunks pertinents pour: {query[:50]}")
            return chunks

        except Exception as e:
            logger.error(f"Erreur recherche vectorielle: {e}")
            return []

    def generate_response_with_context(
        self,
        query: str,
        context_chunks: List[Dict[str, Any]],
        conversation_history: Optional[List[Dict[str, str]]] = None,
        system_prompt: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Génère une réponse en utilisant les chunks pertinents comme contexte

        Args:
            query: Question de l'utilisateur
            context_chunks: Chunks récupérés par la recherche vectorielle
            conversation_history: Historique de conversation
            system_prompt: Instructions système personnalisées

        Returns:
            Dict avec réponse et métadonnées
        """
        try:
            # Charger le service LLM si nécessaire
            if self.llm_service is None:
                self.llm_service = get_llm_service()

            # Construire le contexte à partir des chunks
            context_text = self._build_context_from_chunks(context_chunks)

            # Prompt système par défaut pour SYSCOHADA
            if system_prompt is None:
                system_prompt = """Tu es Paloma, l'assistante IA de WiseBook, experte en comptabilité SYSCOHADA et gestion d'entreprise.

Tes responsabilités:
- Répondre aux questions sur le référentiel SYSCOHADA avec précision
- Aider à la comptabilisation des opérations selon les normes OHADA
- Détecter et signaler les anomalies dans les écritures comptables
- Proposer des suggestions d'amélioration
- Assister les utilisateurs avec clarté et pédagogie

Règles importantes:
- Base tes réponses UNIQUEMENT sur le contexte fourni (guide SYSCOHADA)
- Si l'information n'est pas dans le contexte, dis-le clairement
- Cite toujours les articles SYSCOHADA pertinents
- Sois précise et technique mais reste compréhensible
- Propose des exemples pratiques quand c'est pertinent
"""

            # Générer la réponse
            response = self.llm_service.generate_response(
                query=query,
                context=context_text,
                system_prompt=system_prompt,
                conversation_history=conversation_history
            )

            # Ajouter les citations
            response['citations'] = self._extract_citations(context_chunks)
            response['context_chunks'] = [c['id'] for c in context_chunks]

            return response

        except Exception as e:
            logger.error(f"Erreur génération réponse: {e}")
            return {
                'response': "Désolée, j'ai rencontré une erreur lors de la génération de la réponse.",
                'error': str(e),
                'citations': []
            }

    def ask_paloma(
        self,
        query: str,
        company,
        user,
        session_id: Optional[int] = None,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        Interface principale pour interroger Paloma

        Args:
            query: Question de l'utilisateur
            company: Instance Company
            user: Instance User
            session_id: ID de session existante (optionnel)
            top_k: Nombre de chunks à récupérer

        Returns:
            Dict avec réponse complète
        """
        try:
            # Créer ou récupérer la session
            if session_id:
                session = ConversationSession.objects.get(id=session_id, company=company)
            else:
                session = ConversationSession.objects.create(
                    company=company,
                    user=user,
                    title=query[:100]  # Utiliser la première question comme titre
                )

            # Sauvegarder le message utilisateur
            user_message = ConversationMessage.objects.create(
                session=session,
                role='USER',
                content=query
            )

            # Recherche vectorielle
            relevant_chunks = self.search_similar_chunks(
                query=query,
                top_k=top_k,
                document_type='SYSCOHADA_GUIDE'
            )

            # Récupérer l'historique de conversation
            conversation_history = self._get_conversation_history(session)

            # Générer la réponse
            response_data = self.generate_response_with_context(
                query=query,
                context_chunks=relevant_chunks,
                conversation_history=conversation_history
            )

            # Sauvegarder le message assistant
            assistant_message = ConversationMessage.objects.create(
                session=session,
                role='ASSISTANT',
                content=response_data['response'],
                model_used=response_data.get('model_name', 'unknown'),
                tokens_used=response_data.get('tokens_used', 0),
                processing_time_ms=response_data.get('processing_time_ms', 0),
                retrieved_chunks=response_data.get('context_chunks', []),
                citations=response_data.get('citations', [])
            )

            # Mettre à jour les statistiques de session
            session.total_messages = F('total_messages') + 2
            session.total_tokens_used = F('total_tokens_used') + response_data.get('tokens_used', 0)
            session.save(update_fields=['total_messages', 'total_tokens_used', 'last_activity_at'])

            return {
                'success': True,
                'session_id': session.id,
                'response': response_data['response'],
                'citations': response_data.get('citations', []),
                'relevant_chunks': len(relevant_chunks),
                'tokens_used': response_data.get('tokens_used', 0),
                'model_used': response_data.get('model_name', 'unknown')
            }

        except Exception as e:
            logger.error(f"Erreur dans ask_paloma: {e}")
            return {
                'success': False,
                'error': str(e),
                'response': "Désolée, une erreur s'est produite. Veuillez réessayer."
            }

    def _build_context_from_chunks(self, chunks: List[Dict[str, Any]]) -> str:
        """
        Construit le contexte textuel à partir des chunks récupérés

        Args:
            chunks: Liste de chunks

        Returns:
            Contexte formaté
        """
        if not chunks:
            return "Aucun contexte disponible."

        context_parts = ["=== CONTEXTE SYSCOHADA ===\n"]

        for idx, chunk in enumerate(chunks, start=1):
            context_parts.append(f"\n--- Document {idx} ---")

            # Ajouter métadonnées si disponibles
            if chunk.get('article_number'):
                context_parts.append(f"Article: {chunk['article_number']}")
            if chunk.get('section_title'):
                context_parts.append(f"Section: {chunk['section_title']}")
            if chunk.get('page_number'):
                context_parts.append(f"Page: {chunk['page_number']}")

            context_parts.append(f"\nContenu:\n{chunk['content']}")
            context_parts.append(f"\n(Pertinence: {chunk['similarity_score']:.2%})")

        context_parts.append("\n=== FIN DU CONTEXTE ===")

        return "\n".join(context_parts)

    def _extract_citations(self, chunks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extrait les citations des chunks pour référencement

        Args:
            chunks: Liste de chunks

        Returns:
            Liste de citations formatées
        """
        citations = []

        for chunk in chunks:
            citation = {
                'source': chunk.get('document_title', 'Guide SYSCOHADA'),
                'type': chunk.get('document_type', 'SYSCOHADA_GUIDE')
            }

            if chunk.get('article_number'):
                citation['reference'] = f"Article {chunk['article_number']}"
            elif chunk.get('section_title'):
                citation['reference'] = chunk['section_title']
            else:
                citation['reference'] = f"Page {chunk.get('page_number', 'N/A')}"

            citations.append(citation)

        return citations

    def _get_conversation_history(
        self,
        session: ConversationSession,
        max_messages: int = 10
    ) -> List[Dict[str, str]]:
        """
        Récupère l'historique de conversation

        Args:
            session: Session de conversation
            max_messages: Nombre maximum de messages à inclure

        Returns:
            Liste de messages {role, content}
        """
        messages = session.messages.order_by('-created_at')[:max_messages]

        # Inverser pour ordre chronologique
        history = []
        for msg in reversed(messages):
            history.append({
                'role': msg.role.lower(),
                'content': msg.content
            })

        return history

    def search_syscohada_articles(
        self,
        article_number: str
    ) -> List[Dict[str, Any]]:
        """
        Recherche des articles SYSCOHADA spécifiques

        Args:
            article_number: Numéro d'article (ex: "15", "342")

        Returns:
            Liste de chunks correspondants
        """
        try:
            chunks = DocumentChunk.objects.filter(
                article_number__icontains=article_number,
                document_source__document_type='SYSCOHADA_GUIDE'
            ).select_related('document_source')

            results = []
            for chunk in chunks:
                results.append({
                    'content': chunk.content,
                    'article_number': chunk.article_number,
                    'section_title': chunk.section_title,
                    'page_number': chunk.page_number,
                    'document_title': chunk.document_source.title
                })

            return results

        except Exception as e:
            logger.error(f"Erreur recherche article: {e}")
            return []

    def search_code_documentation(
        self,
        query: str,
        search_type: Optional[str] = None,
        top_k: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Recherche dans la documentation du code WiseBook

        Args:
            query: Requête (ex: "modèle Company", "service trésorerie")
            search_type: Filtrer par type (model, view, service)
            top_k: Nombre de résultats

        Returns:
            Liste de chunks de code pertinents
        """
        try:
            # Recherche vectorielle dans la doc code
            chunks = self.search_similar_chunks(
                query=query,
                top_k=top_k,
                document_type='CODE_DOCUMENTATION',
                min_similarity=0.4
            )

            # Filtrer par type si spécifié
            if search_type:
                chunks = [
                    c for c in chunks
                    if c.get('metadata', {}).get('type') == search_type
                ]

            return chunks

        except Exception as e:
            logger.error(f"Erreur recherche code: {e}")
            return []

    def ask_about_wisebook(
        self,
        query: str,
        company,
        user,
        session_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Poser une question sur le logiciel WiseBook lui-même
        (pas SYSCOHADA, mais sur comment utiliser WiseBook)

        Args:
            query: Question sur WiseBook
            company: Instance Company
            user: Instance User
            session_id: ID de session (optionnel)

        Returns:
            Réponse avec documentation du code
        """
        try:
            # Rechercher dans la documentation du code
            code_chunks = self.search_code_documentation(
                query=query,
                top_k=5
            )

            # Créer ou récupérer session
            if session_id:
                session = ConversationSession.objects.get(id=session_id, company=company)
            else:
                session = ConversationSession.objects.create(
                    company=company,
                    user=user,
                    title=f"Question WiseBook: {query[:80]}"
                )

            # Sauvegarder message utilisateur
            user_message = ConversationMessage.objects.create(
                session=session,
                role='USER',
                content=query
            )

            # Prompt système spécialisé pour questions sur le logiciel
            system_prompt = """Tu es Paloma, l'assistante IA de WiseBook. Tu connais parfaitement le logiciel WiseBook par cœur.

Tes responsabilités:
- Expliquer comment utiliser les différentes fonctionnalités de WiseBook
- Guider les utilisateurs sur les modèles, vues, et services disponibles
- Aider à comprendre la structure du projet
- Expliquer les relations entre les différents modules

Règles:
- Base tes réponses sur la documentation du code fournie
- Sois précise et technique mais compréhensible
- Donne des exemples concrets d'utilisation
- Si l'information n'est pas dans le contexte, dis-le clairement
"""

            # Récupérer historique
            conversation_history = self._get_conversation_history(session)

            # Générer réponse
            response_data = self.generate_response_with_context(
                query=query,
                context_chunks=code_chunks,
                conversation_history=conversation_history,
                system_prompt=system_prompt
            )

            # Sauvegarder réponse
            assistant_message = ConversationMessage.objects.create(
                session=session,
                role='ASSISTANT',
                content=response_data['response'],
                model_used=response_data.get('model_name', 'unknown'),
                tokens_used=response_data.get('tokens_used', 0),
                processing_time_ms=response_data.get('processing_time_ms', 0),
                retrieved_chunks=response_data.get('context_chunks', []),
                citations=response_data.get('citations', [])
            )

            # Mettre à jour session
            session.total_messages = F('total_messages') + 2
            session.total_tokens_used = F('total_tokens_used') + response_data.get('tokens_used', 0)
            session.save(update_fields=['total_messages', 'total_tokens_used', 'last_activity_at'])

            return {
                'success': True,
                'session_id': session.id,
                'response': response_data['response'],
                'code_references': [c['section_title'] for c in code_chunks],
                'relevant_chunks': len(code_chunks),
                'tokens_used': response_data.get('tokens_used', 0)
            }

        except Exception as e:
            logger.error(f"Erreur ask_about_wisebook: {e}")
            return {
                'success': False,
                'error': str(e),
                'response': "Désolée, une erreur s'est produite."
            }


# Instance globale
_rag_service_instance = None


def get_rag_service() -> RAGService:
    """
    Récupère l'instance singleton du service RAG

    Returns:
        Instance RAGService
    """
    global _rag_service_instance

    if _rag_service_instance is None:
        _rag_service_instance = RAGService()

    return _rag_service_instance
