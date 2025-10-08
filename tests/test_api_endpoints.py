"""
Tests des endpoints API pour WiseBook V3.0
Framework de test complet pour tous les endpoints REST
"""
import pytest
import json
from decimal import Decimal
from datetime import date, datetime
from django.test import TestCase
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from apps.core.models import Societe, Devise, Exercice
from apps.security.models import Utilisateur, Role, Permission
from apps.accounting.models import CompteComptable, JournalComptable, EcritureComptable
from apps.third_party.models import Tiers
from apps.treasury.models import CompteBancaire
from apps.assets.models import Immobilisation
from apps.analytics.models import AxeAnalytique


class BaseAPITestCase(APITestCase):
    """Classe de base pour tous les tests API."""
    
    def setUp(self):
        """Configuration commune pour tous les tests API."""
        # Création de la société de test
        self.societe = Societe.objects.create(
            nom='Test API Company',
            sigle='TAC',
            forme_juridique='SARL',
            secteur_activite='Services',
            pays='CM',
            ville='Douala',
            adresse='123 Test Street',
            telephone='+237123456789',
            email='contact@testapi.cm',
            effectif=50,
            monnaie_fonctionnelle='XAF',
            active=True
        )
        
        # Devise de base
        self.devise_xaf = Devise.objects.create(
            code='XAF',
            nom='Franc CFA',
            symbole='FCFA',
            taux_change=Decimal('1.0000'),
            devise_reference=True
        )
        
        # Exercice comptable
        self.exercice = Exercice.objects.create(
            societe=self.societe,
            annee=2024,
            date_debut=date(2024, 1, 1),
            date_fin=date(2024, 12, 31),
            statut='ouvert'
        )
        
        # Utilisateurs de test
        self.admin_user = Utilisateur.objects.create_user(
            username='admin_api',
            email='admin@testapi.cm',
            password='AdminAPI123!',
            nom='Admin',
            prenom='API',
            societe=self.societe,
            is_staff=True,
            is_superuser=True
        )
        
        self.comptable_user = Utilisateur.objects.create_user(
            username='comptable_api',
            email='comptable@testapi.cm',
            password='ComptableAPI123!',
            nom='Comptable',
            prenom='API',
            societe=self.societe
        )
        
        self.readonly_user = Utilisateur.objects.create_user(
            username='readonly_api',
            email='readonly@testapi.cm',
            password='ReadOnlyAPI123!',
            nom='ReadOnly',
            prenom='API',
            societe=self.societe
        )
        
        # Configuration du client API
        self.client = APIClient()
        
    def get_jwt_token(self, user):
        """Génère un token JWT pour l'utilisateur."""
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)
    
    def authenticate_user(self, user):
        """Authentifie un utilisateur pour les tests."""
        token = self.get_jwt_token(user)
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    def create_base_accounts(self):
        """Crée les comptes comptables de base."""
        accounts = [
            ('70', 'Ventes', 'produit', 7),
            ('60', 'Achats', 'charge', 6),
            ('41', 'Clients', 'actif', 4),
            ('40', 'Fournisseurs', 'passif', 4),
            ('52', 'Banque', 'actif', 5),
        ]
        
        created_accounts = {}
        for numero, intitule, sens, classe in accounts:
            account = CompteComptable.objects.create(
                societe=self.societe,
                numero=numero,
                intitule=intitule,
                sens=sens,
                classe=classe,
                collectif=True,
                actif=True
            )
            created_accounts[numero] = account
            
        return created_accounts


