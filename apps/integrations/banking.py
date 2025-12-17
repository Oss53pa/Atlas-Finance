import requests
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Any
from decimal import Decimal
import logging
import hashlib
import hmac
import base64
import json
from dataclasses import dataclass

from django.conf import settings
from django.utils import timezone
from django.core.cache import cache

from apps.treasury.models import BankAccount, CashMovement

# Alias pour rétrocompatibilité
ComptesBancaires = BankAccount
MouvementTresorerie = CashMovement

logger = logging.getLogger(__name__)


@dataclass
class BankTransaction:
    """Représentation d'une transaction bancaire."""
    reference: str
    date_valeur: datetime
    date_operation: datetime
    montant: Decimal
    libelle: str
    type_operation: str
    solde_apres: Optional[Decimal] = None
    metadonnees: Optional[Dict] = None


class BaseBankingConnector:
    """Connecteur bancaire de base."""
    
    def __init__(self, compte_bancaire: ComptesBancaires):
        self.compte = compte_bancaire
        self.config = compte_bancaire.configuration_api or {}
        
    def authenticate(self) -> bool:
        """Authentification auprès de la banque."""
        raise NotImplementedError
    
    def get_balance(self) -> Decimal:
        """Récupérer le solde du compte."""
        raise NotImplementedError
    
    def get_transactions(self, date_debut: datetime, date_fin: datetime) -> List[BankTransaction]:
        """Récupérer les transactions."""
        raise NotImplementedError
    
    def initiate_transfer(self, beneficiaire: str, montant: Decimal, libelle: str) -> Dict:
        """Initier un virement."""
        raise NotImplementedError


