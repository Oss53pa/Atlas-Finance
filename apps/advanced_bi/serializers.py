"""
Serializers pour l'API Paloma
"""
from rest_framework import serializers
from apps.advanced_bi.models import (
    DocumentSource,
    DocumentChunk,
    ConversationSession,
    ConversationMessage,
    CodeAnalysisResult,
    PalomaAnalytics
)


class DocumentSourceSerializer(serializers.ModelSerializer):
    """Serializer pour les sources de documents"""

    class Meta:
        model = DocumentSource
        fields = [
            'id', 'title', 'document_type', 'description', 'file', 'url',
            'status', 'total_pages', 'total_chunks', 'total_embeddings',
            'processing_started_at', 'processing_completed_at', 'error_message',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'total_pages', 'total_chunks', 'total_embeddings',
            'processing_started_at', 'processing_completed_at', 'error_message',
            'created_at', 'updated_at'
        ]


class DocumentChunkSerializer(serializers.ModelSerializer):
    """Serializer pour les chunks de documents"""

    document_title = serializers.CharField(source='document_source.title', read_only=True)
    similarity_score = serializers.FloatField(read_only=True, required=False)

    class Meta:
        model = DocumentChunk
        fields = [
            'id', 'document_source', 'document_title', 'content', 'chunk_index',
            'page_number', 'section_title', 'article_number', 'regulation_reference',
            'token_count', 'char_count', 'retrieval_count', 'relevance_score_avg',
            'similarity_score', 'metadata', 'created_at'
        ]
        read_only_fields = ['id', 'retrieval_count', 'relevance_score_avg', 'created_at']


class ConversationMessageSerializer(serializers.ModelSerializer):
    """Serializer pour les messages de conversation"""

    class Meta:
        model = ConversationMessage
        fields = [
            'id', 'session', 'role', 'content', 'model_used', 'tokens_used',
            'processing_time_ms', 'retrieved_chunks', 'citations',
            'suggested_actions', 'helpful', 'user_feedback', 'created_at'
        ]
        read_only_fields = [
            'id', 'model_used', 'tokens_used', 'processing_time_ms',
            'retrieved_chunks', 'citations', 'suggested_actions', 'created_at'
        ]


class ConversationSessionSerializer(serializers.ModelSerializer):
    """Serializer pour les sessions de conversation"""

    messages = ConversationMessageSerializer(many=True, read_only=True)
    last_message_preview = serializers.SerializerMethodField()

    class Meta:
        model = ConversationSession
        fields = [
            'id', 'title', 'context', 'total_messages', 'total_tokens_used',
            'started_at', 'last_activity_at', 'ended_at',
            'user_rating', 'user_feedback', 'messages', 'last_message_preview'
        ]
        read_only_fields = [
            'id', 'total_messages', 'total_tokens_used', 'started_at',
            'last_activity_at', 'messages', 'last_message_preview'
        ]

    def get_last_message_preview(self, obj):
        """Retourne un aperçu du dernier message"""
        last_message = obj.messages.order_by('-created_at').first()
        if last_message:
            content = last_message.content
            return content[:100] + "..." if len(content) > 100 else content
        return None


class CodeAnalysisResultSerializer(serializers.ModelSerializer):
    """Serializer pour les résultats d'analyse de code"""

    class Meta:
        model = CodeAnalysisResult
        fields = [
            'id', 'file_path', 'line_number', 'column_number', 'category',
            'severity', 'title', 'description', 'code_snippet', 'suggestion',
            'fixed_code', 'acknowledged', 'fixed', 'false_positive', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class PalomaAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer pour les analytiques Paloma"""

    class Meta:
        model = PalomaAnalytics
        fields = [
            'id', 'period_type', 'period_start', 'period_end',
            'total_queries', 'total_conversations', 'total_tokens_used',
            'average_response_time_ms', 'helpful_responses_count',
            'unhelpful_responses_count', 'average_rating',
            'top_intents', 'top_syscohada_topics',
            'code_issues_found', 'code_issues_fixed', 'total_cost'
        ]
        read_only_fields = ['id']


class AskPalomaRequestSerializer(serializers.Serializer):
    """Serializer pour les requêtes à Paloma"""

    query = serializers.CharField(
        max_length=5000,
        help_text="Question à poser à Paloma"
    )
    session_id = serializers.IntegerField(
        required=False,
        allow_null=True,
        help_text="ID de session existante (optionnel)"
    )
    top_k = serializers.IntegerField(
        default=5,
        min_value=1,
        max_value=20,
        help_text="Nombre de chunks à récupérer"
    )


class AskPalomaResponseSerializer(serializers.Serializer):
    """Serializer pour les réponses de Paloma"""

    success = serializers.BooleanField()
    session_id = serializers.IntegerField()
    response = serializers.CharField()
    citations = serializers.ListField(child=serializers.DictField())
    relevant_chunks = serializers.IntegerField()
    tokens_used = serializers.IntegerField()
    model_used = serializers.CharField()
    error = serializers.CharField(required=False)


class SearchSYSCOHADARequestSerializer(serializers.Serializer):
    """Serializer pour recherche SYSCOHADA"""

    query = serializers.CharField(
        max_length=1000,
        required=False,
        help_text="Recherche sémantique"
    )
    article_number = serializers.CharField(
        max_length=50,
        required=False,
        help_text="Numéro d'article spécifique"
    )
    top_k = serializers.IntegerField(default=10, min_value=1, max_value=50)


class UploadDocumentSerializer(serializers.Serializer):
    """Serializer pour upload de documents"""

    file = serializers.FileField(
        help_text="Fichier PDF du guide SYSCOHADA ou autre document"
    )
    title = serializers.CharField(max_length=500)
    document_type = serializers.ChoiceField(
        choices=DocumentSource.DOCUMENT_TYPES
    )
    description = serializers.CharField(
        max_length=2000,
        required=False,
        allow_blank=True
    )


class CodeAnalysisRequestSerializer(serializers.Serializer):
    """Serializer pour demande d'analyse de code"""

    code = serializers.CharField(
        required=False,
        help_text="Code snippet à analyser"
    )
    file_path = serializers.CharField(
        required=False,
        help_text="Chemin du fichier à analyser"
    )
    directory_path = serializers.CharField(
        required=False,
        help_text="Chemin du répertoire à scanner"
    )
