# WiseBook V3.0 - Guide des Intégrations et APIs

## Vue d'ensemble

WiseBook V3.0 offre un système complet d'intégrations et d'APIs pour connecter votre système comptable avec les banques, les administrations fiscales, et les systèmes tiers.

## API REST Complète

### Authentification

L'API WiseBook utilise plusieurs méthodes d'authentification :

#### 1. Authentification par Token JWT
```bash
POST /api/v1/auth/login/
{
    "email": "user@example.com",
    "password": "password",
    "mfa_code": "123456"  # Optionnel si MFA activé
}
```

Réponse :
```json
{
    "success": true,
    "user": {...},
    "token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
    "expires_in": 3600,
    "session_id": 123
}
```

#### 2. Authentification par Clé API
```bash
GET /api/v1/comptes/
X-API-Key: your-api-key-here
```

#### 3. Authentification par Session
Utilise les cookies de session Django pour l'interface web.

### Endpoints Principaux

#### Comptabilité
```bash
# Plan comptable
GET /api/v1/comptes/
GET /api/v1/comptes/plan_comptable/

# Écritures comptables
GET /api/v1/ecritures/
POST /api/v1/ecritures/
POST /api/v1/ecritures/{id}/valider/

# Filtres avancés
GET /api/v1/ecritures/?date_debut=2024-01-01&date_fin=2024-12-31&journal=VTE
```

#### Tiers (Clients/Fournisseurs)
```bash
# Clients
GET /api/v1/clients/
POST /api/v1/clients/
GET /api/v1/clients/{id}/factures/

# Fournisseurs
GET /api/v1/fournisseurs/
POST /api/v1/fournisseurs/

# Factures
GET /api/v1/factures/
POST /api/v1/factures/
POST /api/v1/factures/{id}/generer_ecriture/
```

#### Trésorerie
```bash
# Comptes bancaires
GET /api/v1/comptes-bancaires/
POST /api/v1/comptes-bancaires/

# Mouvements
GET /api/v1/mouvements-tresorerie/
GET /api/v1/mouvements-tresorerie/?compte_bancaire=1&date_debut=2024-01-01
```

#### Reporting et Analytics
```bash
# Tableaux de bord
GET /api/v1/dashboard/

# Rapports
GET /api/v1/rapports/
POST /api/v1/rapports/

# Analyses financières
GET /api/v1/analyses-financieres/
```

### Pagination et Filtres

Tous les endpoints de liste supportent :

```bash
# Pagination
GET /api/v1/clients/?page=2&page_size=50

# Filtres
GET /api/v1/factures/?type_facture=vente&statut=emise&client=123

# Recherche
GET /api/v1/clients/?search=ACME

# Tri
GET /api/v1/factures/?ordering=-date_facture,montant_ttc
```

## Intégrations Bancaires

### Protocoles Supportés

#### 1. PSD2 (Payment Services Directive 2)
Pour les banques européennes et certaines banques africaines :

```python
from apps.integrations.banking import PSD2Connector

# Configuration
compte = ComptesBancaires.objects.get(id=1)
connector = PSD2Connector(compte)

# Authentification
if connector.authenticate():
    # Récupérer le solde
    solde = connector.get_balance()
    
    # Récupérer les transactions
    transactions = connector.get_transactions(date_debut, date_fin)
    
    # Initier un virement
    result = connector.initiate_transfer(iban_beneficiaire, montant, libelle)
```

#### 2. EBICS (Electronic Banking Internet Communication Standard)
Pour les banques françaises et allemandes :

```python
from apps.integrations.banking import EBICSConnector

connector = EBICSConnector(compte)
# Ordres EBICS : HAC (soldes), STA (relevés), CCT (virements)
```

#### 3. SWIFT
Pour les virements internationaux :

```python
from apps.integrations.banking import SWIFTConnector

connector = SWIFTConnector(compte)
result = connector.initiate_international_transfer(
    beneficiaire_swift="DEUTDEFF",
    beneficiaire_account="DE89370400440532013000",
    montant=Decimal('1000.00'),
    devise="EUR",
    libelle="Paiement facture"
)
```

#### 4. APIs Bancaires Africaines
Support pour les principales banques africaines :

```python
from apps.integrations.banking import AfricanBankingConnector

# Banques supportées : ECOBANK, BGFI, BICICI, CORIS
connector = AfricanBankingConnector(compte)
```

### Synchronisation Automatique

La synchronisation bancaire s'exécute automatiquement :

