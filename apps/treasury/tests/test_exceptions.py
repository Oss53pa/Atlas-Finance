"""
Tests unitaires pour les exceptions Treasury
Validation des messages d'erreur et codes HTTP
"""
import pytest
from decimal import Decimal
from rest_framework import status
from apps.treasury.exceptions import (
    TreasuryException,
    InsufficientBalanceException,
    PaymentNotExecutableException,
    InvalidSignatureException,
    IBANValidationException,
    AccountInactiveException,
    FundCallLimitExceededException,
    ReconciliationException,
    BankConnectionException,
    AccountingEntryException
)


class TestTreasuryException:
    """Tests pour TreasuryException (classe de base)"""

    def test_treasury_exception_default(self):
        """Test exception de base avec valeurs par défaut"""
        with pytest.raises(TreasuryException) as exc_info:
            raise TreasuryException()

        assert exc_info.value.status_code == status.HTTP_400_BAD_REQUEST
        assert "Treasury" in str(exc_info.value.detail)

    def test_treasury_exception_custom_detail(self):
        """Test exception avec message personnalisé"""
        custom_message = "Erreur personnalisée de test"

        with pytest.raises(TreasuryException) as exc_info:
            raise TreasuryException(detail=custom_message)

        assert custom_message in str(exc_info.value.detail)


class TestInsufficientBalanceException:
    """Tests pour InsufficientBalanceException"""

    def test_insufficient_balance_basic(self):
        """Test exception solde insuffisant basique"""
        with pytest.raises(InsufficientBalanceException) as exc_info:
            raise InsufficientBalanceException(
                required_amount=50000,
                available_balance=25000
            )

        detail = exc_info.value.detail
        assert detail['required_amount'] == 50000.0
        assert detail['available_balance'] == 25000.0
        assert detail['shortfall'] == 25000.0

    def test_insufficient_balance_with_account(self):
        """Test exception avec label de compte"""
        with pytest.raises(InsufficientBalanceException) as exc_info:
            raise InsufficientBalanceException(
                required_amount=100000,
                available_balance=75000,
                account_label="Compte BNI Principal"
            )

        detail = exc_info.value.detail
        assert detail['account'] == "Compte BNI Principal"
        assert detail['shortfall'] == 25000.0

    def test_insufficient_balance_decimal_precision(self):
        """Test précision avec Decimal"""
        with pytest.raises(InsufficientBalanceException) as exc_info:
            raise InsufficientBalanceException(
                required_amount=Decimal('50000.50'),
                available_balance=Decimal('25000.25')
            )

        detail = exc_info.value.detail
        assert detail['shortfall'] == 25000.25


class TestPaymentNotExecutableException:
    """Tests pour PaymentNotExecutableException"""

    def test_payment_not_executable(self):
        """Test exception paiement non exécutable"""
        reasons = [
            "Statut invalide: DRAFT (requis: APPROVED)",
            "Signatures insuffisantes: 1/3"
        ]

        with pytest.raises(PaymentNotExecutableException) as exc_info:
            raise PaymentNotExecutableException(
                payment_ref="PAY-2024-001",
                reasons=reasons
            )

        detail = exc_info.value.detail
        assert detail['payment_reference'] == "PAY-2024-001"
        assert len(detail['reasons']) == 2
        assert "Statut invalide" in detail['reasons'][0]

    def test_payment_not_executable_empty_reasons(self):
        """Test avec liste de raisons vide"""
        with pytest.raises(PaymentNotExecutableException) as exc_info:
            raise PaymentNotExecutableException(
                payment_ref="PAY-TEST",
                reasons=[]
            )

        detail = exc_info.value.detail
        assert detail['reasons'] == []


class TestInvalidSignatureException:
    """Tests pour InvalidSignatureException"""

    def test_invalid_signature(self):
        """Test exception signatures invalides"""
        with pytest.raises(InvalidSignatureException) as exc_info:
            raise InvalidSignatureException(
                current_signatures=1,
                required_signatures=3
            )

        detail = exc_info.value.detail
        assert detail['current_signatures'] == 1
        assert detail['required_signatures'] == 3
        assert detail['missing_signatures'] == 2
        assert exc_info.value.status_code == status.HTTP_403_FORBIDDEN

    def test_invalid_signature_zero_current(self):
        """Test avec zéro signatures actuelles"""
        with pytest.raises(InvalidSignatureException) as exc_info:
            raise InvalidSignatureException(
                current_signatures=0,
                required_signatures=2
            )

        detail = exc_info.value.detail
        assert detail['missing_signatures'] == 2


class TestIBANValidationException:
    """Tests pour IBANValidationException"""

    def test_iban_validation(self):
        """Test exception IBAN invalide"""
        invalid_iban = "FR76123456789"

        with pytest.raises(IBANValidationException) as exc_info:
            raise IBANValidationException(iban=invalid_iban)

        detail = exc_info.value.detail
        assert 'iban_provided' in detail
        assert 'expected_format' in detail

    def test_iban_validation_masking(self):
        """Test masquage IBAN dans l'erreur (sécurité)"""
        long_iban = "FR7612345678901234567890123456789"

        with pytest.raises(IBANValidationException) as exc_info:
            raise IBANValidationException(iban=long_iban)

        detail = exc_info.value.detail
        # IBAN doit être masqué après 10 caractères
        assert len(detail['iban_provided']) <= 13  # 10 + "..."


