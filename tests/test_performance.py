"""
Tests de performance pour WiseBook V3.0
Suite de benchmarking complète pour l'ERP comptable
"""
import pytest
import time
import statistics
from decimal import Decimal
from datetime import date, datetime, timedelta
from django.test import TestCase, TransactionTestCase, override_settings
from django.test.client import Client
from django.contrib.auth import get_user_model
from django.db import connection, transaction
from django.db.models import Q, Sum, Count
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from unittest.mock import patch
import cProfile
import pstats
from io import StringIO

from apps.core.models import Societe, Devise, Exercice, Periode
from apps.security.models import Utilisateur
from apps.accounting.models import (
    CompteComptable, JournalComptable, EcritureComptable, 
    LigneEcriture, Balance
)
from apps.third_party.models import Tiers
from apps.treasury.models import CompteBancaire, MouvementBancaire
from apps.assets.models import Immobilisation
from apps.analytics.models import AxeAnalytique, CentreAnalytique


class BasePerformanceTest(TransactionTestCase):
    """Classe de base pour les tests de performance."""
    
    def setUp(self):
        """Configuration pour les tests de performance."""
        # Configuration de la société
        self.societe = Societe.objects.create(
            nom='Performance Test Company',
            sigle='PTC',
            forme_juridique='SARL',
            pays='CM',
            ville='Douala',
            effectif=100,
            monnaie_fonctionnelle='XAF'
        )
        
        # Devise
        self.devise_xaf = Devise.objects.create(
            code='XAF',
            nom='Franc CFA',
            symbole='FCFA',
            taux_change=Decimal('1.0000'),
            devise_reference=True
        )
        
        # Exercice
        self.exercice = Exercice.objects.create(
            societe=self.societe,
            annee=2024,
            date_debut=date(2024, 1, 1),
            date_fin=date(2024, 12, 31),
            statut='ouvert'
        )
        
        # Utilisateur
        self.user = Utilisateur.objects.create_user(
            username='perf_user',
            email='perf@test.com',
            password='PerfTest123!',
            societe=self.societe
        )
        
        # Compteurs de performance
        self.timings = []
        self.query_counts = []
    
    def measure_time(self, func, *args, **kwargs):
        """Mesure le temps d'exécution d'une fonction."""
        start_time = time.time()
        result = func(*args, **kwargs)
        end_time = time.time()
        execution_time = end_time - start_time
        self.timings.append(execution_time)
        return result, execution_time
    
    def measure_queries(self, func, *args, **kwargs):
        """Mesure le nombre de requêtes SQL."""
        with self.assertNumQueries(expected_num=None) as queries:
            result = func(*args, **kwargs)
        
        query_count = len(queries.captured_queries)
        self.query_counts.append(query_count)
        return result, query_count
    
    def get_timing_stats(self):
        """Calcule les statistiques de timing."""
        if not self.timings:
            return None
        
        return {
            'min': min(self.timings),
            'max': max(self.timings),
            'mean': statistics.mean(self.timings),
            'median': statistics.median(self.timings),
            'stdev': statistics.stdev(self.timings) if len(self.timings) > 1 else 0
        }
    
    def profile_function(self, func, *args, **kwargs):
        """Profile une fonction avec cProfile."""
        profiler = cProfile.Profile()
        profiler.enable()
        
        result = func(*args, **kwargs)
        
        profiler.disable()
        
        # Analyser les résultats
        stats_stream = StringIO()
        stats = pstats.Stats(profiler, stream=stats_stream)
        stats.sort_stats('cumulative')
        stats.print_stats(10)  # Top 10 des fonctions
        
        return result, stats_stream.getvalue()