```python
# Configuration dans Celery
CELERY_BEAT_SCHEDULE = {
    'sync-bank-accounts': {
        'task': 'apps.integrations.tasks.synchronize_all_bank_accounts',
        'schedule': 300.0,  # Toutes les 5 minutes
    },
}

# Synchronisation manuelle
from apps.integrations.tasks import synchronize_bank_account
result = synchronize_bank_account.delay(compte_id=1)
```

## Intégrations Fiscales

### OHADA - Administrations Fiscales Africaines

Support pour les DGI de tous les pays OHADA :

```python
from apps.integrations.fiscal import OHADAFiscalConnector

# Pays supportés : CI, SN, ML, BF, CM, etc.
connector = OHADAFiscalConnector(societe)

if connector.authenticate():
    # Soumettre une déclaration
    result = connector.submit_declaration(declaration)
    
    # Vérifier le statut
    status = connector.get_declaration_status(reference)
    
    # Récupérer le calendrier fiscal
    calendar = connector.get_tax_calendar(2024)
```

### Types de Déclarations Supportées

- **TVA** : Déclarations mensuelles/trimestrielles
- **IS** : Impôt sur les Sociétés
- **CNI** : Contribution Nationale d'Investissement
- **FOPROLOS** : Fonds de Promotion du Logement Social
- **Patente** : Contribution des patentes

### Automatisation Fiscale

```python
# Vérification automatique des échéances
CELERY_BEAT_SCHEDULE = {
    'check-fiscal-deadlines': {
        'task': 'apps.integrations.tasks.check_fiscal_deadlines',
        'schedule': crontab(minute=0),  # Toutes les heures
    },
}

# Calcul automatique des pénalités
from apps.integrations.fiscal import FiscalService
penalties = FiscalService.calculate_penalties(declaration)
```

## Système de Webhooks

### Configuration des Webhooks

```python
from apps.integrations.webhooks import WebhookSubscription

# Créer un abonnement webhook
subscription = WebhookSubscription.objects.create(
    societe=societe,
    endpoint_url="https://your-app.com/webhooks/wisebook",
    event_types=[
        'accounting.entry.created',
        'invoice.paid',
        'treasury.movement',
        'ml.anomaly.detected'
    ],
    secret_key="your-secret-key",
    active=True
)
```

### Types d'Événements

#### Comptabilité
- `accounting.entry.created` : Écriture comptable créée
- `accounting.entry.validated` : Écriture comptable validée

#### Facturation
- `invoice.created` : Facture créée
- `invoice.paid` : Facture payée

#### Trésorerie
- `treasury.movement` : Mouvement de trésorerie
- `payment.received` : Paiement reçu

#### Budget
- `budget.exceeded` : Budget dépassé

#### Fiscal
- `tax.declaration.due` : Déclaration fiscale due
- `tax.declaration.submitted` : Déclaration déposée

#### Sécurité
- `security.alert` : Alerte de sécurité

#### ML/IA
- `ml.anomaly.detected` : Anomalie détectée

### Format des Webhooks

```json
{
    "event_type": "invoice.paid",
    "timestamp": "2024-01-15T10:30:00Z",
    "societe": {
        "id": 123,
        "nom": "ACME Corp",
        "siret": "12345678901234"
    },
    "data": {
        "id": 456,
        "model": "third_party.facture",
        "numero": "FA-2024-001",
        "date_paiement": "2024-01-15T10:30:00Z",
        "montant_paye": 1000.00,
        "mode_paiement": "virement"
    }
}
```

### Validation des Webhooks

```python
# Côté réception
from apps.integrations.webhooks import validate_webhook_signature

def webhook_handler(request):
    signature = request.META.get('HTTP_X_WISEBOOK_SIGNATURE_256')
    secret = 'your-secret-key'
    
    if validate_webhook_signature(request.body, signature, secret):
        # Traiter le webhook
        payload = json.loads(request.body)
        handle_webhook_event(payload)
        return JsonResponse({'status': 'ok'})
    
    return JsonResponse({'error': 'Invalid signature'}, status=401)
```

## APIs Externes

### Validation des Données d'Entreprises

#### SIRET (France)
```python
from apps.integrations.external_apis import ExternalAPIService

# Valider un SIRET
company_info = ExternalAPIService.validate_siret("12345678901234")
if company_info:
    print(f"Entreprise : {company_info.nom}")
    print(f"Forme juridique : {company_info.forme_juridique}")
```

#### Entreprises Africaines
```python
# Valider une entreprise africaine
company_info = ExternalAPIService.validate_african_company("CI", "1234567890")
```

### Taux de Change

```python
# Récupérer les taux de change
rates = ExternalAPIService.get_exchange_rates("EUR")
print(f"EUR -> XOF : {rates['XOF']}")

# Conversion de devise
montant_converti = ExternalAPIService.convert_currency(
    amount=Decimal('1000'),
    from_currency="EUR",
    to_currency="XOF"
)
```