class TestAccountInactiveException:
    """Tests pour AccountInactiveException"""

    def test_account_inactive(self):
        """Test exception compte inactif"""
        with pytest.raises(AccountInactiveException) as exc_info:
            raise AccountInactiveException(
                account_label="Compte SGCI Secondaire",
                account_status="SUSPENDED"
            )

        detail = exc_info.value.detail
        assert detail['account'] == "Compte SGCI Secondaire"
        assert detail['status'] == "SUSPENDED"

    def test_account_inactive_closed(self):
        """Test avec compte fermé"""
        with pytest.raises(AccountInactiveException) as exc_info:
            raise AccountInactiveException(
                account_label="Ancien compte",
                account_status="CLOSED"
            )

        detail = exc_info.value.detail
        assert detail['status'] == "CLOSED"


class TestFundCallLimitExceededException:
    """Tests pour FundCallLimitExceededException"""

    def test_fund_call_limit_exceeded(self):
        """Test exception limite dépassée"""
        with pytest.raises(FundCallLimitExceededException) as exc_info:
            raise FundCallLimitExceededException(
                requested_amount=150000,
                max_limit=100000
            )

        detail = exc_info.value.detail
        assert detail['requested_amount'] == 150000.0
        assert detail['max_limit'] == 100000.0
        assert detail['excess'] == 50000.0

    def test_fund_call_limit_decimal(self):
        """Test avec montants Decimal"""
        with pytest.raises(FundCallLimitExceededException) as exc_info:
            raise FundCallLimitExceededException(
                requested_amount=Decimal('75000.50'),
                max_limit=Decimal('50000.00')
            )

        detail = exc_info.value.detail
        assert detail['excess'] == 25000.5


class TestReconciliationException:
    """Tests pour ReconciliationException"""

    def test_reconciliation_exception(self):
        """Test exception rapprochement bancaire"""
        with pytest.raises(ReconciliationException) as exc_info:
            raise ReconciliationException(
                difference=5000,
                statement_balance=100000,
                book_balance=95000
            )

        detail = exc_info.value.detail
        assert detail['difference'] == 5000.0
        assert detail['statement_balance'] == 100000.0
        assert detail['book_balance'] == 95000.0

    def test_reconciliation_negative_difference(self):
        """Test avec différence négative"""
        with pytest.raises(ReconciliationException) as exc_info:
            raise ReconciliationException(
                difference=-3000,
                statement_balance=95000,
                book_balance=98000
            )

        detail = exc_info.value.detail
        assert detail['difference'] == -3000.0


class TestBankConnectionException:
    """Tests pour BankConnectionException"""

    def test_bank_connection_basic(self):
        """Test exception connexion bancaire basique"""
        with pytest.raises(BankConnectionException) as exc_info:
            raise BankConnectionException(bank_name="BNI")

        detail = exc_info.value.detail
        assert detail['bank'] == "BNI"
        assert exc_info.value.status_code == status.HTTP_503_SERVICE_UNAVAILABLE

    def test_bank_connection_with_technical_details(self):
        """Test avec détails techniques"""
        with pytest.raises(BankConnectionException) as exc_info:
            raise BankConnectionException(
                bank_name="SGCI",
                error_message="Timeout after 30s"
            )

        detail = exc_info.value.detail
        assert detail['bank'] == "SGCI"
        assert detail['technical_details'] == "Timeout after 30s"


class TestAccountingEntryException:
    """Tests pour AccountingEntryException"""

    def test_accounting_entry_exception(self):
        """Test exception écriture comptable"""
        with pytest.raises(AccountingEntryException) as exc_info:
            raise AccountingEntryException(
                transaction_ref="PAY-2024-001",
                error_message="Déséquilibre: Débit 50000 ≠ Crédit 49500"
            )

        detail = exc_info.value.detail
        assert detail['transaction_reference'] == "PAY-2024-001"
        assert "Déséquilibre" in detail['technical_details']
        assert exc_info.value.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR


class TestExceptionStatusCodes:
    """Tests pour vérifier les codes HTTP"""

    def test_status_codes(self):
        """Vérification des codes HTTP appropriés"""
        # 400 Bad Request
        assert InsufficientBalanceException(10, 5).status_code == status.HTTP_400_BAD_REQUEST
        assert PaymentNotExecutableException("REF", []).status_code == status.HTTP_400_BAD_REQUEST

        # 403 Forbidden
        assert InvalidSignatureException(1, 3).status_code == status.HTTP_403_FORBIDDEN

        # 500 Internal Server Error
        assert AccountingEntryException("REF", "Error").status_code == status.HTTP_500_INTERNAL_SERVER_ERROR

        # 503 Service Unavailable
        assert BankConnectionException("BNI").status_code == status.HTTP_503_SERVICE_UNAVAILABLE


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