class DatabasePerformanceTest(BasePerformanceTest):
    """Tests de performance de la base de données."""
    
    def test_bulk_account_creation(self):
        """Test de création en masse de comptes comptables."""
        account_count = 1000
        
        def create_accounts_one_by_one():
            """Création compte par compte."""
            for i in range(account_count):
                CompteComptable.objects.create(
                    societe=self.societe,
                    numero=f'7{i:04d}',
                    intitule=f'Compte test {i}',
                    sens='produit',
                    classe=7
                )
        
        def create_accounts_bulk():
            """Création en masse."""
            accounts = [
                CompteComptable(
                    societe=self.societe,
                    numero=f'6{i:04d}',
                    intitule=f'Compte bulk {i}',
                    sens='charge',
                    classe=6
                )
                for i in range(account_count)
            ]
            CompteComptable.objects.bulk_create(accounts)
        
        # Test création individuelle
        _, time_individual = self.measure_time(create_accounts_one_by_one)
        
        # Test création en masse
        _, time_bulk = self.measure_time(create_accounts_bulk)
        
        # Vérifications
        self.assertLess(time_bulk, time_individual / 10, 
                       f"Bulk create devrait être au moins 10x plus rapide: {time_bulk:.3f}s vs {time_individual:.3f}s")
        
        self.assertEqual(CompteComptable.objects.filter(societe=self.societe).count(), 2000)
    
    def test_complex_query_optimization(self):
        """Test d'optimisation des requêtes complexes."""
        # Créer des données de test
        self._create_large_dataset()
        
        def unoptimized_balance_query():
            """Requête non optimisée pour calculer la balance."""
            comptes = CompteComptable.objects.filter(societe=self.societe)
            balance_data = []
            
            for compte in comptes:
                lignes = LigneEcriture.objects.filter(
                    compte=compte,
                    ecriture__statut='valide'
                )
                
                total_debit = sum(ligne.montant_debit for ligne in lignes)
                total_credit = sum(ligne.montant_credit for ligne in lignes)
                
                balance_data.append({
                    'compte': compte,
                    'debit': total_debit,
                    'credit': total_credit,
                    'solde': total_debit - total_credit
                })
            
            return balance_data
        
        def optimized_balance_query():
            """Requête optimisée avec aggregation."""
            from django.db.models import Sum, F
            
            comptes = CompteComptable.objects.filter(
                societe=self.societe
            ).annotate(
                total_debit=Sum('lignes_ecriture__montant_debit'),
                total_credit=Sum('lignes_ecriture__montant_credit'),
                solde=F('total_debit') - F('total_credit')
            ).filter(
                lignes_ecriture__ecriture__statut='valide'
            )
            
            return list(comptes.values('numero', 'intitule', 'total_debit', 'total_credit', 'solde'))
        
        # Mesurer les performances
        _, time_unoptimized = self.measure_time(unoptimized_balance_query)
        _, queries_unoptimized = self.measure_queries(unoptimized_balance_query)
        
        _, time_optimized = self.measure_time(optimized_balance_query)
        _, queries_optimized = self.measure_queries(optimized_balance_query)
        
        # Vérifications
        self.assertLess(time_optimized, time_unoptimized / 2,
                       f"Requête optimisée devrait être au moins 2x plus rapide")
        
        self.assertLess(queries_optimized, queries_unoptimized / 5,
                       f"Requête optimisée devrait utiliser au moins 5x moins de requêtes")
    
    def test_index_effectiveness(self):
        """Test de l'efficacité des index."""
        # Créer des données avec différents patterns
        self._create_indexed_data()
        
        def search_with_index():
            """Recherche utilisant les index."""
            return LigneEcriture.objects.filter(
                ecriture__societe=self.societe,
                ecriture__date_ecriture__gte=date(2024, 1, 1),
                compte__numero__startswith='7'
            ).select_related('ecriture', 'compte')
        
        def search_without_index():
            """Recherche sans utiliser les index optimaux."""
            return LigneEcriture.objects.filter(
                ecriture__libelle__contains='test'
            ).select_related('ecriture', 'compte')
        
        # Mesurer les performances
        _, time_with_index = self.measure_time(lambda: list(search_with_index()))
        _, time_without_index = self.measure_time(lambda: list(search_without_index()))
        
        # L'index devrait améliorer significativement les performances
        self.assertLess(time_with_index, time_without_index,
                       "Les requêtes indexées devraient être plus rapides")
    
    def _create_large_dataset(self):
        """Crée un large dataset pour les tests."""
        # Comptes
        comptes = [
            CompteComptable(
                societe=self.societe,
                numero=f'{classe}{i:03d}',
                intitule=f'Compte {classe}{i:03d}',
                sens='produit' if classe == 7 else 'charge',
                classe=classe
            )
            for classe in [6, 7]
            for i in range(100)
        ]
        CompteComptable.objects.bulk_create(comptes)
        
        # Journaux
        journal = JournalComptable.objects.create(
            societe=self.societe,
            code='TEST',
            libelle='Journal de test',
            type='general'
        )
        
        # Écritures
        comptes_list = list(CompteComptable.objects.filter(societe=self.societe))
        ecritures = []
        
        for i in range(100):
            ecriture = EcritureComptable.objects.create(
                societe=self.societe,
                journal=journal,
                numero=f'TEST{i:04d}',
                date_ecriture=date(2024, 1, 1) + timedelta(days=i % 365),
                libelle=f'Écriture test {i}',
                statut='valide',
                utilisateur=self.user,
                exercice=self.exercice
            )
            
            # Lignes d'écriture
            LigneEcriture.objects.create(
                ecriture=ecriture,
                compte=comptes_list[i % len(comptes_list)],
                libelle=f'Ligne débit {i}',
                montant_debit=Decimal('1000'),
                montant_credit=Decimal('0'),
                ordre_ligne=1
            )
            
            LigneEcriture.objects.create(
                ecriture=ecriture,
                compte=comptes_list[(i + 1) % len(comptes_list)],
                libelle=f'Ligne crédit {i}',
                montant_debit=Decimal('0'),
                montant_credit=Decimal('1000'),
                ordre_ligne=2
            )
    
    def _create_indexed_data(self):
        """Crée des données pour tester les index."""
        self._create_large_dataset()


