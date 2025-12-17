"""
Tâches Celery pour le système IA Paloma
Indexation de documents, analyse de code, et maintenance
"""
import logging
from celery import shared_task
from django.utils import timezone
from django.db import transaction

from apps.advanced_bi.models import DocumentSource, DocumentChunk
from apps.advanced_bi.services.document_processor import get_document_processor
from apps.advanced_bi.services.embedding_service import get_embedding_service

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_and_index_document(self, document_source_id: int):
    """
    Traite et indexe un document pour le RAG

    Args:
        document_source_id: ID du DocumentSource à traiter

    Returns:
        Dict avec résultats
    """
    try:
        logger.info(f"Début traitement document ID: {document_source_id}")

        # Récupérer le document
        document = DocumentSource.objects.get(id=document_source_id)

        # Mettre à jour le statut
        document.status = 'PROCESSING'
        document.processing_started_at = timezone.now()
        document.save(update_fields=['status', 'processing_started_at'])

        # Traiter le document selon le type
        if document.file:
            file_path = document.file.path

            # Extraire et découper le texte
            processor = get_document_processor()
            result = processor.process_pdf_document(
                file_path=file_path,
                document_type=document.document_type
            )

            if not result['success']:
                raise Exception(result.get('error', 'Erreur de traitement'))

            # Mettre à jour les métadonnées du document
            document.total_pages = result['total_pages']
            document.total_chunks = result['total_chunks']
            document.save(update_fields=['total_pages', 'total_chunks'])

            # Créer les chunks et générer les embeddings
            chunks_created = create_chunks_with_embeddings(
                document_source=document,
                chunks_data=result['chunks']
            )

            document.total_embeddings = chunks_created
            document.status = 'INDEXED'
            document.processing_completed_at = timezone.now()
            document.save(update_fields=['total_embeddings', 'status', 'processing_completed_at'])

            logger.info(f"Document {document_source_id} traité avec succès: {chunks_created} chunks")

            return {
                'success': True,
                'document_id': document_source_id,
                'chunks_created': chunks_created,
                'total_pages': result['total_pages']
            }

        else:
            raise Exception("Aucun fichier associé au document")

    except Exception as e:
        logger.error(f"Erreur traitement document {document_source_id}: {e}")

        # Mettre à jour le statut d'erreur
        try:
            document = DocumentSource.objects.get(id=document_source_id)
            document.status = 'ERROR'
            document.error_message = str(e)
            document.save(update_fields=['status', 'error_message'])
        except Exception as update_error:
            logger.warning(f"Could not update document status: {update_error}")

        # Retry si possible
        raise self.retry(exc=e, countdown=60)


def create_chunks_with_embeddings(
    document_source: DocumentSource,
    chunks_data: list
) -> int:
    """
    Crée les chunks en base de données avec leurs embeddings

    Args:
        document_source: Source du document
        chunks_data: Données des chunks

    Returns:
        Nombre de chunks créés
    """
    embedding_service = get_embedding_service()
    chunks_created = 0

    # Extraire tous les contenus pour génération en batch
    contents = [chunk['content'] for chunk in chunks_data]

    # Générer les embeddings en batch
    logger.info(f"Génération de {len(contents)} embeddings...")
    embeddings = embedding_service.generate_embeddings_batch(
        texts=contents,
        batch_size=32,
        show_progress=True
    )

    # Créer les chunks avec leurs embeddings
    with transaction.atomic():
        for idx, chunk_data in enumerate(chunks_data):
            # Extraire les métadonnées SYSCOHADA
            syscohada_meta = chunk_data.get('syscohada_metadata', {})

            DocumentChunk.objects.create(
                document_source=document_source,
                content=chunk_data['content'],
                chunk_index=chunk_data['chunk_index'],
                embedding=embeddings[idx],
                page_number=chunk_data.get('page_number'),
                section_title=chunk_data.get('section_title'),
                article_number=syscohada_meta.get('article_numbers', [''])[0] if syscohada_meta.get('article_numbers') else '',
                regulation_reference=', '.join(syscohada_meta.get('regulation_references', [])),
                token_count=chunk_data.get('token_count'),
                char_count=chunk_data['char_count'],
                metadata=chunk_data.get('metadata', {})
            )
            chunks_created += 1

    logger.info(f"{chunks_created} chunks créés avec succès")
    return chunks_created


