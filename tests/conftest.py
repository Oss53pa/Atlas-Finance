"""
Configuration pytest pour WiseBook V3.0
Fixtures et configuration globale pour tous les tests
"""
import pytest
import os
from decimal import Decimal
from datetime import date, datetime, timedelta
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.db import transaction
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

# Import des modèles
from apps.core.models import Societe, Devise, Exercice, Periode
from apps.security.models import Utilisateur, Role, Permission
from apps.accounting.models import CompteComptable, JournalComptable
from apps.third_party.models import Tiers
from apps.treasury.models import CompteBancaire
from apps.analytics.models import AxeAnalytique, CentreAnalytique


@pytest.fixture(scope='session')
def django_db_setup():
    """Configuration de la base de données pour les tests."""
    from django.conf import settings
    from django.core.management import execute_from_command_line
    
    # Créer les tables
    execute_from_command_line(['manage.py', 'migrate', '--verbosity=0'])


@pytest.fixture
def test_societe():
    """Fixture pour une société de test."""
    return Societe.objects.create(
        nom='Société de Test',
        sigle='TEST',
        forme_juridique='SARL',
        secteur_activite='Services',
        pays='CM',
        ville='Douala',
        adresse='123 Rue de Test',
        telephone='+237123456789',
        email='contact@test.cm',
        site_web='https://test.cm',
        effectif=10,
        chiffre_affaires=Decimal('50000000'),
        monnaie_fonctionnelle='XAF',
        active=True
    )


@pytest.fixture
def test_devise():
    """Fixture pour la devise de test."""
    return Devise.objects.create(
        code='XAF',
        nom='Franc CFA (BEAC)',
        symbole='FCFA',
        taux_change=Decimal('1.0000'),
        devise_reference=True,
        active=True
    )


@pytest.fixture
def test_exercice(test_societe):
    """Fixture pour un exercice comptable de test."""
    return Exercice.objects.create(
        societe=test_societe,
        annee=2024,
        date_debut=date(2024, 1, 1),
        date_fin=date(2024, 12, 31),
        statut='ouvert'
    )


@pytest.fixture
def test_periodes(test_exercice):
    """Fixture pour les périodes d'un exercice."""
    periodes = []
    for mois in range(1, 13):
        periode = Periode.objects.create(
            exercice=test_exercice,
            numero=mois,
            nom=f"Période {mois:02d}/2024",
            date_debut=date(2024, mois, 1),
            date_fin=date(2024, mois, 28 if mois == 2 else 30 if mois in [4,6,9,11] else 31),
            statut='ouverte'
        )
        periodes.append(periode)
    return periodes


@pytest.fixture
def admin_user(test_societe):
    """Fixture pour un utilisateur administrateur."""
    return Utilisateur.objects.create_user(
        username='admin_test',
        email='admin@test.cm',
        password='AdminTest123!',
        nom='Admin',
        prenom='Test',
        societe=test_societe,
        is_staff=True,
        is_superuser=True,
        is_active=True
    )


@pytest.fixture
def comptable_user(test_societe):
    """Fixture pour un utilisateur comptable."""
    return Utilisateur.objects.create_user(
        username='comptable_test',
        email='comptable@test.cm',
        password='ComptableTest123!',
        nom='Comptable',
        prenom='Test',
        societe=test_societe,
        is_active=True
    )


@pytest.fixture
def readonly_user(test_societe):
    """Fixture pour un utilisateur en lecture seule."""
    return Utilisateur.objects.create_user(
        username='readonly_test',
        email='readonly@test.cm',
        password='ReadOnlyTest123!',
        nom='ReadOnly',
        prenom='Test',
        societe=test_societe,
        is_active=True
    )


@pytest.fixture
def authenticated_client(admin_user):
    """Fixture pour un client API authentifié."""
    client = APIClient()
    refresh = RefreshToken.for_user(admin_user)
    access_token = str(refresh.access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    return client


@pytest.fixture
def comptable_client(comptable_user):
    """Fixture pour un client API comptable."""
    client = APIClient()
    refresh = RefreshToken.for_user(comptable_user)
    access_token = str(refresh.access_token)
    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access_token}')
    return client


