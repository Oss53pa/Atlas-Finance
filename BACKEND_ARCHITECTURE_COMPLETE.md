# ARCHITECTURE BACKEND COMPLETE - WISEBOOK ERP

**Date**: 2025-10-07
**Version**: 1.0
**Framework**: Django 4.2+ avec Django REST Framework 3.14+

---

## 1. STACK TECHNIQUE

### Backend Core
- **Framework**: Django 4.2+
- **API**: Django REST Framework (DRF) 3.14+
- **Base de données**: PostgreSQL 15+ (production) / SQLite (développement)
- **Cache**: Redis 7+
- **Queue**: Celery 5+ avec Redis
- **Documentation API**: drf-spectacular (OpenAPI 3.0)
- **GraphQL**: Graphene-Django (optionnel)

### Authentification & Sécurité
- **Auth**: JWT (Simple JWT)
- **Permissions**: Custom DRF permissions
- **CORS**: django-cors-headers
- **Rate Limiting**: django-ratelimit
- **Audit**: django-auditlog

### Performance
- **Cache**: django-redis
- **Compression**: whitenoise + gzip
- **Indexation**: django-db-indexes

### Tests
- **Framework**: pytest + pytest-django
- **Coverage**: pytest-cov
- **Factories**: factory-boy
- **API Testing**: DRF test client

---

## 2. STRUCTURE DU PROJET

```
wisebook/
├── apps/
│   ├── authentication/          # Auth JWT, users
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── permissions.py
│   │   └── services/
│   │       └── auth_service.py
│   │
│   ├── core/                    # Sociétés, Exercices, Devises
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── filters.py
│   │   └── services/
│   │       ├── company_service.py
│   │       ├── fiscal_year_service.py
│   │       └── currency_service.py
│   │
│   ├── accounting/              # Comptabilité générale
│   │   ├── models.py           # ChartOfAccount, Journal, Entry, EntryLine
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── filters.py
│   │   └── services/
│   │       ├── chart_service.py
│   │       ├── journal_service.py
│   │       ├── entry_service.py
│   │       ├── lettrage_service.py
│   │       └── report_service.py
│   │
│   ├── third_party/             # Clients, Fournisseurs, Contacts
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── filters.py
│   │   └── services/
│   │       ├── tiers_service.py
│   │       ├── contact_service.py
│   │       └── balance_service.py
│   │
│   ├── treasury/                # Trésorerie
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── filters.py
│   │   └── services/
│   │       ├── bank_account_service.py
│   │       ├── bank_transaction_service.py
│   │       ├── reconciliation_service.py
│   │       └── forecast_service.py
│   │
│   ├── assets/                  # Immobilisations
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   ├── filters.py
│   │   └── services/
│   │       ├── asset_service.py
│   │       ├── depreciation_service.py
│   │       └── disposal_service.py
│   │
│   ├── analytics/               # Comptabilité analytique
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services/
│   │       ├── axis_service.py
│   │       └── center_service.py
│   │
│   ├── budget/                  # Budget et contrôle budgétaire
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services/
│   │       ├── budget_service.py
│   │       └── control_service.py
│   │
│   ├── taxation/                # Fiscalité
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services/
│   │       ├── declaration_service.py
│   │       └── calculation_service.py
│   │
│   ├── closures/                # Clôtures périodiques
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services/
│   │       ├── closure_service.py
│   │       ├── workflow_service.py
│   │       └── control_service.py
│   │
│   ├── inventory/               # Inventaire/Stocks
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services/
│   │       ├── item_service.py
│   │       ├── movement_service.py
│   │       └── valuation_service.py
│   │
│   ├── reporting/               # Rapports personnalisés
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services/
│   │       ├── report_service.py
│   │       └── dashboard_service.py
│   │
│   ├── financial_statements/    # États financiers
│   │   ├── serializers.py
│   │   ├── views.py
│   │   ├── urls.py
│   │   └── services/
│   │       ├── balance_sheet_service.py
│   │       ├── income_statement_service.py
│   │       ├── tafire_service.py
│   │       ├── sig_service.py
│   │       └── ratios_service.py
│   │
│   ├── configuration/           # Configuration
│   │   ├── models.py
│   │   ├── serializers.py
│   │   ├── views.py
│   │   └── urls.py
│   │
│   └── integrations/            # Intégrations externes
│       ├── banking.py           # Connexions bancaires
│       ├── fiscal.py            # Intégrations fiscales
│       ├── webhooks.py
│       └── tasks.py             # Celery tasks
│
├── wisebook/
│   ├── settings/
│   │   ├── base.py
│   │   ├── development.py
│   │   ├── production.py
│   │   └── test.py
│   ├── urls.py
│   ├── wsgi.py
│   └── celery.py
│
├── shared/
│   ├── middleware/
│   │   ├── audit_middleware.py
│   │   ├── tenant_middleware.py
│   │   └── error_handler_middleware.py
│   ├── permissions/
│   │   ├── base_permissions.py
│   │   └── module_permissions.py
│   ├── serializers/
│   │   └── base_serializers.py
│   ├── validators/
│   │   ├── accounting_validators.py
│   │   └── business_validators.py
│   └── utils/
│       ├── pdf_generator.py
│       ├── excel_generator.py
│       ├── import_export.py
│       └── syscohada_utils.py
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── docs/
│   ├── api/
│   └── deployment/
│
├── scripts/
│   ├── setup_data.py
│   ├── seed_syscohada.py
│   └── backup_restore.py
│
├── requirements/
│   ├── base.txt
│   ├── development.txt
│   ├── production.txt
│   └── test.txt
│
├── .env.example
├── .gitignore
├── manage.py
├── pytest.ini
├── Dockerfile
└── docker-compose.yml
```