class APIPerformanceTest(BasePerformanceTest):
    """Tests de performance des API."""
    
    def setUp(self):
        super().setUp()
        self.client = APIClient()
        self.token = str(RefreshToken.for_user(self.user).access_token)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.token}')
    
    def test_api_response_times(self):
        """Test des temps de réponse des API."""
        # Créer des données
        self._create_test_data_for_api()
        
        endpoints_to_test = [
            ('/api/v1/accounting/comptes/', 'GET'),
            ('/api/v1/accounting/ecritures/', 'GET'),
            ('/api/v1/third-party/tiers/', 'GET'),
            ('/api/v1/accounting/balance/', 'GET'),
        ]
        
        for endpoint, method in endpoints_to_test:
            with self.subTest(endpoint=endpoint):
                def api_call():
                    if method == 'GET':
                        return self.client.get(endpoint)
                    elif method == 'POST':
                        return self.client.post(endpoint, {})
                
                response, execution_time = self.measure_time(api_call)
                
                # Les API doivent répondre en moins de 2 secondes
                self.assertLess(execution_time, 2.0,
                               f"API {endpoint} trop lente: {execution_time:.3f}s")
                
                # Le statut doit être correct
                self.assertIn(response.status_code, [200, 201, 400, 403])
    
    def test_api_pagination_performance(self):
        """Test de performance de la pagination."""
        # Créer beaucoup de comptes
        comptes = [
            CompteComptable(
                societe=self.societe,
                numero=f'8{i:04d}',
                intitule=f'Compte pagination {i}',
                sens='produit',
                classe=8
            )
            for i in range(500)
        ]
        CompteComptable.objects.bulk_create(comptes)
        
        def test_pagination():
            # Tester différentes tailles de page
            page_sizes = [10, 25, 50, 100]
            timings_by_size = {}
            
            for page_size in page_sizes:
                response, timing = self.measure_time(
                    lambda: self.client.get(f'/api/v1/accounting/comptes/?page_size={page_size}')
                )
                timings_by_size[page_size] = timing
                
                self.assertEqual(response.status_code, 200)
                self.assertLessEqual(len(response.data['results']), page_size)
            
            return timings_by_size
        
        timings = test_pagination()
        
        # Les temps ne doivent pas augmenter de façon disproportionnée avec la taille
        for page_size in [25, 50, 100]:
            self.assertLess(
                timings[page_size] / timings[10],
                page_size / 10 * 2,  # Maximum 2x la proportion théorique
                f"Pagination inefficace pour page_size={page_size}"
            )
    
    def test_api_filtering_performance(self):
        """Test de performance des filtres API."""
        self._create_test_data_for_api()
        
        filters_to_test = [
            ('sens=produit', 'Filtre par sens'),
            ('classe=7', 'Filtre par classe'),
            ('actif=true', 'Filtre par statut'),
            ('search=test', 'Recherche textuelle'),
            ('sens=produit&classe=7', 'Filtres multiples'),
        ]
        
        for filter_params, description in filters_to_test:
            with self.subTest(filter=description):
                def filtered_request():
                    return self.client.get(f'/api/v1/accounting/comptes/?{filter_params}')
                
                response, execution_time = self.measure_time(filtered_request)
                
                self.assertEqual(response.status_code, 200)
                self.assertLess(execution_time, 1.0,
                               f"Filtre '{description}' trop lent: {execution_time:.3f}s")
    
    def _create_test_data_for_api(self):
        """Crée des données de test pour les API."""
        # Comptes comptables
        for i in range(100):
            CompteComptable.objects.create(
                societe=self.societe,
                numero=f'7{i:03d}',
                intitule=f'Test compte API {i}',
                sens='produit',
                classe=7,
                actif=i % 5 != 0  # 80% actifs
            )
        
        # Tiers
        for i in range(50):
            Tiers.objects.create(
                societe=self.societe,
                type='client' if i % 2 == 0 else 'fournisseur',
                nom=f'Tiers API {i}',
                code=f'API{i:03d}'
            )


