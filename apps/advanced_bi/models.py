"""
Modèles pour le système IA avancée Paloma
Système RAG avec pgvector pour SYSCOHADA
"""
from django.db import models
from django.contrib.postgres.fields import ArrayField
from pgvector.django import VectorField
from apps.core.models import BaseModel, Company
from django.contrib.auth import get_user_model

User = get_user_model()


class DocumentSource(BaseModel):
    """
    Sources de documents pour l'IA (Guide SYSCOHADA, documentation, etc.)
    """
    DOCUMENT_TYPES = [
        ('SYSCOHADA_GUIDE', 'Guide SYSCOHADA'),
        ('REGULATORY', 'Document Réglementaire'),
        ('INTERNAL_DOC', 'Documentation Interne'),
        ('TRAINING_MATERIAL', 'Matériel de Formation'),
        ('CODE_DOCUMENTATION', 'Documentation Code Source'),
        ('USER_MANUAL', 'Manuel Utilisateur'),
    ]

    STATUS_CHOICES = [
        ('PENDING', 'En attente'),
        ('PROCESSING', 'En cours de traitement'),
        ('INDEXED', 'Indexé'),
        ('ERROR', 'Erreur'),
    ]

    company = models.ForeignKey(
        Company,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        help_text="Null pour documents globaux"
    )

    title = models.CharField(max_length=500)
    document_type = models.CharField(max_length=30, choices=DOCUMENT_TYPES)
    description = models.TextField(blank=True)

    # Fichier source
    file = models.FileField(upload_to='paloma/documents/%Y/%m/', null=True, blank=True)
    url = models.URLField(max_length=1000, blank=True, help_text="URL si document externe")

    # Métadonnées
    file_size_mb = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    mime_type = models.CharField(max_length=100, blank=True)
    language = models.CharField(max_length=10, default='fr')
    version = models.CharField(max_length=50, blank=True)

    # Traitement
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    processing_started_at = models.DateTimeField(null=True, blank=True)
    processing_completed_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)

    # Statistiques
    total_pages = models.PositiveIntegerField(null=True, blank=True)
    total_chunks = models.PositiveIntegerField(default=0)
    total_embeddings = models.PositiveIntegerField(default=0)

    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'apps_advanced_bi_documentsource'
        verbose_name = 'Source de Document'
        verbose_name_plural = 'Sources de Documents'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.get_document_type_display()})"


class DocumentChunk(BaseModel):
    """
    Chunks de documents avec embeddings vectoriels pour la recherche sémantique
    """
    document_source = models.ForeignKey(
        DocumentSource,
        on_delete=models.CASCADE,
        related_name='chunks'
    )

    # Contenu
    content = models.TextField(help_text="Contenu textuel du chunk")
    chunk_index = models.PositiveIntegerField(help_text="Position dans le document")

    # Embedding vectoriel (dimension 384 pour sentence-transformers, 768 pour CamemBERT)
    embedding = VectorField(dimensions=768, null=True, blank=True)

    # Métadonnées de localisation
    page_number = models.PositiveIntegerField(null=True, blank=True)
    section_title = models.CharField(max_length=500, blank=True)
    section_number = models.CharField(max_length=50, blank=True)

    # Métadonnées pour SYSCOHADA
    article_number = models.CharField(max_length=50, blank=True, help_text="Numéro d'article SYSCOHADA")
    regulation_reference = models.CharField(max_length=200, blank=True)

    # Tokens et taille
    token_count = models.PositiveIntegerField(null=True, blank=True)
    char_count = models.PositiveIntegerField(null=True, blank=True)

    # Métadonnées additionnelles en JSON
    metadata = models.JSONField(default=dict, blank=True)

    # Statistiques d'utilisation
    retrieval_count = models.PositiveIntegerField(default=0, help_text="Nombre de fois récupéré")
    relevance_score_avg = models.DecimalField(
        max_digits=5,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Score moyen de pertinence"
    )

    class Meta:
        db_table = 'apps_advanced_bi_documentchunk'
        verbose_name = 'Chunk de Document'
        verbose_name_plural = 'Chunks de Documents'
        ordering = ['document_source', 'chunk_index']
        indexes = [
            models.Index(fields=['document_source', 'chunk_index']),
            models.Index(fields=['article_number']),
            models.Index(fields=['page_number']),
        ]

    def __str__(self):
        return f"Chunk {self.chunk_index} - {self.document_source.title[:50]}"