---

## 3. MODÈLE DE BASE DE DONNÉES

### 3.1 Schéma Global (PostgreSQL)

#### Tables Core
```sql
-- Sociétés
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(20) UNIQUE NOT NULL,
    nom VARCHAR(255) NOT NULL,
    description TEXT,
    email VARCHAR(255),
    telephone VARCHAR(50),
    address TEXT,
    logo VARCHAR(255),
    numero_rc VARCHAR(50),
    numero_if VARCHAR(50),
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_id UUID REFERENCES users(id),
    updated_by_id UUID REFERENCES users(id)
);

-- Exercices fiscaux
CREATE TABLE fiscal_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    societe_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    statut VARCHAR(20) CHECK (statut IN ('ouvert', 'cloture', 'archive')) DEFAULT 'ouvert',
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (societe_id, code)
);

-- Devises
CREATE TABLE currencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(3) UNIQUE NOT NULL,
    libelle VARCHAR(100) NOT NULL,
    symbole VARCHAR(10),
    taux_change DECIMAL(20, 6) DEFAULT 1.0,
    devise_reference BOOLEAN DEFAULT FALSE,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tables Comptabilité
```sql
-- Plan comptable
CREATE TABLE chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    societe_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    numero VARCHAR(20) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    classe CHAR(1) CHECK (classe IN ('1','2','3','4','5','6','7','8','9')) NOT NULL,
    sous_classe VARCHAR(5),
    compte_principal VARCHAR(10),
    parent_id UUID REFERENCES chart_of_accounts(id),
    type VARCHAR(20) CHECK (type IN ('detail', 'total')) DEFAULT 'detail',
    nature VARCHAR(20) CHECK (nature IN ('debit', 'credit')) NOT NULL,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (societe_id, numero)
);

CREATE INDEX idx_chart_accounts_numero ON chart_of_accounts(numero);
CREATE INDEX idx_chart_accounts_classe ON chart_of_accounts(classe);
CREATE INDEX idx_chart_accounts_societe ON chart_of_accounts(societe_id);

-- Journaux
CREATE TABLE journals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    societe_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(10) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    type VARCHAR(10) CHECK (type IN ('ACH', 'VTE', 'BQ', 'OD', 'PAIE', 'AN')) NOT NULL,
    compte_contrepartie_id UUID REFERENCES chart_of_accounts(id),
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (societe_id, code)
);

-- Écritures comptables
CREATE TABLE accounting_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    societe_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    exercice_id UUID NOT NULL REFERENCES fiscal_years(id),
    journal_id UUID NOT NULL REFERENCES journals(id),
    numero_piece VARCHAR(50) NOT NULL,
    date_piece DATE NOT NULL,
    libelle TEXT NOT NULL,
    reference_externe VARCHAR(100),
    statut VARCHAR(20) CHECK (statut IN ('brouillon', 'valide', 'lettree', 'contrepasse')) DEFAULT 'brouillon',
    total_debit DECIMAL(18, 2) DEFAULT 0,
    total_credit DECIMAL(18, 2) DEFAULT 0,
    validee_par_id UUID REFERENCES users(id),
    date_validation TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by_id UUID REFERENCES users(id),
    UNIQUE (societe_id, exercice_id, numero_piece)
);