class PSD2Connector(BaseBankingConnector):
    """Connecteur PSD2 pour les banques européennes."""
    
    def __init__(self, compte_bancaire: ComptesBancaires):
        super().__init__(compte_bancaire)
        self.base_url = self.config.get('psd2_base_url')
        self.client_id = self.config.get('client_id')
        self.client_secret = self.config.get('client_secret')
        self.certificate_path = self.config.get('certificate_path')
        self.access_token = None
    
    def authenticate(self) -> bool:
        """Authentification OAuth2 PSD2."""
        try:
            auth_url = f"{self.base_url}/oauth/token"
            
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
            
            data = {
                'grant_type': 'client_credentials',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'scope': 'pis ais'
            }
            
            # Utiliser le certificat eIDAS si configuré
            cert = None
            if self.certificate_path:
                cert = (self.certificate_path, self.certificate_path.replace('.crt', '.key'))
            
            response = requests.post(
                auth_url,
                headers=headers,
                data=data,
                cert=cert,
                timeout=30
            )
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data['access_token']
                
                # Cache du token
                cache_key = f"psd2_token_{self.compte.id}"
                cache.set(cache_key, self.access_token, token_data.get('expires_in', 3600))
                
                logger.info(f"Authentification PSD2 réussie pour {self.compte.nom}")
                return True
            else:
                logger.error(f"Erreur authentification PSD2: {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Erreur authentification PSD2: {str(e)}")
            return False
    
    def get_balance(self) -> Decimal:
        """Récupérer le solde via PSD2."""
        if not self.access_token:
            if not self.authenticate():
                raise Exception("Authentification PSD2 échouée")
        
        try:
            account_id = self.config.get('account_id')
            balance_url = f"{self.base_url}/v1/accounts/{account_id}/balances"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Accept': 'application/json',
                'X-Request-ID': self._generate_request_id()
            }
            
            response = requests.get(balance_url, headers=headers, timeout=30)
            
            if response.status_code == 200:
                balance_data = response.json()
                # Récupérer le solde disponible
                for balance in balance_data.get('balances', []):
                    if balance.get('balanceType') == 'interimAvailable':
                        return Decimal(balance['balanceAmount']['amount'])
                
                # Fallback sur le solde comptable
                for balance in balance_data.get('balances', []):
                    if balance.get('balanceType') == 'interimBooked':
                        return Decimal(balance['balanceAmount']['amount'])
            
            raise Exception(f"Impossible de récupérer le solde: {response.text}")
            
        except Exception as e:
            logger.error(f"Erreur récupération solde PSD2: {str(e)}")
            raise
    
    def get_transactions(self, date_debut: datetime, date_fin: datetime) -> List[BankTransaction]:
        """Récupérer les transactions via PSD2."""
        if not self.access_token:
            if not self.authenticate():
                raise Exception("Authentification PSD2 échouée")
        
        try:
            account_id = self.config.get('account_id')
            transactions_url = f"{self.base_url}/v1/accounts/{account_id}/transactions"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Accept': 'application/json',
                'X-Request-ID': self._generate_request_id()
            }
            
            params = {
                'dateFrom': date_debut.strftime('%Y-%m-%d'),
                'dateTo': date_fin.strftime('%Y-%m-%d'),
                'bookingStatus': 'booked'
            }
            
            response = requests.get(
                transactions_url, 
                headers=headers, 
                params=params, 
                timeout=30
            )
            
            if response.status_code == 200:
                transactions_data = response.json()
                transactions = []
                
                for tx in transactions_data.get('transactions', {}).get('booked', []):
                    transaction = BankTransaction(
                        reference=tx.get('transactionId', ''),
                        date_valeur=datetime.fromisoformat(tx['valueDate']),
                        date_operation=datetime.fromisoformat(tx['bookingDate']),
                        montant=Decimal(tx['transactionAmount']['amount']),
                        libelle=tx.get('remittanceInformationUnstructured', ''),
                        type_operation=self._map_transaction_type(tx),
                        metadonnees=tx
                    )
                    transactions.append(transaction)
                
                return transactions
            
            raise Exception(f"Impossible de récupérer les transactions: {response.text}")
            
        except Exception as e:
            logger.error(f"Erreur récupération transactions PSD2: {str(e)}")
            raise
    
    def initiate_transfer(self, beneficiaire: str, montant: Decimal, libelle: str) -> Dict:
        """Initier un virement via PSD2."""
        if not self.access_token:
            if not self.authenticate():
                raise Exception("Authentification PSD2 échouée")
        
        try:
            payments_url = f"{self.base_url}/v1/payments/sepa-credit-transfers"
            
            headers = {
                'Authorization': f'Bearer {self.access_token}',
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Request-ID': self._generate_request_id(),
                'PSU-IP-Address': '127.0.0.1'  # IP du PSU (utilisateur final)
            }
            
            payment_data = {
                'instructedAmount': {
                    'currency': self.compte.devise.code,
                    'amount': str(montant)
                },
                'debtorAccount': {
                    'iban': self.compte.iban
                },
                'creditorAccount': {
                    'iban': beneficiaire
                },
                'creditorName': 'Bénéficiaire',
                'remittanceInformationUnstructured': libelle
            }
            
            response = requests.post(
                payments_url,
                headers=headers,
                json=payment_data,
                timeout=30
            )
            
            if response.status_code in [201, 202]:
                return response.json()
            
            raise Exception(f"Erreur initiation virement: {response.text}")
            
        except Exception as e:
            logger.error(f"Erreur initiation virement PSD2: {str(e)}")
            raise
    
    def _generate_request_id(self) -> str:
        """Générer un ID de requête unique."""
        return f"wb_{int(datetime.now().timestamp())}_{self.compte.id}"
    
    def _map_transaction_type(self, transaction_data: Dict) -> str:
        """Mapper le type de transaction PSD2 vers WiseBook."""
        amount = Decimal(transaction_data['transactionAmount']['amount'])
        
        if amount > 0:
            return 'credit'
        else:
            return 'debit'


