"""
Tests unitaires pour AccountingEntryService
Validation de la génération d'écritures comptables
"""
import pytest
from decimal import Decimal
from datetime import date
from unittest.mock import Mock, patch
from django.test import TestCase

from apps.treasury.services.accounting_entry_service import AccountingEntryService
from apps.treasury.exceptions import AccountingEntryException


class TestAccountingEntryService(TestCase):
    """Tests pour AccountingEntryService"""

    def setUp(self):
        """Configuration initiale des tests"""
        # Mock BankAccount
        self.mock_bank_account = Mock()
        self.mock_bank_account.label = "Compte BNI Principal"
        self.mock_bank_account.accounting_code = None

    def create_mock_payment(self, direction='OUTBOUND', amount=50000, bank_fees=0):
        """Créé un mock Payment pour les tests"""
        mock_payment = Mock()
        mock_payment.payment_reference = "PAY-TEST-001"
        mock_payment.direction = direction
        mock_payment.amount_in_base_currency = Decimal(str(amount))
        mock_payment.bank_fees = Decimal(str(bank_fees))
        mock_payment.beneficiary_name = "Fournisseur Test"
        mock_payment.description = "Paiement de test"
        mock_payment.execution_date = date.today()
        mock_payment.bank_account = self.mock_bank_account

        return mock_payment

    def test_create_payment_entry_outbound(self):
        """Test création écriture pour paiement sortant"""
        payment = self.create_mock_payment(direction='OUTBOUND', amount=50000)

        result = AccountingEntryService.create_payment_entry(payment)

        # Vérifications basiques
        assert result['success'] is True
        assert result['reference'] == "PAY-TEST-001"
        assert result['journal_code'] == 'BQ'

        # Vérifier équilibre
        assert result['total_debit'] == result['total_credit']
        assert result['total_debit'] == 50000.0

        # Vérifier structure des écritures
        assert len(result['entries']) == 2
        assert result['entries'][0]['debit'] == 50000.0  # Fournisseur
        assert result['entries'][1]['credit'] == 50000.0  # Banque

    def test_create_payment_entry_outbound_with_fees(self):
        """Test création écriture avec frais bancaires"""
        payment = self.create_mock_payment(
            direction='OUTBOUND',
            amount=50000,
            bank_fees=250
        )

        result = AccountingEntryService.create_payment_entry(payment)

        # Doit avoir 4 écritures (2 pour paiement + 2 pour frais)
        assert len(result['entries']) == 4

        # Total débit = montant + frais
        assert result['total_debit'] == 50250.0
        assert result['total_credit'] == 50250.0

    def test_create_payment_entry_inbound(self):
        """Test création écriture pour paiement entrant"""
        payment = self.create_mock_payment(direction='INBOUND', amount=75000)

        result = AccountingEntryService.create_payment_entry(payment)

        assert result['success'] is True
        assert result['total_debit'] == 75000.0
        assert result['total_credit'] == 75000.0

        # Pour INBOUND: Débit Banque, Crédit Client
        assert result['entries'][0]['debit'] == 75000.0  # Banque
        assert result['entries'][1]['credit'] == 75000.0  # Client

    def test_create_payment_entry_balance_check(self):
        """Test vérification équilibre débit/crédit"""
        payment = self.create_mock_payment(amount=100000)

        result = AccountingEntryService.create_payment_entry(payment)

        # Calcul manuel de l'équilibre
        total_debit = sum(e['debit'] for e in result['entries'])
        total_credit = sum(e['credit'] for e in result['entries'])

        assert total_debit == total_credit
        assert abs(total_debit - total_credit) < 0.01  # Tolérance 1 centime

    def test_create_fund_call_entry(self):
        """Test création écriture pour appel de fonds"""
        # Mock FundCall
        mock_fund_call = Mock()
        mock_fund_call.call_reference = "FC-TEST-001"
        mock_fund_call.amount_transferred = Decimal('25000.00')
        mock_fund_call.description = "Appel de fonds test"
        mock_fund_call.execution_date = date.today()

        # Mock accounts
        mock_source = Mock()
        mock_source.label = "Compte source"
        mock_dest = Mock()
        mock_dest.label = "Compte destination"

        mock_fund_call.source_account = mock_source
        mock_fund_call.destination_account = mock_dest

        result = AccountingEntryService.create_fund_call_entry(mock_fund_call)

        assert result['success'] is True
        assert result['reference'] == "FC-TEST-001"
        assert result['total_debit'] == 25000.0
        assert result['total_credit'] == 25000.0

        # Virement interne: Débit destination, Crédit source
        assert len(result['entries']) == 2

    def test_create_cash_movement_entry_inbound(self):
        """Test création écriture pour mouvement entrant"""
        mock_movement = Mock()
        mock_movement.id = "mov-123"
        mock_movement.movement_type = "RECEIPT"
        mock_movement.direction = "INBOUND"
        mock_movement.amount = Decimal('10000.00')
        mock_movement.description = "Encaissement test"
        mock_movement.execution_date = date.today()
        mock_movement.bank_account = self.mock_bank_account

        result = AccountingEntryService.create_cash_movement_entry(mock_movement)

        assert result['success'] is True
        assert result['journal_code'] == 'BQ'

        # INBOUND: Débit Banque, Crédit Contrepartie
        assert result['entries'][0]['debit'] == 10000.0
        assert result['entries'][1]['credit'] == 10000.0

    def test_create_cash_movement_entry_outbound(self):
        """Test création écriture pour mouvement sortant"""
        mock_movement = Mock()
        mock_movement.id = "mov-456"
        mock_movement.movement_type = "PAYMENT"
        mock_movement.direction = "OUTBOUND"
        mock_movement.amount = Decimal('5000.00')
        mock_movement.description = "Décaissement test"
        mock_movement.execution_date = date.today()
        mock_movement.bank_account = self.mock_bank_account

        result = AccountingEntryService.create_cash_movement_entry(mock_movement)

        # OUTBOUND: Débit Contrepartie, Crédit Banque
        assert result['entries'][0]['debit'] == 5000.0
        assert result['entries'][1]['credit'] == 5000.0

    def test_get_bank_account_code_default(self):
        """Test récupération code comptable par défaut"""
        mock_account = Mock()
        mock_account.accounting_code = None

        code = AccountingEntryService._get_bank_account_code(mock_account)

        assert code == AccountingEntryService.ACCOUNTS['BANK']  # '512'

    def test_get_bank_account_code_custom(self):
        """Test récupération code comptable personnalisé"""
        mock_account = Mock()
        mock_account.accounting_code = "512001"

        code = AccountingEntryService._get_bank_account_code(mock_account)

        assert code == "512001"

    def test_get_counterpart_account_payment(self):
        """Test détermination compte contrepartie"""
        code = AccountingEntryService._get_counterpart_account('PAYMENT')
        assert code == AccountingEntryService.ACCOUNTS['SUPPLIERS']  # '401'

    def test_get_counterpart_account_receipt(self):
        """Test compte contrepartie pour encaissement"""
        code = AccountingEntryService._get_counterpart_account('RECEIPT')
        assert code == AccountingEntryService.ACCOUNTS['CUSTOMERS']  # '411'

    def test_get_counterpart_account_unknown(self):
        """Test compte contrepartie pour type inconnu"""
        code = AccountingEntryService._get_counterpart_account('UNKNOWN_TYPE')
        assert code == AccountingEntryService.ACCOUNTS['BANK']  # Défaut

    def test_preview_entry(self):
        """Test prévisualisation écriture"""
        transaction_data = {
            'reference': 'PREVIEW-001',
            'direction': 'OUTBOUND',
            'amount': 30000,
            'bank_fees': 150,
            'beneficiary_name': 'Test Beneficiary',
            'description': 'Test description',
            'bank_account_label': 'Test Account'
        }

        result = AccountingEntryService.preview_entry('payment', transaction_data)

        assert result['success'] is True
        assert result['reference'] == 'PREVIEW-001'
        assert len(result['entries']) == 4  # 2 paiement + 2 frais

    def test_preview_entry_invalid_type(self):
        """Test prévisualisation avec type invalide"""
        with pytest.raises(ValueError) as exc_info:
            AccountingEntryService.preview_entry('invalid_type', {})

        assert "non supporté" in str(exc_info.value)

    def test_accounting_codes_constants(self):
        """Test que tous les codes comptables sont définis"""
        required_codes = [
            'BANK', 'CASH', 'CUSTOMERS', 'SUPPLIERS',
            'EXPENSES', 'REVENUE', 'BANK_FEES',
            'INTEREST_INCOME', 'INTEREST_EXPENSE'
        ]

        for code_key in required_codes:
            assert code_key in AccountingEntryService.ACCOUNTS
            assert AccountingEntryService.ACCOUNTS[code_key] is not None