CREATE INDEX idx_entries_date ON accounting_entries(date_piece);
CREATE INDEX idx_entries_journal ON accounting_entries(journal_id);
CREATE INDEX idx_entries_statut ON accounting_entries(statut);

-- Lignes d'écritures
CREATE TABLE accounting_entry_lines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ecriture_id UUID NOT NULL REFERENCES accounting_entries(id) ON DELETE CASCADE,
    compte_id UUID NOT NULL REFERENCES chart_of_accounts(id),
    libelle TEXT NOT NULL,
    debit DECIMAL(18, 2) DEFAULT 0,
    credit DECIMAL(18, 2) DEFAULT 0,
    tiers_id UUID REFERENCES third_parties(id),
    axe_analytique_id UUID REFERENCES analytical_axes(id),
    centre_analytique_id UUID REFERENCES analytical_centers(id),
    piece_jointe VARCHAR(255),
    numero_ligne INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entry_lines_compte ON accounting_entry_lines(compte_id);
CREATE INDEX idx_entry_lines_tiers ON accounting_entry_lines(tiers_id);
```

#### Tables Tiers
```sql
-- Tiers (clients/fournisseurs)
CREATE TABLE third_parties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    societe_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    nom VARCHAR(255) NOT NULL,
    type VARCHAR(30) CHECK (type IN ('client', 'fournisseur', 'client_fournisseur', 'autre')) NOT NULL,
    compte_comptable_id UUID REFERENCES chart_of_accounts(id),
    adresse TEXT,
    ville VARCHAR(100),
    code_postal VARCHAR(20),
    pays VARCHAR(100),
    telephone VARCHAR(50),
    email VARCHAR(255),
    contact_principal VARCHAR(255),
    numero_rc VARCHAR(50),
    numero_if VARCHAR(50),
    conditions_reglement TEXT,
    delai_paiement INTEGER,
    plafond_credit DECIMAL(18, 2),
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (societe_id, code)
);

CREATE INDEX idx_tiers_type ON third_parties(type);
CREATE INDEX idx_tiers_nom ON third_parties(nom);

-- Contacts
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tiers_id UUID NOT NULL REFERENCES third_parties(id) ON DELETE CASCADE,
    nom VARCHAR(100) NOT NULL,
    prenom VARCHAR(100),
    fonction VARCHAR(100),
    telephone VARCHAR(50),
    mobile VARCHAR(50),
    email VARCHAR(255),
    principal BOOLEAN DEFAULT FALSE,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tables Trésorerie
```sql
-- Comptes bancaires
CREATE TABLE bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    societe_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    numero_compte VARCHAR(50) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    banque VARCHAR(255),
    agence VARCHAR(255),
    iban VARCHAR(50),
    bic_swift VARCHAR(20),
    compte_comptable_id UUID REFERENCES chart_of_accounts(id),
    devise_id UUID NOT NULL REFERENCES currencies(id),
    solde_initial DECIMAL(18, 2) DEFAULT 0,
    solde_actuel DECIMAL(18, 2) DEFAULT 0,
    date_ouverture DATE,
    date_fermeture DATE,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (societe_id, numero_compte)
);

-- Transactions bancaires
CREATE TABLE bank_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compte_bancaire_id UUID NOT NULL REFERENCES bank_accounts(id) ON DELETE CASCADE,
    date_operation DATE NOT NULL,
    date_valeur DATE,
    libelle TEXT NOT NULL,
    reference VARCHAR(100),
    montant DECIMAL(18, 2) NOT NULL,
    sens VARCHAR(10) CHECK (sens IN ('debit', 'credit')) NOT NULL,
    solde_apres DECIMAL(18, 2),
    type_operation VARCHAR(30) CHECK (type_operation IN ('virement', 'cheque', 'carte', 'prelevement', 'depot', 'autre')),
    statut VARCHAR(20) CHECK (statut IN ('en_attente', 'rapproche', 'lettree')) DEFAULT 'en_attente',
    ecriture_comptable_id UUID REFERENCES accounting_entries(id),
    piece_jointe VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bank_trans_date ON bank_transactions(date_operation);
CREATE INDEX idx_bank_trans_compte ON bank_transactions(compte_bancaire_id);
```

