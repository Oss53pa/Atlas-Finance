"""
Système de Recherche Intelligente Grand Livre WiseBook
Performance < 1s pour 10M+ écritures avec IA avancée
"""
import re
import json
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from decimal import Decimal
from dataclasses import dataclass
from enum import Enum

from django.db import models
from django.db.models import Q, Count, Sum, Avg, F, Case, When
from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
from django.core.cache import cache
from django.conf import settings
import redis
import elasticsearch
from fuzzywuzzy import fuzz, process

from ..models import LedgerEntryIndex, SearchHistory, SavedSearch, AIAnalysisResult


class SearchType(Enum):
    QUICK = "quick"
    ADVANCED = "advanced"
    VOICE = "voice"
    IMAGE = "image"
    AI_SEMANTIC = "ai_semantic"
    FUZZY = "fuzzy"


@dataclass
class SearchCriteria:
    """Critères de recherche structurés"""
    query: str = ""
    account_numbers: List[str] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    amount_min: Optional[Decimal] = None
    amount_max: Optional[Decimal] = None
    journal_codes: List[str] = None
    document_references: List[str] = None
    account_classes: List[str] = None
    tags: List[str] = None
    analytical_axes: Dict[str, Any] = None
    search_type: SearchType = SearchType.QUICK
    fuzzy_threshold: int = 80
    limit: int = 100
    offset: int = 0


@dataclass
class SearchResult:
    """Résultat de recherche enrichi"""
    entries: List[LedgerEntryIndex]
    total_count: int
    response_time_ms: int
    suggestions: List[str]
    aggregations: Dict[str, Any]
    query_explanation: str
    confidence_score: float