@shared_task
def reindex_document(document_source_id: int):
    """
    Réindexe un document existant (supprime les anciens chunks)

    Args:
        document_source_id: ID du document

    Returns:
        Dict avec résultats
    """
    try:
        document = DocumentSource.objects.get(id=document_source_id)

        # Supprimer les anciens chunks
        old_chunks_count = document.chunks.count()
        document.chunks.all().delete()

        logger.info(f"Suppression de {old_chunks_count} anciens chunks")

        # Réindexer
        result = process_and_index_document(document_source_id)

        return {
            'success': True,
            'old_chunks_deleted': old_chunks_count,
            'new_chunks_created': result.get('chunks_created', 0)
        }

    except Exception as e:
        logger.error(f"Erreur réindexation: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task
def analyze_project_code(company_id: int, directory_path: str):
    """
    Analyse le code d'un projet complet

    Args:
        company_id: ID de la company
        directory_path: Chemin du répertoire à analyser

    Returns:
        Dict avec résultats
    """
    try:
        from apps.core.models import Company
        from apps.advanced_bi.services.code_analyzer import get_code_analyzer

        company = Company.objects.get(id=company_id)
        analyzer = get_code_analyzer(company)

        # Scanner le répertoire
        result = analyzer.scan_project_directory(directory_path)

        logger.info(f"Analyse code terminée: {result.get('total_issues', 0)} issues")

        return result

    except Exception as e:
        logger.error(f"Erreur analyse code: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task
def update_chunk_statistics():
    """
    Met à jour les statistiques d'utilisation des chunks

    Tâche périodique pour calculer les scores de pertinence moyens
    """
    try:
        from django.db.models import Avg

        chunks_with_usage = DocumentChunk.objects.filter(retrieval_count__gt=0)

        for chunk in chunks_with_usage:
            # Calculer score moyen (simulation - à adapter selon vos feedbacks)
            # Pour l'instant, on considère que plus un chunk est utilisé, plus il est pertinent
            relevance = min(chunk.retrieval_count / 100.0, 1.0)
            chunk.relevance_score_avg = relevance
            chunk.save(update_fields=['relevance_score_avg'])

        logger.info(f"Statistiques mises à jour pour {chunks_with_usage.count()} chunks")

        return {
            'success': True,
            'chunks_updated': chunks_with_usage.count()
        }

    except Exception as e:
        logger.error(f"Erreur mise à jour statistiques: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task
def generate_paloma_analytics(company_id: int, period_type: str):
    """
    Génère les analytiques d'utilisation de Paloma

    Args:
        company_id: ID de la company
        period_type: 'HOUR', 'DAY', 'WEEK', 'MONTH'

    Returns:
        Dict avec résultats
    """
    try:
        from apps.core.models import Company
        from apps.advanced_bi.models import (
            PalomaAnalytics,
            ConversationSession,
            ConversationMessage,
            CodeAnalysisResult
        )
        from django.db.models import Avg, Count
        from datetime import timedelta

        company = Company.objects.get(id=company_id)

        # Définir la période
        now = timezone.now()
        if period_type == 'HOUR':
            period_start = now.replace(minute=0, second=0, microsecond=0)
            period_end = period_start + timedelta(hours=1)
        elif period_type == 'DAY':
            period_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            period_end = period_start + timedelta(days=1)
        elif period_type == 'WEEK':
            period_start = now - timedelta(days=now.weekday())
            period_start = period_start.replace(hour=0, minute=0, second=0, microsecond=0)
            period_end = period_start + timedelta(days=7)
        else:  # MONTH
            period_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            if now.month == 12:
                period_end = period_start.replace(year=now.year + 1, month=1)
            else:
                period_end = period_start.replace(month=now.month + 1)

        # Récupérer les données
        sessions = ConversationSession.objects.filter(
            company=company,
            started_at__gte=period_start,
            started_at__lt=period_end
        )

        messages = ConversationMessage.objects.filter(
            session__company=company,
            created_at__gte=period_start,
            created_at__lt=period_end
        )

        code_issues = CodeAnalysisResult.objects.filter(
            company=company,
            created_at__gte=period_start,
            created_at__lt=period_end
        )

        # Calculer les métriques
        total_queries = messages.filter(role='USER').count()
        total_conversations = sessions.count()
        total_tokens = sum(m.tokens_used or 0 for m in messages)

        helpful_count = messages.filter(helpful=True).count()
        unhelpful_count = messages.filter(helpful=False).count()

        avg_response_time = messages.filter(
            processing_time_ms__isnull=False
        ).aggregate(Avg('processing_time_ms'))['processing_time_ms__avg']

        avg_rating = sessions.filter(
            user_rating__isnull=False
        ).aggregate(Avg('user_rating'))['user_rating__avg']

        code_issues_found = code_issues.count()
        code_issues_fixed = code_issues.filter(fixed=True).count()

        # Créer ou mettre à jour l'analytique
        analytics, created = PalomaAnalytics.objects.update_or_create(
            company=company,
            period_type=period_type,
            period_start=period_start,
            defaults={
                'period_end': period_end,
                'total_queries': total_queries,
                'total_conversations': total_conversations,
                'total_tokens_used': total_tokens,
                'average_response_time_ms': int(avg_response_time) if avg_response_time else None,
                'helpful_responses_count': helpful_count,
                'unhelpful_responses_count': unhelpful_count,
                'average_rating': avg_rating,
                'code_issues_found': code_issues_found,
                'code_issues_fixed': code_issues_fixed,
            }
        )

        logger.info(f"Analytiques générées pour {company.name} - {period_type}")

        return {
            'success': True,
            'analytics_id': analytics.id,
            'total_queries': total_queries,
            'total_conversations': total_conversations
        }

    except Exception as e:
        logger.error(f"Erreur génération analytiques: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task
def cleanup_old_conversations(days_to_keep: int = 365):
    """
    Nettoie les anciennes conversations

    Args:
        days_to_keep: Nombre de jours à conserver

    Returns:
        Dict avec résultats
    """
    try:
        from apps.advanced_bi.models import ConversationSession
        from datetime import timedelta

        cutoff_date = timezone.now() - timedelta(days=days_to_keep)

        old_sessions = ConversationSession.objects.filter(
            last_activity_at__lt=cutoff_date
        )

        count = old_sessions.count()
        old_sessions.delete()

        logger.info(f"Suppression de {count} anciennes conversations")

        return {
            'success': True,
            'deleted_count': count
        }

    except Exception as e:
        logger.error(f"Erreur nettoyage conversations: {e}")
        return {
            'success': False,
            'error': str(e)
        }


@shared_task(bind=True, max_retries=2)
def index_wisebook_codebase(self, company_id: int = None):
    """
    Indexe tout le code source WiseBook pour que Paloma le connaisse par cœur

    Args:
        company_id: ID de la company (optionnel, None = global)

    Returns:
        Dict avec résultats
    """
    try:
        from apps.core.models import Company
        from apps.advanced_bi.services.code_indexer import get_code_indexer

        logger.info("Début indexation du code source WiseBook")

        company = None
        if company_id:
            company = Company.objects.get(id=company_id)

        indexer = get_code_indexer()

        # Indexer tout le projet
        result = indexer.index_entire_project(company=company)

        logger.info(f"Indexation terminée avec succès: {result['total_chunks']} chunks créés")

        return {
            'success': True,
            'models_indexed': result['models_indexed'],
            'views_indexed': result['views_indexed'],
            'services_indexed': result['services_indexed'],
            'total_chunks': result['total_chunks'],
            'document_id': result['document_id']
        }

    except Exception as e:
        logger.error(f"Erreur indexation code source: {e}")
        # Retry si possible
        raise self.retry(exc=e, countdown=300)  # Retry après 5 minutes


@shared_task
def reindex_wisebook_codebase(company_id: int = None):
    """
    Réindexe le code source (supprime l'ancien et recrée)

    Args:
        company_id: ID de la company (optionnel)

    Returns:
        Dict avec résultats
    """
    try:
        from apps.core.models import Company

        company = None
        if company_id:
            company = Company.objects.get(id=company_id)

        # Supprimer l'ancienne indexation
        old_docs = DocumentSource.objects.filter(
            company=company,
            document_type='CODE_DOCUMENTATION'
        )

        old_count = old_docs.count()
        old_docs.delete()

        logger.info(f"Suppression de {old_count} anciennes indexations")

        # Réindexer
        result = index_wisebook_codebase(company_id)

        return {
            'success': True,
            'old_docs_deleted': old_count,
            'new_chunks_created': result.get('total_chunks', 0)
        }

    except Exception as e:
        logger.error(f"Erreur réindexation code: {e}")
        return {
            'success': False,
            'error': str(e)
        }
