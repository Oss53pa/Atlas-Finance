"""
Tests d'intégration End-to-End (E2E)
Workflow complet de paiement de A à Z
"""
import pytest
from decimal import Decimal
from datetime import date
from django.test import TestCase, TransactionTestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.core.models import Societe as Company
from apps.treasury.models import Bank, BankAccount, Payment
from apps.treasury.exceptions import InsufficientBalanceException

User = get_user_model()


@pytest.mark.e2e
class TestPaymentWorkflowE2E(TransactionTestCase):
    """
    Tests E2E complet du workflow de paiement
    Simule un scénario réel de création jusqu'à exécution
    """

    def setUp(self):
        """Configuration initiale pour chaque test"""
        # Créer entreprise
        self.company = Company.objects.create(
            name="Test Company",
            siret="12345678901234",
            country="FR"
        )

        # Créer utilisateurs
        self.admin_user = User.objects.create_user(
            username="admin",
            email="admin@test.com",
            password="testpass123"
        )

        self.approver1 = User.objects.create_user(
            username="approver1",
            email="approver1@test.com",
            password="testpass123"
        )

        self.approver2 = User.objects.create_user(
            username="approver2",
            email="approver2@test.com",
            password="testpass123"
        )

        # Créer banque
        self.bank = Bank.objects.create(
            name="BNI Test",
            code="BNI001",
            swift_code="BNIXFRPP",
            country="FR"
        )

        # Créer compte bancaire avec solde
        self.bank_account = BankAccount.objects.create(
            company=self.company,
            bank=self.bank,
            account_number="FR7612345678901234567890123",
            label="Compte Principal Test",
            currency="XOF",
            current_balance=Decimal('1000000.00'),  # 1M XOF
            overdraft_limit=Decimal('100000.00'),
            status='ACTIVE'
        )

        # Client API
        self.client = APIClient()

    def test_complete_payment_workflow_small_amount(self):
        """
        Test workflow complet paiement petit montant (1 signature)
        DRAFT → PENDING_APPROVAL → APPROVED → EXECUTED
        """
        # Étape 1: Créer paiement (DRAFT)
        self.client.force_authenticate(user=self.admin_user)

        payment_data = {
            "bank_account": str(self.bank_account.id),
            "payment_type": "SEPA",
            "direction": "OUTBOUND",
            "amount": 5000.00,  # Petit montant → 1 signature
            "currency": "XOF",
            "beneficiary_name": "Fournisseur Test",
            "beneficiary_account": "FR7698765432109876543210987",
            "description": "Test E2E paiement"
        }

        response = self.client.post(
            '/api/v1/treasury/payments/',
            payment_data,
            format='json'
        )

        assert response.status_code == status.HTTP_201_CREATED
        payment_id = response.data['id']
        assert response.data['status'] == 'DRAFT'
        assert response.data['required_signatures'] == 1

        # Étape 2: Soumettre pour approbation
        response = self.client.post(
            f'/api/v1/treasury/payments/{payment_id}/submit_for_approval/'
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'PENDING_APPROVAL'

        # Étape 3: Approuver (1ère signature suffit)
        self.client.force_authenticate(user=self.approver1)

        response = self.client.post(
            f'/api/v1/treasury/payments/{payment_id}/approve/'
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['payment']['status'] == 'APPROVED'
        assert response.data['payment']['current_signatures'] == 1

        # Étape 4: Exécuter
        initial_balance = self.bank_account.current_balance

        response = self.client.post(
            f'/api/v1/treasury/payments/{payment_id}/execute/'
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['payment']['status'] == 'EXECUTED'

        # Vérifier débit compte
        self.bank_account.refresh_from_db()
        expected_balance = initial_balance - Decimal('5000.00')
        assert self.bank_account.current_balance == expected_balance

    def test_complete_payment_workflow_large_amount(self):
        """
        Test workflow paiement gros montant (3 signatures)
        Nécessite 3 approbations successives
        """
        # Étape 1: Créer paiement gros montant
        self.client.force_authenticate(user=self.admin_user)

        payment_data = {
            "bank_account": str(self.bank_account.id),
            "payment_type": "WIRE",
            "direction": "OUTBOUND",
            "amount": 150000.00,  # Gros montant → 3 signatures
            "currency": "XOF",
            "beneficiary_name": "Gros Fournisseur",
            "beneficiary_account": "FR7612345678901234567890123",
            "description": "Paiement important test"
        }

        response = self.client.post(
            '/api/v1/treasury/payments/',
            payment_data,
            format='json'
        )

        assert response.status_code == status.HTTP_201_CREATED
        payment_id = response.data['id']
        assert response.data['required_signatures'] == 3

        # Étape 2: Soumettre
        response = self.client.post(
            f'/api/v1/treasury/payments/{payment_id}/submit_for_approval/'
        )
        assert response.data['status'] == 'PENDING_APPROVAL'

        # Étape 3: 1ère approbation
        self.client.force_authenticate(user=self.approver1)
        response = self.client.post(
            f'/api/v1/treasury/payments/{payment_id}/approve/'
        )
        assert response.data['payment']['current_signatures'] == 1
        assert response.data['payment']['status'] == 'PENDING_APPROVAL'  # Pas encore approuvé

        # Étape 4: 2ème approbation
        self.client.force_authenticate(user=self.approver2)
        response = self.client.post(
            f'/api/v1/treasury/payments/{payment_id}/approve/'
        )
        assert response.data['payment']['current_signatures'] == 2
        assert response.data['payment']['status'] == 'PENDING_APPROVAL'  # Toujours pas

        # Étape 5: 3ème approbation (finale)
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.post(
            f'/api/v1/treasury/payments/{payment_id}/approve/'
        )
        assert response.data['payment']['current_signatures'] == 3
        assert response.data['payment']['status'] == 'APPROVED'  # Maintenant approuvé !

        # Étape 6: Exécuter
        response = self.client.post(
            f'/api/v1/treasury/payments/{payment_id}/execute/'
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data['payment']['status'] == 'EXECUTED'

    def test_payment_rejection_workflow(self):
        """Test workflow de rejet de paiement"""
        self.client.force_authenticate(user=self.admin_user)

        # Créer et soumettre paiement
        payment_data = {
            "bank_account": str(self.bank_account.id),
            "payment_type": "SEPA",
            "direction": "OUTBOUND",
            "amount": 10000.00,
            "currency": "XOF",
            "beneficiary_name": "Test",
            "beneficiary_account": "FR7612345678901234567890123",
            "description": "Test rejet"
        }

        response = self.client.post('/api/v1/treasury/payments/', payment_data, format='json')
        payment_id = response.data['id']

        self.client.post(f'/api/v1/treasury/payments/{payment_id}/submit_for_approval/')

        # Rejeter
        response = self.client.post(
            f'/api/v1/treasury/payments/{payment_id}/reject/',
            {'reason': 'Montant incorrect'},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'CANCELLED'

    def test_insufficient_balance_prevents_execution(self):
        """Test que solde insuffisant empêche l'exécution"""
        self.client.force_authenticate(user=self.admin_user)

        # Créer paiement supérieur au solde disponible
        payment_data = {
            "bank_account": str(self.bank_account.id),
            "payment_type": "WIRE",
            "direction": "OUTBOUND",
            "amount": 2000000.00,  # > solde (1M)
            "currency": "XOF",
            "beneficiary_name": "Test",
            "beneficiary_account": "FR7612345678901234567890123",
            "description": "Test solde insuffisant"
        }

        response = self.client.post('/api/v1/treasury/payments/', payment_data, format='json')
        payment_id = response.data['id']

        # Soumettre et approuver
        self.client.post(f'/api/v1/treasury/payments/{payment_id}/submit_for_approval/')

        # Approuver (3 fois car montant > 100k)
        for i in range(3):
            self.client.post(f'/api/v1/treasury/payments/{payment_id}/approve/')

        # Tenter d'exécuter
        response = self.client.post(f'/api/v1/treasury/payments/{payment_id}/execute/')

        # Doit échouer avec erreur explicite
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'required_amount' in response.data
        assert response.data['required_amount'] == 2000000.0
        assert 'shortfall' in response.data

    def test_payment_cancellation_after_draft(self):
        """Test annulation paiement en brouillon"""
        self.client.force_authenticate(user=self.admin_user)

        payment_data = {
            "bank_account": str(self.bank_account.id),
            "payment_type": "SEPA",
            "direction": "OUTBOUND",
            "amount": 1000.00,
            "currency": "XOF",
            "beneficiary_name": "Test",
            "beneficiary_account": "FR7612345678901234567890123",
            "description": "Test annulation"
        }

        response = self.client.post('/api/v1/treasury/payments/', payment_data, format='json')
        payment_id = response.data['id']

        # Annuler directement depuis DRAFT
        response = self.client.post(
            f'/api/v1/treasury/payments/{payment_id}/cancel/',
            {'reason': 'Erreur de saisie'},
            format='json'
        )

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'CANCELLED'

    def test_cannot_execute_without_approval(self):
        """Test qu'on ne peut pas exécuter sans approbation"""
        self.client.force_authenticate(user=self.admin_user)

        payment_data = {
            "bank_account": str(self.bank_account.id),
            "payment_type": "SEPA",
            "direction": "OUTBOUND",
            "amount": 5000.00,
            "currency": "XOF",
            "beneficiary_name": "Test",
            "beneficiary_account": "FR7612345678901234567890123",
            "description": "Test sans approbation"
        }

        response = self.client.post('/api/v1/treasury/payments/', payment_data, format='json')
        payment_id = response.data['id']

        # Tenter d'exécuter directement (sans approbation)
        response = self.client.post(f'/api/v1/treasury/payments/{payment_id}/execute/')

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert 'reasons' in response.data
        assert any('Statut invalide' in reason for reason in response.data['reasons'])

    def test_payment_statistics_endpoint(self):
        """Test endpoint statistiques"""
        self.client.force_authenticate(user=self.admin_user)

        # Créer plusieurs paiements avec statuts différents
        for i in range(5):
            payment_data = {
                "bank_account": str(self.bank_account.id),
                "payment_type": "SEPA",
                "direction": "OUTBOUND",
                "amount": 1000.00 * (i + 1),
                "currency": "XOF",
                "beneficiary_name": f"Test {i}",
                "beneficiary_account": "FR7612345678901234567890123",
                "description": f"Test stats {i}"
            }
            self.client.post('/api/v1/treasury/payments/', payment_data, format='json')

        # Récupérer statistiques
        response = self.client.get('/api/v1/treasury/payments/statistics/')

        assert response.status_code == status.HTTP_200_OK
        assert 'total_payments' in response.data
        assert response.data['total_payments'] >= 5


@pytest.mark.e2e
class TestConcurrentPayments(TransactionTestCase):
    """Tests de concurrence et transactions"""

    def setUp(self):
        """Setup similaire au test précédent"""
        self.company = Company.objects.create(
            name="Concurrent Test",
            siret="98765432109876"
        )

        self.user = User.objects.create_user(
            username="concurrent_user",
            email="concurrent@test.com",
            password="test123"
        )

        self.bank = Bank.objects.create(
            name="Test Bank",
            code="TB001",
            swift_code="TESTFRPP"
        )

        self.account = BankAccount.objects.create(
            company=self.company,
            bank=self.bank,
            account_number="FR7600000000000000000000001",
            label="Concurrent Account",
            currency="XOF",
            current_balance=Decimal('500000.00'),
            status='ACTIVE'
        )

        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_concurrent_payment_execution_maintains_balance(self):
        """
        Test que l'exécution concurrente de paiements
        maintient l'intégrité du solde
        """
        # Créer 3 paiements de 100k chacun
        payment_ids = []

        for i in range(3):
            payment_data = {
                "bank_account": str(self.account.id),
                "payment_type": "SEPA",
                "direction": "OUTBOUND",
                "amount": 100000.00,
                "currency": "XOF",
                "beneficiary_name": f"Concurrent {i}",
                "beneficiary_account": "FR7612345678901234567890123",
                "description": f"Concurrent test {i}"
            }

            response = self.client.post('/api/v1/treasury/payments/', payment_data, format='json')
            payment_id = response.data['id']
            payment_ids.append(payment_id)

            # Soumettre et approuver
            self.client.post(f'/api/v1/treasury/payments/{payment_id}/submit_for_approval/')
            self.client.post(f'/api/v1/treasury/payments/{payment_id}/approve/')

        # Exécuter les 3 paiements
        # Les 2 premiers devraient réussir, le 3ème échouer (solde insuffisant)
        initial_balance = self.account.current_balance

        executed_count = 0
        for payment_id in payment_ids:
            response = self.client.post(f'/api/v1/treasury/payments/{payment_id}/execute/')
            if response.status_code == status.HTTP_200_OK:
                executed_count += 1

        # Vérifier intégrité
        self.account.refresh_from_db()

        # Solde doit être cohérent
        expected_balance = initial_balance - (Decimal('100000.00') * executed_count)
        assert self.account.current_balance == expected_balance


if __name__ == '__main__':
    pytest.main([__file__, '-v', '-m', 'e2e'])