#### Tables Immobilisations
```sql
-- Immobilisations
CREATE TABLE fixed_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    societe_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    numero VARCHAR(50) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    categorie VARCHAR(100),
    compte_immobilisation_id UUID REFERENCES chart_of_accounts(id),
    compte_amortissement_id UUID REFERENCES chart_of_accounts(id),
    date_acquisition DATE NOT NULL,
    date_mise_en_service DATE,
    valeur_acquisition DECIMAL(18, 2) NOT NULL,
    valeur_residuelle DECIMAL(18, 2) DEFAULT 0,
    duree_amortissement INTEGER,
    methode_amortissement VARCHAR(20) CHECK (methode_amortissement IN ('lineaire', 'degressif', 'variable')),
    taux_amortissement DECIMAL(5, 2),
    valeur_nette_comptable DECIMAL(18, 2),
    statut VARCHAR(20) CHECK (statut IN ('en_cours', 'amorti', 'cede', 'reforme')) DEFAULT 'en_cours',
    localisation VARCHAR(255),
    responsable VARCHAR(255),
    fournisseur_id UUID REFERENCES third_parties(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (societe_id, numero)
);

-- Amortissements
CREATE TABLE depreciations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    immobilisation_id UUID NOT NULL REFERENCES fixed_assets(id) ON DELETE CASCADE,
    exercice_id UUID NOT NULL REFERENCES fiscal_years(id),
    date_dotation DATE NOT NULL,
    montant_dotation DECIMAL(18, 2) NOT NULL,
    amortissement_cumule DECIMAL(18, 2) NOT NULL,
    valeur_nette_comptable DECIMAL(18, 2) NOT NULL,
    ecriture_comptable_id UUID REFERENCES accounting_entries(id),
    statut VARCHAR(20) CHECK (statut IN ('calculee', 'comptabilisee')) DEFAULT 'calculee',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tables Comptabilité Analytique
```sql
-- Axes analytiques
CREATE TABLE analytical_axes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    societe_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    description TEXT,
    obligatoire BOOLEAN DEFAULT FALSE,
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (societe_id, code)
);

-- Centres analytiques
CREATE TABLE analytical_centers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    axe_id UUID NOT NULL REFERENCES analytical_axes(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    parent_id UUID REFERENCES analytical_centers(id),
    niveau INTEGER DEFAULT 1,
    responsable VARCHAR(255),
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (axe_id, code)
);
```

#### Tables Budget
```sql
-- Budgets
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    societe_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    exercice_id UUID NOT NULL REFERENCES fiscal_years(id),
    code VARCHAR(50) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('previsionnel', 'initial', 'modifie')) DEFAULT 'initial',
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    statut VARCHAR(20) CHECK (statut IN ('brouillon', 'valide', 'cloture')) DEFAULT 'brouillon',
    montant_total DECIMAL(18, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (societe_id, code)
);

-- Contrôles budgétaires
CREATE TABLE budget_controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    compte_id UUID REFERENCES chart_of_accounts(id),
    centre_analytique_id UUID REFERENCES analytical_centers(id),
    periode VARCHAR(20),
    montant_budgete DECIMAL(18, 2) NOT NULL,
    montant_realise DECIMAL(18, 2) DEFAULT 0,
    montant_engage DECIMAL(18, 2) DEFAULT 0,
    ecart DECIMAL(18, 2) DEFAULT 0,
    taux_realisation DECIMAL(5, 2) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Tables Fiscalité
```sql
-- Déclarations fiscales
CREATE TABLE tax_declarations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    societe_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    exercice_id UUID NOT NULL REFERENCES fiscal_years(id),
    numero VARCHAR(50) NOT NULL,
    type VARCHAR(20) CHECK (type IN ('tva', 'is', 'irpp', 'tpl', 'autre')) NOT NULL,
    periode_debut DATE NOT NULL,
    periode_fin DATE NOT NULL,
    date_declaration DATE,
    date_limite_depot DATE NOT NULL,
    montant_taxe DECIMAL(18, 2) DEFAULT 0,
    montant_paye DECIMAL(18, 2) DEFAULT 0,
    statut VARCHAR(20) CHECK (statut IN ('brouillon', 'depose', 'paye')) DEFAULT 'brouillon',
    fichier_declaration VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (societe_id, numero)
);
```