### Validation Bancaire

```python
# Valider un IBAN
iban_info = ExternalAPIService.validate_iban("FR1420041010050500013M02606")
if iban_info['valid']:
    print(f"Banque : {iban_info['bank_name']}")

# Valider un BIC
bic_info = ExternalAPIService.validate_bic("DEUTDEFF")
```

### Données Économiques

```python
# Récupérer les indicateurs économiques
indicators = ExternalAPIService.get_economic_indicators("CI", [2023, 2024])
print(f"Croissance PIB 2024 : {indicators['gdp_growth'][2024]}%")
print(f"Inflation 2024 : {indicators['inflation_rate'][2024]}%")
```

## Tâches Asynchrones

### Configuration Celery

Toutes les intégrations utilisent Celery pour le traitement asynchrone :

```python
# Démarrer le worker
celery -A wisebook worker --loglevel=info

# Démarrer le scheduler
celery -A wisebook beat --loglevel=info

# Monitoring
celery -A wisebook flower
```

### Tâches Programmées

```python
# Synchronisation bancaire
synchronize_bank_account.delay(compte_id=1)

# Soumission déclaration fiscale
submit_fiscal_declaration.delay(declaration_id=123)

# Traitement des webhooks
process_webhooks.delay()

# Détection d'anomalies ML
run_ml_anomaly_detection.delay()
```

## Sécurité des Intégrations

### Chiffrement

- **TLS 1.3** : Toutes les communications externes
- **Certificats eIDAS** : Pour les connexions bancaires européennes
- **HMAC SHA-256** : Signature des webhooks
- **JWT RS256** : Tokens d'authentification

### Rate Limiting

```python
# Configuration par défaut
RATE_LIMITS = {
    'anonymous': '100/hour',
    'authenticated': '1000/hour',
    'api_key': '10000/hour'
}
```

### Audit et Logging

Toutes les intégrations sont auditées :

```python
from apps.security.models import JournalSecurite

# Les logs incluent :
# - Tentatives d'authentification
# - Accès aux APIs
# - Échanges bancaires
# - Soumissions fiscales
# - Événements webhooks
```

## Monitoring et Observabilité

### Métriques Disponibles

- **Latence des APIs** : Temps de réponse par endpoint
- **Taux d'erreur** : Erreurs 4xx/5xx par intégration
- **Volume de transactions** : Nombre de synchronisations bancaires
- **Webhooks** : Taux de succès/échec des livraisons
- **Tâches Celery** : Performance des tâches asynchrones

### Alertes Configurées

- **Échec synchronisation bancaire** : > 3 échecs consécutifs
- **Webhook en échec** : > 5 échecs sur 24h
- **Dépassement quotas API** : > 80% du quota
- **Anomalies ML** : Score > 0.8
- **Échéances fiscales** : 3 jours avant l'échéance

## Configuration et Déploiement

### Variables d'Environnement

```bash
# APIs Bancaires
PSD2_CLIENT_ID=your-client-id
PSD2_CLIENT_SECRET=your-client-secret
EBICS_HOST_ID=your-host-id
SWIFT_API_KEY=your-swift-key

# APIs Fiscales
CI_FISCAL_API_KEY=your-ci-api-key
SN_FISCAL_API_KEY=your-sn-api-key

# APIs Externes
INSEE_API_KEY=your-insee-key
EXCHANGE_RATE_API_KEY=your-exchange-api-key

# Webhooks
WEBHOOK_SECRET=your-webhook-secret

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/1
```

### Docker Compose

```yaml
version: '3.8'
services:
  wisebook-api:
    build: .
    environment:
      - DEBUG=False
      - DATABASE_URL=postgresql://user:pass@db:5432/wisebook
    
  celery-worker:
    build: .
    command: celery -A wisebook worker --loglevel=info
    
  celery-beat:
    build: .
    command: celery -A wisebook beat --loglevel=info
    
  redis:
    image: redis:7-alpine
    
  postgresql:
    image: postgres:15-alpine
```

## Support et Documentation

### Endpoints de Documentation

- **Swagger UI** : `/api/v1/docs/`
- **ReDoc** : `/api/v1/redoc/`
- **OpenAPI Schema** : `/api/v1/swagger.json`

### Environnement de Test

```bash
# Serveur de test
https://test-api.wisebook.com

# Données de test
POST /api/v1/auth/login/
{
    "email": "demo@wisebook.com",
    "password": "demo123"
}
```

### Contact Support

- **Email** : api@wisebook.com
- **Documentation** : https://docs.wisebook.com
- **Support Technique** : https://support.wisebook.com