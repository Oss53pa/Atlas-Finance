#!/usr/bin/env python
"""Test rapide de l'API"""
import requests
import json

BASE_URL = "http://localhost:8000/api/v1"

print("=== TEST API WISEBOOK ===\n")

# Test 1: JWT Token (Login)
print("1. Test JWT Token (Login)...")
try:
    response = requests.post(
        f"{BASE_URL}/auth/token/",
        json={
            "email": "admin@wisebook.cm",
            "password": "admin123"
        },
        timeout=10
    )
    print(f"   Status: {response.status_code}")

    if response.status_code == 200:
        data = response.json()
        print(f"   Access Token: {data.get('access', '')[:30]}...")
        print(f"   Refresh Token: {data.get('refresh', '')[:30]}...")
        access_token = data.get('access')
    else:
        print(f"   Error: {response.text[:200]}")
        access_token = None
except Exception as e:
    print(f"   Exception: {e}")
    access_token = None

if not access_token:
    print("\n[ERREUR] Pas de token - les tests suivants vont échouer")
    print("Assurez-vous que l'utilisateur existe avec le bon mot de passe")
    exit(1)

# Headers avec authentification
headers = {
    "Authorization": f"Bearer {access_token}",
    "Content-Type": "application/json"
}

# Test 2: Liste des sociétés
print("\n2. Test Liste Sociétés...")
try:
    response = requests.get(f"{BASE_URL}/societes/", headers=headers, timeout=10)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        # Handle both paginated and non-paginated responses
        if isinstance(data, list):
            results = data
        else:
            results = data.get('results', [])
        print(f"   Résultats: {len(results)} sociétés")
        for soc in results[:3]:
            print(f"     - {soc.get('code', 'N/A')}: {soc.get('nom', 'N/A')}")
except Exception as e:
    print(f"   Exception: {e}")

# Test 3: Liste des devises
print("\n3. Test Liste Devises...")
try:
    response = requests.get(f"{BASE_URL}/devises/", headers=headers, timeout=10)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        # Handle both paginated and non-paginated responses
        if isinstance(data, list):
            results = data
        else:
            results = data.get('results', [])
        print(f"   Résultats: {len(results)} devises")
        for dev in results[:3]:
            print(f"     - {dev.get('code', 'N/A')}: {dev.get('nom', 'N/A')}")
except Exception as e:
    print(f"   Exception: {e}")

# Test 4: Plan comptable
print("\n4. Test Plan Comptable...")
try:
    response = requests.get(f"{BASE_URL}/comptes/?page_size=5", headers=headers, timeout=10)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        # Handle both paginated and non-paginated responses
        if isinstance(data, list):
            results = data
            total = len(data)
        else:
            results = data.get('results', [])
            total = data.get('count', len(results))
        print(f"   Total: {total} comptes")
        print(f"   Premiers résultats:")
        for compte in results[:5]:
            print(f"     - {compte.get('code', 'N/A')}: {compte.get('name', 'N/A')}")
except Exception as e:
    print(f"   Exception: {e}")

# Test 5: Journaux
print("\n5. Test Journaux...")
try:
    response = requests.get(f"{BASE_URL}/journaux/", headers=headers, timeout=10)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        # Handle both paginated and non-paginated responses
        if isinstance(data, list):
            results = data
        else:
            results = data.get('results', [])
        print(f"   Résultats: {len(results)} journaux")
        for journal in results:
            print(f"     - {journal.get('code', 'N/A')}: {journal.get('name', 'N/A')}")
except Exception as e:
    print(f"   Exception: {e}")

# Test 6: Exercices fiscaux
print("\n6. Test Exercices Fiscaux...")
try:
    response = requests.get(f"{BASE_URL}/exercices/", headers=headers, timeout=10)
    print(f"   Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        # Handle both paginated and non-paginated responses
        if isinstance(data, list):
            results = data
        else:
            results = data.get('results', [])
        print(f"   Résultats: {len(results)} exercices")
        for ex in results:
            print(f"     - {ex.get('code', 'N/A')}: {ex.get('name', 'N/A')} ({ex.get('start_date', 'N/A')} -> {ex.get('end_date', 'N/A')})")
except Exception as e:
    print(f"   Exception: {e}")

print("\n=== FIN DES TESTS ===")
