"""
Service de télédéclaration pour les administrations fiscales OHADA.
"""
import xml.etree.ElementTree as ET
import json
import requests
import logging
from typing import Dict, Any, Optional
from datetime import datetime, date
from decimal import Decimal
from django.conf import settings
from django.core.exceptions import ValidationError
from django.utils import timezone
from cryptography.hazmat.primitives import serialization, hashes
from cryptography.hazmat.primitives.asymmetric import rsa, padding
import base64

from ..models import DeclarationFiscale, DocumentFiscal, EvenementFiscal
from ...core.models import Societe

logger = logging.getLogger(__name__)


class TeleDeclarationService:
    """
    Service pour la télédéclaration des impôts selon les standards OHADA.
    """
    
    def __init__(self, societe: Societe):
        self.societe = societe
        self.base_url = getattr(settings, 'FISCAL_API_BASE_URL', 'https://api-fiscal.gov.ci')
        self.api_key = getattr(settings, 'FISCAL_API_KEY', '')
        self.certificate_path = getattr(settings, 'FISCAL_CERTIFICATE_PATH', '')
        
    def transmettre_declaration(
        self, 
        declaration: DeclarationFiscale,
        format_transmission: str = 'XML',
        signature_electronique: bool = True
    ) -> Dict[str, Any]:
        """
        Transmet une déclaration fiscale à l'administration.
        """
        try:
            # Validation préalable
            self._valider_declaration_pour_transmission(declaration)
            
            # Génération du document de transmission
            if format_transmission == 'XML':
                document = self._generer_xml_declaration(declaration)
            elif format_transmission == 'JSON':
                document = self._generer_json_declaration(declaration)
            elif format_transmission == 'EDI':
                document = self._generer_edi_declaration(declaration)
            else:
                raise ValidationError(f"Format de transmission non supporté: {format_transmission}")
            
            # Signature électronique si demandée
            if signature_electronique:
                document = self._signer_electroniquement(document, format_transmission)
            
            # Transmission à l'API fiscale
            response = self._envoyer_a_api_fiscale(document, format_transmission, declaration)
            
            # Mise à jour de la déclaration
            self._mettre_a_jour_declaration_transmise(declaration, response)
            
            # Création d'un événement fiscal
            self._creer_evenement_transmission(declaration, response)
            
            return {
                'success': True,
                'reference_administration': response.get('reference'),
                'numero_accuse': response.get('accuse_reception'),
                'date_transmission': timezone.now(),
                'statut_api': response.get('status', 'TRANSMISE'),
                'message': 'Déclaration transmise avec succès'
            }
            
        except Exception as e:
            logger.error(f"Erreur transmission déclaration {declaration.numero_declaration}: {str(e)}")
            
            # Créer une alerte d'erreur
            from ..models import AlerteFiscale
            AlerteFiscale.objects.create(
                societe=self.societe,
                type_alerte='TRANSMISSION_ECHEC',
                niveau='ERROR',
                titre=f'Échec transmission {declaration.numero_declaration}',
                message=f'Erreur lors de la transmission: {str(e)}',
                declaration=declaration
            )
            
            return {
                'success': False,
                'error': str(e),
                'message': 'Erreur lors de la transmission'
            }
    
    def _valider_declaration_pour_transmission(self, declaration: DeclarationFiscale):
        """Valide une déclaration avant transmission."""
        
        if declaration.statut != 'VALIDEE':
            raise ValidationError("Seules les déclarations validées peuvent être transmises")
        
        if not declaration.lignes.exists():
            raise ValidationError("La déclaration doit contenir au moins une ligne")
        
        # Validation des données obligatoires selon le type de déclaration
        type_decl = declaration.type_declaration.code
        
        if type_decl == 'TVA':
            self._valider_declaration_tva(declaration)
        elif type_decl == 'IS':
            self._valider_declaration_is(declaration)
        elif type_decl == 'PATENTE':
            self._valider_declaration_patente(declaration)
    
    def _valider_declaration_tva(self, declaration: DeclarationFiscale):
        """Validation spécifique pour les déclarations TVA."""
        
        # Vérifier les rubriques obligatoires
        rubriques_obligatoires = ['TVA_COLLECTEE', 'TVA_DEDUCTIBLE', 'TVA_A_PAYER']
        rubriques_presentes = set(declaration.lignes.values_list('code_ligne', flat=True))
        
        manquantes = set(rubriques_obligatoires) - rubriques_presentes
        if manquantes:
            raise ValidationError(f"Rubriques TVA manquantes: {', '.join(manquantes)}")
        
        # Vérifier la cohérence des montants
        tva_collectee = declaration.lignes.filter(code_ligne='TVA_COLLECTEE').first()
        tva_deductible = declaration.lignes.filter(code_ligne='TVA_DEDUCTIBLE').first()
        tva_a_payer = declaration.lignes.filter(code_ligne='TVA_A_PAYER').first()
        
        if tva_collectee and tva_deductible and tva_a_payer:
            montant_calcule = max(0, tva_collectee.montant_calcule - tva_deductible.montant_calcule)
            if abs(montant_calcule - tva_a_payer.montant_calcule) > Decimal('0.01'):
                raise ValidationError("Incohérence dans les montants TVA")
    
    def _valider_declaration_is(self, declaration: DeclarationFiscale):
        """Validation spécifique pour les déclarations IS."""
        
        # Vérifier les rubriques obligatoires
        rubriques_obligatoires = ['CHIFFRE_AFFAIRES', 'RESULTAT_FISCAL', 'IS_A_PAYER']
        rubriques_presentes = set(declaration.lignes.values_list('code_ligne', flat=True))
        
        manquantes = set(rubriques_obligatoires) - rubriques_presentes
        if manquantes:
            raise ValidationError(f"Rubriques IS manquantes: {', '.join(manquantes)}")
    
    def _valider_declaration_patente(self, declaration: DeclarationFiscale):
        """Validation spécifique pour les déclarations de patente."""
        
        if not declaration.donnees_declaration.get('activite_principale'):
            raise ValidationError("L'activité principale doit être renseignée pour la patente")
    
    def _generer_xml_declaration(self, declaration: DeclarationFiscale) -> str:
        """Génère le XML de déclaration selon le format OHADA."""
        
        # Création de l'élément racine
        root = ET.Element("DeclarationFiscale")
        root.set("version", "1.0")
        root.set("xmlns", "http://ohada.org/fiscal/schemas/v1")
        
        # En-tête
        entete = ET.SubElement(root, "Entete")
        ET.SubElement(entete, "NumeroDeclaration").text = declaration.numero_declaration
        ET.SubElement(entete, "TypeDeclaration").text = declaration.type_declaration.code
        ET.SubElement(entete, "Exercice").text = str(declaration.exercice)
        ET.SubElement(entete, "PeriodeDebut").text = declaration.periode_debut.strftime("%Y-%m-%d")
        ET.SubElement(entete, "PeriodeFin").text = declaration.periode_fin.strftime("%Y-%m-%d")
        ET.SubElement(entete, "DateLimiteDepot").text = declaration.date_limite_depot.strftime("%Y-%m-%d")
        
        # Informations déclarant
        declarant = ET.SubElement(root, "Declarant")
        ET.SubElement(declarant, "RaisonSociale").text = self.societe.raison_sociale
        ET.SubElement(declarant, "NumeroContribuable").text = self.societe.numero_contribuable or ""
        ET.SubElement(declarant, "Adresse").text = f"{self.societe.adresse_siege or ''}"
        ET.SubElement(declarant, "Ville").text = self.societe.ville_siege or ""
        ET.SubElement(declarant, "CodePostal").text = self.societe.code_postal_siege or ""
        ET.SubElement(declarant, "Pays").text = self.societe.pays or ""
        
        # Régime fiscal
        regime = ET.SubElement(root, "RegimeFiscal")
        ET.SubElement(regime, "Code").text = declaration.regime_fiscal.code
        ET.SubElement(regime, "Libelle").text = declaration.regime_fiscal.libelle
        ET.SubElement(regime, "TypeRegime").text = declaration.regime_fiscal.type_regime
        
        # Lignes de déclaration
        lignes_elem = ET.SubElement(root, "LignesDeclaration")
        
        for ligne in declaration.lignes.all().order_by('ordre'):
            ligne_elem = ET.SubElement(lignes_elem, "Ligne")
            ET.SubElement(ligne_elem, "Code").text = ligne.code_ligne
            ET.SubElement(ligne_elem, "Libelle").text = ligne.libelle
            ET.SubElement(ligne_elem, "MontantBase").text = str(ligne.montant_base)
            ET.SubElement(ligne_elem, "TauxApplique").text = str(ligne.taux_applique)
            ET.SubElement(ligne_elem, "MontantCalcule").text = str(ligne.montant_calcule)
            ET.SubElement(ligne_elem, "Obligatoire").text = str(ligne.obligatoire).lower()
            
            if ligne.description:
                ET.SubElement(ligne_elem, "Description").text = ligne.description
        
        # Totaux
        totaux = ET.SubElement(root, "Totaux")
        ET.SubElement(totaux, "BaseImposable").text = str(declaration.base_imposable)
        ET.SubElement(totaux, "MontantImpot").text = str(declaration.montant_impot)
        ET.SubElement(totaux, "CreditImpot").text = str(declaration.credit_impot)
        ET.SubElement(totaux, "AcompteVerse").text = str(declaration.acompte_verse)
        ET.SubElement(totaux, "MontantDu").text = str(declaration.montant_du)
        ET.SubElement(totaux, "PenaliteRetard").text = str(declaration.penalite_retard)
        ET.SubElement(totaux, "Majorations").text = str(declaration.majorations)
        
        # Données spécifiques
        if declaration.donnees_declaration:
            donnees = ET.SubElement(root, "DonneesSpecifiques")
            for cle, valeur in declaration.donnees_declaration.items():
                elem = ET.SubElement(donnees, cle)
                elem.text = str(valeur)
        
        # Observations
        if declaration.observations:
            ET.SubElement(root, "Observations").text = declaration.observations
        
        # Signature et validation
        validation = ET.SubElement(root, "Validation")
        ET.SubElement(validation, "DateValidation").text = declaration.date_validation.strftime("%Y-%m-%d %H:%M:%S") if declaration.date_validation else ""
        ET.SubElement(validation, "ValidePar").text = declaration.valide_par.username if declaration.valide_par else ""
        
        # Convertir en string
        return ET.tostring(root, encoding='unicode', xml_declaration=True)
    
    def _generer_json_declaration(self, declaration: DeclarationFiscale) -> str:
        """Génère le JSON de déclaration."""
        
        data = {
            "version": "1.0",
            "entete": {
                "numero_declaration": declaration.numero_declaration,
                "type_declaration": declaration.type_declaration.code,
                "exercice": declaration.exercice,
                "periode_debut": declaration.periode_debut.strftime("%Y-%m-%d"),
                "periode_fin": declaration.periode_fin.strftime("%Y-%m-%d"),
                "date_limite_depot": declaration.date_limite_depot.strftime("%Y-%m-%d")
            },
            "declarant": {
                "raison_sociale": self.societe.raison_sociale,
                "numero_contribuable": self.societe.numero_contribuable or "",
                "adresse": self.societe.adresse_siege or "",
                "ville": self.societe.ville_siege or "",
                "code_postal": self.societe.code_postal_siege or "",
                "pays": self.societe.pays or ""
            },
            "regime_fiscal": {
                "code": declaration.regime_fiscal.code,
                "libelle": declaration.regime_fiscal.libelle,
                "type_regime": declaration.regime_fiscal.type_regime
            },
            "lignes_declaration": [
                {
                    "code": ligne.code_ligne,
                    "libelle": ligne.libelle,
                    "montant_base": float(ligne.montant_base),
                    "taux_applique": float(ligne.taux_applique),
                    "montant_calcule": float(ligne.montant_calcule),
                    "obligatoire": ligne.obligatoire,
                    "description": ligne.description or ""
                }
                for ligne in declaration.lignes.all().order_by('ordre')
            ],
            "totaux": {
                "base_imposable": float(declaration.base_imposable),
                "montant_impot": float(declaration.montant_impot),
                "credit_impot": float(declaration.credit_impot),
                "acompte_verse": float(declaration.acompte_verse),
                "montant_du": float(declaration.montant_du),
                "penalite_retard": float(declaration.penalite_retard),
                "majorations": float(declaration.majorations)
            },
            "donnees_specifiques": declaration.donnees_declaration,
            "observations": declaration.observations or "",
            "validation": {
                "date_validation": declaration.date_validation.strftime("%Y-%m-%d %H:%M:%S") if declaration.date_validation else "",
                "valide_par": declaration.valide_par.username if declaration.valide_par else ""
            }
        }
        
        return json.dumps(data, ensure_ascii=False, indent=2)
    
    def _generer_edi_declaration(self, declaration: DeclarationFiscale) -> str:
        """Génère le format EDI de déclaration."""
        
        # Format EDI simplifié - à adapter selon les spécifications exactes
        lignes_edi = []
        
        # En-tête EDI
        lignes_edi.append(f"HDR+{declaration.numero_declaration}+{declaration.type_declaration.code}+{declaration.exercice}+{declaration.periode_debut.strftime('%Y%m%d')}+{declaration.periode_fin.strftime('%Y%m%d')}")
        
        # Déclarant
        lignes_edi.append(f"DCL+{self.societe.raison_sociale}+{self.societe.numero_contribuable or ''}+{self.societe.adresse_siege or ''}+{self.societe.ville_siege or ''}")
        
        # Régime fiscal
        lignes_edi.append(f"RGM+{declaration.regime_fiscal.code}+{declaration.regime_fiscal.type_regime}")
        
        # Lignes de déclaration
        for ligne in declaration.lignes.all().order_by('ordre'):
            lignes_edi.append(f"LIG+{ligne.code_ligne}+{ligne.montant_base}+{ligne.taux_applique}+{ligne.montant_calcule}")
        
        # Totaux
        lignes_edi.append(f"TOT+{declaration.base_imposable}+{declaration.montant_impot}+{declaration.montant_du}")
        
        # Fin EDI
        lignes_edi.append("END")
        
        return '\n'.join(lignes_edi)
    
    def _signer_electroniquement(self, document: str, format_transmission: str) -> str:
        """Applique une signature électronique au document."""
        
        try:
            # Charger la clé privée (à adapter selon votre infrastructure PKI)
            if not self.certificate_path or not hasattr(settings, 'FISCAL_PRIVATE_KEY'):
                logger.warning("Signature électronique demandée mais certificat non configuré")
                return document
            
            # Simulation de signature électronique
            # En production, utiliser un vrai certificat numérique
            signature_data = {
                'document': document,
                'timestamp': datetime.now().isoformat(),
                'societe': self.societe.numero_contribuable,
                'hash': self._calculer_hash_document(document)
            }
            
            if format_transmission == 'XML':
                # Ajouter la signature XML
                root = ET.fromstring(document)
                signature_elem = ET.SubElement(root, "SignatureElectronique")
                ET.SubElement(signature_elem, "Timestamp").text = signature_data['timestamp']
                ET.SubElement(signature_elem, "Hash").text = signature_data['hash']
                ET.SubElement(signature_elem, "Certificat").text = "SIMULATED_CERT"
                
                return ET.tostring(root, encoding='unicode', xml_declaration=True)
            
            elif format_transmission == 'JSON':
                data = json.loads(document)
                data['signature_electronique'] = signature_data
                return json.dumps(data, ensure_ascii=False, indent=2)
            
            else:
                # Pour EDI, ajouter ligne de signature
                return document + f"\nSIG+{signature_data['timestamp']}+{signature_data['hash']}"
        
        except Exception as e:
            logger.error(f"Erreur signature électronique: {str(e)}")
            return document
    
    def _calculer_hash_document(self, document: str) -> str:
        """Calcule le hash SHA-256 du document."""
        import hashlib
        return hashlib.sha256(document.encode('utf-8')).hexdigest()
    
    def _envoyer_a_api_fiscale(
        self, 
        document: str, 
        format_transmission: str, 
        declaration: DeclarationFiscale
    ) -> Dict[str, Any]:
        """Envoie le document à l'API fiscale."""
        
        # En mode développement, simuler la réponse
        if settings.DEBUG:
            return self._simuler_reponse_api_fiscale(declaration)
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/xml' if format_transmission == 'XML' else 'application/json',
            'X-Societe-ID': str(self.societe.id),
            'X-Declaration-Type': declaration.type_declaration.code
        }
        
        endpoint = f"{self.base_url}/declarations/submit"
        
        try:
            response = requests.post(
                endpoint,
                data=document,
                headers=headers,
                timeout=30
            )
            
            response.raise_for_status()
            
            return response.json()
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur API fiscale: {str(e)}")
            raise ValidationError(f"Erreur de transmission à l'API fiscale: {str(e)}")
    
    def _simuler_reponse_api_fiscale(self, declaration: DeclarationFiscale) -> Dict[str, Any]:
        """Simule la réponse de l'API fiscale en développement."""
        
        return {
            'status': 'SUCCESS',
            'reference': f"REF-{declaration.numero_declaration}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
            'accuse_reception': f"AR-{declaration.numero_declaration}-{datetime.now().strftime('%Y%m%d')}",
            'date_reception': datetime.now().isoformat(),
            'message': 'Déclaration reçue et enregistrée avec succès',
            'statut_traitement': 'EN_COURS',
            'delai_traitement_estime': '5 jours ouvrables'
        }
    
    def _mettre_a_jour_declaration_transmise(
        self, 
        declaration: DeclarationFiscale, 
        response: Dict[str, Any]
    ):
        """Met à jour la déclaration après transmission réussie."""
        
        declaration.statut = 'TRANSMISE'
        declaration.date_transmission = timezone.now()
        declaration.reference_administration = response.get('reference')
        
        # Ajouter les détails de la transmission dans les données
        declaration.donnees_declaration.update({
            'transmission': {
                'date': timezone.now().isoformat(),
                'reference_api': response.get('reference'),
                'accuse_reception': response.get('accuse_reception'),
                'statut_api': response.get('status'),
                'delai_traitement': response.get('delai_traitement_estime')
            }
        })
        
        declaration.save()
    
    def _creer_evenement_transmission(
        self, 
        declaration: DeclarationFiscale, 
        response: Dict[str, Any]
    ):
        """Crée un événement fiscal pour la transmission."""
        
        EvenementFiscal.objects.create(
            societe=self.societe,
            type_evenement='TRANSMISSION_DECLARATION',
            date_evenement=date.today(),
            date_effet_fiscal=date.today(),
            libelle=f'Transmission déclaration {declaration.numero_declaration}',
            description=f'Déclaration {declaration.type_declaration.libelle} transmise avec succès. Référence: {response.get("reference", "N/A")}',
            traite=True,
            date_traitement=timezone.now()
        )
    
    def verifier_statut_declaration(self, declaration: DeclarationFiscale) -> Dict[str, Any]:
        """Vérifie le statut d'une déclaration transmise."""
        
        if not declaration.reference_administration:
            raise ValidationError("Aucune référence administration pour cette déclaration")
        
        # En mode développement, simuler la vérification
        if settings.DEBUG:
            return self._simuler_verification_statut(declaration)
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }
        
        endpoint = f"{self.base_url}/declarations/{declaration.reference_administration}/status"
        
        try:
            response = requests.get(endpoint, headers=headers, timeout=15)
            response.raise_for_status()
            
            statut_data = response.json()
            
            # Mettre à jour le statut si nécessaire
            if statut_data.get('status') == 'ACCEPTED':
                declaration.statut = 'ACCEPTEE'
                declaration.save()
            elif statut_data.get('status') == 'REJECTED':
                declaration.statut = 'REJETEE'
                declaration.commentaires_administration = statut_data.get('rejection_reason', '')
                declaration.save()
            
            return statut_data
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur vérification statut: {str(e)}")
            raise ValidationError(f"Erreur lors de la vérification du statut: {str(e)}")
    
    def _simuler_verification_statut(self, declaration: DeclarationFiscale) -> Dict[str, Any]:
        """Simule la vérification de statut en développement."""
        
        return {
            'reference': declaration.reference_administration,
            'status': 'ACCEPTED',
            'date_traitement': (timezone.now() + timezone.timedelta(days=2)).isoformat(),
            'message': 'Déclaration acceptée et traitée',
            'observations': '',
            'montant_confirme': float(declaration.montant_du)
        }
    
    def telecharger_accuse_reception(self, declaration: DeclarationFiscale) -> Optional[bytes]:
        """Télécharge l'accusé de réception d'une déclaration."""
        
        if not declaration.reference_administration:
            raise ValidationError("Aucune référence administration pour cette déclaration")
        
        # En mode développement, générer un PDF simulé
        if settings.DEBUG:
            return self._generer_accuse_reception_simule(declaration)
        
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Accept': 'application/pdf'
        }
        
        endpoint = f"{self.base_url}/declarations/{declaration.reference_administration}/receipt"
        
        try:
            response = requests.get(endpoint, headers=headers, timeout=30)
            response.raise_for_status()
            
            return response.content
        
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur téléchargement accusé: {str(e)}")
            return None
    
    def _generer_accuse_reception_simule(self, declaration: DeclarationFiscale) -> bytes:
        """Génère un accusé de réception simulé."""
        
        # Contenu PDF simulé (en production, utiliser une vraie librairie PDF)
        contenu = f"""
        ACCUSÉ DE RÉCEPTION DE DÉCLARATION FISCALE
        ==========================================
        
        Référence: {declaration.reference_administration}
        Déclaration: {declaration.numero_declaration}
        Type: {declaration.type_declaration.libelle}
        Société: {self.societe.raison_sociale}
        
        Date de réception: {timezone.now().strftime('%d/%m/%Y %H:%M')}
        Statut: REÇU ET ENREGISTRÉ
        
        Votre déclaration a été reçue et enregistrée avec succès.
        Elle sera traitée dans un délai de 5 jours ouvrables.
        
        Administration Fiscale
        """.encode('utf-8')
        
        return contenu