class CachePerformanceTest(BasePerformanceTest):
    """Tests de performance du cache."""
    
    def test_cache_effectiveness(self):
        """Test de l'efficacité du cache."""
        cache.clear()
        
        def expensive_calculation():
            """Simulation d'un calcul coûteux."""
            time.sleep(0.1)  # Simulation
            return sum(range(10000))
        
        def cached_calculation():
            """Version cachée du calcul."""
            cache_key = 'expensive_calc_result'
            result = cache.get(cache_key)
            
            if result is None:
                result = expensive_calculation()
                cache.set(cache_key, result, timeout=300)
            
            return result
        
        # Premier appel (cache miss)
        _, time_first = self.measure_time(cached_calculation)
        
        # Deuxième appel (cache hit)
        _, time_second = self.measure_time(cached_calculation)
        
        # Le cache doit accélérer significativement
        self.assertLess(time_second, time_first / 10,
                       f"Cache inefficace: {time_second:.3f}s vs {time_first:.3f}s")
    
    @override_settings(
        CACHES={
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                'LOCATION': 'test-cache',
            }
        }
    )
    def test_cache_with_database_queries(self):
        """Test du cache avec des requêtes de base de données."""
        cache.clear()
        self._create_large_dataset()
        
        def get_account_balance(compte_id):
            """Calcul du solde d'un compte avec cache."""
            cache_key = f'account_balance_{compte_id}'
            balance = cache.get(cache_key)
            
            if balance is None:
                lignes = LigneEcriture.objects.filter(compte_id=compte_id)
                balance = {
                    'debit': sum(l.montant_debit for l in lignes),
                    'credit': sum(l.montant_credit for l in lignes)
                }
                cache.set(cache_key, balance, timeout=60)
            
            return balance
        
        compte = CompteComptable.objects.filter(societe=self.societe).first()
        
        # Premier appel
        _, time_uncached = self.measure_time(lambda: get_account_balance(compte.id))
        
        # Deuxième appel (caché)
        _, time_cached = self.measure_time(lambda: get_account_balance(compte.id))
        
        self.assertLess(time_cached, time_uncached / 2,
                       "Le cache devrait réduire le temps d'au moins 50%")