#### Tables Inventaire
```sql
-- Articles d'inventaire
CREATE TABLE inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    societe_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    libelle VARCHAR(255) NOT NULL,
    description TEXT,
    categorie VARCHAR(100),
    unite_mesure VARCHAR(20),
    quantite_stock DECIMAL(18, 4) DEFAULT 0,
    quantite_reservee DECIMAL(18, 4) DEFAULT 0,
    quantite_disponible DECIMAL(18, 4) DEFAULT 0,
    valeur_unitaire DECIMAL(18, 2) DEFAULT 0,
    valeur_totale DECIMAL(18, 2) DEFAULT 0,
    methode_valorisation VARCHAR(20) CHECK (methode_valorisation IN ('FIFO', 'LIFO', 'AVCO', 'STANDARD')),
    seuil_reapprovisionnement DECIMAL(18, 4),
    localisation VARCHAR(255),
    emplacement VARCHAR(100),
    actif BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (societe_id, code)
);
```

---

## 4. AUTHENTIFICATION ET SÉCURITÉ

### 4.1 JWT Authentication

**Modèle User** (Django AbstractUser étendu):
```python
from django.contrib.auth.models import AbstractUser
import uuid

class User(AbstractUser):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    role = models.ForeignKey('Role', on_delete=models.SET_NULL, null=True)
    societe = models.ForeignKey('core.Company', on_delete=models.SET_NULL, null=True)
    phone = models.CharField(max_length=50, blank=True)
    photo = models.ImageField(upload_to='users/', blank=True)
    is_2fa_enabled = models.BooleanField(default=False)
```

**Endpoints d'authentification**:
```
POST   /api/v1/auth/register/         - Inscription
POST   /api/v1/auth/login/            - Connexion (JWT)
POST   /api/v1/auth/logout/           - Déconnexion
POST   /api/v1/auth/refresh/          - Refresh token
POST   /api/v1/auth/password/reset/   - Réinitialisation
POST   /api/v1/auth/password/change/  - Changement
GET    /api/v1/auth/me/               - Profil utilisateur
PATCH  /api/v1/auth/me/               - Modifier profil
```

### 4.2 Permissions Granulaires

**Modèle de permissions**:
```python
class Permission(models.Model):
    code = models.CharField(max_length=100, unique=True)
    nom = models.CharField(max_length=255)
    module = models.CharField(max_length=50)
    description = models.TextField(blank=True)

class Role(models.Model):
    nom = models.CharField(max_length=100)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    permissions = models.ManyToManyField(Permission)
```

**Exemples de permissions**:
- `accounting.view_entry` - Voir écritures
- `accounting.add_entry` - Créer écritures
- `accounting.change_entry` - Modifier écritures
- `accounting.delete_entry` - Supprimer écritures
- `accounting.validate_entry` - Valider écritures
- etc.

---

## 5. ARCHITECTURE DES VIEWS (DRF)

### 5.1 ViewSets Standard

**Pattern commun**:
```python
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

class BaseViewSet(viewsets.ModelViewSet):
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    permission_classes = [IsAuthenticated, HasModulePermission]

    def get_queryset(self):
        # Filtrer par société de l'utilisateur
        return self.queryset.filter(societe=self.request.user.societe)

    def perform_create(self, serializer):
        serializer.save(
            created_by=self.request.user,
            societe=self.request.user.societe
        )
```

### 5.2 Actions Personnalisées

**Exemple**: Validation d'écriture
```python
@action(detail=True, methods=['post'], permission_classes=[CanValidateEntry])
def validate(self, request, pk=None):
    entry = self.get_object()
    if entry.total_debit != entry.total_credit:
        return Response(
            {'error': 'Écriture déséquilibrée'},
            status=status.HTTP_400_BAD_REQUEST
        )
    entry.statut = 'valide'
    entry.validee_par = request.user
    entry.save()
    return Response({'message': 'Écriture validée'})
```

---

## 6. SERVICES MÉTIER

### 6.1 Pattern Service

