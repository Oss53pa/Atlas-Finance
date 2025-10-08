#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Script de test pour valider l'intégration API WiseBook
Teste tous les endpoints Phase 1
"""

import sys
import os
import json
import requests
from datetime import datetime
from typing import Dict, Any, Optional

# Fix encoding for Windows
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')

# Configuration
BASE_URL = "http://localhost:8000/api/v1"
COLORS = {
    'GREEN': '\033[92m',
    'RED': '\033[91m',
    'YELLOW': '\033[93m',
    'BLUE': '\033[94m',
    'END': '\033[0m'
}

class APITester:
    def __init__(self):
        self.base_url = BASE_URL
        self.access_token: Optional[str] = None
        self.refresh_token: Optional[str] = None
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': []
        }

    def print_colored(self, message: str, color: str = 'END'):
        """Print avec couleur"""
        print(f"{COLORS.get(color, '')}{message}{COLORS['END']}")

    def print_header(self, title: str):
        """Afficher un header"""
        print("\n" + "="*60)
        self.print_colored(f"  {title}", 'BLUE')
        print("="*60)

    def print_test(self, name: str, passed: bool, details: str = ""):
        """Afficher résultat d'un test"""
        status = "✓ PASS" if passed else "✗ FAIL"
        color = 'GREEN' if passed else 'RED'

        if passed:
            self.test_results['passed'] += 1
        else:
            self.test_results['failed'] += 1
            self.test_results['errors'].append(f"{name}: {details}")

        print(f"  [{COLORS[color]}{status}{COLORS['END']}] {name}")
        if details and not passed:
            self.print_colored(f"        → {details}", 'YELLOW')

    def get_headers(self, auth: bool = True) -> Dict[str, str]:
        """Obtenir les headers pour les requêtes"""
        headers = {"Content-Type": "application/json"}
        if auth and self.access_token:
            headers["Authorization"] = f"Bearer {self.access_token}"
        return headers

    def test_endpoint(self, method: str, endpoint: str, data: Optional[Dict] = None,
                     auth: bool = True, test_name: str = "") -> Optional[Dict]:
        """Tester un endpoint"""
        url = f"{self.base_url}{endpoint}"
        headers = self.get_headers(auth)

        try:
            if method == "GET":
                response = requests.get(url, headers=headers, timeout=10)
            elif method == "POST":
                response = requests.post(url, json=data, headers=headers, timeout=10)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=headers, timeout=10)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers, timeout=10)
            else:
                return None

            success = response.status_code in [200, 201, 204]

            if test_name:
                if success:
                    self.print_test(test_name, True)
                else:
                    self.print_test(test_name, False,
                                  f"HTTP {response.status_code}: {response.text[:100]}")

            return response.json() if response.content else {}

        except Exception as e:
            if test_name:
                self.print_test(test_name, False, str(e))
            return None

    def test_authentication(self):
        """Tester l'authentification"""
        self.print_header("TEST AUTHENTICATION")

        # Créer un superuser d'abord si nécessaire
        print("\n  Note: Assurez-vous qu'un superuser existe (admin@wisebook.cm)")

        # Test 1: JWT Token (Login)
        login_data = {
            "email": "admin@wisebook.cm",
            "password": "admin123"
        }

        response = self.test_endpoint(
            "POST",
            "/auth/token/",
            data=login_data,
            auth=False,
            test_name="Obtenir JWT token (login)"
        )

        if response and 'access' in response:
            self.access_token = response['access']
            self.refresh_token = response.get('refresh')
            self.print_colored(f"    Token obtenu: {self.access_token[:20]}...", 'GREEN')

        # Test 2: Get Profile
        if self.access_token:
            self.test_endpoint(
                "GET",
                "/auth/profile/",
                test_name="Récupérer profil utilisateur"
            )

    def test_core_services(self):
        """Tester les services Core"""
        self.print_header("TEST CORE SERVICES")

        # Test 1: Liste des sociétés
        response = self.test_endpoint(
            "GET",
            "/societes/",
            test_name="Lister les sociétés"
        )

        # Test 2: Liste des devises
        devises_response = self.test_endpoint(
            "GET",
            "/devises/",
            test_name="Lister les devises"
        )

        if devises_response and 'results' in devises_response:
            count = len(devises_response['results'])
            self.print_colored(f"    {count} devise(s) trouvée(s)", 'GREEN')

    def test_accounting_services(self):
        """Tester les services Accounting"""
        self.print_header("TEST ACCOUNTING SERVICES")

        # Test 1: Liste des exercices
        exercices = self.test_endpoint(
            "GET",
            "/exercices/",
            test_name="Lister les exercices fiscaux"
        )

        # Test 2: Liste des journaux
        journaux = self.test_endpoint(
            "GET",
            "/journaux/",
            test_name="Lister les journaux"
        )

        if journaux and 'results' in journaux:
            count = len(journaux['results'])
            self.print_colored(f"    {count} journal(aux) trouvé(s)", 'GREEN')

        # Test 3: Plan comptable
        comptes = self.test_endpoint(
            "GET",
            "/comptes/?page_size=5",
            test_name="Lister le plan comptable"
        )

        if comptes and 'count' in comptes:
            self.print_colored(f"    {comptes['count']} compte(s) au total", 'GREEN')

        # Test 4: Liste des écritures
        ecritures = self.test_endpoint(
            "GET",
            "/ecritures/",
            test_name="Lister les écritures comptables"
        )

    def test_thirdparty_services(self):
        """Tester les services Third Party"""
        self.print_header("TEST THIRD PARTY SERVICES")

        # Test 1: Liste des tiers
        tiers = self.test_endpoint(
            "GET",
            "/tiers/",
            test_name="Lister les tiers"
        )

        # Test 2: Clients
        try:
            response = requests.get(
                f"{self.base_url}/tiers/clients/",
                headers=self.get_headers(),
                timeout=10
            )
            success = response.status_code == 200
            self.print_test("Lister les clients", success)
        except Exception as e:
            self.print_test("Lister les clients", False, str(e))

        # Test 3: Fournisseurs
        try:
            response = requests.get(
                f"{self.base_url}/tiers/fournisseurs/",
                headers=self.get_headers(),
                timeout=10
            )
            success = response.status_code == 200
            self.print_test("Lister les fournisseurs", success)
        except Exception as e:
            self.print_test("Lister les fournisseurs", False, str(e))

    def test_pagination(self):
        """Tester la pagination"""
        self.print_header("TEST PAGINATION & FILTRAGE")

        # Test 1: Pagination
        response = self.test_endpoint(
            "GET",
            "/comptes/?page=1&page_size=10",
            test_name="Pagination (page 1, size 10)"
        )

        if response:
            if 'count' in response and 'results' in response:
                self.print_colored(
                    f"    Total: {response['count']}, Page actuelle: {len(response['results'])} items",
                    'GREEN'
                )

        # Test 2: Recherche
        self.test_endpoint(
            "GET",
            "/comptes/?search=Capital",
            test_name="Recherche (search=Capital)"
        )

        # Test 3: Tri
        self.test_endpoint(
            "GET",
            "/comptes/?ordering=code",
            test_name="Tri (ordering=code)"
        )

    def print_summary(self):
        """Afficher le résumé"""
        self.print_header("RÉSUMÉ DES TESTS")

        total = self.test_results['passed'] + self.test_results['failed']
        success_rate = (self.test_results['passed'] / total * 100) if total > 0 else 0

        print(f"\n  Total tests: {total}")
        self.print_colored(f"  ✓ Réussis: {self.test_results['passed']}", 'GREEN')

        if self.test_results['failed'] > 0:
            self.print_colored(f"  ✗ Échoués: {self.test_results['failed']}", 'RED')

        print(f"\n  Taux de réussite: {success_rate:.1f}%")

        if self.test_results['errors']:
            self.print_colored("\n  Erreurs détaillées:", 'YELLOW')
            for error in self.test_results['errors']:
                print(f"    - {error}")

        print("\n" + "="*60 + "\n")

        if success_rate >= 80:
            self.print_colored("✓ INTÉGRATION API VALIDÉE", 'GREEN')
        elif success_rate >= 50:
            self.print_colored("⚠ INTÉGRATION PARTIELLE", 'YELLOW')
        else:
            self.print_colored("✗ INTÉGRATION ÉCHOUÉE", 'RED')

        print()

    def run_all_tests(self):
        """Exécuter tous les tests"""
        self.print_colored("\n╔════════════════════════════════════════════════════════════╗", 'BLUE')
        self.print_colored("║  TEST INTÉGRATION API WISEBOOK - PHASE 1                  ║", 'BLUE')
        self.print_colored("╚════════════════════════════════════════════════════════════╝", 'BLUE')

        print(f"\n  Backend: {self.base_url}")
        print(f"  Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Vérifier que le backend répond
        try:
            response = requests.get(f"{self.base_url.replace('/api/v1', '')}/admin/", timeout=5)
            self.print_colored("\n  ✓ Backend accessible", 'GREEN')
        except:
            self.print_colored("\n  ✗ Backend non accessible!", 'RED')
            print("\n  Assurez-vous que le backend Django est démarré:")
            print("  python manage.py runserver --settings=wisebook.settings.development")
            return

        # Exécuter les tests
        self.test_authentication()

        if self.access_token:
            self.test_core_services()
            self.test_accounting_services()
            self.test_thirdparty_services()
            self.test_pagination()
        else:
            self.print_colored("\n  ⚠ Tests suivants ignorés (pas de token)", 'YELLOW')

        # Résumé
        self.print_summary()


if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests()