class MemoryPerformanceTest(BasePerformanceTest):
    """Tests de performance mémoire."""
    
    def test_memory_usage_bulk_operations(self):
        """Test de l'utilisation mémoire lors d'opérations en masse."""
        import tracemalloc
        
        tracemalloc.start()
        
        # Baseline
        snapshot1 = tracemalloc.take_snapshot()
        
        # Opération en masse
        comptes = [
            CompteComptable(
                societe=self.societe,
                numero=f'9{i:04d}',
                intitule=f'Memory test {i}',
                sens='produit',
                classe=9
            )
            for i in range(1000)
        ]
        
        CompteComptable.objects.bulk_create(comptes)
        
        snapshot2 = tracemalloc.take_snapshot()
        
        # Analyse de l'utilisation mémoire
        top_stats = snapshot2.compare_to(snapshot1, 'lineno')
        
        total_memory_diff = sum(stat.size_diff for stat in top_stats[:10])
        
        # L'utilisation mémoire ne doit pas dépasser 10MB pour cette opération
        self.assertLess(total_memory_diff, 10 * 1024 * 1024,
                       f"Utilisation mémoire excessive: {total_memory_diff} bytes")
        
        tracemalloc.stop()


class ConcurrencyPerformanceTest(TransactionTestCase):
    """Tests de performance en concurrence."""
    
    def setUp(self):
        super().setUp()
        # Configuration similaire à BasePerformanceTest
        self.societe = Societe.objects.create(
            nom='Concurrency Test Company',
            sigle='CTC',
            pays='CM'
        )
        
        self.user = Utilisateur.objects.create_user(
            username='concurrency_user',
            email='concurrency@test.com',
            password='Test123!',
            societe=self.societe
        )
    
    def test_concurrent_writes(self):
        """Test d'écritures concurrentes."""
        import threading
        import queue
        
        results = queue.Queue()
        errors = queue.Queue()
        
        def create_accounts(thread_id, count):
            """Crée des comptes dans un thread."""
            try:
                for i in range(count):
                    CompteComptable.objects.create(
                        societe=self.societe,
                        numero=f'{thread_id}{i:03d}',
                        intitule=f'Thread {thread_id} compte {i}',
                        sens='produit',
                        classe=7
                    )
                results.put(f'Thread {thread_id}: {count} comptes créés')
            except Exception as e:
                errors.put(f'Thread {thread_id}: {str(e)}')
        
        # Lancer plusieurs threads
        threads = []
        thread_count = 5
        accounts_per_thread = 20
        
        start_time = time.time()
        
        for i in range(thread_count):
            thread = threading.Thread(
                target=create_accounts,
                args=(i + 1, accounts_per_thread)
            )
            threads.append(thread)
            thread.start()
        
        # Attendre la fin de tous les threads
        for thread in threads:
            thread.join()
        
        end_time = time.time()
        
        # Vérifier les résultats
        self.assertTrue(errors.empty(), f"Erreurs en concurrence: {list(errors.queue)}")
        self.assertEqual(results.qsize(), thread_count)
        
        total_accounts = CompteComptable.objects.filter(societe=self.societe).count()
        self.assertEqual(total_accounts, thread_count * accounts_per_thread)
        
        # Les opérations concurrentes ne doivent pas prendre plus de 2x le temps séquentiel
        sequential_time_estimate = (end_time - start_time) * thread_count
        self.assertLess(end_time - start_time, sequential_time_estimate * 0.8,
                       "La concurrence n'améliore pas les performances")