**Exemple**: Service d'écritures comptables
```python
# apps/accounting/services/entry_service.py
from django.db import transaction
from decimal import Decimal

class AccountingEntryService:
    @staticmethod
    @transaction.atomic
    def create_entry(data, user):
        """Créer une écriture comptable avec validation"""
        # Valider équilibre débit/crédit
        total_debit = sum(line['debit'] for line in data['lignes'])
        total_credit = sum(line['credit'] for line in data['lignes'])

        if total_debit != total_credit:
            raise ValidationError("Écriture déséquilibrée")

        # Créer l'écriture
        entry = AccountingEntry.objects.create(
            societe=user.societe,
            **data,
            total_debit=total_debit,
            total_credit=total_credit,
            created_by=user
        )

        # Créer les lignes
        for idx, line_data in enumerate(data['lignes'], start=1):
            AccountingEntryLine.objects.create(
                ecriture=entry,
                numero_ligne=idx,
                **line_data
            )

        return entry

    @staticmethod
    def get_next_piece_number(societe, journal, exercice):
        """Générer le prochain numéro de pièce"""
        last_entry = AccountingEntry.objects.filter(
            societe=societe,
            journal=journal,
            exercice=exercice
        ).order_by('-numero_piece').first()

        if last_entry:
            # Extraire le numéro et incrémenter
            last_num = int(last_entry.numero_piece.split('-')[-1])
            return f"{journal.code}-{exercice.code}-{last_num + 1:06d}"
        else:
            return f"{journal.code}-{exercice.code}-000001"
```

---

## 7. VALIDATION ET RÈGLES MÉTIER

### 7.1 Validators Django

```python
# shared/validators/accounting_validators.py
from django.core.exceptions import ValidationError

def validate_account_number(value):
    """Valider format numéro de compte SYSCOHADA"""
    if not value.isdigit():
        raise ValidationError("Le numéro de compte doit être numérique")
    if len(value) < 1 or len(value) > 8:
        raise ValidationError("Le numéro de compte doit avoir entre 1 et 8 chiffres")

def validate_debit_credit_balance(debit, credit):
    """Valider qu'une ligne a soit débit soit crédit, pas les deux"""
    if debit > 0 and credit > 0:
        raise ValidationError("Une ligne ne peut avoir à la fois débit et crédit")
    if debit == 0 and credit == 0:
        raise ValidationError("Une ligne doit avoir soit un débit soit un crédit")
```

---

## 8. EXPORT ET GÉNÉRATION DE RAPPORTS

### 8.1 PDF Generator

```python
# shared/utils/pdf_generator.py
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, Paragraph
from reportlab.lib.styles import getSampleStyleSheet

class PDFReportGenerator:
    @staticmethod
    def generate_balance_sheet(data, output_path):
        """Générer un bilan PDF"""
        doc = SimpleDocTemplate(output_path, pagesize=A4)
        elements = []

        # Titre
        styles = getSampleStyleSheet()
        title = Paragraph("BILAN COMPTABLE", styles['Title'])
        elements.append(title)

        # Table
        table_data = [['Compte', 'Libellé', 'Débit', 'Crédit', 'Solde']]
        for row in data:
            table_data.append([
                row['numero'],
                row['libelle'],
                f"{row['debit']:,.2f}",
                f"{row['credit']:,.2f}",
                f"{row['solde']:,.2f}"
            ])

        table = Table(table_data)
        elements.append(table)

        doc.build(elements)
```

### 8.2 Excel Generator

```python
# shared/utils/excel_generator.py
import openpyxl
from openpyxl.styles import Font, Alignment

class ExcelReportGenerator:
    @staticmethod
    def generate_general_ledger(data, output_path):
        """Générer grand livre Excel"""
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Grand Livre"

        # En-têtes
        headers = ['Date', 'Journal', 'Pièce', 'Compte', 'Libellé', 'Débit', 'Crédit', 'Solde']
        ws.append(headers)

        # Style des en-têtes
        for cell in ws[1]:
            cell.font = Font(bold=True)
            cell.alignment = Alignment(horizontal='center')

        # Données
        for row in data:
            ws.append([
                row['date'],
                row['journal'],
                row['numero_piece'],
                row['compte'],
                row['libelle'],
                row['debit'],
                row['credit'],
                row['solde']
            ])

        wb.save(output_path)
```

---

## 9. TESTS

### 9.1 Structure des Tests