@pytest.fixture
def base_accounts(test_societe):
    """Fixture pour les comptes comptables de base."""
    comptes = []
    
    # Comptes principaux SYSCOHADA
    accounts_data = [
        ('10', 'CAPITAL', 'passif', 1, True),
        ('11', 'RESERVES', 'passif', 1, True),
        ('21', 'IMMOBILISATIONS CORPORELLES', 'actif', 2, True),
        ('28', 'AMORTISSEMENTS', 'actif', 2, True),
        ('40', 'FOURNISSEURS ET COMPTES RATTACHES', 'passif', 4, True),
        ('41', 'CLIENTS ET COMPTES RATTACHES', 'actif', 4, True),
        ('52', 'BANQUES', 'actif', 5, True),
        ('53', 'CAISSE', 'actif', 5, True),
        ('60', 'ACHATS ET VARIATIONS DE STOCKS', 'charge', 6, False),
        ('70', 'VENTES', 'produit', 7, False),
    ]
    
    for numero, intitule, sens, classe, collectif in accounts_data:
        compte = CompteComptable.objects.create(
            societe=test_societe,
            numero=numero,
            intitule=intitule,
            sens=sens,
            classe=classe,
            collectif=collectif,
            actif=True
        )
        comptes.append(compte)
    
    return comptes


@pytest.fixture
def base_journals(test_societe):
    """Fixture pour les journaux comptables de base."""
    journaux = []
    
    journals_data = [
        ('VTE', 'Journal des ventes', 'vente'),
        ('ACH', 'Journal des achats', 'achat'),
        ('BQ1', 'Journal de banque principale', 'tresorerie'),
        ('CAI', 'Journal de caisse', 'tresorerie'),
        ('OD', 'Journal des opérations diverses', 'general'),
    ]
    
    for code, libelle, type_journal in journals_data:
        journal = JournalComptable.objects.create(
            societe=test_societe,
            code=code,
            libelle=libelle,
            type=type_journal,
            actif=True
        )
        journaux.append(journal)
    
    return journaux


@pytest.fixture
def test_clients(test_societe):
    """Fixture pour des clients de test."""
    clients = []
    
    clients_data = [
        ('CLI001', 'SARL Client Alpha', 'client@alpha.cm'),
        ('CLI002', 'SA Client Beta', 'contact@beta.cm'),
        ('CLI003', 'EURL Client Gamma', 'info@gamma.cm'),
    ]
    
    for code, nom, email in clients_data:
        client = Tiers.objects.create(
            societe=test_societe,
            type='client',
            nom=nom,
            code=code,
            forme_juridique='SARL',
            activite='Commerce',
            pays='CM',
            ville='Douala',
            email=email,
            actif=True
        )
        clients.append(client)
    
    return clients


@pytest.fixture
def test_fournisseurs(test_societe):
    """Fixture pour des fournisseurs de test."""
    fournisseurs = []
    
    fournisseurs_data = [
        ('FOU001', 'Fournisseur Alpha SARL', 'contact@fournisseur-alpha.cm'),
        ('FOU002', 'Fournisseur Beta SA', 'info@fournisseur-beta.cm'),
    ]
    
    for code, nom, email in fournisseurs_data:
        fournisseur = Tiers.objects.create(
            societe=test_societe,
            type='fournisseur',
            nom=nom,
            code=code,
            forme_juridique='SARL',
            activite='Distribution',
            pays='CM',
            ville='Yaoundé',
            email=email,
            actif=True
        )
        fournisseurs.append(fournisseur)
    
    return fournisseurs


@pytest.fixture
def test_compte_bancaire(test_societe, test_devise):
    """Fixture pour un compte bancaire de test."""
    return CompteBancaire.objects.create(
        societe=test_societe,
        nom='Compte Principal Test',
        banque='BGFI Bank Cameroun',
        numero_compte='12345678901234567890',
        iban='CM2112345678901234567890',
        bic='BGFICMCM',
        devise=test_devise,
        solde_initial=Decimal('5000000'),
        date_ouverture=date(2024, 1, 1),
        actif=True
    )


@pytest.fixture
def axes_analytiques(test_societe):
    """Fixture pour les axes analytiques de test."""
    axes = []
    
    # Axe centres de coût
    axe_cc = AxeAnalytique.objects.create(
        societe=test_societe,
        code='CC',
        libelle='Centres de coût',
        type='centre_cout',
        obligatoire=True,
        actif=True
    )
    axes.append(axe_cc)
    
    # Centres de coût
    centres_cout = [
        ('CC001', 'Direction générale'),
        ('CC002', 'Comptabilité'),
        ('CC003', 'Commercial'),
        ('CC004', 'Production'),
    ]
    
    for code, libelle in centres_cout:
        CentreAnalytique.objects.create(
            axe=axe_cc,
            code=code,
            libelle=libelle,
            actif=True
        )
    
    # Axe projets
    axe_proj = AxeAnalytique.objects.create(
        societe=test_societe,
        code='PROJ',
        libelle='Projets',
        type='projet',
        obligatoire=False,
        actif=True
    )
    axes.append(axe_proj)
    
    # Projets
    projets = [
        ('PROJ001', 'Projet Alpha'),
        ('PROJ002', 'Projet Beta'),
    ]
    
    for code, libelle in projets:
        CentreAnalytique.objects.create(
            axe=axe_proj,
            code=code,
            libelle=libelle,
            actif=True
        )
    
    return axes