class ConversationSession(BaseModel):
    """
    Sessions de conversation avec Paloma
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    title = models.CharField(max_length=500, blank=True, help_text="Titre généré automatiquement")
    context = models.JSONField(default=dict, help_text="Contexte de conversation")

    # Statistiques
    total_messages = models.PositiveIntegerField(default=0)
    total_tokens_used = models.PositiveIntegerField(default=0)

    started_at = models.DateTimeField(auto_now_add=True)
    last_activity_at = models.DateTimeField(auto_now=True)
    ended_at = models.DateTimeField(null=True, blank=True)

    # Évaluation
    user_rating = models.PositiveSmallIntegerField(null=True, blank=True, help_text="Note 1-5")
    user_feedback = models.TextField(blank=True)

    class Meta:
        db_table = 'apps_advanced_bi_conversationsession'
        verbose_name = 'Session de Conversation'
        verbose_name_plural = 'Sessions de Conversation'
        ordering = ['-last_activity_at']

    def __str__(self):
        return f"Session {self.id} - {self.user.email} - {self.started_at.strftime('%Y-%m-%d')}"


class ConversationMessage(BaseModel):
    """
    Messages dans les conversations avec Paloma
    """
    ROLE_CHOICES = [
        ('USER', 'Utilisateur'),
        ('ASSISTANT', 'Paloma (Assistant)'),
        ('SYSTEM', 'Système'),
    ]

    session = models.ForeignKey(
        ConversationSession,
        on_delete=models.CASCADE,
        related_name='messages'
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    content = models.TextField()

    # Métadonnées de génération
    model_used = models.CharField(max_length=100, blank=True, help_text="claude-3-opus, gpt-4, etc.")
    tokens_used = models.PositiveIntegerField(null=True, blank=True)
    processing_time_ms = models.PositiveIntegerField(null=True, blank=True)

    # Context RAG
    retrieved_chunks = models.JSONField(
        default=list,
        blank=True,
        help_text="IDs des chunks utilisés pour la réponse"
    )
    citations = models.JSONField(
        default=list,
        blank=True,
        help_text="Citations et références SYSCOHADA"
    )

    # Actions suggérées
    suggested_actions = models.JSONField(default=list, blank=True)

    # Feedback
    helpful = models.BooleanField(null=True, blank=True)
    user_feedback = models.TextField(blank=True)

    class Meta:
        db_table = 'apps_advanced_bi_conversationmessage'
        verbose_name = 'Message de Conversation'
        verbose_name_plural = 'Messages de Conversation'
        ordering = ['created_at']

    def __str__(self):
        preview = self.content[:50] + "..." if len(self.content) > 50 else self.content
        return f"{self.get_role_display()}: {preview}"


class CodeAnalysisResult(BaseModel):
    """
    Résultats d'analyse de code par Paloma
    """
    SEVERITY_CHOICES = [
        ('INFO', 'Information'),
        ('WARNING', 'Avertissement'),
        ('ERROR', 'Erreur'),
        ('CRITICAL', 'Critique'),
    ]

    CATEGORY_CHOICES = [
        ('SYNTAX', 'Erreur de syntaxe'),
        ('LOGIC', 'Erreur de logique'),
        ('PERFORMANCE', 'Problème de performance'),
        ('SECURITY', 'Vulnérabilité de sécurité'),
        ('BEST_PRACTICE', 'Bonne pratique'),
        ('CODE_SMELL', 'Code smell'),
        ('SYSCOHADA_COMPLIANCE', 'Conformité SYSCOHADA'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    analyzed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    # Localisation
    file_path = models.CharField(max_length=500)
    line_number = models.PositiveIntegerField(null=True, blank=True)
    column_number = models.PositiveIntegerField(null=True, blank=True)

    # Détails
    category = models.CharField(max_length=30, choices=CATEGORY_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    title = models.CharField(max_length=500)
    description = models.TextField()

    # Code concerné
    code_snippet = models.TextField(blank=True)

    # Suggestions
    suggestion = models.TextField(blank=True, help_text="Suggestion de correction")
    fixed_code = models.TextField(blank=True, help_text="Code corrigé proposé")

    # Statut
    acknowledged = models.BooleanField(default=False)
    fixed = models.BooleanField(default=False)
    false_positive = models.BooleanField(default=False)

    class Meta:
        db_table = 'apps_advanced_bi_codeanalysisresult'
        verbose_name = 'Résultat d\'Analyse de Code'
        verbose_name_plural = 'Résultats d\'Analyse de Code'
        ordering = ['-created_at', '-severity']
        indexes = [
            models.Index(fields=['company', 'severity', 'fixed']),
            models.Index(fields=['file_path']),
        ]

    def __str__(self):
        return f"{self.get_severity_display()} - {self.title}"


class AIModelConfiguration(BaseModel):
    """
    Configuration des modèles IA utilisés par Paloma
    """
    PROVIDER_CHOICES = [
        ('ANTHROPIC', 'Anthropic Claude'),
        ('OPENAI', 'OpenAI GPT'),
        ('LOCAL', 'Modèle Local'),
        ('HUGGINGFACE', 'HuggingFace'),
    ]

    MODEL_TYPE_CHOICES = [
        ('LLM', 'Large Language Model'),
        ('EMBEDDING', 'Modèle d\'Embeddings'),
        ('CLASSIFICATION', 'Modèle de Classification'),
    ]

    name = models.CharField(max_length=200)
    provider = models.CharField(max_length=30, choices=PROVIDER_CHOICES)
    model_type = models.CharField(max_length=30, choices=MODEL_TYPE_CHOICES)
    model_id = models.CharField(max_length=200, help_text="claude-3-opus, gpt-4, etc.")

    # Configuration
    api_key_encrypted = models.CharField(max_length=500, blank=True)
    endpoint_url = models.URLField(max_length=500, blank=True)
    parameters = models.JSONField(default=dict, help_text="Temperature, max_tokens, etc.")

    # Limites
    max_tokens = models.PositiveIntegerField(default=4096)
    rate_limit_per_minute = models.PositiveIntegerField(default=60)
    cost_per_1k_tokens = models.DecimalField(max_digits=10, decimal_places=6, null=True, blank=True)

    # État
    is_active = models.BooleanField(default=True)
    is_default = models.BooleanField(default=False)

    # Statistiques
    total_requests = models.PositiveIntegerField(default=0)
    total_tokens_used = models.PositiveBigIntegerField(default=0)
    total_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    class Meta:
        db_table = 'apps_advanced_bi_aimodelconfiguration'
        verbose_name = 'Configuration de Modèle IA'
        verbose_name_plural = 'Configurations de Modèles IA'

    def __str__(self):
        return f"{self.name} ({self.get_provider_display()})"


class PalomaAnalytics(BaseModel):
    """
    Analytiques et métriques d'utilisation de Paloma
    """
    PERIOD_CHOICES = [
        ('HOUR', 'Horaire'),
        ('DAY', 'Journalier'),
        ('WEEK', 'Hebdomadaire'),
        ('MONTH', 'Mensuel'),
    ]

    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()

    # Métriques d'utilisation
    total_queries = models.PositiveIntegerField(default=0)
    total_conversations = models.PositiveIntegerField(default=0)
    total_tokens_used = models.PositiveBigIntegerField(default=0)

    # Métriques de qualité
    average_response_time_ms = models.PositiveIntegerField(null=True, blank=True)
    helpful_responses_count = models.PositiveIntegerField(default=0)
    unhelpful_responses_count = models.PositiveIntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True)

    # Top queries
    top_intents = models.JSONField(default=dict, blank=True)
    top_syscohada_topics = models.JSONField(default=list, blank=True)

    # Analyse de code
    code_issues_found = models.PositiveIntegerField(default=0)
    code_issues_fixed = models.PositiveIntegerField(default=0)

    # Coûts
    total_cost = models.DecimalField(max_digits=15, decimal_places=2, default=0)

    class Meta:
        db_table = 'apps_advanced_bi_palomaanalytics'
        verbose_name = 'Analytique Paloma'
        verbose_name_plural = 'Analytiques Paloma'
        unique_together = ['company', 'period_type', 'period_start']
        ordering = ['-period_start']

    def __str__(self):
        return f"Analytics {self.company.name} - {self.period_start.strftime('%Y-%m-%d')}"
