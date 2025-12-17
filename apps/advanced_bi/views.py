"""
API Views pour Paloma - Assistant IA WiseBook
"""
import logging
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404

from apps.advanced_bi.models import (
    DocumentSource,
    DocumentChunk,
    ConversationSession,
    ConversationMessage,
    CodeAnalysisResult,
    PalomaAnalytics
)
from apps.advanced_bi.serializers import (
    DocumentSourceSerializer,
    DocumentChunkSerializer,
    ConversationSessionSerializer,
    ConversationMessageSerializer,
    CodeAnalysisResultSerializer,
    PalomaAnalyticsSerializer,
    AskPalomaRequestSerializer,
    AskPalomaResponseSerializer,
    SearchSYSCOHADARequestSerializer,
    UploadDocumentSerializer,
    CodeAnalysisRequestSerializer
)
from apps.advanced_bi.services.rag_service import get_rag_service
from apps.advanced_bi.services.code_analyzer import get_code_analyzer
from apps.advanced_bi.tasks import process_and_index_document, analyze_project_code

logger = logging.getLogger(__name__)


class PalomaViewSet(viewsets.ViewSet):
    """
    ViewSet principal pour interagir avec Paloma
    """
    permission_classes = [IsAuthenticated]

    @action(detail=False, methods=['post'])
    def ask(self, request):
        """
        Poser une question à Paloma

        POST /api/paloma/ask/
        {
            "query": "Comment comptabiliser une immobilisation ?",
            "session_id": 123,  # optionnel
            "top_k": 5
        }
        """
        serializer = AskPalomaRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            rag_service = get_rag_service()

            result = rag_service.ask_paloma(
                query=serializer.validated_data['query'],
                company=request.user.company,
                user=request.user,
                session_id=serializer.validated_data.get('session_id'),
                top_k=serializer.validated_data.get('top_k', 5)
            )

            response_serializer = AskPalomaResponseSerializer(data=result)
            response_serializer.is_valid(raise_exception=True)

            return Response(response_serializer.data)

        except Exception as e:
            logger.error(f"Erreur ask Paloma: {e}")
            return Response(
                {'error': str(e), 'success': False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def search_syscohada(self, request):
        """
        Recherche dans le guide SYSCOHADA

        POST /api/paloma/search_syscohada/
        {
            "query": "immobilisation corporelle",
            "article_number": "15",  # optionnel
            "top_k": 10
        }
        """
        serializer = SearchSYSCOHADARequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            rag_service = get_rag_service()

            # Recherche par numéro d'article
            if serializer.validated_data.get('article_number'):
                results = rag_service.search_syscohada_articles(
                    article_number=serializer.validated_data['article_number']
                )
                return Response({
                    'success': True,
                    'search_type': 'article',
                    'results': results,
                    'total': len(results)
                })

            # Recherche sémantique
            elif serializer.validated_data.get('query'):
                chunks = rag_service.search_similar_chunks(
                    query=serializer.validated_data['query'],
                    top_k=serializer.validated_data.get('top_k', 10),
                    document_type='SYSCOHADA_GUIDE'
                )
                return Response({
                    'success': True,
                    'search_type': 'semantic',
                    'results': chunks,
                    'total': len(chunks)
                })

            else:
                return Response(
                    {'error': 'Fournissez query ou article_number'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            logger.error(f"Erreur recherche SYSCOHADA: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def analyze_code(self, request):
        """
        Analyse de code Python

        POST /api/paloma/analyze_code/
        {
            "code": "def my_function():\n    pass",
            "file_path": "/path/to/file.py",
            "directory_path": "/path/to/project"
        }
        """
        serializer = CodeAnalysisRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            analyzer = get_code_analyzer(request.user.company)

            # Analyse d'un snippet
            if serializer.validated_data.get('code'):
                issues = analyzer.analyze_code_snippet(
                    code=serializer.validated_data['code']
                )
                return Response({
                    'success': True,
                    'analysis_type': 'snippet',
                    'issues': issues,
                    'total_issues': len(issues)
                })

            # Analyse d'un fichier
            elif serializer.validated_data.get('file_path'):
                result = analyzer.analyze_file(
                    file_path=serializer.validated_data['file_path'],
                    user=request.user
                )
                return Response(result)

            # Analyse d'un répertoire (async)
            elif serializer.validated_data.get('directory_path'):
                task = analyze_project_code.delay(
                    company_id=request.user.company.id,
                    directory_path=serializer.validated_data['directory_path']
                )
                return Response({
                    'success': True,
                    'task_id': task.id,
                    'message': 'Analyse en cours (asynchrone)'
                })

            else:
                return Response(
                    {'error': 'Fournissez code, file_path ou directory_path'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        except Exception as e:
            logger.error(f"Erreur analyse code: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def ask_about_wisebook(self, request):
        """
        Poser une question sur WiseBook (le logiciel lui-même)

        POST /api/paloma/ask_about_wisebook/
        {
            "query": "Comment utiliser le modèle Company?",
            "session_id": 123  # optionnel
        }
        """
        serializer = AskPalomaRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            rag_service = get_rag_service()

            result = rag_service.ask_about_wisebook(
                query=serializer.validated_data['query'],
                company=request.user.company,
                user=request.user,
                session_id=serializer.validated_data.get('session_id')
            )

            return Response(result)

        except Exception as e:
            logger.error(f"Erreur ask_about_wisebook: {e}")
            return Response(
                {'error': str(e), 'success': False},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def index_codebase(self, request):
        """
        Indexer tout le code source WiseBook pour que Paloma le connaisse

        POST /api/paloma/index_codebase/
        {}
        """
        from apps.advanced_bi.tasks import index_wisebook_codebase

        try:
            # Lancer l'indexation en arrière-plan
            task = index_wisebook_codebase.delay(
                company_id=None  # Global pour tous
            )

            return Response({
                'success': True,
                'task_id': task.id,
                'message': 'Indexation du code source en cours (peut prendre 5-10 minutes)'
            })

        except Exception as e:
            logger.error(f"Erreur indexation code: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['post'])
    def search_code(self, request):
        """
        Rechercher dans la documentation du code

        POST /api/paloma/search_code/
        {
            "query": "service de trésorerie",
            "search_type": "service",  # optionnel: model, view, service
            "top_k": 5
        }
        """
        query = request.data.get('query')
        search_type = request.data.get('search_type')
        top_k = request.data.get('top_k', 5)

        if not query:
            return Response(
                {'error': 'query requis'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            rag_service = get_rag_service()

            results = rag_service.search_code_documentation(
                query=query,
                search_type=search_type,
                top_k=top_k
            )

            return Response({
                'success': True,
                'results': results,
                'total': len(results)
            })

        except Exception as e:
            logger.error(f"Erreur recherche code: {e}")
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class DocumentSourceViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les sources de documents"""

    permission_classes = [IsAuthenticated]
    serializer_class = DocumentSourceSerializer

    def get_queryset(self):
        """Filtre par company de l'utilisateur"""
        return DocumentSource.objects.filter(
            company=self.request.user.company
        ).order_by('-created_at')

    def perform_create(self, serializer):
        """Crée un document et lance l'indexation"""
        document = serializer.save(
            company=self.request.user.company,
            uploaded_by=self.request.user
        )

        # Lancer l'indexation en arrière-plan
        if document.file:
            process_and_index_document.delay(document.id)

    @action(detail=True, methods=['post'])
    def reindex(self, request, pk=None):
        """Réindexe un document"""
        from apps.advanced_bi.tasks import reindex_document

        document = self.get_object()
        task = reindex_document.delay(document.id)

        return Response({
            'success': True,
            'task_id': task.id,
            'message': 'Réindexation en cours'
        })

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """
        Upload un nouveau document (ex: Guide SYSCOHADA)

        POST /api/documents/upload/
        Form-data:
            - file: PDF file
            - title: string
            - document_type: string
            - description: string (optionnel)
        """
        serializer = UploadDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        document = DocumentSource.objects.create(
            company=request.user.company,
            uploaded_by=request.user,
            title=serializer.validated_data['title'],
            document_type=serializer.validated_data['document_type'],
            description=serializer.validated_data.get('description', ''),
            file=serializer.validated_data['file'],
            file_size_mb=serializer.validated_data['file'].size / (1024 * 1024)
        )

        # Lancer l'indexation
        process_and_index_document.delay(document.id)

        return Response(
            DocumentSourceSerializer(document).data,
            status=status.HTTP_201_CREATED
        )


class ConversationSessionViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les sessions de conversation"""

    permission_classes = [IsAuthenticated]
    serializer_class = ConversationSessionSerializer

    def get_queryset(self):
        """Filtre par company et user"""
        return ConversationSession.objects.filter(
            company=self.request.user.company,
            user=self.request.user
        ).order_by('-last_activity_at')

    @action(detail=True, methods=['post'])
    def rate(self, request, pk=None):
        """
        Note une session de conversation

        POST /api/conversations/{id}/rate/
        {
            "rating": 5,
            "feedback": "Très utile!"
        }
        """
        session = self.get_object()

        rating = request.data.get('rating')
        feedback = request.data.get('feedback', '')

        if rating is not None:
            session.user_rating = rating
            session.user_feedback = feedback
            session.save(update_fields=['user_rating', 'user_feedback'])

        return Response(
            ConversationSessionSerializer(session).data
        )


class CodeAnalysisResultViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour consulter les résultats d'analyse de code"""

    permission_classes = [IsAuthenticated]
    serializer_class = CodeAnalysisResultSerializer

    def get_queryset(self):
        """Filtre par company"""
        queryset = CodeAnalysisResult.objects.filter(
            company=self.request.user.company
        ).order_by('-created_at')

        # Filtres optionnels
        severity = self.request.query_params.get('severity')
        if severity:
            queryset = queryset.filter(severity=severity)

        fixed = self.request.query_params.get('fixed')
        if fixed is not None:
            queryset = queryset.filter(fixed=fixed.lower() == 'true')

        return queryset

    @action(detail=True, methods=['post'])
    def mark_fixed(self, request, pk=None):
        """Marque un problème comme corrigé"""
        result = self.get_object()
        result.fixed = True
        result.save(update_fields=['fixed'])

        return Response({'success': True, 'message': 'Marqué comme corrigé'})

    @action(detail=True, methods=['post'])
    def mark_false_positive(self, request, pk=None):
        """Marque comme faux positif"""
        result = self.get_object()
        result.false_positive = True
        result.save(update_fields=['false_positive'])

        return Response({'success': True, 'message': 'Marqué comme faux positif'})


class PalomaAnalyticsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour consulter les analytiques Paloma"""

    permission_classes = [IsAuthenticated]
    serializer_class = PalomaAnalyticsSerializer

    def get_queryset(self):
        """Filtre par company"""
        return PalomaAnalytics.objects.filter(
            company=self.request.user.company
        ).order_by('-period_start')