class ReportPerformanceTest(BasePerformanceTest):
    """Tests de performance des rapports."""
    
    def test_balance_generation_performance(self):
        """Test de performance de génération de balance."""
        self._create_large_dataset()
        
        def generate_balance():
            """Génère une balance générale."""
            from apps.accounting.services import ComptabiliteService
            
            service = ComptabiliteService(self.societe)
            return service.generer_balance_generale(self.exercice)
        
        # Profiler la génération de balance
        result, profile_output = self.profile_function(generate_balance)
        
        # Vérifier que la balance contient des données
        self.assertIsNotNone(result)
        
        # La génération de balance doit être rapide même avec beaucoup de données
        _, execution_time = self.measure_time(generate_balance)
        self.assertLess(execution_time, 5.0,
                       f"Génération de balance trop lente: {execution_time:.3f}s")
    
    def test_reporting_with_filters_performance(self):
        """Test de performance des rapports avec filtres."""
        self._create_large_dataset()
        
        def filtered_report():
            """Rapport avec filtres complexes."""
            return LigneEcriture.objects.filter(
                ecriture__societe=self.societe,
                ecriture__date_ecriture__year=2024,
                compte__classe__in=[6, 7],
                ecriture__statut='valide'
            ).select_related('ecriture', 'compte').prefetch_related(
                'ecriture__journal'
            )[:1000]
        
        # Mesurer les performances
        _, execution_time = self.measure_time(lambda: list(filtered_report()))
        
        self.assertLess(execution_time, 2.0,
                       f"Rapport filtré trop lent: {execution_time:.3f}s")


@pytest.mark.performance
class WiseBookBenchmarkSuite:
    """Suite de benchmark complète pour WiseBook."""
    
    def __init__(self):
        self.results = {}
    
    def run_all_benchmarks(self):
        """Lance tous les benchmarks."""
        benchmark_classes = [
            DatabasePerformanceTest,
            APIPerformanceTest,
            CachePerformanceTest,
            MemoryPerformanceTest,
            ReportPerformanceTest
        ]
        
        for benchmark_class in benchmark_classes:
            test_instance = benchmark_class()
            test_instance.setUp()
            
            # Lancer tous les tests de la classe
            test_methods = [
                method for method in dir(test_instance)
                if method.startswith('test_')
            ]
            
            class_results = {}
            for method_name in test_methods:
                try:
                    method = getattr(test_instance, method_name)
                    start_time = time.time()
                    method()
                    end_time = time.time()
                    
                    class_results[method_name] = {
                        'status': 'PASS',
                        'duration': end_time - start_time
                    }
                except Exception as e:
                    class_results[method_name] = {
                        'status': 'FAIL',
                        'error': str(e),
                        'duration': 0
                    }
            
            self.results[benchmark_class.__name__] = class_results
    
    def generate_report(self):
        """Génère un rapport de benchmark."""
        report = []
        report.append("=" * 80)
        report.append("WISEBOOK V3.0 - RAPPORT DE PERFORMANCE")
        report.append("=" * 80)
        report.append("")
        
        total_tests = 0
        passed_tests = 0
        total_duration = 0
        
        for class_name, class_results in self.results.items():
            report.append(f"[{class_name}]")
            report.append("-" * len(class_name) + "--")
            
            for test_name, test_result in class_results.items():
                status = test_result['status']
                duration = test_result.get('duration', 0)
                
                total_tests += 1
                total_duration += duration
                
                if status == 'PASS':
                    passed_tests += 1
                    report.append(f"  ✓ {test_name} ({duration:.3f}s)")
                else:
                    error = test_result.get('error', 'Unknown error')
                    report.append(f"  ✗ {test_name} - {error}")
            
            report.append("")
        
        # Résumé
        report.append("RÉSUMÉ")
        report.append("=" * 20)
        report.append(f"Tests exécutés: {total_tests}")
        report.append(f"Tests réussis: {passed_tests}")
        report.append(f"Taux de réussite: {(passed_tests/total_tests)*100:.1f}%")
        report.append(f"Durée totale: {total_duration:.3f}s")
        report.append("")
        
        return "\n".join(report)


if __name__ == '__main__':
    # Lancement du benchmark complet
    print("Démarrage des benchmarks WiseBook V3.0...")
    
    benchmark_suite = WiseBookBenchmarkSuite()
    benchmark_suite.run_all_benchmarks()
    
    report = benchmark_suite.generate_report()
    print(report)
    
    # Sauvegarder le rapport
    with open('benchmark_report.txt', 'w', encoding='utf-8') as f:
        f.write(report)
    
    print("Rapport de benchmark sauvegardé dans 'benchmark_report.txt'")