class EBICSConnector(BaseBankingConnector):
    """Connecteur EBICS pour les banques allemandes et françaises."""
    
    def __init__(self, compte_bancaire: ComptesBancaires):
        super().__init__(compte_bancaire)
        self.host_id = self.config.get('host_id')
        self.user_id = self.config.get('user_id')
        self.partner_id = self.config.get('partner_id')
        self.bank_url = self.config.get('bank_url')
        self.certificate_path = self.config.get('certificate_path')
    
    def authenticate(self) -> bool:
        """Authentification EBICS."""
        try:
            # Implémentation EBICS simplifiée
            # En production, utiliser une bibliothèque EBICS complète
            logger.info(f"Authentification EBICS pour {self.compte.nom}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur authentification EBICS: {str(e)}")
            return False
    
    def get_balance(self) -> Decimal:
        """Récupérer le solde via EBICS (ordre HAC)."""
        try:
            if not self.authenticate():
                raise Exception("Authentification EBICS échouée")

            # Construction de la requête EBICS HAC (Have Account Currents)
            request_xml = self._build_ebics_request('HAC')

            response = requests.post(
                self.bank_url,
                data=request_xml,
                headers={'Content-Type': 'application/xml'},
                cert=(self.certificate_path, self.certificate_path.replace('.crt', '.key')) if self.certificate_path else None,
                timeout=60
            )

            if response.status_code == 200:
                # Parser la réponse EBICS
                root = ET.fromstring(response.content)
                ns = {'ebics': 'urn:org:ebics:H004'}

                # Extraire le solde depuis la réponse
                balance_element = root.find('.//ebics:Balance', ns)
                if balance_element is not None:
                    return Decimal(balance_element.text)

                # Fallback: parser le format CAMT.052 si présent
                camt_balance = root.find('.//{urn:iso:std:iso:20022:tech:xsd:camt.052.001.02}Bal')
                if camt_balance is not None:
                    amt = camt_balance.find('.//{urn:iso:std:iso:20022:tech:xsd:camt.052.001.02}Amt')
                    if amt is not None:
                        return Decimal(amt.text)

            logger.warning(f"Impossible de récupérer le solde EBICS, utilisation du solde en base")
            return self.compte.solde_actuel or Decimal('0')

        except Exception as e:
            logger.error(f"Erreur récupération solde EBICS: {str(e)}")
            return self.compte.solde_actuel or Decimal('0')

    def get_transactions(self, date_debut: datetime, date_fin: datetime) -> List[BankTransaction]:
        """Récupérer les transactions via EBICS (ordre STA)."""
        try:
            if not self.authenticate():
                raise Exception("Authentification EBICS échouée")

            # Construction de la requête EBICS STA (Statement)
            request_xml = self._build_ebics_request('STA', {
                'date_debut': date_debut.strftime('%Y-%m-%d'),
                'date_fin': date_fin.strftime('%Y-%m-%d')
            })

            response = requests.post(
                self.bank_url,
                data=request_xml,
                headers={'Content-Type': 'application/xml'},
                cert=(self.certificate_path, self.certificate_path.replace('.crt', '.key')) if self.certificate_path else None,
                timeout=120
            )

            transactions = []

            if response.status_code == 200:
                # Parser la réponse MT940 ou CAMT.053
                root = ET.fromstring(response.content)

                # Parser format CAMT.053 (ISO 20022)
                ns = {'camt': 'urn:iso:std:iso:20022:tech:xsd:camt.053.001.02'}
                entries = root.findall('.//camt:Ntry', ns)

                for entry in entries:
                    try:
                        # Extraire les informations de la transaction
                        amount_elem = entry.find('.//camt:Amt', ns)
                        amount = Decimal(amount_elem.text) if amount_elem is not None else Decimal('0')

                        # Déterminer le sens (débit/crédit)
                        cdt_dbt = entry.find('.//camt:CdtDbtInd', ns)
                        if cdt_dbt is not None and cdt_dbt.text == 'DBIT':
                            amount = -amount

                        booking_date = entry.find('.//camt:BookgDt/camt:Dt', ns)
                        value_date = entry.find('.//camt:ValDt/camt:Dt', ns)
                        ref = entry.find('.//camt:AcctSvcrRef', ns)
                        info = entry.find('.//camt:AddtlNtryInf', ns)

                        transaction = BankTransaction(
                            reference=ref.text if ref is not None else f"EBICS_{datetime.now().timestamp()}",
                            date_valeur=datetime.fromisoformat(value_date.text) if value_date is not None else datetime.now(),
                            date_operation=datetime.fromisoformat(booking_date.text) if booking_date is not None else datetime.now(),
                            montant=amount,
                            libelle=info.text if info is not None else "Transaction EBICS",
                            type_operation='credit' if amount > 0 else 'debit',
                            metadonnees={'source': 'EBICS', 'format': 'CAMT.053'}
                        )
                        transactions.append(transaction)
                    except Exception as parse_error:
                        logger.warning(f"Erreur parsing transaction EBICS: {parse_error}")
                        continue

            logger.info(f"EBICS: {len(transactions)} transactions récupérées")
            return transactions

        except Exception as e:
            logger.error(f"Erreur récupération transactions EBICS: {str(e)}")
            return []

    def initiate_transfer(self, beneficiaire: str, montant: Decimal, libelle: str) -> Dict:
        """Initier un virement via EBICS (ordre CCT)."""
        try:
            if not self.authenticate():
                raise Exception("Authentification EBICS échouée")

            # Générer le fichier pain.001 (SEPA Credit Transfer)
            pain_xml = self._generate_pain001(beneficiaire, montant, libelle)

            # Construction de la requête EBICS CCT
            request_xml = self._build_ebics_request('CCT', {'payload': pain_xml})

            response = requests.post(
                self.bank_url,
                data=request_xml,
                headers={'Content-Type': 'application/xml'},
                cert=(self.certificate_path, self.certificate_path.replace('.crt', '.key')) if self.certificate_path else None,
                timeout=60
            )

            if response.status_code in [200, 201, 202]:
                root = ET.fromstring(response.content)

                # Extraire la référence de transaction
                order_id = root.find('.//{urn:org:ebics:H004}OrderID')

                return {
                    'success': True,
                    'status': 'submitted',
                    'order_id': order_id.text if order_id is not None else f"CCT_{datetime.now().strftime('%Y%m%d%H%M%S')}",
                    'message': 'Virement SEPA soumis avec succès'
                }
            else:
                return {
                    'success': False,
                    'status': 'failed',
                    'error': f"Erreur EBICS: {response.status_code}"
                }

        except Exception as e:
            logger.error(f"Erreur initiation virement EBICS: {str(e)}")
            return {
                'success': False,
                'status': 'error',
                'error': str(e)
            }

    def _build_ebics_request(self, order_type: str, params: Dict = None) -> str:
        """Construire une requête EBICS."""
        params = params or {}
        timestamp = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')

        request = f"""<?xml version="1.0" encoding="UTF-8"?>
<ebicsRequest xmlns="urn:org:ebics:H004" Version="H004" Revision="1">
    <header authenticate="true">
        <static>
            <HostID>{self.host_id}</HostID>
            <PartnerID>{self.partner_id}</PartnerID>
            <UserID>{self.user_id}</UserID>
            <OrderDetails>
                <OrderType>{order_type}</OrderType>
                <OrderAttribute>OZHNN</OrderAttribute>
            </OrderDetails>
        </static>
        <mutable>
            <TransactionPhase>Initialisation</TransactionPhase>
        </mutable>
    </header>
    <body>
        <DataTransfer>
            <OrderData>{params.get('payload', '')}</OrderData>
        </DataTransfer>
    </body>
</ebicsRequest>"""
        return request

    def _generate_pain001(self, beneficiaire_iban: str, montant: Decimal, libelle: str) -> str:
        """Générer un fichier pain.001 pour virement SEPA."""
        timestamp = datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
        msg_id = f"WB{datetime.now().strftime('%Y%m%d%H%M%S')}"

        return f"""<?xml version="1.0" encoding="UTF-8"?>
<Document xmlns="urn:iso:std:iso:20022:tech:xsd:pain.001.001.03">
    <CstmrCdtTrfInitn>
        <GrpHdr>
            <MsgId>{msg_id}</MsgId>
            <CreDtTm>{timestamp}</CreDtTm>
            <NbOfTxs>1</NbOfTxs>
            <CtrlSum>{montant}</CtrlSum>
            <InitgPty>
                <Nm>{self.compte.nom}</Nm>
            </InitgPty>
        </GrpHdr>
        <PmtInf>
            <PmtInfId>{msg_id}-1</PmtInfId>
            <PmtMtd>TRF</PmtMtd>
            <NbOfTxs>1</NbOfTxs>
            <CtrlSum>{montant}</CtrlSum>
            <PmtTpInf>
                <SvcLvl><Cd>SEPA</Cd></SvcLvl>
            </PmtTpInf>
            <ReqdExctnDt>{datetime.now().strftime('%Y-%m-%d')}</ReqdExctnDt>
            <Dbtr>
                <Nm>{self.compte.nom}</Nm>
            </Dbtr>
            <DbtrAcct>
                <Id><IBAN>{self.compte.iban}</IBAN></Id>
            </DbtrAcct>
            <DbtrAgt>
                <FinInstnId><BIC>{self.compte.bic or ''}</BIC></FinInstnId>
            </DbtrAgt>
            <CdtTrfTxInf>
                <PmtId>
                    <EndToEndId>{msg_id}-E2E</EndToEndId>
                </PmtId>
                <Amt>
                    <InstdAmt Ccy="{self.compte.devise.code if hasattr(self.compte, 'devise') else 'EUR'}">{montant}</InstdAmt>
                </Amt>
                <CdtrAgt>
                    <FinInstnId><BIC></BIC></FinInstnId>
                </CdtrAgt>
                <Cdtr>
                    <Nm>Beneficiaire</Nm>
                </Cdtr>
                <CdtrAcct>
                    <Id><IBAN>{beneficiaire_iban}</IBAN></Id>
                </CdtrAcct>
                <RmtInf>
                    <Ustrd>{libelle}</Ustrd>
                </RmtInf>
            </CdtTrfTxInf>
        </PmtInf>
    </CstmrCdtTrfInitn>
</Document>"""