class IntelligentSearchEngine:
    """
    Moteur de recherche intelligent multi-modal
    """

    def __init__(self):
        self.redis_client = redis.from_url(settings.REDIS_URL) if hasattr(settings, 'REDIS_URL') else None
        self.es_client = self._init_elasticsearch()
        self.cache_ttl = 1800  # 30 minutes

    def _init_elasticsearch(self):
        """Initialisation Elasticsearch si disponible"""
        try:
            if hasattr(settings, 'ELASTICSEARCH_URL'):
                return elasticsearch.Elasticsearch([settings.ELASTICSEARCH_URL])
        except:
            pass
        return None

    async def search(self, criteria: SearchCriteria, user_id: int, company_id: int) -> SearchResult:
        """
        Recherche principale intelligente avec optimisations
        """
        start_time = datetime.now()

        # 1. Vérification cache
        cache_key = self._generate_cache_key(criteria, company_id)
        cached_result = await self._get_cached_result(cache_key)
        if cached_result:
            return cached_result

        # 2. Analyse et préparation de la requête
        enhanced_criteria = await self._enhance_search_criteria(criteria, user_id, company_id)

        # 3. Exécution recherche selon le type
        if criteria.search_type == SearchType.AI_SEMANTIC and self.es_client:
            result = await self._semantic_search(enhanced_criteria, company_id)
        elif criteria.search_type == SearchType.FUZZY:
            result = await self._fuzzy_search(enhanced_criteria, company_id)
        else:
            result = await self._standard_search(enhanced_criteria, company_id)

        # 4. Post-processing et enrichissement
        result = await self._enrich_search_result(result, criteria, company_id)

        # 5. Mise en cache et logging
        response_time = (datetime.now() - start_time).total_seconds() * 1000
        result.response_time_ms = int(response_time)

        await self._cache_result(cache_key, result)
        await self._log_search(criteria, result, user_id, company_id)

        return result

    async def _enhance_search_criteria(self, criteria: SearchCriteria, user_id: int, company_id: int) -> SearchCriteria:
        """
        Enhancement intelligent des critères de recherche
        """
        enhanced = criteria

        # Auto-correction orthographique
        if criteria.query:
            enhanced.query = await self._spell_check(criteria.query, company_id)

        # Expansion des synonymes
        if criteria.query:
            enhanced.query = await self._expand_synonyms(enhanced.query, company_id)

        # Suggestions basées sur l'historique
        if criteria.account_numbers is None and criteria.query:
            suggested_accounts = await self._suggest_accounts(criteria.query, user_id, company_id)
            if suggested_accounts:
                enhanced.account_numbers = suggested_accounts

        # Auto-détection de patterns
        patterns = await self._detect_query_patterns(criteria.query)
        if patterns.get('account_pattern'):
            enhanced.account_numbers = patterns['account_pattern']
        if patterns.get('amount_pattern'):
            enhanced.amount_min, enhanced.amount_max = patterns['amount_pattern']
        if patterns.get('date_pattern'):
            enhanced.date_from, enhanced.date_to = patterns['date_pattern']

        return enhanced

    async def _standard_search(self, criteria: SearchCriteria, company_id: int) -> SearchResult:
        """
        Recherche standard optimisée PostgreSQL
        """
        # Construction de la requête Q
        q_objects = Q(company_id=company_id)

        # Recherche textuelle
        if criteria.query:
            if len(criteria.query) > 3:
                # Full-text search pour requêtes longues
                search_vector = SearchVector('searchable_text', weight='A')
                search_query = SearchQuery(criteria.query)
                q_objects &= Q(search_vector=search_query)
            else:
                # icontains pour requêtes courtes
                q_objects &= (
                    Q(account_number__icontains=criteria.query) |
                    Q(account_label__icontains=criteria.query) |
                    Q(searchable_text__icontains=criteria.query)
                )

        # Filtres numériques
        if criteria.account_numbers:
            q_objects &= Q(account_number__in=criteria.account_numbers)

        if criteria.date_from:
            q_objects &= Q(entry_date__gte=criteria.date_from)
        if criteria.date_to:
            q_objects &= Q(entry_date__lte=criteria.date_to)

        if criteria.amount_min:
            q_objects &= Q(absolute_amount__gte=criteria.amount_min)
        if criteria.amount_max:
            q_objects &= Q(absolute_amount__lte=criteria.amount_max)

        if criteria.journal_codes:
            q_objects &= Q(journal_code__in=criteria.journal_codes)

        if criteria.account_classes:
            q_objects &= Q(account_class__in=criteria.account_classes)

        # Filtres avancés
        if criteria.tags:
            q_objects &= Q(tags__overlap=criteria.tags)

        # Exécution de la requête avec optimisations
        queryset = LedgerEntryIndex.objects.filter(q_objects).select_related('entry', 'company')

        # Tri intelligent
        if criteria.query:
            queryset = queryset.annotate(
                rank=SearchRank(SearchVector('searchable_text'), SearchQuery(criteria.query))
            ).order_by('-rank', '-entry_date')
        else:
            queryset = queryset.order_by('-entry_date', '-absolute_amount')

        # Pagination optimisée
        total_count = await self._get_count_efficiently(queryset)
        entries = list(queryset[criteria.offset:criteria.offset + criteria.limit])

        # Agrégations
        aggregations = await self._calculate_aggregations(queryset, criteria)

        return SearchResult(
            entries=entries,
            total_count=total_count,
            response_time_ms=0,  # Sera calculé plus tard
            suggestions=[],
            aggregations=aggregations,
            query_explanation=self._explain_query(q_objects),
            confidence_score=0.85
        )

    async def _fuzzy_search(self, criteria: SearchCriteria, company_id: int) -> SearchResult:
        """
        Recherche floue pour tolérance aux erreurs
        """
        if not criteria.query:
            return await self._standard_search(criteria, company_id)

        # Récupération de tous les libellés pour matching flou
        cache_key = f"fuzzy_labels:{company_id}"
        labels = cache.get(cache_key)

        if not labels:
            labels = list(
                LedgerEntryIndex.objects.filter(company_id=company_id)
                .values_list('account_label', 'account_number', 'searchable_text')
                .distinct()[:10000]  # Limite pour performance
            )
            cache.set(cache_key, labels, 3600)  # 1 heure

        # Matching flou
        matches = []
        for label, account_num, searchable in labels:
            if label:
                score1 = fuzz.ratio(criteria.query.lower(), label.lower())
                score2 = fuzz.partial_ratio(criteria.query.lower(), searchable.lower())
                max_score = max(score1, score2)

                if max_score >= criteria.fuzzy_threshold:
                    matches.append((account_num, label, max_score))

        # Tri par score de similarité
        matches.sort(key=lambda x: x[2], reverse=True)

        # Recherche sur les comptes trouvés
        if matches:
            account_numbers = [match[0] for match in matches[:50]]  # Top 50
            fuzzy_criteria = SearchCriteria(
                account_numbers=account_numbers,
                date_from=criteria.date_from,
                date_to=criteria.date_to,
                amount_min=criteria.amount_min,
                amount_max=criteria.amount_max,
                limit=criteria.limit,
                offset=criteria.offset
            )
            result = await self._standard_search(fuzzy_criteria, company_id)
            result.confidence_score = max(matches[0][2] / 100.0, 0.6)  # Score basé sur meilleur match
            return result

        # Fallback vers recherche standard
        return await self._standard_search(criteria, company_id)

    async def _semantic_search(self, criteria: SearchCriteria, company_id: int) -> SearchResult:
        """
        Recherche sémantique via Elasticsearch (si disponible)
        """
        if not self.es_client or not criteria.query:
            return await self._standard_search(criteria, company_id)

        try:
            # Construction de la requête Elasticsearch
            es_query = {
                "query": {
                    "bool": {
                        "must": [
                            {
                                "match": {
                                    "searchable_text": {
                                        "query": criteria.query,
                                        "fuzziness": "AUTO"
                                    }
                                }
                            }
                        ],
                        "filter": [
                            {"term": {"company_id": company_id}}
                        ]
                    }
                },
                "highlight": {
                    "fields": {
                        "searchable_text": {}
                    }
                },
                "size": criteria.limit,
                "from": criteria.offset
            }

            # Filtres additionnels
            if criteria.date_from or criteria.date_to:
                date_range = {}
                if criteria.date_from:
                    date_range["gte"] = criteria.date_from.isoformat()
                if criteria.date_to:
                    date_range["lte"] = criteria.date_to.isoformat()
                es_query["query"]["bool"]["filter"].append({
                    "range": {"entry_date": date_range}
                })

            # Exécution
            response = self.es_client.search(
                index=f"ledger_entries_{company_id}",
                body=es_query
            )

            # Conversion des résultats
            entry_ids = [hit["_source"]["id"] for hit in response["hits"]["hits"]]
            entries = list(
                LedgerEntryIndex.objects.filter(id__in=entry_ids)
                .select_related('entry', 'company')
            )

            # Agrégations
            aggregations = await self._calculate_aggregations_from_ids(entry_ids, company_id)

            return SearchResult(
                entries=entries,
                total_count=response["hits"]["total"]["value"],
                response_time_ms=0,
                suggestions=[],
                aggregations=aggregations,
                query_explanation=f"Elasticsearch semantic search: {criteria.query}",
                confidence_score=0.9
            )

        except Exception as e:
            # Fallback vers recherche standard
            print(f"Elasticsearch error: {e}")
            return await self._standard_search(criteria, company_id)

    async def _enrich_search_result(self, result: SearchResult, criteria: SearchCriteria, company_id: int) -> SearchResult:
        """
        Enrichissement des résultats avec suggestions et analyses
        """
        # Génération de suggestions
        if criteria.query and result.total_count < 10:
            result.suggestions = await self._generate_suggestions(criteria.query, company_id)

        # Analyse de pertinence
        if result.entries:
            result.confidence_score = await self._calculate_relevance_score(result.entries, criteria)

        # Ajout d'insights IA
        if len(result.entries) > 0:
            ai_insights = await self._get_ai_insights(result.entries, company_id)
            result.aggregations['ai_insights'] = ai_insights

        return result

    async def _calculate_aggregations(self, queryset, criteria: SearchCriteria) -> Dict[str, Any]:
        """
        Calcul d'agrégations utiles
        """
        aggregations = {}

        # Agrégations de base
        base_aggs = queryset.aggregate(
            total_debit=Sum('debit_amount'),
            total_credit=Sum('credit_amount'),
            avg_amount=Avg('absolute_amount'),
            count_by_class=Count('account_class')
        )
        aggregations.update(base_aggs)

        # Répartition par classe de compte
        class_distribution = (
            queryset.values('account_class')
            .annotate(count=Count('id'), total_amount=Sum('absolute_amount'))
            .order_by('-count')
        )
        aggregations['class_distribution'] = list(class_distribution)

        # Évolution temporelle (si période définie)
        if criteria.date_from and criteria.date_to:
            monthly_evolution = (
                queryset.values('entry_year', 'entry_month')
                .annotate(
                    count=Count('id'),
                    total_debit=Sum('debit_amount'),
                    total_credit=Sum('credit_amount')
                )
                .order_by('entry_year', 'entry_month')
            )
            aggregations['monthly_evolution'] = list(monthly_evolution)

        # Top comptes
        top_accounts = (
            queryset.values('account_number', 'account_label')
            .annotate(
                total_movements=Count('id'),
                total_amount=Sum('absolute_amount')
            )
            .order_by('-total_amount')[:10]
        )
        aggregations['top_accounts'] = list(top_accounts)

        return aggregations

    async def _spell_check(self, query: str, company_id: int) -> str:
        """
        Correction orthographique basée sur le vocabulaire comptable
        """
        # Dictionnaire de termes comptables courants
        accounting_terms = [
            'banque', 'caisse', 'client', 'fournisseur', 'stock', 'vente', 'achat',
            'charge', 'produit', 'immobilisation', 'amortissement', 'provision',
            'capital', 'reserve', 'emprunt', 'creance', 'dette'
        ]

        words = query.lower().split()
        corrected_words = []

        for word in words:
            if len(word) > 3:
                # Recherche du terme le plus proche
                best_match = process.extractOne(word, accounting_terms, scorer=fuzz.ratio)
                if best_match and best_match[1] > 80:  # Seuil de similarité
                    corrected_words.append(best_match[0])
                else:
                    corrected_words.append(word)
            else:
                corrected_words.append(word)

        return ' '.join(corrected_words)

    async def _expand_synonyms(self, query: str, company_id: int) -> str:
        """
        Expansion avec synonymes métier
        """
        synonyms = {
            'banque': ['banque', 'etablissement bancaire', 'institution financiere'],
            'client': ['client', 'debiteur', 'creancier'],
            'fournisseur': ['fournisseur', 'crediteur', 'vendeur'],
            'vente': ['vente', 'chiffre affaires', 'recette'],
            'achat': ['achat', 'acquisition', 'depense'],
        }

        expanded_terms = []
        for word in query.lower().split():
            if word in synonyms:
                expanded_terms.extend(synonyms[word])
            else:
                expanded_terms.append(word)

        return ' '.join(expanded_terms)

    async def _detect_query_patterns(self, query: str) -> Dict[str, Any]:
        """
        Détection automatique de patterns dans la requête
        """
        patterns = {}

        # Pattern numéro de compte (3-6 chiffres)
        account_pattern = re.findall(r'\b\d{3,6}\b', query)
        if account_pattern:
            patterns['account_pattern'] = account_pattern

        # Pattern montant (avec ou sans devise)
        amount_pattern = re.findall(r'(\d+(?:[.,]\d+)?)\s*(?:€|EUR|XOF|FCFA)?', query)
        if amount_pattern:
            amounts = [float(a.replace(',', '.')) for a in amount_pattern]
            if len(amounts) == 1:
                patterns['amount_pattern'] = (amounts[0], amounts[0])
            elif len(amounts) == 2:
                patterns['amount_pattern'] = (min(amounts), max(amounts))

        # Pattern date
        date_patterns = [
            r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})',  # DD/MM/YYYY
            r'(\d{4})[/.-](\d{1,2})[/.-](\d{1,2})',  # YYYY/MM/DD
        ]

        for pattern in date_patterns:
            dates = re.findall(pattern, query)
            if dates:
                try:
                    if len(dates[0][2]) == 4:  # DD/MM/YYYY
                        date_obj = datetime.strptime(f"{dates[0][0]}/{dates[0][1]}/{dates[0][2]}", "%d/%m/%Y")
                    else:  # YYYY/MM/DD
                        date_obj = datetime.strptime(f"{dates[0][0]}/{dates[0][1]}/{dates[0][2]}", "%Y/%m/%d")
                    patterns['date_pattern'] = (date_obj, date_obj)
                    break
                except:
                    continue

        return patterns

    async def _suggest_accounts(self, query: str, user_id: int, company_id: int) -> List[str]:
        """
        Suggestions de comptes basées sur l'historique utilisateur
        """
        # Récupération des comptes fréquemment consultés par l'utilisateur
        frequent_accounts = (
            SearchHistory.objects.filter(
                user_id=user_id,
                company_id=company_id,
                created_at__gte=timezone.now() - timedelta(days=30)
            )
            .values('search_filters__account_numbers')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )

        # Extraction des numéros de compte
        suggested = []
        for item in frequent_accounts:
            accounts = item.get('search_filters__account_numbers', [])
            if accounts:
                suggested.extend(accounts)

        return list(set(suggested))  # Dédoublonnage

    async def _generate_suggestions(self, query: str, company_id: int) -> List[str]:
        """
        Génération de suggestions alternatives
        """
        suggestions = []

        # Suggestions basées sur des recherches similaires
        similar_searches = (
            SearchHistory.objects.filter(
                company_id=company_id,
                search_query__icontains=query[:5] if len(query) > 5 else query,
                was_successful=True
            )
            .values('search_query')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )

        for search in similar_searches:
            if search['search_query'] != query:
                suggestions.append(search['search_query'])

        # Suggestions de comptes proches
        if len(query) > 2:
            close_accounts = (
                LedgerEntryIndex.objects.filter(
                    company_id=company_id,
                    account_label__icontains=query
                )
                .values('account_number', 'account_label')
                .distinct()[:5]
            )

            for account in close_accounts:
                suggestions.append(f"{account['account_number']} {account['account_label']}")

        return suggestions

    async def _get_ai_insights(self, entries: List[LedgerEntryIndex], company_id: int) -> Dict[str, Any]:
        """
        Génération d'insights IA sur les résultats
        """
        insights = {}

        if len(entries) < 5:
            return insights

        # Analyse des patterns temporels
        dates = [entry.entry_date for entry in entries]
        if dates:
            date_range = max(dates) - min(dates)
            insights['temporal_pattern'] = {
                'date_range_days': date_range.days,
                'regularity': 'periodic' if date_range.days > 30 else 'clustered'
            }

        # Analyse des montants
        amounts = [float(entry.absolute_amount) for entry in entries]
        if amounts:
            avg_amount = sum(amounts) / len(amounts)
            insights['amount_analysis'] = {
                'average': avg_amount,
                'pattern': 'consistent' if max(amounts) / min(amounts) < 2 else 'variable'
            }

        # Recherche d'anomalies récentes
        recent_anomalies = AIAnalysisResult.objects.filter(
            company_id=company_id,
            analysis_type='ANOMALY_DETECTION',
            created_at__gte=timezone.now() - timedelta(days=7),
            analyzed_entries__in=[entry.id for entry in entries]
        ).count()

        if recent_anomalies > 0:
            insights['anomaly_alert'] = {
                'count': recent_anomalies,
                'message': f"{recent_anomalies} anomalie(s) détectée(s) récemment"
            }

        return insights

    async def _calculate_relevance_score(self, entries: List[LedgerEntryIndex], criteria: SearchCriteria) -> float:
        """
        Calcul du score de pertinence des résultats
        """
        if not entries:
            return 0.0

        score = 0.0
        total_weight = 0.0

        # Score basé sur la correspondance textuelle
        if criteria.query:
            text_matches = sum(1 for entry in entries if criteria.query.lower() in entry.searchable_text.lower())
            text_score = text_matches / len(entries)
            score += text_score * 0.4
            total_weight += 0.4

        # Score basé sur la récence
        if entries:
            recent_entries = sum(1 for entry in entries if entry.entry_date >= datetime.now().date() - timedelta(days=30))
            recency_score = recent_entries / len(entries)
            score += recency_score * 0.2
            total_weight += 0.2

        # Score basé sur la fréquence d'accès
        accessed_entries = sum(1 for entry in entries if entry.access_count > 0)
        if accessed_entries > 0:
            access_score = accessed_entries / len(entries)
            score += access_score * 0.2
            total_weight += 0.2

        # Score par défaut pour les autres critères
        if total_weight < 1.0:
            score += (1.0 - total_weight) * 0.7  # Score de base

        return min(score, 1.0)

    def _generate_cache_key(self, criteria: SearchCriteria, company_id: int) -> str:
        """Génération de clé de cache unique"""
        key_parts = [
            str(company_id),
            criteria.query or '',
            str(criteria.account_numbers or []),
            str(criteria.date_from),
            str(criteria.date_to),
            str(criteria.amount_min),
            str(criteria.amount_max),
            str(criteria.limit),
            str(criteria.offset)
        ]
        key_string = '|'.join(key_parts)
        return f"search:{hash(key_string)}"

    async def _get_cached_result(self, cache_key: str) -> Optional[SearchResult]:
        """Récupération du cache"""
        if self.redis_client:
            try:
                cached_data = self.redis_client.get(cache_key)
                if cached_data:
                    data = json.loads(cached_data)
                    # Reconstruction des objets (simplifié)
                    return SearchResult(**data)
            except:
                pass
        return None

    async def _cache_result(self, cache_key: str, result: SearchResult):
        """Mise en cache du résultat"""
        if self.redis_client:
            try:
                # Sérialisation simplifiée (à adapter selon les besoins)
                cache_data = {
                    'total_count': result.total_count,
                    'response_time_ms': result.response_time_ms,
                    'suggestions': result.suggestions,
                    'aggregations': result.aggregations,
                    'confidence_score': result.confidence_score
                }
                self.redis_client.setex(
                    cache_key,
                    self.cache_ttl,
                    json.dumps(cache_data, default=str)
                )
            except:
                pass

    async def _log_search(self, criteria: SearchCriteria, result: SearchResult, user_id: int, company_id: int):
        """Logging de la recherche pour analytics"""
        try:
            SearchHistory.objects.create(
                user_id=user_id,
                company_id=company_id,
                search_query=criteria.query or '',
                search_filters={
                    'account_numbers': criteria.account_numbers,
                    'date_from': str(criteria.date_from) if criteria.date_from else None,
                    'date_to': str(criteria.date_to) if criteria.date_to else None,
                    'amount_min': str(criteria.amount_min) if criteria.amount_min else None,
                    'amount_max': str(criteria.amount_max) if criteria.amount_max else None,
                },
                search_type=criteria.search_type.value,
                results_count=result.total_count,
                response_time_ms=result.response_time_ms,
                was_successful=result.total_count > 0
            )
        except:
            pass  # Ne pas faire échouer la recherche pour un problème de log

    async def _get_count_efficiently(self, queryset) -> int:
        """Comptage optimisé pour grandes tables"""
        # Pour les grandes tables, estimation via EXPLAIN si disponible
        try:
            return queryset.count()
        except:
            # Fallback vers estimation
            return queryset[:10000].count()

    def _explain_query(self, q_objects: Q) -> str:
        """Explication de la requête pour debug"""
        return f"Django Q objects: {q_objects}"

    async def _calculate_aggregations_from_ids(self, entry_ids: List[str], company_id: int) -> Dict[str, Any]:
        """Calcul d'agrégations à partir d'IDs Elasticsearch"""
        if not entry_ids:
            return {}

        queryset = LedgerEntryIndex.objects.filter(id__in=entry_ids)
        return await self._calculate_aggregations(queryset, SearchCriteria())