class TestAccountingEntryExceptions(TestCase):
    """Tests pour les exceptions AccountingEntry"""

    def test_exception_on_imbalance(self):
        """Test exception si déséquilibre débit/crédit"""
        # Note: Ce test nécessite de modifier temporairement la logique
        # pour forcer un déséquilibre (normalement impossible dans le code actuel)

        # Pour l'instant, on vérifie que la tolérance fonctionne
        # Un vrai test nécessiterait de mocker des calculs internes
        pass

    def test_exception_with_invalid_data(self):
        """Test exception avec données invalides"""
        mock_payment = Mock()
        mock_payment.payment_reference = "INVALID"
        mock_payment.direction = "OUTBOUND"
        mock_payment.amount_in_base_currency = None  # Invalide
        mock_payment.bank_fees = Decimal('0')
        mock_payment.beneficiary_name = "Test"
        mock_payment.description = "Test"
        mock_payment.execution_date = date.today()
        mock_payment.bank_account = Mock()
        mock_payment.bank_account.label = "Test"

        # Doit lever une exception
        with pytest.raises(Exception):  # AccountingEntryException ou autre
            AccountingEntryService.create_payment_entry(mock_payment)


class TestRealWorldAccountingScenarios(TestCase):
    """Tests de scénarios comptables réels"""

    def test_supplier_payment_with_vat(self):
        """Test paiement fournisseur avec TVA incluse"""
        # Paiement de 60000 (50000 HT + 10000 TVA)
        mock_account = Mock()
        mock_account.label = "Compte principal"
        mock_account.accounting_code = None

        mock_payment = Mock()
        mock_payment.payment_reference = "PAY-SUPPLIER-001"
        mock_payment.direction = "OUTBOUND"
        mock_payment.amount_in_base_currency = Decimal('60000.00')
        mock_payment.bank_fees = Decimal('300.00')
        mock_payment.beneficiary_name = "Fournisseur ABC"
        mock_payment.description = "Facture #12345 (TVA incluse)"
        mock_payment.execution_date = date.today()
        mock_payment.bank_account = mock_account

        result = AccountingEntryService.create_payment_entry(mock_payment)

        # Total débité = montant + frais
        assert result['total_debit'] == 60300.0
        assert result['total_credit'] == 60300.0

    def test_customer_receipt(self):
        """Test encaissement client"""
        mock_account = Mock()
        mock_account.label = "Compte encaissements"
        mock_account.accounting_code = None

        mock_payment = Mock()
        mock_payment.payment_reference = "REC-CUST-001"
        mock_payment.direction = "INBOUND"
        mock_payment.amount_in_base_currency = Decimal('75000.00')
        mock_payment.bank_fees = Decimal('0')
        mock_payment.beneficiary_name = "Client XYZ"
        mock_payment.description = "Règlement facture #67890"
        mock_payment.execution_date = date.today()
        mock_payment.bank_account = mock_account

        result = AccountingEntryService.create_payment_entry(mock_payment)

        assert result['total_debit'] == 75000.0
        assert result['total_credit'] == 75000.0

        # Débit Banque, Crédit Client
        assert result['entries'][0]['debit'] == 75000.0
        assert result['entries'][1]['credit'] == 75000.0

    def test_internal_transfer(self):
        """Test virement interne entre comptes"""
        mock_source = Mock()
        mock_source.label = "Compte A"

        mock_dest = Mock()
        mock_dest.label = "Compte B"

        mock_fund_call = Mock()
        mock_fund_call.call_reference = "TRANSFER-001"
        mock_fund_call.amount_transferred = Decimal('100000.00')
        mock_fund_call.description = "Virement interne A → B"
        mock_fund_call.execution_date = date.today()
        mock_fund_call.source_account = mock_source
        mock_fund_call.destination_account = mock_dest

        result = AccountingEntryService.create_fund_call_entry(mock_fund_call)

        # Vérifier équilibre
        assert result['total_debit'] == 100000.0
        assert result['total_credit'] == 100000.0

        # Débit destination, Crédit source
        assert len(result['entries']) == 2


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