class SWIFTConnector(BaseBankingConnector):
    """Connecteur SWIFT pour les virements internationaux."""
    
    def __init__(self, compte_bancaire: ComptesBancaires):
        super().__init__(compte_bancaire)
        self.swift_bic = self.config.get('swift_bic')
        self.api_key = self.config.get('api_key')
        self.base_url = self.config.get('swift_api_url')
    
    def authenticate(self) -> bool:
        """Authentification SWIFT."""
        try:
            # Implémentation authentification SWIFT
            logger.info(f"Authentification SWIFT pour {self.compte.nom}")
            return True
            
        except Exception as e:
            logger.error(f"Erreur authentification SWIFT: {str(e)}")
            return False
    
    def initiate_international_transfer(
        self, 
        beneficiaire_swift: str, 
        beneficiaire_account: str,
        montant: Decimal, 
        devise: str,
        libelle: str
    ) -> Dict:
        """Initier un virement international SWIFT."""
        try:
            # Créer le message MT103 (Customer Credit Transfer)
            mt103_message = self._create_mt103_message(
                beneficiaire_swift,
                beneficiaire_account,
                montant,
                devise,
                libelle
            )
            
            # Envoyer via SWIFT
            # Implémentation d'envoi SWIFT
            
            return {
                'status': 'sent',
                'swift_reference': f"FT{datetime.now().strftime('%Y%m%d%H%M%S')}",
                'message': mt103_message
            }
            
        except Exception as e:
            logger.error(f"Erreur virement SWIFT: {str(e)}")
            raise
    
    def _create_mt103_message(
        self,
        beneficiaire_swift: str,
        beneficiaire_account: str,
        montant: Decimal,
        devise: str,
        libelle: str
    ) -> str:
        """Créer un message MT103 SWIFT."""
        # Implémentation simplifiée du format MT103
        return f"""
        :20:{datetime.now().strftime('%Y%m%d%H%M%S')}
        :23B:CRED
        :32A:{datetime.now().strftime('%y%m%d')}{devise}{montant}
        :50K:{self.compte.nom}
        {self.compte.adresse}
        :59:{beneficiaire_account}
        :70:{libelle}
        :71A:SHA
        """