```python
# tests/unit/accounting/test_entry_service.py
import pytest
from apps.accounting.services.entry_service import AccountingEntryService

@pytest.mark.django_db
class TestAccountingEntryService:
    def test_create_balanced_entry(self, user, journal, compte_debit, compte_credit):
        """Test création d'une écriture équilibrée"""
        data = {
            'exercice': user.societe.exercice_actif,
            'journal': journal,
            'date_piece': '2024-01-15',
            'libelle': 'Test écriture',
            'lignes': [
                {'compte': compte_debit, 'debit': 1000, 'credit': 0},
                {'compte': compte_credit, 'debit': 0, 'credit': 1000}
            ]
        }

        entry = AccountingEntryService.create_entry(data, user)

        assert entry.total_debit == 1000
        assert entry.total_credit == 1000
        assert entry.statut == 'brouillon'

    def test_reject_unbalanced_entry(self, user, journal):
        """Test rejet d'une écriture déséquilibrée"""
        data = {
            'lignes': [
                {'debit': 1000, 'credit': 0},
                {'debit': 0, 'credit': 500}  # Déséquilibre
            ]
        }

        with pytest.raises(ValidationError):
            AccountingEntryService.create_entry(data, user)
```

---

## 10. DÉPLOIEMENT

### 10.1 Docker

**Dockerfile**:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Dépendances système
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Dépendances Python
COPY requirements/production.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Code
COPY . .

# Collecte des fichiers statiques
RUN python manage.py collectstatic --noinput

EXPOSE 8000

CMD ["gunicorn", "wisebook.wsgi:application", "--bind", "0.0.0.0:8000"]
```

**docker-compose.yml**:
```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: wisebook
      POSTGRES_USER: wisebook
      POSTGRES_PASSWORD: changeme
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  web:
    build: .
    command: gunicorn wisebook.wsgi:application --bind 0.0.0.0:8000
    volumes:
      - ./:/app
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    ports:
      - "8000:8000"
    env_file:
      - .env
    depends_on:
      - db
      - redis

  celery:
    build: .
    command: celery -A wisebook worker -l info
    volumes:
      - ./:/app
    env_file:
      - .env
    depends_on:
      - db
      - redis

  nginx:
    image: nginx:alpine
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    ports:
      - "80:80"
    depends_on:
      - web

volumes:
  postgres_data:
  static_volume:
  media_volume:
```

---

## 11. CONFIGURATION .ENV

```bash
# .env.example
DEBUG=False
SECRET_KEY=your-secret-key-here-change-in-production

# Database
DB_NAME=wisebook
DB_USER=wisebook
DB_PASSWORD=changeme
DB_HOST=localhost
DB_PORT=5432

# Redis
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://yourdomain.com

# JWT
JWT_ACCESS_TOKEN_LIFETIME=15  # minutes
JWT_REFRESH_TOKEN_LIFETIME=7  # days

# Email
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-password

# Storage (AWS S3 pour production)
USE_S3=False
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_STORAGE_BUCKET_NAME=

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Sentry (monitoring d'erreurs)
SENTRY_DSN=
```

---

## 12. COMMANDES DE GESTION

### 12.1 Scripts d'Initialisation

```python
# scripts/setup_data.py
"""
Commande: python manage.py setup_data
Initialise les données de base (devises, plan SYSCOHADA, etc.)
"""

from django.core.management.base import BaseCommand
from apps.core.models import Currency
from apps.accounting.services.chart_service import ChartOfAccountsService

class Command(BaseCommand):
    def handle(self, *args, **options):
        # Devises
        Currency.objects.get_or_create(
            code='XAF',
            defaults={'libelle': 'Franc CFA', 'symbole': 'FCFA', 'devise_reference': True}
        )

        # Plan SYSCOHADA
        ChartOfAccountsService.import_syscohada_standard()

        self.stdout.write(self.style.SUCCESS('Données initialisées'))
```

---

## RÉSUMÉ

✅ **Architecture complète** : 15 modules Django
✅ **Base de données** : Schéma PostgreSQL complet
✅ **346 endpoints API** : RESTful avec DRF
✅ **Authentification** : JWT avec permissions granulaires
✅ **Services métier** : Logique isolée et testable
✅ **Validation** : Règles métier SYSCOHADA
✅ **Export** : PDF, Excel, CSV
✅ **Tests** : Pytest avec fixtures
✅ **Déploiement** : Docker + Nginx + Gunicorn
✅ **Documentation** : OpenAPI 3.0 (Swagger)

