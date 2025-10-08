"""
Tests d'intégration pour WiseBook V3.0
Tests complets du système ERP comptable
"""
import pytest
from decimal import Decimal
from datetime import date, datetime, timedelta
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from django.db import transaction
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from apps.core.models import Societe, Devise, Exercice, Periode
from apps.security.models import Utilisateur, Role, Profil, Permission
from apps.accounting.models import (
    CompteComptable, JournalComptable, EcritureComptable, 
    LigneEcriture, PlanComptable, Balance
)
from apps.third_party.models import Tiers, Contact, CompteClient
from apps.treasury.models import CompteBancaire, MouvementBancaire
from apps.assets.models import Immobilisation, PlanAmortissement
from apps.analytics.models import AxeAnalytique, CentreAnalytique


class WiseBookIntegrationTestCase(TransactionTestCase):
    """Test d'intégration complet du système WiseBook."""
    
    def setUp(self):
        """Configuration des données de test."""
        # Création d'une société de test
        self.societe = Societe.objects.create(
            nom='SARL Test Comptable',
            sigle='STC',
            forme_juridique='SARL',
            secteur_activite='Services',
            pays='CM',
            ville='Douala',
            adresse='123 Rue de la Comptabilité',
            telephone='+237123456789',
            email='contact@test-comptable.cm',
            site_web='https://test-comptable.cm',
            effectif=25,
            chiffre_affaires=Decimal('500000000'),
            monnaie_fonctionnelle='XAF',
            active=True
        )
        
        # Création de la devise
        self.devise_xaf = Devise.objects.create(
            code='XAF',
            nom='Franc CFA (BEAC)',
            symbole='FCFA',
            taux_change=Decimal('1.0000'),
            devise_reference=True
        )
        
        # Création de l'exercice comptable
        self.exercice = Exercice.objects.create(
            societe=self.societe,
            annee=2024,
            date_debut=date(2024, 1, 1),
            date_fin=date(2024, 12, 31),
            statut='ouvert'
        )
        
        # Création des périodes
        for mois in range(1, 13):
            Periode.objects.create(
                exercice=self.exercice,
                numero=mois,
                nom=f"Période {mois:02d}/2024",
                date_debut=date(2024, mois, 1),
                date_fin=date(2024, mois, 28 if mois == 2 else 30 if mois in [4,6,9,11] else 31),
                statut='ouverte'
            )
        
        # Création utilisateur admin
        self.admin_user = Utilisateur.objects.create_user(
            username='admin_test',
            email='admin@test-comptable.cm',
            password='TestPassword123!',
            nom='Admin',
            prenom='Test',
            societe=self.societe,
            is_staff=True,
            is_superuser=True
        )
        
        # Création utilisateur comptable
        self.comptable_user = Utilisateur.objects.create_user(
            username='comptable_test',
            email='comptable@test-comptable.cm',
            password='TestPassword123!',
            nom='Comptable',
            prenom='Test',
            societe=self.societe
        )
        
        # Configuration du plan comptable SYSCOHADA
        self._setup_plan_comptable()
        
        # Configuration des journaux
        self._setup_journaux()
        
        # Configuration des axes analytiques
        self._setup_axes_analytiques()
    
    def _setup_plan_comptable(self):
        """Configuration du plan comptable SYSCOHADA."""
        # Comptes de base SYSCOHADA
        comptes_base = [
            ('10', 'CAPITAL', 'passif', 1, True),
            ('11', 'RESERVES', 'passif', 1, True),
            ('12', 'REPORT A NOUVEAU', 'passif', 1, True),
            ('13', 'RESULTAT NET DE L\'EXERCICE', 'passif', 1, True),
            ('21', 'IMMOBILISATIONS CORPORELLES', 'actif', 2, True),
            ('28', 'AMORTISSEMENTS', 'actif', 2, True),
            ('31', 'STOCKS DE MATIERES PREMIERES', 'actif', 3, False),
            ('40', 'FOURNISSEURS ET COMPTES RATTACHES', 'passif', 4, False),
            ('41', 'CLIENTS ET COMPTES RATTACHES', 'actif', 4, False),
            ('42', 'PERSONNEL', 'passif', 4, False),
            ('43', 'ORGANISMES SOCIAUX', 'passif', 4, False),
            ('44', 'ETAT ET COLLECTIVITES PUBLIQUES', 'passif', 4, False),
            ('52', 'BANQUES', 'actif', 5, False),
            ('53', 'CAISSE', 'actif', 5, False),
            ('60', 'ACHATS ET VARIATIONS DE STOCKS', 'charge', 6, False),
            ('61', 'TRANSPORTS', 'charge', 6, False),
            ('62', 'SERVICES EXTERIEURS A', 'charge', 6, False),
            ('63', 'SERVICES EXTERIEURS B', 'charge', 6, False),
            ('64', 'IMPOTS ET TAXES', 'charge', 6, False),
            ('65', 'AUTRES CHARGES', 'charge', 6, False),
            ('66', 'CHARGES DE PERSONNEL', 'charge', 6, False),
            ('67', 'FRAIS FINANCIERS', 'charge', 6, False),
            ('68', 'DOTATIONS AUX AMORTISSEMENTS', 'charge', 6, False),
            ('70', 'VENTES', 'produit', 7, False),
            ('71', 'SUBVENTIONS D\'EXPLOITATION', 'produit', 7, False),
            ('72', 'PRODUCTION IMMOBILISEE', 'produit', 7, False),
            ('73', 'VARIATION DES STOCKS', 'produit', 7, False),
            ('75', 'AUTRES PRODUITS', 'produit', 7, False),
            ('77', 'REVENUS FINANCIERS', 'produit', 7, False),
        ]
        
        for numero, intitule, sens, classe, collectif in comptes_base:
            CompteComptable.objects.create(
                societe=self.societe,
                numero=numero,
                intitule=intitule,
                sens=sens,
                classe=classe,
                collectif=collectif,
                actif=True
            )
    
    def _setup_journaux(self):
        """Configuration des journaux comptables."""
        journaux = [
            ('VTE', 'Journal des ventes', 'vente'),
            ('ACH', 'Journal des achats', 'achat'),
            ('BQ1', 'Journal de banque principale', 'tresorerie'),
            ('CAI', 'Journal de caisse', 'tresorerie'),
            ('OD', 'Journal des opérations diverses', 'general'),
            ('AN', 'Journal des à-nouveaux', 'report'),
        ]
        
        for code, libelle, type_journal in journaux:
            JournalComptable.objects.create(
                societe=self.societe,
                code=code,
                libelle=libelle,
                type=type_journal,
                actif=True
            )
    
    def _setup_axes_analytiques(self):
        """Configuration des axes analytiques."""
        # Axe Centre de coût
        axe_cout = AxeAnalytique.objects.create(
            societe=self.societe,
            code='CC',
            libelle='Centres de coût',
            type='centre_cout',
            obligatoire=True,
            actif=True
        )
        
        centres_cout = [
            ('CC001', 'Direction générale'),
            ('CC002', 'Comptabilité'),
            ('CC003', 'Commercial'),
            ('CC004', 'Production'),
        ]
        
        for code, libelle in centres_cout:
            CentreAnalytique.objects.create(
                axe=axe_cout,
                code=code,
                libelle=libelle,
                actif=True
            )
    
    def test_cycle_comptable_complet(self):
        """Test du cycle comptable complet."""
        with transaction.atomic():
            # 1. Création d'un client
            client = Tiers.objects.create(
                societe=self.societe,
                type='client',
                nom='SARL Client Test',
                code='CLI001',
                forme_juridique='SARL',
                activite='Commerce',
                pays='CM',
                ville='Yaoundé',
                adresse='456 Avenue du Commerce',
                telephone='+237987654321',
                email='client@test.cm',
                actif=True
            )
            
            # 2. Création d'un compte client
            compte_client = CompteComptable.objects.get(numero='41')
            compte_client_individuel = CompteComptable.objects.create(
                societe=self.societe,
                numero='411001',
                intitule=f'Client - {client.nom}',
                sens='actif',
                classe=4,
                collectif=False,
                compte_collectif=compte_client,
                tiers=client,
                actif=True
            )
            
            # 3. Création d'une vente
            journal_vente = JournalComptable.objects.get(code='VTE')
            compte_vente = CompteComptable.objects.get(numero='70')
            compte_tva = CompteComptable.objects.create(
                societe=self.societe,
                numero='44571',
                intitule='TVA facturée',
                sens='passif',
                classe=4,
                collectif=False,
                actif=True
            )
            
            # Montants
            ht = Decimal('1000000')  # 1M FCFA HT
            tva = ht * Decimal('0.1925')  # TVA 19.25%
            ttc = ht + tva
            
            # Écriture de vente
            ecriture_vente = EcritureComptable.objects.create(
                societe=self.societe,
                journal=journal_vente,
                numero='VTE240001',
                date_ecriture=date.today(),
                libelle=f'Vente à {client.nom}',
                reference_externe='FAC-001',
                montant_total=ttc,
                statut='brouillard',
                utilisateur=self.admin_user,
                exercice=self.exercice
            )
            
            # Ligne débit client
            LigneEcriture.objects.create(
                ecriture=ecriture_vente,
                compte=compte_client_individuel,
                libelle=f'Vente à {client.nom}',
                montant_debit=ttc,
                montant_credit=Decimal('0'),
                devise=self.devise_xaf,
                taux_change=Decimal('1.0000'),
                ordre_ligne=1
            )
            
            # Ligne crédit vente HT
            LigneEcriture.objects.create(
                ecriture=ecriture_vente,
                compte=compte_vente,
                libelle='Vente de marchandises',
                montant_debit=Decimal('0'),
                montant_credit=ht,
                devise=self.devise_xaf,
                taux_change=Decimal('1.0000'),
                ordre_ligne=2
            )
            
            # Ligne crédit TVA
            LigneEcriture.objects.create(
                ecriture=ecriture_vente,
                compte=compte_tva,
                libelle='TVA sur vente',
                montant_debit=Decimal('0'),
                montant_credit=tva,
                devise=self.devise_xaf,
                taux_change=Decimal('1.0000'),
                ordre_ligne=3
            )
            
            # Validation de l'écriture
            ecriture_vente.statut = 'valide'
            ecriture_vente.save()
            
            # 4. Encaissement
            journal_banque = JournalComptable.objects.get(code='BQ1')
            compte_banque = CompteComptable.objects.get(numero='52')
            
            ecriture_encaissement = EcritureComptable.objects.create(
                societe=self.societe,
                journal=journal_banque,
                numero='BQ1240001',
                date_ecriture=date.today(),
                libelle=f'Encaissement {client.nom}',
                reference_externe='VIR-001',
                montant_total=ttc,
                statut='valide',
                utilisateur=self.admin_user,
                exercice=self.exercice
            )
            
            # Ligne débit banque
            LigneEcriture.objects.create(
                ecriture=ecriture_encaissement,
                compte=compte_banque,
                libelle='Virement reçu',
                montant_debit=ttc,
                montant_credit=Decimal('0'),
                devise=self.devise_xaf,
                taux_change=Decimal('1.0000'),
                ordre_ligne=1
            )
            
            # Ligne crédit client
            LigneEcriture.objects.create(
                ecriture=ecriture_encaissement,
                compte=compte_client_individuel,
                libelle=f'Règlement {client.nom}',
                montant_debit=Decimal('0'),
                montant_credit=ttc,
                devise=self.devise_xaf,
                taux_change=Decimal('1.0000'),
                ordre_ligne=2
            )
            
            # 5. Vérifications
            # Vérifier l'équilibrage des écritures
            total_debit_vente = sum(ligne.montant_debit for ligne in ecriture_vente.lignes.all())
            total_credit_vente = sum(ligne.montant_credit for ligne in ecriture_vente.lignes.all())
            self.assertEqual(total_debit_vente, total_credit_vente)
            
            total_debit_encaissement = sum(ligne.montant_debit for ligne in ecriture_encaissement.lignes.all())
            total_credit_encaissement = sum(ligne.montant_credit for ligne in ecriture_encaissement.lignes.all())
            self.assertEqual(total_debit_encaissement, total_credit_encaissement)
            
            # Vérifier le solde client (doit être 0)
            solde_client = (
                sum(ligne.montant_debit for ligne in LigneEcriture.objects.filter(compte=compte_client_individuel)) -
                sum(ligne.montant_credit for ligne in LigneEcriture.objects.filter(compte=compte_client_individuel))
            )
            self.assertEqual(solde_client, Decimal('0'))
            
            # Vérifier le solde banque
            solde_banque = (
                sum(ligne.montant_debit for ligne in LigneEcriture.objects.filter(compte=compte_banque)) -
                sum(ligne.montant_credit for ligne in LigneEcriture.objects.filter(compte=compte_banque))
            )
            self.assertEqual(solde_banque, ttc)
    
    def test_integration_tresorerie(self):
        """Test d'intégration de la trésorerie."""
        # Création d'un compte bancaire
        compte_bancaire = CompteBancaire.objects.create(
            societe=self.societe,
            nom='Compte Principal BEAC',
            banque='BEAC - Banque Centrale',
            numero_compte='12345678901234567890',
            iban='CM2112345678901234567890',
            bic='BEACCMCX',
            devise=self.devise_xaf,
            solde_initial=Decimal('10000000'),
            date_ouverture=date(2024, 1, 1),
            actif=True
        )
        
        # Simulation de mouvements bancaires
        mouvements = [
            (date(2024, 1, 15), 'VIR', 'Virement reçu client', Decimal('2500000')),
            (date(2024, 1, 20), 'CHQ', 'Chèque émis fournisseur', Decimal('-800000')),
            (date(2024, 1, 25), 'VIR', 'Virement fournisseur', Decimal('-1200000')),
        ]
        
        for date_mouvement, type_mvt, libelle, montant in mouvements:
            MouvementBancaire.objects.create(
                compte_bancaire=compte_bancaire,
                date_mouvement=date_mouvement,
                date_valeur=date_mouvement,
                type_mouvement=type_mvt,
                libelle=libelle,
                montant=montant,
                solde_apres=compte_bancaire.solde_initial + montant,
                reference_banque=f"REF-{date_mouvement.strftime('%Y%m%d')}-{abs(montant)}",
                statut='rapproche'
            )
            compte_bancaire.solde_initial += montant
        
        # Vérification du solde final
        solde_final_attendu = Decimal('10000000') + Decimal('2500000') - Decimal('800000') - Decimal('1200000')
        self.assertEqual(compte_bancaire.solde_initial, solde_final_attendu)
    
    def test_integration_immobilisations(self):
        """Test d'intégration des immobilisations."""
        # Création d'une immobilisation
        immobilisation = Immobilisation.objects.create(
            societe=self.societe,
            designation='Ordinateur portable Dell',
            numero_inventaire='INFO-001',
            categorie='materiel_informatique',
            date_acquisition=date(2024, 1, 1),
            valeur_acquisition=Decimal('800000'),
            valeur_residuelle=Decimal('50000'),
            duree_amortissement=36,  # 3 ans
            methode_amortissement='lineaire',
            compte_immobilisation_id=CompteComptable.objects.get(numero='21').id,
            compte_amortissement_id=CompteComptable.objects.get(numero='28').id,
            actif=True
        )
        
        # Calcul et vérification de l'amortissement
        plan = PlanAmortissement.objects.create(
            immobilisation=immobilisation,
            exercice=self.exercice
        )
        
        # Vérifier que l'amortissement mensuel est correct
        amortissement_mensuel_attendu = (immobilisation.valeur_acquisition - immobilisation.valeur_residuelle) / 36
        self.assertEqual(plan.dotation_mensuelle, amortissement_mensuel_attendu)