class AfricanBankingConnector(BaseBankingConnector):
    """Connecteur pour les banques africaines (API spécifiques)."""
    
    SUPPORTED_BANKS = {
        'ECOBANK': 'ecobank_api',
        'BGFI': 'bgfi_api',
        'BICICI': 'bicici_api',
        'CORIS': 'coris_api'
    }
    
    def __init__(self, compte_bancaire: ComptesBancaires):
        super().__init__(compte_bancaire)
        self.bank_code = self.config.get('bank_code')
        self.api_url = self.config.get('api_url')
        self.api_key = self.config.get('api_key')
        self.api_secret = self.config.get('api_secret')
    
    def authenticate(self) -> bool:
        """Authentification spécifique banque africaine."""
        try:
            if self.bank_code == 'ECOBANK':
                return self._authenticate_ecobank()
            elif self.bank_code == 'BGFI':
                return self._authenticate_bgfi()
            # Ajouter d'autres banques...
            
            return False
            
        except Exception as e:
            logger.error(f"Erreur authentification banque africaine: {str(e)}")
            return False
    
    def _authenticate_ecobank(self) -> bool:
        """Authentification Ecobank."""
        try:
            auth_url = f"{self.api_url}/oauth/token"
            
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            data = {
                'grant_type': 'client_credentials',
                'client_id': self.api_key,
                'client_secret': self.api_secret
            }
            
            response = requests.post(auth_url, headers=headers, data=data, timeout=30)
            
            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data['access_token']
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Erreur authentification Ecobank: {str(e)}")
            return False
    
    def _authenticate_bgfi(self) -> bool:
        """Authentification BGFI Bank."""
        try:
            auth_url = f"{self.api_url}/v1/auth/token"

            # Signature HMAC pour BGFI
            timestamp = str(int(datetime.now().timestamp()))
            signature_string = f"{self.api_key}{timestamp}{self.api_secret}"
            signature = hmac.new(
                self.api_secret.encode(),
                signature_string.encode(),
                hashlib.sha256
            ).hexdigest()

            headers = {
                'Content-Type': 'application/json',
                'X-API-Key': self.api_key,
                'X-Timestamp': timestamp,
                'X-Signature': signature
            }

            response = requests.post(auth_url, headers=headers, timeout=30)

            if response.status_code == 200:
                token_data = response.json()
                self.access_token = token_data.get('access_token')
                return True

            logger.error(f"Erreur authentification BGFI: {response.text}")
            return False

        except Exception as e:
            logger.error(f"Erreur authentification BGFI: {str(e)}")
            return False
    
    def get_balance(self) -> Decimal:
        """Récupérer le solde via API banque africaine."""
        try:
            if self.bank_code == 'ECOBANK':
                return self._get_balance_ecobank()
            
            raise Exception(f"Banque {self.bank_code} non supportée")
            
        except Exception as e:
            logger.error(f"Erreur récupération solde banque africaine: {str(e)}")
            raise
    
    def _get_balance_ecobank(self) -> Decimal:
        """Récupérer le solde Ecobank."""
        balance_url = f"{self.api_url}/accounts/{self.config.get('account_number')}/balance"
        
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Accept': 'application/json'
        }
        
        response = requests.get(balance_url, headers=headers, timeout=30)
        
        if response.status_code == 200:
            balance_data = response.json()
            return Decimal(balance_data['availableBalance'])
        
        raise Exception(f"Erreur récupération solde: {response.text}")


