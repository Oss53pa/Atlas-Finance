"""
Configuration des logs structurés pour Treasury
Format JSON pour faciliter le parsing et l'analyse
"""
import logging
import json
from datetime import datetime
from decimal import Decimal


class JSONFormatter(logging.Formatter):
    """
    Formatter personnalisé pour logs en format JSON
    Facilite l'intégration avec outils de monitoring (ELK, Datadog, etc.)
    """

    def format(self, record):
        """Formate le log en JSON structuré"""
        log_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'level': record.levelname,
            'logger': record.name,
            'message': record.getMessage(),
            'module': record.module,
            'function': record.funcName,
            'line': record.lineno
        }

        # Ajouter des champs personnalisés si présents
        if hasattr(record, 'user_id'):
            log_data['user_id'] = record.user_id

        if hasattr(record, 'company_id'):
            log_data['company_id'] = str(record.company_id)

        if hasattr(record, 'transaction_ref'):
            log_data['transaction_ref'] = record.transaction_ref

        if hasattr(record, 'amount'):
            # Convertir Decimal en float pour JSON
            if isinstance(record.amount, Decimal):
                log_data['amount'] = float(record.amount)
            else:
                log_data['amount'] = record.amount

        if hasattr(record, 'account_id'):
            log_data['account_id'] = str(record.account_id)

        # Exception si présente
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        # Stack trace si présent
        if record.stack_info:
            log_data['stack_trace'] = record.stack_info

        return json.dumps(log_data, ensure_ascii=False)


class TreasuryLogger:
    """
    Logger personnalisé pour le module Treasury
    Fournit des méthodes facilitant le logging structuré
    """

    def __init__(self, name='treasury'):
        self.logger = logging.getLogger(name)

    def log_payment_created(self, payment, user_id=None):
        """Log création d'un paiement"""
        self.logger.info(
            f"Paiement créé: {payment.payment_reference}",
            extra={
                'user_id': user_id,
                'company_id': payment.company_id,
                'transaction_ref': payment.payment_reference,
                'amount': payment.amount_in_base_currency,
                'direction': payment.direction,
                'status': payment.status
            }
        )

    def log_payment_approved(self, payment, approver_id):
        """Log approbation d'un paiement"""
        self.logger.info(
            f"Paiement approuvé: {payment.payment_reference}",
            extra={
                'user_id': approver_id,
                'company_id': payment.company_id,
                'transaction_ref': payment.payment_reference,
                'signatures': f"{payment.current_signatures}/{payment.required_signatures}"
            }
        )

    def log_payment_executed(self, payment, account_id):
        """Log exécution d'un paiement"""
        self.logger.info(
            f"Paiement exécuté: {payment.payment_reference}",
            extra={
                'company_id': payment.company_id,
                'transaction_ref': payment.payment_reference,
                'amount': payment.amount_in_base_currency,
                'account_id': account_id,
                'execution_date': str(payment.execution_date)
            }
        )

    def log_payment_failed(self, payment, reason, exception=None):
        """Log échec d'exécution paiement"""
        self.logger.error(
            f"Échec exécution paiement: {payment.payment_reference} - {reason}",
            extra={
                'company_id': payment.company_id,
                'transaction_ref': payment.payment_reference,
                'failure_reason': reason
            },
            exc_info=exception
        )

    def log_insufficient_balance(self, account_label, required, available):
        """Log solde insuffisant"""
        self.logger.warning(
            f"Solde insuffisant: {account_label}",
            extra={
                'account_label': account_label,
                'required_amount': required,
                'available_balance': available,
                'shortfall': required - available
            }
        )

    def log_fund_call_created(self, fund_call, user_id=None):
        """Log création appel de fonds"""
        self.logger.info(
            f"Appel de fonds créé: {fund_call.call_reference}",
            extra={
                'user_id': user_id,
                'company_id': fund_call.company_id,
                'transaction_ref': fund_call.call_reference,
                'amount': fund_call.amount_requested,
                'urgency': fund_call.urgency_level
            }
        )

    def log_accounting_entry_created(self, transaction_ref, entry_data):
        """Log création écriture comptable"""
        self.logger.info(
            f"Écriture comptable créée: {transaction_ref}",
            extra={
                'transaction_ref': transaction_ref,
                'journal_code': entry_data.get('journal_code'),
                'total_debit': entry_data.get('total_debit'),
                'total_credit': entry_data.get('total_credit'),
                'entries_count': len(entry_data.get('entries', []))
            }
        )

    def log_accounting_entry_failed(self, transaction_ref, reason):
        """Log échec création écriture comptable"""
        self.logger.error(
            f"Échec écriture comptable: {transaction_ref} - {reason}",
            extra={
                'transaction_ref': transaction_ref,
                'failure_reason': reason
            }
        )

    def log_bank_reconciliation(self, account_label, difference):
        """Log rapprochement bancaire"""
        if difference == 0:
            self.logger.info(
                f"Rapprochement bancaire OK: {account_label}",
                extra={
                    'account_label': account_label,
                    'difference': 0
                }
            )
        else:
            self.logger.warning(
                f"Écart rapprochement bancaire: {account_label}",
                extra={
                    'account_label': account_label,
                    'difference': difference
                }
            )

    def log_alert_triggered(self, alert_type, severity, message):
        """Log déclenchement d'alerte"""
        self.logger.warning(
            f"Alerte déclenchée: {alert_type}",
            extra={
                'alert_type': alert_type,
                'severity': severity,
                'alert_message': message
            }
        )

    def log_api_call(self, endpoint, method, user_id, status_code, duration_ms):
        """Log appel API"""
        self.logger.info(
            f"API call: {method} {endpoint}",
            extra={
                'user_id': user_id,
                'endpoint': endpoint,
                'http_method': method,
                'status_code': status_code,
                'duration_ms': duration_ms
            }
        )

    def log_database_query(self, query_type, table, duration_ms):
        """Log requête base de données (pour debugging performance)"""
        self.logger.debug(
            f"DB Query: {query_type} on {table}",
            extra={
                'query_type': query_type,
                'table': table,
                'duration_ms': duration_ms
            }
        )


# Configuration des niveaux de log par environnement
LOG_LEVELS = {
    'development': logging.DEBUG,
    'staging': logging.INFO,
    'production': logging.WARNING
}


def configure_treasury_logging(environment='development', log_file=None):
    """
    Configure le logging pour Treasury

    Args:
        environment: 'development', 'staging', 'production'
        log_file: Chemin vers fichier de log (optionnel)
    """
    logger = logging.getLogger('treasury')
    logger.setLevel(LOG_LEVELS.get(environment, logging.INFO))

    # Handler console (format JSON)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(JSONFormatter())
    logger.addHandler(console_handler)

    # Handler fichier si spécifié
    if log_file:
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(JSONFormatter())
        logger.addHandler(file_handler)

    return logger


# Instance globale du logger
treasury_logger = TreasuryLogger()


# Exemples d'utilisation
"""
# Dans views_payment.py:
from apps.treasury.logging_config import treasury_logger

@action(detail=True, methods=['post'])
def execute(self, request, pk=None):
    payment = self.get_object()

    try:
        # Log début exécution
        treasury_logger.log_payment_executed(
            payment,
            account_id=payment.bank_account_id
        )

        # Exécution...

    except InsufficientBalanceException as e:
        treasury_logger.log_insufficient_balance(
            account_label=payment.bank_account.label,
            required=payment.amount_in_base_currency,
            available=payment.bank_account.available_balance
        )
        raise
"""