class WiseBookAPIIntegrationTest(APITestCase):
    """Tests d'intégration des APIs REST."""
    
    def setUp(self):
        """Configuration pour les tests API."""
        self.client = APIClient()
        
        # Création société de test
        self.societe = Societe.objects.create(
            nom='Test API Company',
            sigle='TAC',
            pays='CM',
            monnaie_fonctionnelle='XAF'
        )
        
        # Utilisateur de test
        self.user = Utilisateur.objects.create_user(
            username='api_test_user',
            email='api@test.com',
            password='TestAPI123!',
            societe=self.societe
        )
        
        # Authentification
        self.client.force_authenticate(user=self.user)
    
    def test_api_workflow_complet(self):
        """Test du workflow complet via API."""
        # 1. Création d'un exercice via API
        exercice_data = {
            'annee': 2024,
            'date_debut': '2024-01-01',
            'date_fin': '2024-12-31',
            'statut': 'ouvert'
        }
        
        response = self.client.post('/api/v1/core/exercices/', exercice_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        exercice_id = response.data['id']
        
        # 2. Création d'un compte comptable via API
        compte_data = {
            'numero': '70001',
            'intitule': 'Ventes de marchandises diverses',
            'sens': 'produit',
            'classe': 7,
            'collectif': False,
            'actif': True
        }
        
        response = self.client.post('/api/v1/accounting/comptes/', compte_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 3. Consultation de la balance via API
        response = self.client.get('/api/v1/accounting/balance/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 4. Génération d'un rapport via API
        rapport_data = {
            'type': 'balance_generale',
            'exercice_id': exercice_id,
            'format': 'json'
        }
        
        response = self.client.post('/api/v1/reporting/rapports/', rapport_data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


@pytest.mark.performance
class WiseBookPerformanceTest(TestCase):
    """Tests de performance du système."""
    
    def setUp(self):
        """Configuration pour les tests de performance."""
        self.societe = Societe.objects.create(
            nom='Performance Test Company',
            sigle='PTC',
            pays='CM'
        )
        
        self.user = Utilisateur.objects.create_user(
            username='perf_user',
            email='perf@test.com',
            password='PerfTest123!',
            societe=self.societe
        )
    
    def test_creation_massive_comptes(self):
        """Test de création massive de comptes comptables."""
        import time
        
        start_time = time.time()
        
        # Création de 1000 comptes
        comptes = []
        for i in range(1000):
            comptes.append(CompteComptable(
                societe=self.societe,
                numero=f'7{i:04d}',
                intitule=f'Compte test {i}',
                sens='produit',
                classe=7,
                collectif=False,
                actif=True
            ))
        
        CompteComptable.objects.bulk_create(comptes)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Vérifier que la création s'est faite en moins de 5 secondes
        self.assertLess(duration, 5.0, f"Création trop lente: {duration:.2f}s")
        
        # Vérifier le nombre de comptes créés
        self.assertEqual(CompteComptable.objects.filter(societe=self.societe).count(), 1000)
    
    def test_requete_balance_performance(self):
        """Test de performance pour le calcul de balance."""
        # Création de données de test
        journal = JournalComptable.objects.create(
            societe=self.societe,
            code='TEST',
            libelle='Journal de test',
            type='general'
        )
        
        compte = CompteComptable.objects.create(
            societe=self.societe,
            numero='70000',
            intitule='Compte test',
            sens='produit',
            classe=7
        )
        
        # Création de nombreuses écritures
        import time
        from django.db import connection
        
        start_time = time.time()
        
        with transaction.atomic():
            for i in range(100):  # 100 écritures
                ecriture = EcritureComptable.objects.create(
                    societe=self.societe,
                    journal=journal,
                    numero=f'TEST{i:04d}',
                    date_ecriture=date.today(),
                    libelle=f'Écriture test {i}',
                    montant_total=Decimal('1000'),
                    statut='valide',
                    utilisateur=self.user
                )
                
                LigneEcriture.objects.create(
                    ecriture=ecriture,
                    compte=compte,
                    libelle='Ligne test',
                    montant_debit=Decimal('1000'),
                    montant_credit=Decimal('0'),
                    ordre_ligne=1
                )
        
        # Test de performance du calcul de solde
        start_query_time = time.time()
        
        # Simulation du calcul de balance
        solde = LigneEcriture.objects.filter(
            compte=compte,
            ecriture__statut='valide'
        ).aggregate(
            total_debit=models.Sum('montant_debit'),
            total_credit=models.Sum('montant_credit')
        )
        
        end_query_time = time.time()
        query_duration = end_query_time - start_query_time
        
        # Vérifier que la requête est rapide (moins de 1 seconde)
        self.assertLess(query_duration, 1.0, f"Requête trop lente: {query_duration:.3f}s")
        
        # Vérifier le résultat
        self.assertEqual(solde['total_debit'], Decimal('100000'))  # 100 * 1000


class WiseBookSecurityIntegrationTest(TestCase):
    """Tests de sécurité et d'audit."""
    
    def setUp(self):
        """Configuration pour les tests de sécurité."""
        self.societe = Societe.objects.create(
            nom='Security Test Company',
            sigle='SEC',
            pays='CM'
        )
        
        self.admin_user = Utilisateur.objects.create_user(
            username='security_admin',
            email='admin@security.com',
            password='SecureTest123!',
            societe=self.societe,
            is_staff=True
        )
        
        self.normal_user = Utilisateur.objects.create_user(
            username='normal_user',
            email='user@security.com',
            password='UserTest123!',
            societe=self.societe
        )
    
    def test_audit_trail_creation(self):
        """Test de création des pistes d'audit."""
        from apps.core.models import AuditLog
        
        # Création d'un compte (doit créer un log d'audit)
        compte = CompteComptable.objects.create(
            societe=self.societe,
            numero='40001',
            intitule='Fournisseur Test',
            sens='passif',
            classe=4,
            utilisateur_creation=self.admin_user
        )
        
        # Vérifier qu'un log d'audit a été créé
        audit_logs = AuditLog.objects.filter(
            content_type__model='comptecomptable',
            object_id=compte.id,
            action='CREATE'
        )
        
        self.assertEqual(audit_logs.count(), 1)
        audit_log = audit_logs.first()
        self.assertEqual(audit_log.utilisateur, self.admin_user)
        self.assertEqual(audit_log.societe, self.societe)
    
    def test_multi_tenant_isolation(self):
        """Test d'isolation multi-tenant."""
        # Création d'une deuxième société
        societe2 = Societe.objects.create(
            nom='Company 2',
            sigle='C2',
            pays='CM'
        )
        
        user2 = Utilisateur.objects.create_user(
            username='user_company2',
            email='user@company2.com',
            password='Company2Test123!',
            societe=societe2
        )
        
        # Création de comptes dans chaque société
        compte_s1 = CompteComptable.objects.create(
            societe=self.societe,
            numero='60001',
            intitule='Achats Société 1',
            sens='charge',
            classe=6
        )
        
        compte_s2 = CompteComptable.objects.create(
            societe=societe2,
            numero='60001',
            intitule='Achats Société 2',
            sens='charge',
            classe=6
        )
        
        # Vérifier l'isolation: l'utilisateur de la société 1 ne doit voir que ses comptes
        comptes_s1 = CompteComptable.objects.filter(societe=self.societe)
        comptes_s2 = CompteComptable.objects.filter(societe=societe2)
        
        self.assertIn(compte_s1, comptes_s1)
        self.assertNotIn(compte_s2, comptes_s1)
        self.assertIn(compte_s2, comptes_s2)
        self.assertNotIn(compte_s1, comptes_s2)


if __name__ == '__main__':
    pytest.main([__file__])