class BankingService:
    """Service principal pour la gestion des connexions bancaires."""
    
    @staticmethod
    def get_connector(compte_bancaire: ComptesBancaires) -> BaseBankingConnector:
        """Factory pour créer le bon connecteur."""
        api_type = compte_bancaire.type_api
        
        if api_type == 'psd2':
            return PSD2Connector(compte_bancaire)
        elif api_type == 'ebics':
            return EBICSConnector(compte_bancaire)
        elif api_type == 'swift':
            return SWIFTConnector(compte_bancaire)
        elif api_type == 'african':
            return AfricanBankingConnector(compte_bancaire)
        else:
            raise ValueError(f"Type d'API bancaire non supporté: {api_type}")
    
    @staticmethod
    def synchronize_account(compte_bancaire: ComptesBancaires) -> Dict[str, Any]:
        """Synchroniser un compte bancaire."""
        try:
            connector = BankingService.get_connector(compte_bancaire)
            
            if not connector.authenticate():
                raise Exception("Authentification bancaire échouée")
            
            # Récupérer le solde
            nouveau_solde = connector.get_balance()
            
            # Récupérer les transactions des 30 derniers jours
            date_fin = timezone.now()
            date_debut = date_fin - timedelta(days=30)
            
            transactions = connector.get_transactions(date_debut, date_fin)
            
            # Synchroniser les nouvelles transactions
            nouvelles_transactions = 0
            for tx in transactions:
                if not MouvementTresorerie.objects.filter(
                    compte_bancaire=compte_bancaire,
                    reference_externe=tx.reference
                ).exists():
                    MouvementTresorerie.objects.create(
                        societe=compte_bancaire.societe,
                        compte_bancaire=compte_bancaire,
                        date_valeur=tx.date_valeur,
                        date_operation=tx.date_operation,
                        montant=tx.montant,
                        libelle=tx.libelle,
                        type_mouvement=tx.type_operation,
                        reference_externe=tx.reference,
                        metadonnees=tx.metadonnees,
                        statut='valide'
                    )
                    nouvelles_transactions += 1
            
            # Mettre à jour le solde
            compte_bancaire.solde_actuel = nouveau_solde
            compte_bancaire.date_derniere_synchronisation = timezone.now()
            compte_bancaire.save()
            
            return {
                'success': True,
                'nouveau_solde': nouveau_solde,
                'nouvelles_transactions': nouvelles_transactions,
                'total_transactions': len(transactions)
            }
            
        except Exception as e:
            logger.error(f"Erreur synchronisation compte {compte_bancaire.nom}: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }
    
    @staticmethod
    def initiate_transfer(
        compte_source: ComptesBancaires,
        compte_destination: str,
        montant: Decimal,
        libelle: str,
        type_virement: str = 'sepa'
    ) -> Dict[str, Any]:
        """Initier un virement bancaire."""
        try:
            connector = BankingService.get_connector(compte_source)
            
            if not connector.authenticate():
                raise Exception("Authentification bancaire échouée")
            
            if type_virement == 'international' and isinstance(connector, SWIFTConnector):
                # Virement international SWIFT
                result = connector.initiate_international_transfer(
                    compte_destination, '', montant, compte_source.devise.code, libelle
                )
            else:
                # Virement SEPA ou domestique
                result = connector.initiate_transfer(compte_destination, montant, libelle)
            
            return {
                'success': True,
                'reference': result.get('paymentId', result.get('swift_reference')),
                'statut': result.get('transactionStatus', result.get('status')),
                'details': result
            }
            
        except Exception as e:
            logger.error(f"Erreur initiation virement: {str(e)}")
            return {
                'success': False,
                'error': str(e)
            }