"""
Vues API Grand Livre Nouvelle Génération WiseBook
Navigation multi-modale avec vues chronologique, hiérarchique et analytique
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.db import transaction
from django.db.models import Q, Count, Sum, Avg, F, Prefetch
from django.core.cache import cache
from django.http import JsonResponse, HttpResponse, StreamingHttpResponse
from decimal import Decimal
import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any

from .models import (
    GrandLivreConfiguration,
    LedgerEntryIndex,
    SearchHistory,
    SavedSearch,
    LedgerAnnotation,
    LedgerExportTemplate,
    AIAnalysisResult,
    LedgerAccessLog,
    CollaborativeWorkspace
)
from .services.intelligent_search import (
    IntelligentSearchEngine,
    SearchCriteria,
    SearchType,
    quick_search,
    advanced_search,
    fuzzy_search
)
from apps.core.mixins import CompanyFilterMixin
from apps.core.permissions import IsCompanyMember

logger = logging.getLogger(__name__)


class GrandLivreConfigurationViewSet(CompanyFilterMixin, viewsets.ModelViewSet):
    """Configuration du Grand Livre par société"""

    queryset = GrandLivreConfiguration.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]
    filter_backends = [DjangoFilterBackend]

    def get_queryset(self):
        return super().get_queryset().select_related('company')

    @action(detail=True, methods=['post'])
    def optimize_performance(self, request, pk=None):
        """Optimisation automatique des performances"""
        config = self.get_object()

        # Analyse des métriques de performance actuelles
        recent_searches = SearchHistory.objects.filter(
            company=config.company,
            created_at__gte=timezone.now() - timedelta(days=7)
        )

        avg_response_time = recent_searches.aggregate(avg_time=Avg('response_time_ms'))['avg_time'] or 0

        # Recommandations d'optimisation
        recommendations = []

        if avg_response_time > 2000:  # > 2 secondes
            recommendations.append({
                'type': 'cache_strategy',
                'message': 'Activation du cache Redis recommandée',
                'action': 'enable_redis_cache'
            })

        if recent_searches.count() > 1000:  # Volume élevé
            recommendations.append({
                'type': 'search_engine',
                'message': 'Migration vers Elasticsearch recommandée',
                'action': 'enable_elasticsearch'
            })

        # Application automatique si autorisé
        auto_optimize = request.data.get('auto_apply', False)
        if auto_optimize and recommendations:
            for rec in recommendations:
                if rec['action'] == 'enable_redis_cache':
                    config.cache_strategy = 'REDIS'
                elif rec['action'] == 'enable_elasticsearch':
                    config.search_engine = 'ELASTICSEARCH'

            config.save()

        return Response({
            'status': 'success',
            'current_performance': {
                'avg_response_time_ms': avg_response_time,
                'daily_searches': recent_searches.count() / 7
            },
            'recommendations': recommendations,
            'optimizations_applied': auto_optimize
        })


class LedgerSearchViewSet(CompanyFilterMixin, viewsets.ViewSet):
    """
    ViewSet pour recherche intelligente dans le Grand Livre
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    @action(detail=False, methods=['get', 'post'])
    def quick_search(self, request):
        """Recherche rapide instantanée"""
        query = request.data.get('q') or request.query_params.get('q', '')
        limit = int(request.data.get('limit', 50))

        if not query:
            return Response({
                'error': 'Paramètre de recherche requis'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            # Recherche asynchrone
            result = asyncio.run(quick_search(
                query=query,
                user_id=request.user.id,
                company_id=self.get_company().id,
                limit=limit
            ))

            # Sérialisation des résultats
            entries_data = []
            for entry in result.entries:
                entries_data.append({
                    'id': str(entry.id),
                    'account_number': entry.account_number,
                    'account_label': entry.account_label,
                    'entry_date': entry.entry_date.isoformat(),
                    'debit_amount': str(entry.debit_amount),
                    'credit_amount': str(entry.credit_amount),
                    'journal_code': entry.journal_code,
                    'document_reference': entry.document_reference,
                    'searchable_text': entry.searchable_text[:200] + '...' if len(entry.searchable_text) > 200 else entry.searchable_text
                })

            return Response({
                'status': 'success',
                'results': {
                    'entries': entries_data,
                    'total_count': result.total_count,
                    'response_time_ms': result.response_time_ms,
                    'suggestions': result.suggestions,
                    'aggregations': result.aggregations,
                    'confidence_score': result.confidence_score
                }
            })

        except Exception as e:
            logger.error(f"Erreur recherche rapide: {str(e)}")
            return Response({
                'error': 'Erreur lors de la recherche'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def advanced_search(self, request):
        """Recherche avancée avec filtres multiples"""
        try:
            filters = request.data.get('filters', {})

            # Conversion des dates
            if filters.get('date_from'):
                filters['date_from'] = datetime.fromisoformat(filters['date_from'].replace('Z', '+00:00'))
            if filters.get('date_to'):
                filters['date_to'] = datetime.fromisoformat(filters['date_to'].replace('Z', '+00:00'))

            # Conversion des montants
            if filters.get('amount_min'):
                filters['amount_min'] = Decimal(str(filters['amount_min']))
            if filters.get('amount_max'):
                filters['amount_max'] = Decimal(str(filters['amount_max']))

            result = asyncio.run(advanced_search(
                filters=filters,
                user_id=request.user.id,
                company_id=self.get_company().id
            ))

            # Log de l'accès
            self._log_access('SEARCH', request, result.entries)

            return self._format_search_response(result)

        except Exception as e:
            logger.error(f"Erreur recherche avancée: {str(e)}")
            return Response({
                'error': 'Erreur lors de la recherche avancée'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def fuzzy_search(self, request):
        """Recherche floue avec tolérance aux erreurs"""
        query = request.data.get('query', '')
        threshold = int(request.data.get('threshold', 80))

        if not query:
            return Response({
                'error': 'Requête de recherche requise'
            }, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = asyncio.run(fuzzy_search(
                query=query,
                user_id=request.user.id,
                company_id=self.get_company().id,
                threshold=threshold
            ))

            return self._format_search_response(result)

        except Exception as e:
            logger.error(f"Erreur recherche floue: {str(e)}")
            return Response({
                'error': 'Erreur lors de la recherche floue'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'])
    def search_suggestions(self, request):
        """Suggestions de recherche basées sur l'historique"""
        company = self.get_company()

        # Recherches fréquentes de l'utilisateur
        user_searches = SearchHistory.objects.filter(
            user=request.user,
            company=company,
            was_successful=True,
            created_at__gte=timezone.now() - timedelta(days=30)
        ).values('search_query').annotate(count=Count('id')).order_by('-count')[:10]

        # Recherches populaires de la société
        popular_searches = SearchHistory.objects.filter(
            company=company,
            was_successful=True,
            created_at__gte=timezone.now() - timedelta(days=7)
        ).values('search_query').annotate(count=Count('id')).order_by('-count')[:5]

        # Comptes fréquemment consultés
        frequent_accounts = LedgerEntryIndex.objects.filter(
            company=company,
            access_count__gt=0
        ).order_by('-access_count')[:10].values('account_number', 'account_label')

        return Response({
            'user_searches': [s['search_query'] for s in user_searches],
            'popular_searches': [s['search_query'] for s in popular_searches],
            'frequent_accounts': list(frequent_accounts)
        })

    def _format_search_response(self, result):
        """Formatage uniforme des réponses de recherche"""
        entries_data = []
        for entry in result.entries:
            entries_data.append({
                'id': str(entry.id),
                'account_number': entry.account_number,
                'account_label': entry.account_label,
                'account_class': entry.account_class,
                'entry_date': entry.entry_date.isoformat(),
                'debit_amount': str(entry.debit_amount),
                'credit_amount': str(entry.credit_amount),
                'absolute_amount': str(entry.absolute_amount),
                'journal_code': entry.journal_code,
                'document_reference': entry.document_reference,
                'sequence_number': entry.sequence_number,
                'currency_code': entry.currency_code,
                'tags': entry.tags,
                'access_count': entry.access_count,
                'last_accessed': entry.last_accessed.isoformat() if entry.last_accessed else None
            })

        return Response({
            'status': 'success',
            'results': {
                'entries': entries_data,
                'total_count': result.total_count,
                'response_time_ms': result.response_time_ms,
                'suggestions': result.suggestions,
                'aggregations': result.aggregations,
                'confidence_score': result.confidence_score,
                'query_explanation': result.query_explanation
            }
        })

    def _log_access(self, access_type: str, request, entries: List):
        """Logging des accès pour audit"""
        try:
            log = LedgerAccessLog.objects.create(
                user=request.user,
                company=self.get_company(),
                access_type=access_type,
                search_criteria=request.data,
                ip_address=self._get_client_ip(request),
                user_agent=request.META.get('HTTP_USER_AGENT', ''),
                session_id=request.session.session_key or '',
                results_count=len(entries)
            )

            # Association avec les écritures consultées
            if entries and len(entries) < 1000:  # Éviter les gros volumes
                log.accessed_entries.set(entries[:100])  # Limite pour performance

        except Exception as e:
            logger.warning(f"Erreur logging accès: {str(e)}")

    def _get_client_ip(self, request):
        """Récupération IP client"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip


class LedgerNavigationViewSet(CompanyFilterMixin, viewsets.ViewSet):
    """
    Vues de navigation avancées pour le Grand Livre
    """

    permission_classes = [permissions.IsAuthenticated, IsCompanyMember]

    @action(detail=False, methods=['get'])
    def chronological_view(self, request):
        """Vue chronologique avec timeline interactive"""
        company = self.get_company()

        # Paramètres de période
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        granularity = request.query_params.get('granularity', 'month')  # day, week, month, year

        if not date_from or not date_to:
            # Période par défaut : 12 derniers mois
            date_to = timezone.now().date()
            date_from = date_to - timedelta(days=365)
        else:
            date_from = datetime.fromisoformat(date_from).date()
            date_to = datetime.fromisoformat(date_to).date()

        # Construction de la timeline selon la granularité
        timeline_data = self._build_timeline(company, date_from, date_to, granularity)

        # Métadonnées pour navigation
        metadata = {
            'period_start': date_from.isoformat(),
            'period_end': date_to.isoformat(),
            'granularity': granularity,
            'total_periods': len(timeline_data),
            'navigation_hints': self._generate_navigation_hints(timeline_data)
        }

        return Response({
            'status': 'success',
            'view_type': 'chronological',
            'timeline': timeline_data,
            'metadata': metadata
        })

    @action(detail=False, methods=['get'])
    def hierarchical_view(self, request):
        """Vue hiérarchique par classes et comptes"""
        company = self.get_company()

        # Paramètres de filtre
        expand_level = int(request.query_params.get('expand_level', 2))  # 1=classes, 2=comptes, 3=détail
        account_class = request.query_params.get('account_class')

        # Construction de l'arborescence
        hierarchy = self._build_account_hierarchy(company, expand_level, account_class)

        # Statistiques par niveau
        stats = self._calculate_hierarchy_stats(hierarchy)

        return Response({
            'status': 'success',
            'view_type': 'hierarchical',
            'hierarchy': hierarchy,
            'expand_level': expand_level,
            'statistics': stats,
            'navigation_path': self._build_breadcrumb(account_class)
        })

    @action(detail=False, methods=['get'])
    def analytical_view(self, request):
        """Vue analytique avec axes et dimensions"""
        company = self.get_company()

        # Axes analytiques
        axis_type = request.query_params.get('axis', 'cost_center')  # cost_center, project, department
        breakdown_by = request.query_params.get('breakdown', 'amount')  # amount, count, frequency

        # Période d'analyse
        period = request.query_params.get('period', '12M')

        # Construction de l'analyse multi-dimensionnelle
        analytical_data = self._build_analytical_breakdown(company, axis_type, breakdown_by, period)

        # Corrélations et insights
        correlations = self._calculate_correlations(analytical_data)
        insights = self._generate_analytical_insights(analytical_data, correlations)

        return Response({
            'status': 'success',
            'view_type': 'analytical',
            'analytical_data': analytical_data,
            'correlations': correlations,
            'insights': insights,
            'axis_type': axis_type,
            'breakdown_by': breakdown_by
        })

    @action(detail=False, methods=['get'])
    def kanban_view(self, request):
        """Vue Kanban par statut de validation/traitement"""
        company = self.get_company()

        # Colonnes du Kanban
        columns = [
            {
                'id': 'draft',
                'title': 'Brouillons',
                'entries': self._get_entries_by_status(company, 'draft')
            },
            {
                'id': 'pending_review',
                'title': 'En attente de révision',
                'entries': self._get_entries_by_status(company, 'pending_review')
            },
            {
                'id': 'validated',
                'title': 'Validées',
                'entries': self._get_entries_by_status(company, 'validated')
            },
            {
                'id': 'with_annotations',
                'title': 'Avec annotations',
                'entries': self._get_entries_with_annotations(company)
            }
        ]

        # Statistiques des workflows
        workflow_stats = self._calculate_workflow_stats(columns)

        return Response({
            'status': 'success',
            'view_type': 'kanban',
            'columns': columns,
            'workflow_stats': workflow_stats
        })

    @action(detail=False, methods=['get'])
    def heatmap_view(self, request):
        """Vue heatmap pour visualiser l'activité"""
        company = self.get_company()

        # Type de heatmap
        heatmap_type = request.query_params.get('type', 'temporal')  # temporal, amount, frequency

        # Période
        months_back = int(request.query_params.get('months', 12))
        end_date = timezone.now().date()
        start_date = end_date - timedelta(days=months_back * 30)

        # Génération des données de heatmap
        heatmap_data = self._generate_heatmap_data(company, heatmap_type, start_date, end_date)

        return Response({
            'status': 'success',
            'view_type': 'heatmap',
            'heatmap_type': heatmap_type,
            'data': heatmap_data,
            'period': {
                'start': start_date.isoformat(),
                'end': end_date.isoformat()
            }
        })

    def _build_timeline(self, company, date_from, date_to, granularity):
        """Construction de la timeline chronologique"""
        # Agrégation par période selon la granularité
        if granularity == 'day':
            trunc_func = 'day'
        elif granularity == 'week':
            trunc_func = 'week'
        elif granularity == 'year':
            trunc_func = 'year'
        else:
            trunc_func = 'month'

        timeline_query = (
            LedgerEntryIndex.objects.filter(
                company=company,
                entry_date__range=[date_from, date_to]
            )
            .extra(select={'period': f"date_trunc('{trunc_func}', entry_date)"})
            .values('period')
            .annotate(
                entry_count=Count('id'),
                total_debit=Sum('debit_amount'),
                total_credit=Sum('credit_amount'),
                avg_amount=Avg('absolute_amount'),
                unique_accounts=Count('account_number', distinct=True)
            )
            .order_by('period')
        )

        timeline_data = []
        for item in timeline_query:
            timeline_data.append({
                'period': item['period'].isoformat() if item['period'] else None,
                'entry_count': item['entry_count'],
                'total_debit': str(item['total_debit'] or 0),
                'total_credit': str(item['total_credit'] or 0),
                'avg_amount': str(item['avg_amount'] or 0),
                'unique_accounts': item['unique_accounts'],
                'balance': str((item['total_debit'] or 0) - (item['total_credit'] or 0))
            })

        return timeline_data

    def _build_account_hierarchy(self, company, expand_level, account_class_filter=None):
        """Construction de la hiérarchie des comptes"""
        hierarchy = {}

        # Filtre par classe si spécifié
        base_query = LedgerEntryIndex.objects.filter(company=company)
        if account_class_filter:
            base_query = base_query.filter(account_class=account_class_filter)

        if expand_level >= 1:
            # Niveau 1: Classes de comptes
            classes = (
                base_query.values('account_class')
                .annotate(
                    account_count=Count('account_number', distinct=True),
                    entry_count=Count('id'),
                    total_debit=Sum('debit_amount'),
                    total_credit=Sum('credit_amount')
                )
                .order_by('account_class')
            )

            for class_item in classes:
                class_code = class_item['account_class']
                class_name = self._get_class_name(class_code)

                hierarchy[class_code] = {
                    'code': class_code,
                    'name': class_name,
                    'account_count': class_item['account_count'],
                    'entry_count': class_item['entry_count'],
                    'total_debit': str(class_item['total_debit'] or 0),
                    'total_credit': str(class_item['total_credit'] or 0),
                    'children': {}
                }

                if expand_level >= 2:
                    # Niveau 2: Comptes détaillés
                    accounts = (
                        base_query.filter(account_class=class_code)
                        .values('account_number', 'account_label')
                        .annotate(
                            entry_count=Count('id'),
                            total_debit=Sum('debit_amount'),
                            total_credit=Sum('credit_amount'),
                            last_movement=F('last_accessed')
                        )
                        .order_by('account_number')
                    )

                    for account in accounts:
                        account_key = account['account_number']
                        hierarchy[class_code]['children'][account_key] = {
                            'number': account['account_number'],
                            'label': account['account_label'],
                            'entry_count': account['entry_count'],
                            'total_debit': str(account['total_debit'] or 0),
                            'total_credit': str(account['total_credit'] or 0),
                            'balance': str((account['total_debit'] or 0) - (account['total_credit'] or 0)),
                            'last_movement': account['last_movement'].isoformat() if account['last_movement'] else None
                        }

        return hierarchy

    def _build_analytical_breakdown(self, company, axis_type, breakdown_by, period):
        """Construction de l'analyse multi-dimensionnelle"""
        # Calcul de la période
        if period == '12M':
            date_from = timezone.now().date() - timedelta(days=365)
        elif period == '6M':
            date_from = timezone.now().date() - timedelta(days=180)
        elif period == '1M':
            date_from = timezone.now().date() - timedelta(days=30)
        else:
            date_from = timezone.now().date() - timedelta(days=365)

        base_query = LedgerEntryIndex.objects.filter(
            company=company,
            entry_date__gte=date_from
        )

        analytical_data = {}

        # Extraction des axes analytiques depuis le JSON
        for entry in base_query.values('id', 'analytical_axes', 'absolute_amount'):
            axes = entry.get('analytical_axes', {})
            axis_value = axes.get(axis_type, 'Non spécifié')

            if axis_value not in analytical_data:
                analytical_data[axis_value] = {
                    'total_amount': Decimal('0'),
                    'entry_count': 0,
                    'avg_amount': Decimal('0')
                }

            analytical_data[axis_value]['total_amount'] += entry['absolute_amount']
            analytical_data[axis_value]['entry_count'] += 1

        # Calcul des moyennes
        for key in analytical_data:
            if analytical_data[key]['entry_count'] > 0:
                analytical_data[key]['avg_amount'] = (
                    analytical_data[key]['total_amount'] / analytical_data[key]['entry_count']
                )

        # Conversion en format sérialisable
        result = []
        for axis_value, data in analytical_data.items():
            result.append({
                'axis_value': axis_value,
                'total_amount': str(data['total_amount']),
                'entry_count': data['entry_count'],
                'avg_amount': str(data['avg_amount']),
                'percentage': float(data['total_amount'] / sum(d['total_amount'] for d in analytical_data.values()) * 100)
            })

        return sorted(result, key=lambda x: x['percentage'], reverse=True)

    def _get_entries_by_status(self, company, status):
        """Récupération des écritures par statut"""
        # Simulation de statuts (à adapter selon la logique métier)
        if status == 'draft':
            entries = LedgerEntryIndex.objects.filter(
                company=company,
                entry_date__gte=timezone.now().date() - timedelta(days=7)
            )[:20]
        elif status == 'pending_review':
            entries = LedgerEntryIndex.objects.filter(
                company=company,
                absolute_amount__gte=10000  # Montants élevés nécessitant révision
            )[:20]
        elif status == 'validated':
            entries = LedgerEntryIndex.objects.filter(
                company=company,
                access_count__gt=0  # Écritures déjà consultées
            )[:20]
        else:
            entries = []

        return [
            {
                'id': str(entry.id),
                'account_number': entry.account_number,
                'account_label': entry.account_label,
                'entry_date': entry.entry_date.isoformat(),
                'amount': str(entry.absolute_amount),
                'document_reference': entry.document_reference
            }
            for entry in entries
        ]

    def _get_entries_with_annotations(self, company):
        """Écritures avec annotations"""
        entries_with_annotations = LedgerEntryIndex.objects.filter(
            company=company,
            annotations__isnull=False
        ).distinct()[:20]

        return [
            {
                'id': str(entry.id),
                'account_number': entry.account_number,
                'account_label': entry.account_label,
                'entry_date': entry.entry_date.isoformat(),
                'amount': str(entry.absolute_amount),
                'annotation_count': entry.annotations.count()
            }
            for entry in entries_with_annotations
        ]

    def _generate_heatmap_data(self, company, heatmap_type, start_date, end_date):
        """Génération des données pour heatmap"""
        data = []

        if heatmap_type == 'temporal':
            # Heatmap temporelle par jour/heure
            daily_activity = (
                LedgerEntryIndex.objects.filter(
                    company=company,
                    entry_date__range=[start_date, end_date]
                )
                .values('entry_date')
                .annotate(activity_score=Count('id'))
                .order_by('entry_date')
            )

            for item in daily_activity:
                data.append({
                    'date': item['entry_date'].isoformat(),
                    'value': item['activity_score']
                })

        elif heatmap_type == 'amount':
            # Heatmap par montants
            amount_distribution = (
                LedgerEntryIndex.objects.filter(
                    company=company,
                    entry_date__range=[start_date, end_date]
                )
                .values('account_class', 'entry_date')
                .annotate(total_amount=Sum('absolute_amount'))
                .order_by('entry_date', 'account_class')
            )

            for item in amount_distribution:
                data.append({
                    'date': item['entry_date'].isoformat(),
                    'account_class': item['account_class'],
                    'value': float(item['total_amount'] or 0)
                })

        return data

    def _get_class_name(self, class_code):
        """Nom de la classe de compte SYSCOHADA"""
        class_names = {
            '1': 'Comptes de ressources durables',
            '2': 'Comptes d\'actif immobilisé',
            '3': 'Comptes de stocks',
            '4': 'Comptes de tiers',
            '5': 'Comptes de trésorerie',
            '6': 'Comptes de charges',
            '7': 'Comptes de produits',
            '8': 'Comptes des autres charges et des autres produits'
        }
        return class_names.get(class_code, f'Classe {class_code}')

    def _calculate_hierarchy_stats(self, hierarchy):
        """Calcul des statistiques de hiérarchie"""
        total_classes = len(hierarchy)
        total_accounts = sum(len(class_data['children']) for class_data in hierarchy.values())
        total_entries = sum(class_data['entry_count'] for class_data in hierarchy.values())

        return {
            'total_classes': total_classes,
            'total_accounts': total_accounts,
            'total_entries': total_entries,
            'avg_accounts_per_class': total_accounts / total_classes if total_classes > 0 else 0
        }

    def _build_breadcrumb(self, account_class):
        """Construction du fil d'Ariane"""
        breadcrumb = [{'label': 'Grand Livre', 'path': '/'}]

        if account_class:
            class_name = self._get_class_name(account_class)
            breadcrumb.append({
                'label': f'Classe {account_class} - {class_name}',
                'path': f'/class/{account_class}'
            })

        return breadcrumb

    def _calculate_correlations(self, analytical_data):
        """Calcul des corrélations entre axes"""
        # Simulation de corrélations (à implémenter avec scipy/numpy)
        return {
            'strong_correlations': [],
            'weak_correlations': [],
            'negative_correlations': []
        }

    def _generate_analytical_insights(self, analytical_data, correlations):
        """Génération d'insights analytiques"""
        insights = []

        if analytical_data:
            # Top contributeur
            top_contributor = max(analytical_data, key=lambda x: x['percentage'])
            insights.append({
                'type': 'top_contributor',
                'message': f"{top_contributor['axis_value']} représente {top_contributor['percentage']:.1f}% des mouvements"
            })

            # Distribution
            if len(analytical_data) > 5:
                top_5_percentage = sum(item['percentage'] for item in analytical_data[:5])
                insights.append({
                    'type': 'concentration',
                    'message': f"Les 5 premiers axes représentent {top_5_percentage:.1f}% du total"
                })

        return insights

    def _generate_navigation_hints(self, timeline_data):
        """Génération d'indices de navigation"""
        hints = []

        if timeline_data:
            # Période d'activité maximale
            max_activity = max(timeline_data, key=lambda x: x['entry_count'])
            hints.append({
                'type': 'max_activity',
                'message': f"Activité maximale le {max_activity['period']}"
            })

            # Période de montants élevés
            max_amount = max(timeline_data, key=lambda x: float(x['avg_amount']))
            hints.append({
                'type': 'high_amounts',
                'message': f"Montants moyens élevés le {max_amount['period']}"
            })

        return hints

    def _calculate_workflow_stats(self, columns):
        """Calcul des statistiques de workflow"""
        total_entries = sum(len(col['entries']) for col in columns)

        return {
            'total_entries': total_entries,
            'distribution': {
                col['id']: {
                    'count': len(col['entries']),
                    'percentage': len(col['entries']) / total_entries * 100 if total_entries > 0 else 0
                }
                for col in columns
            }
        }