class AuthenticationAPITest(BaseAPITestCase):
    """Tests des endpoints d'authentification."""
    
    def test_login_success(self):
        """Test de connexion réussie."""
        url = reverse('token_obtain_pair')
        data = {
            'username': 'admin_api',
            'password': 'AdminAPI123!'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
    
    def test_login_invalid_credentials(self):
        """Test de connexion avec credentials invalides."""
        url = reverse('token_obtain_pair')
        data = {
            'username': 'admin_api',
            'password': 'WrongPassword'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_token_refresh(self):
        """Test du rafraîchissement de token."""
        # Obtenir un token initial
        refresh = RefreshToken.for_user(self.admin_user)
        
        url = reverse('token_refresh')
        data = {'refresh': str(refresh)}
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
    
    def test_user_profile(self):
        """Test de récupération du profil utilisateur."""
        self.authenticate_user(self.admin_user)
        
        url = reverse('user-profile')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'admin_api')
        self.assertEqual(response.data['email'], 'admin@testapi.cm')


class CoreAPITest(BaseAPITestCase):
    """Tests des endpoints core (sociétés, exercices, devises)."""
    
    def test_societe_list(self):
        """Test de liste des sociétés."""
        self.authenticate_user(self.admin_user)
        
        url = reverse('societe-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['nom'], 'Test API Company')
    
    def test_societe_create_admin_only(self):
        """Test de création de société (admin seulement)."""
        self.authenticate_user(self.admin_user)
        
        url = reverse('societe-list')
        data = {
            'nom': 'Nouvelle Société API',
            'sigle': 'NSA',
            'forme_juridique': 'SA',
            'pays': 'CM',
            'ville': 'Yaoundé',
            'monnaie_fonctionnelle': 'XAF'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nom'], 'Nouvelle Société API')
    
    def test_societe_create_forbidden_normal_user(self):
        """Test de création de société interdite pour utilisateur normal."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('societe-list')
        data = {
            'nom': 'Société Interdite',
            'sigle': 'SI',
            'pays': 'CM'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_exercice_list(self):
        """Test de liste des exercices comptables."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('exercice-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['annee'], 2024)
    
    def test_exercice_create(self):
        """Test de création d'exercice comptable."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('exercice-list')
        data = {
            'annee': 2025,
            'date_debut': '2025-01-01',
            'date_fin': '2025-12-31',
            'statut': 'preparation'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['annee'], 2025)
    
    def test_devise_list(self):
        """Test de liste des devises."""
        self.authenticate_user(self.readonly_user)
        
        url = reverse('devise-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data['results']), 1)


class AccountingAPITest(BaseAPITestCase):
    """Tests des endpoints comptables."""
    
    def setUp(self):
        super().setUp()
        self.accounts = self.create_base_accounts()
    
    def test_compte_list(self):
        """Test de liste des comptes comptables."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('compte-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 5)
    
    def test_compte_create(self):
        """Test de création de compte comptable."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('compte-list')
        data = {
            'numero': '70001',
            'intitule': 'Ventes de marchandises',
            'sens': 'produit',
            'classe': 7,
            'collectif': False,
            'actif': True
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['numero'], '70001')
        self.assertEqual(response.data['intitule'], 'Ventes de marchandises')
    
    def test_compte_duplicate_numero_error(self):
        """Test d'erreur pour numéro de compte dupliqué."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('compte-list')
        data = {
            'numero': '70',  # Déjà existant
            'intitule': 'Compte dupliqué',
            'sens': 'produit',
            'classe': 7
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_journal_list(self):
        """Test de liste des journaux comptables."""
        # Créer quelques journaux
        JournalComptable.objects.create(
            societe=self.societe,
            code='VTE',
            libelle='Journal des ventes',
            type='vente'
        )
        
        self.authenticate_user(self.comptable_user)
        
        url = reverse('journal-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_ecriture_create(self):
        """Test de création d'écriture comptable."""
        # Créer un journal
        journal = JournalComptable.objects.create(
            societe=self.societe,
            code='OD',
            libelle='Opérations diverses',
            type='general'
        )
        
        self.authenticate_user(self.comptable_user)
        
        url = reverse('ecriture-list')
        data = {
            'journal': journal.id,
            'numero': 'OD240001',
            'date_ecriture': '2024-01-15',
            'libelle': 'Écriture de test',
            'statut': 'brouillard',
            'lignes': [
                {
                    'compte': self.accounts['41'].id,
                    'libelle': 'Ligne débit',
                    'montant_debit': '1000.00',
                    'montant_credit': '0.00',
                    'ordre_ligne': 1
                },
                {
                    'compte': self.accounts['70'].id,
                    'libelle': 'Ligne crédit',
                    'montant_debit': '0.00',
                    'montant_credit': '1000.00',
                    'ordre_ligne': 2
                }
            ]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['numero'], 'OD240001')
        self.assertEqual(len(response.data['lignes']), 2)
    
    def test_balance_generale(self):
        """Test de génération de la balance générale."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('balance-generale')
        params = {'exercice': self.exercice.id}
        response = self.client.get(url, params)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('comptes', response.data)
        self.assertIn('totaux', response.data)


class ThirdPartyAPITest(BaseAPITestCase):
    """Tests des endpoints tiers (clients/fournisseurs)."""
    
    def test_tiers_list(self):
        """Test de liste des tiers."""
        # Créer un tiers de test
        Tiers.objects.create(
            societe=self.societe,
            type='client',
            nom='Client Test API',
            code='CLI001',
            email='client@test.com',
            actif=True
        )
        
        self.authenticate_user(self.comptable_user)
        
        url = reverse('tiers-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_tiers_create_client(self):
        """Test de création d'un client."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('tiers-list')
        data = {
            'type': 'client',
            'nom': 'Nouveau Client API',
            'code': 'CLI002',
            'forme_juridique': 'SARL',
            'activite': 'Commerce',
            'pays': 'CM',
            'ville': 'Douala',
            'email': 'nouveau-client@test.com',
            'telephone': '+237123456789',
            'actif': True
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nom'], 'Nouveau Client API')
        self.assertEqual(response.data['type'], 'client')
    
    def test_tiers_create_fournisseur(self):
        """Test de création d'un fournisseur."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('tiers-list')
        data = {
            'type': 'fournisseur',
            'nom': 'Nouveau Fournisseur API',
            'code': 'FOU001',
            'pays': 'CM',
            'email': 'fournisseur@test.com',
            'actif': True
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['type'], 'fournisseur')
    
    def test_tiers_filter_by_type(self):
        """Test de filtrage des tiers par type."""
        # Créer des tiers de différents types
        Tiers.objects.create(
            societe=self.societe,
            type='client',
            nom='Client 1',
            code='CLI001'
        )
        Tiers.objects.create(
            societe=self.societe,
            type='fournisseur',
            nom='Fournisseur 1',
            code='FOU001'
        )
        
        self.authenticate_user(self.comptable_user)
        
        # Test filtre clients
        url = reverse('tiers-list')
        response = self.client.get(url, {'type': 'client'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['type'], 'client')
        
        # Test filtre fournisseurs
        response = self.client.get(url, {'type': 'fournisseur'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['type'], 'fournisseur')


class TreasuryAPITest(BaseAPITestCase):
    """Tests des endpoints trésorerie."""
    
    def test_compte_bancaire_list(self):
        """Test de liste des comptes bancaires."""
        # Créer un compte bancaire
        CompteBancaire.objects.create(
            societe=self.societe,
            nom='Compte Test API',
            banque='Banque Test',
            numero_compte='12345678901',
            devise=self.devise_xaf,
            solde_initial=Decimal('1000000'),
            actif=True
        )
        
        self.authenticate_user(self.comptable_user)
        
        url = reverse('compte-bancaire-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_compte_bancaire_create(self):
        """Test de création de compte bancaire."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('compte-bancaire-list')
        data = {
            'nom': 'Nouveau Compte Bancaire API',
            'banque': 'Nouvelle Banque',
            'numero_compte': '98765432101',
            'iban': 'CM2198765432101234567890',
            'bic': 'TESTCMCX',
            'devise': self.devise_xaf.id,
            'solde_initial': '5000000.00',
            'date_ouverture': '2024-01-01',
            'actif': True
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['nom'], 'Nouveau Compte Bancaire API')
        self.assertEqual(float(response.data['solde_initial']), 5000000.00)


class AssetsAPITest(BaseAPITestCase):
    """Tests des endpoints immobilisations."""
    
    def test_immobilisation_list(self):
        """Test de liste des immobilisations."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('immobilisation-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_immobilisation_create(self):
        """Test de création d'immobilisation."""
        # Créer les comptes nécessaires
        compte_immo = CompteComptable.objects.create(
            societe=self.societe,
            numero='21',
            intitule='Immobilisations corporelles',
            sens='actif',
            classe=2
        )
        compte_amort = CompteComptable.objects.create(
            societe=self.societe,
            numero='28',
            intitule='Amortissements',
            sens='actif',
            classe=2
        )
        
        self.authenticate_user(self.comptable_user)
        
        url = reverse('immobilisation-list')
        data = {
            'designation': 'Ordinateur portable API',
            'numero_inventaire': 'API-001',
            'categorie': 'materiel_informatique',
            'date_acquisition': '2024-01-01',
            'valeur_acquisition': '800000.00',
            'valeur_residuelle': '50000.00',
            'duree_amortissement': 36,
            'methode_amortissement': 'lineaire',
            'compte_immobilisation': compte_immo.id,
            'compte_amortissement': compte_amort.id,
            'actif': True
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['designation'], 'Ordinateur portable API')


class AnalyticsAPITest(BaseAPITestCase):
    """Tests des endpoints analytiques."""
    
    def test_axe_analytique_list(self):
        """Test de liste des axes analytiques."""
        # Créer un axe analytique
        AxeAnalytique.objects.create(
            societe=self.societe,
            code='CC',
            libelle='Centres de coût',
            type='centre_cout',
            actif=True
        )
        
        self.authenticate_user(self.comptable_user)
        
        url = reverse('axe-analytique-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
    
    def test_axe_analytique_create(self):
        """Test de création d'axe analytique."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('axe-analytique-list')
        data = {
            'code': 'PROJ',
            'libelle': 'Projets',
            'type': 'projet',
            'obligatoire': False,
            'actif': True
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['code'], 'PROJ')


class ErrorHandlingAPITest(BaseAPITestCase):
    """Tests de gestion d'erreurs des API."""
    
    def test_unauthorized_access(self):
        """Test d'accès non autorisé."""
        url = reverse('compte-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_not_found_error(self):
        """Test d'erreur 404."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('compte-detail', kwargs={'pk': 99999})
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_validation_error(self):
        """Test d'erreur de validation."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('compte-list')
        data = {
            'numero': '',  # Champ requis vide
            'intitule': 'Compte sans numéro',
            'sens': 'invalid_sens'  # Valeur invalide
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('numero', response.data)
        self.assertIn('sens', response.data)
    
    def test_permission_denied(self):
        """Test d'accès refusé pour permissions insuffisantes."""
        self.authenticate_user(self.readonly_user)
        
        url = reverse('compte-list')
        data = {
            'numero': '70002',
            'intitule': 'Test permission',
            'sens': 'produit',
            'classe': 7
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)


class PaginationAPITest(BaseAPITestCase):
    """Tests de pagination des API."""
    
    def test_pagination_works(self):
        """Test du fonctionnement de la pagination."""
        # Créer plusieurs comptes pour tester la pagination
        for i in range(30):
            CompteComptable.objects.create(
                societe=self.societe,
                numero=f'7{i:04d}',
                intitule=f'Compte test {i}',
                sens='produit',
                classe=7
            )
        
        self.authenticate_user(self.comptable_user)
        
        url = reverse('compte-list')
        response = self.client.get(url)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('count', response.data)
        self.assertIn('next', response.data)
        self.assertIn('previous', response.data)
        self.assertIn('results', response.data)
        self.assertEqual(len(response.data['results']), 25)  # Page size par défaut
        
        # Test de la page suivante
        if response.data['next']:
            next_response = self.client.get(response.data['next'])
            self.assertEqual(next_response.status_code, status.HTTP_200_OK)
            self.assertEqual(len(next_response.data['results']), 5)  # 30 - 25 = 5


class SearchFilterAPITest(BaseAPITestCase):
    """Tests de recherche et filtrage des API."""
    
    def setUp(self):
        super().setUp()
        
        # Créer des comptes de test avec différents critères
        CompteComptable.objects.create(
            societe=self.societe,
            numero='60001',
            intitule='Achats de marchandises',
            sens='charge',
            classe=6,
            actif=True
        )
        CompteComptable.objects.create(
            societe=self.societe,
            numero='70001',
            intitule='Ventes de marchandises',
            sens='produit',
            classe=7,
            actif=True
        )
        CompteComptable.objects.create(
            societe=self.societe,
            numero='70002',
            intitule='Ventes de services',
            sens='produit',
            classe=7,
            actif=False  # Inactif
        )
    
    def test_search_filter(self):
        """Test de recherche textuelle."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('compte-list')
        
        # Recherche par intitulé
        response = self.client.get(url, {'search': 'marchandises'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Recherche par numéro
        response = self.client.get(url, {'search': '60001'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['numero'], '60001')
    
    def test_field_filters(self):
        """Test de filtrage par champs."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('compte-list')
        
        # Filtre par sens
        response = self.client.get(url, {'sens': 'charge'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        
        # Filtre par classe
        response = self.client.get(url, {'classe': 7})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)
        
        # Filtre par statut actif
        response = self.client.get(url, {'actif': True})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        actifs = [compte for compte in response.data['results'] if compte['actif']]
        self.assertEqual(len(actifs), len(response.data['results']))
    
    def test_ordering(self):
        """Test de tri des résultats."""
        self.authenticate_user(self.comptable_user)
        
        url = reverse('compte-list')
        
        # Tri par numéro croissant
        response = self.client.get(url, {'ordering': 'numero'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        numeros = [compte['numero'] for compte in response.data['results']]
        self.assertEqual(numeros, sorted(numeros))
        
        # Tri par numéro décroissant
        response = self.client.get(url, {'ordering': '-numero'})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        numeros = [compte['numero'] for compte in response.data['results']]
        self.assertEqual(numeros, sorted(numeros, reverse=True))


if __name__ == '__main__':
    pytest.main([__file__, '-v'])