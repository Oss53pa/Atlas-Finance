"""
Service de création automatique des écritures comptables
Génère les écritures pour les mouvements de trésorerie
"""
from decimal import Decimal
from datetime import date
from typing import Dict, List, Optional
from django.db import transaction

from apps.treasury.models import Payment, FundCall, CashMovement
from apps.treasury.utils import MoneyDecimal
from apps.treasury.exceptions import AccountingEntryException


class AccountingEntryService:
    """
    Service pour générer automatiquement les écritures comptables
    depuis les mouvements de trésorerie
    """

    # Comptes comptables par défaut (à adapter selon le plan comptable)
    ACCOUNTS = {
        'BANK': '512',  # Banques
        'CASH': '53',  # Caisse
        'CUSTOMERS': '411',  # Clients
        'SUPPLIERS': '401',  # Fournisseurs
        'EXPENSES': '6',  # Charges
        'REVENUE': '7',  # Produits
        'BANK_FEES': '627',  # Frais bancaires
        'INTEREST_INCOME': '768',  # Produits financiers
        'INTEREST_EXPENSE': '668',  # Charges financières
    }

    @classmethod
    @transaction.atomic
    def create_payment_entry(cls, payment: Payment) -> Dict:
        """
        Crée l'écriture comptable pour un paiement

        Schéma comptable:
        - Paiement OUTBOUND (sortie):
            Débit: Compte fournisseur/charge
            Crédit: Banque

        - Paiement INBOUND (entrée):
            Débit: Banque
            Crédit: Compte client/produit
        """
        try:
            entries = []
            journal_code = 'BQ'  # Journal de banque
            entry_date = payment.execution_date or date.today()
            reference = payment.payment_reference
            narration = payment.description or f"Paiement {reference}"

            # Compte banque
            bank_account_code = cls._get_bank_account_code(payment.bank_account)

            if payment.direction == 'OUTBOUND':
                # Sortie d'argent
                entries = [
                    {
                        'account_code': cls.ACCOUNTS['SUPPLIERS'],  # ou EXPENSES selon type
                        'account_label': payment.beneficiary_name,
                        'debit': MoneyDecimal.to_float(payment.amount_in_base_currency),
                        'credit': 0.0,
                        'narration': narration
                    },
                    {
                        'account_code': bank_account_code,
                        'account_label': payment.bank_account.label,
                        'debit': 0.0,
                        'credit': MoneyDecimal.to_float(payment.amount_in_base_currency),
                        'narration': narration
                    }
                ]

                # Frais bancaires si présents
                if payment.bank_fees and MoneyDecimal.is_positive(payment.bank_fees):
                    entries.extend([
                        {
                            'account_code': cls.ACCOUNTS['BANK_FEES'],
                            'account_label': 'Frais bancaires',
                            'debit': MoneyDecimal.to_float(payment.bank_fees),
                            'credit': 0.0,
                            'narration': f"Frais sur {reference}"
                        },
                        {
                            'account_code': bank_account_code,
                            'account_label': payment.bank_account.label,
                            'debit': 0.0,
                            'credit': MoneyDecimal.to_float(payment.bank_fees),
                            'narration': f"Frais sur {reference}"
                        }
                    ])

            else:  # INBOUND
                # Entrée d'argent
                entries = [
                    {
                        'account_code': bank_account_code,
                        'account_label': payment.bank_account.label,
                        'debit': MoneyDecimal.to_float(payment.amount_in_base_currency),
                        'credit': 0.0,
                        'narration': narration
                    },
                    {
                        'account_code': cls.ACCOUNTS['CUSTOMERS'],  # ou REVENUE selon type
                        'account_label': payment.beneficiary_name or 'Client',
                        'debit': 0.0,
                        'credit': MoneyDecimal.to_float(payment.amount_in_base_currency),
                        'narration': narration
                    }
                ]

            # Vérification équilibre débit/crédit
            total_debit = sum(e['debit'] for e in entries)
            total_credit = sum(e['credit'] for e in entries)

            if abs(total_debit - total_credit) > 0.01:  # Tolérance 1 centime
                raise AccountingEntryException(
                    transaction_ref=reference,
                    error_message=f"Déséquilibre comptable: Débit {total_debit} ≠ Crédit {total_credit}"
                )

            # TODO: Créer les écritures dans le module accounting
            # from apps.accounting.services import JournalEntryService
            # JournalEntryService.create_entry(
            #     journal_code=journal_code,
            #     entry_date=entry_date,
            #     reference=reference,
            #     lines=entries
            # )

            return {
                'success': True,
                'journal_code': journal_code,
                'entry_date': entry_date,
                'reference': reference,
                'entries': entries,
                'total_debit': total_debit,
                'total_credit': total_credit
            }

        except Exception as e:
            raise AccountingEntryException(
                transaction_ref=payment.payment_reference,
                error_message=str(e)
            )

    @classmethod
    @transaction.atomic
    def create_fund_call_entry(cls, fund_call: FundCall) -> Dict:
        """
        Crée l'écriture comptable pour un appel de fonds

        Schéma: Virement interne entre comptes
        Débit: Compte destination
        Crédit: Compte source
        """
        try:
            entries = []
            journal_code = 'BQ'
            entry_date = fund_call.execution_date or date.today()
            reference = fund_call.call_reference
            narration = fund_call.description or f"Appel de fonds {reference}"

            source_account = cls._get_bank_account_code(fund_call.source_account)
            dest_account = cls._get_bank_account_code(fund_call.destination_account)

            entries = [
                {
                    'account_code': dest_account,
                    'account_label': fund_call.destination_account.label if fund_call.destination_account else 'Compte destination',
                    'debit': MoneyDecimal.to_float(fund_call.amount_transferred),
                    'credit': 0.0,
                    'narration': narration
                },
                {
                    'account_code': source_account,
                    'account_label': fund_call.source_account.label if fund_call.source_account else 'Compte source',
                    'debit': 0.0,
                    'credit': MoneyDecimal.to_float(fund_call.amount_transferred),
                    'narration': narration
                }
            ]

            # Vérification équilibre
            total_debit = sum(e['debit'] for e in entries)
            total_credit = sum(e['credit'] for e in entries)

            if abs(total_debit - total_credit) > 0.01:
                raise AccountingEntryException(
                    transaction_ref=reference,
                    error_message=f"Déséquilibre: Débit {total_debit} ≠ Crédit {total_credit}"
                )

            return {
                'success': True,
                'journal_code': journal_code,
                'entry_date': entry_date,
                'reference': reference,
                'entries': entries,
                'total_debit': total_debit,
                'total_credit': total_credit
            }

        except Exception as e:
            raise AccountingEntryException(
                transaction_ref=fund_call.call_reference,
                error_message=str(e)
            )

    @classmethod
    @transaction.atomic
    def create_cash_movement_entry(cls, movement: CashMovement) -> Dict:
        """
        Crée l'écriture comptable pour un mouvement de trésorerie
        """
        try:
            entries = []
            journal_code = 'BQ'
            entry_date = movement.execution_date or date.today()
            reference = f"MV-{movement.id}"
            narration = movement.description or f"Mouvement {reference}"

            bank_account = cls._get_bank_account_code(movement.bank_account)

            # Déterminer compte contrepartie selon type de mouvement
            counterpart_account = cls._get_counterpart_account(movement.movement_type)

            if movement.direction == 'INBOUND':
                entries = [
                    {
                        'account_code': bank_account,
                        'account_label': movement.bank_account.label,
                        'debit': MoneyDecimal.to_float(movement.amount),
                        'credit': 0.0,
                        'narration': narration
                    },
                    {
                        'account_code': counterpart_account,
                        'account_label': movement.movement_type,
                        'debit': 0.0,
                        'credit': MoneyDecimal.to_float(movement.amount),
                        'narration': narration
                    }
                ]
            else:  # OUTBOUND
                entries = [
                    {
                        'account_code': counterpart_account,
                        'account_label': movement.movement_type,
                        'debit': MoneyDecimal.to_float(movement.amount),
                        'credit': 0.0,
                        'narration': narration
                    },
                    {
                        'account_code': bank_account,
                        'account_label': movement.bank_account.label,
                        'debit': 0.0,
                        'credit': MoneyDecimal.to_float(movement.amount),
                        'narration': narration
                    }
                ]

            return {
                'success': True,
                'journal_code': journal_code,
                'entry_date': entry_date,
                'reference': reference,
                'entries': entries
            }

        except Exception as e:
            raise AccountingEntryException(
                transaction_ref=f"MV-{movement.id}",
                error_message=str(e)
            )

    @staticmethod
    def _get_bank_account_code(bank_account) -> str:
        """Récupère le code comptable d'un compte bancaire"""
        if bank_account and hasattr(bank_account, 'accounting_code'):
            return bank_account.accounting_code
        return AccountingEntryService.ACCOUNTS['BANK']

    @staticmethod
    def _get_counterpart_account(movement_type: str) -> str:
        """Détermine le compte de contrepartie selon le type de mouvement"""
        mapping = {
            'PAYMENT': AccountingEntryService.ACCOUNTS['SUPPLIERS'],
            'RECEIPT': AccountingEntryService.ACCOUNTS['CUSTOMERS'],
            'TRANSFER': AccountingEntryService.ACCOUNTS['BANK'],
            'FEE': AccountingEntryService.ACCOUNTS['BANK_FEES'],
            'INTEREST': AccountingEntryService.ACCOUNTS['INTEREST_INCOME'],
        }
        return mapping.get(movement_type, AccountingEntryService.ACCOUNTS['BANK'])

    @classmethod
    def preview_entry(cls, transaction_type: str, transaction_data: Dict) -> Dict:
        """
        Prévisualise une écriture comptable sans la créer
        Utile pour validation utilisateur avant exécution
        """
        if transaction_type == 'payment':
            # Simuler un objet Payment
            class MockPayment:
                def __init__(self, data):
                    self.payment_reference = data.get('reference', 'PREVIEW')
                    self.direction = data.get('direction', 'OUTBOUND')
                    self.amount_in_base_currency = Decimal(str(data.get('amount', 0)))
                    self.bank_fees = Decimal(str(data.get('bank_fees', 0)))
                    self.beneficiary_name = data.get('beneficiary_name', '')
                    self.description = data.get('description', '')
                    self.execution_date = date.today()

                    class MockBankAccount:
                        label = data.get('bank_account_label', 'Compte bancaire')

                    self.bank_account = MockBankAccount()

            mock_payment = MockPayment(transaction_data)
            return cls.create_payment_entry(mock_payment)

        raise ValueError(f"Type de transaction non supporté: {transaction_type}")