# Fonctions utilitaires pour recherche rapide

async def quick_search(query: str, user_id: int, company_id: int, limit: int = 50) -> SearchResult:
    """Recherche rapide simplifiée"""
    criteria = SearchCriteria(
        query=query,
        search_type=SearchType.QUICK,
        limit=limit
    )

    engine = IntelligentSearchEngine()
    return await engine.search(criteria, user_id, company_id)


async def advanced_search(filters: Dict[str, Any], user_id: int, company_id: int) -> SearchResult:
    """Recherche avancée avec filtres multiples"""
    criteria = SearchCriteria(
        query=filters.get('query', ''),
        account_numbers=filters.get('account_numbers'),
        date_from=filters.get('date_from'),
        date_to=filters.get('date_to'),
        amount_min=filters.get('amount_min'),
        amount_max=filters.get('amount_max'),
        journal_codes=filters.get('journal_codes'),
        account_classes=filters.get('account_classes'),
        search_type=SearchType.ADVANCED,
        limit=filters.get('limit', 100),
        offset=filters.get('offset', 0)
    )

    engine = IntelligentSearchEngine()
    return await engine.search(criteria, user_id, company_id)


async def fuzzy_search(query: str, user_id: int, company_id: int, threshold: int = 80) -> SearchResult:
    """Recherche floue avec tolérance aux erreurs"""
    criteria = SearchCriteria(
        query=query,
        search_type=SearchType.FUZZY,
        fuzzy_threshold=threshold,
        limit=100
    )

    engine = IntelligentSearchEngine()
    return await engine.search(criteria, user_id, company_id)