@pytest.fixture
def sample_permissions():
    """Fixture pour des permissions de test."""
    permissions = []
    
    permissions_data = [
        ('accounting.view_comptecomptable', 'Voir les comptes comptables'),
        ('accounting.add_comptecomptable', 'Ajouter des comptes comptables'),
        ('accounting.change_comptecomptable', 'Modifier les comptes comptables'),
        ('accounting.delete_comptecomptable', 'Supprimer les comptes comptables'),
        ('accounting.view_ecriture', 'Voir les écritures comptables'),
        ('accounting.add_ecriture', 'Ajouter des écritures comptables'),
        ('third_party.view_tiers', 'Voir les tiers'),
        ('third_party.add_tiers', 'Ajouter des tiers'),
    ]
    
    for code, nom in permissions_data:
        permission = Permission.objects.create(
            code=code,
            nom=nom,
            module=code.split('.')[0],
            actif=True
        )
        permissions.append(permission)
    
    return permissions


@pytest.fixture
def comptable_role(sample_permissions):
    """Fixture pour un rôle comptable avec permissions."""
    role = Role.objects.create(
        nom='Comptable',
        code='COMPTABLE',
        description='Rôle pour les comptables',
        actif=True
    )
    
    # Ajouter les permissions comptables
    comptable_permissions = [
        p for p in sample_permissions
        if 'accounting' in p.code or 'third_party' in p.code
    ]
    
    role.permissions.set(comptable_permissions)
    return role


# Fixtures pour les données de performance
@pytest.fixture(scope='session')
def large_dataset(django_db_setup, django_db_blocker):
    """Fixture pour un grand dataset de test (session scope pour performance)."""
    with django_db_blocker.unblock():
        # Création d'une société pour les données de masse
        societe = Societe.objects.create(
            nom='Large Dataset Company',
            sigle='LDC',
            pays='CM'
        )
        
        # Création d'un grand nombre de comptes
        comptes = []
        for classe in [6, 7]:
            for i in range(500):  # 500 comptes par classe
                comptes.append(CompteComptable(
                    societe=societe,
                    numero=f'{classe}{i:04d}',
                    intitule=f'Compte {classe}{i:04d}',
                    sens='charge' if classe == 6 else 'produit',
                    classe=classe,
                    actif=True
                ))
        
        CompteComptable.objects.bulk_create(comptes)
        
        return {
            'societe': societe,
            'compte_count': len(comptes)
        }


# Fixtures pour les tests d'intégration
@pytest.fixture
def complete_setup(test_societe, test_devise, test_exercice, admin_user, 
                  base_accounts, base_journals, test_clients):
    """Fixture complète pour les tests d'intégration."""
    return {
        'societe': test_societe,
        'devise': test_devise,
        'exercice': test_exercice,
        'user': admin_user,
        'accounts': base_accounts,
        'journals': base_journals,
        'clients': test_clients
    }


# Configuration des markers pytest
def pytest_configure(config):
    """Configuration des markers pytest."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')"
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests"
    )
    config.addinivalue_line(
        "markers", "api: marks tests as API tests"
    )
    config.addinivalue_line(
        "markers", "performance: marks tests as performance tests"
    )
    config.addinivalue_line(
        "markers", "security: marks tests as security tests"
    )


# Hooks pytest
def pytest_collection_modifyitems(config, items):
    """Modifie la collection des tests."""
    # Ajouter automatiquement le marker slow aux tests de performance
    for item in items:
        if "performance" in item.nodeid or "test_performance" in item.nodeid:
            item.add_marker(pytest.mark.slow)
        
        if "test_api" in item.nodeid or "api" in item.nodeid:
            item.add_marker(pytest.mark.api)
        
        if "integration" in item.nodeid:
            item.add_marker(pytest.mark.integration)


# Fixtures pour les tests spécifiques aux modules
@pytest.fixture
def mock_external_api():
    """Mock pour les API externes."""
    from unittest.mock import Mock, patch
    
    mock_api = Mock()
    mock_api.get_exchange_rate.return_value = Decimal('655.957')  # EUR to XAF
    mock_api.validate_bank_account.return_value = True
    mock_api.get_company_info.return_value = {
        'name': 'Test Company',
        'status': 'active',
        'tax_number': '123456789'
    }
    
    return mock_api


@pytest.fixture
def temp_media_root(tmp_path):
    """Racine temporaire pour les fichiers media."""
    from django.conf import settings
    
    original_media_root = settings.MEDIA_ROOT
    settings.MEDIA_ROOT = tmp_path
    
    yield tmp_path
    
    settings.MEDIA_ROOT = original_media_root