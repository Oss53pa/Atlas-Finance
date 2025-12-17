"""
Exceptions personnalisées pour le module Treasury
Gestion d'erreurs robuste et messages explicites
"""
from rest_framework.exceptions import APIException
from rest_framework import status


class TreasuryException(APIException):
    """Exception de base pour le module Treasury"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Une erreur s'est produite dans le module Treasury"
    default_code = 'treasury_error'


class InsufficientBalanceException(TreasuryException):
    """Exception levée quand le solde est insuffisant"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Solde insuffisant pour effectuer cette opération"
    default_code = 'insufficient_balance'

    def __init__(self, required_amount, available_balance, account_label=None):
        detail = {
            'error': self.default_detail,
            'required_amount': float(required_amount),
            'available_balance': float(available_balance),
            'shortfall': float(required_amount - available_balance)
        }
        if account_label:
            detail['account'] = account_label

        super().__init__(detail=detail)


class PaymentNotExecutableException(TreasuryException):
    """Exception levée quand un paiement ne peut pas être exécuté"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Le paiement ne peut pas être exécuté dans son état actuel"
    default_code = 'payment_not_executable'

    def __init__(self, payment_ref, reasons):
        detail = {
            'error': self.default_detail,
            'payment_reference': payment_ref,
            'reasons': reasons
        }
        super().__init__(detail=detail)


class InvalidSignatureException(TreasuryException):
    """Exception levée quand il y a un problème de signatures"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Nombre de signatures insuffisant"
    default_code = 'invalid_signature'

    def __init__(self, current_signatures, required_signatures):
        detail = {
            'error': self.default_detail,
            'current_signatures': current_signatures,
            'required_signatures': required_signatures,
            'missing_signatures': required_signatures - current_signatures
        }
        super().__init__(detail=detail)


class IBANValidationException(TreasuryException):
    """Exception levée quand l'IBAN est invalide"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Format IBAN invalide"
    default_code = 'invalid_iban'

    def __init__(self, iban):
        detail = {
            'error': self.default_detail,
            'iban_provided': iban[:10] + '...' if len(iban) > 10 else iban,  # Masquer IBAN complet
            'expected_format': 'XX99XXXXXXXXXXXXXXXXXXXXXXXXXX (min 15 caractères)'
        }
        super().__init__(detail=detail)


class AccountInactiveException(TreasuryException):
    """Exception levée quand le compte est inactif"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Le compte bancaire est inactif"
    default_code = 'account_inactive'

    def __init__(self, account_label, account_status):
        detail = {
            'error': self.default_detail,
            'account': account_label,
            'status': account_status
        }
        super().__init__(detail=detail)


class FundCallLimitExceededException(TreasuryException):
    """Exception levée quand la limite d'appel de fonds est dépassée"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Limite d'appel de fonds dépassée"
    default_code = 'fund_call_limit_exceeded'

    def __init__(self, requested_amount, max_limit):
        detail = {
            'error': self.default_detail,
            'requested_amount': float(requested_amount),
            'max_limit': float(max_limit),
            'excess': float(requested_amount - max_limit)
        }
        super().__init__(detail=detail)


class ReconciliationException(TreasuryException):
    """Exception levée lors d'une erreur de rapprochement bancaire"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Erreur lors du rapprochement bancaire"
    default_code = 'reconciliation_error'

    def __init__(self, difference, statement_balance, book_balance):
        detail = {
            'error': self.default_detail,
            'difference': float(difference),
            'statement_balance': float(statement_balance),
            'book_balance': float(book_balance)
        }
        super().__init__(detail=detail)


class CashFlowForecastException(TreasuryException):
    """Exception levée lors d'une erreur de prévision de trésorerie"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = "Erreur lors de la génération des prévisions"
    default_code = 'forecast_error'


class BankConnectionException(TreasuryException):
    """Exception levée lors d'une erreur de connexion bancaire"""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = "Impossible de se connecter au service bancaire"
    default_code = 'bank_connection_error'

    def __init__(self, bank_name, error_message=None):
        detail = {
            'error': self.default_detail,
            'bank': bank_name
        }
        if error_message:
            detail['technical_details'] = error_message

        super().__init__(detail=detail)


class AccountingEntryException(TreasuryException):
    """Exception levée lors d'une erreur d'écriture comptable"""
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    default_detail = "Erreur lors de la création de l'écriture comptable"
    default_code = 'accounting_entry_error'

    def __init__(self, transaction_ref, error_message):
        detail = {
            'error': self.default_detail,
            'transaction_reference': transaction_ref,
            'technical_details': error_message
        }
        super().__init__(detail=detail)
