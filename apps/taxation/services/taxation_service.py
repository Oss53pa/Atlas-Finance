from django.db import transaction, connection
from django.db.models import Q, F, Sum, Count, Avg, Max, Min
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime, date, timedelta
import logging

from ..models import (
    RegimeFiscal, TypeDeclaration, DeclarationFiscale, 
    LigneDeclaration, EvenementFiscal, ObligationFiscale,
    PlanificationDeclaration, ControlesFiscaux, DocumentFiscal, AlerteFiscale
)
from ...accounting.models import Ecriture, LigneEcriture, CompteComptable
from ...core.models import Societe, Exercice
from ...core.services.base_service import BaseService

logger = logging.getLogger(__name__)

class TaxationService(BaseService):
    """
    Service pour la gestion de la fiscalité OHADA.
    Gère les déclarations, calculs fiscaux, obligations et contrôles.
    """
    
    def __init__(self, societe: Societe):
        super().__init__(societe)
        self.societe = societe
    
    def generer_declaration_automatique(
        self, 
        type_declaration_id: int,
        periode_debut: date,
        periode_fin: date,
        exercice: Exercice
    ) -> DeclarationFiscale:
        """
        Génère automatiquement une déclaration fiscale basée sur les écritures comptables.
        """
        try:
            with transaction.atomic():
                type_declaration = TypeDeclaration.objects.get(
                    id=type_declaration_id,
                    regime_fiscal__societe=self.societe
                )
                
                # Créer la déclaration
                declaration = DeclarationFiscale.objects.create(
                    societe=self.societe,
                    type_declaration=type_declaration,
                    exercice=exercice,
                    periode_debut=periode_debut,
                    periode_fin=periode_fin,
                    statut='BROUILLON'
                )
                
                # Générer les lignes selon le type de déclaration
                if type_declaration.code == 'TVA':
                    self._generer_lignes_tva(declaration, periode_debut, periode_fin)
                elif type_declaration.code == 'IS':
                    self._generer_lignes_is(declaration, periode_debut, periode_fin)
                elif type_declaration.code == 'BIC':
                    self._generer_lignes_bic(declaration, periode_debut, periode_fin)
                elif type_declaration.code == 'IRPP':
                    self._generer_lignes_irpp(declaration, periode_debut, periode_fin)
                elif type_declaration.code == 'PATENTE':
                    self._generer_lignes_patente(declaration, periode_debut, periode_fin)
                
                # Calculer les totaux
                self._calculer_totaux_declaration(declaration)
                
                # Créer événement fiscal
                EvenementFiscal.objects.create(
                    societe=self.societe,
                    type_evenement='GENERATION_DECLARATION',
                    description=f'Génération automatique de la déclaration {type_declaration.libelle}',
                    declaration=declaration,
                    date_evenement=timezone.now()
                )
                
                logger.info(f"Déclaration {type_declaration.code} générée pour {self.societe.raison_sociale}")
                return declaration
                
        except Exception as e:
            logger.error(f"Erreur génération déclaration {type_declaration_id}: {str(e)}")
            raise ValidationError(f"Impossible de générer la déclaration: {str(e)}")
    
    def _generer_lignes_tva(self, declaration: DeclarationFiscal, periode_debut: date, periode_fin: date):
        """Génère les lignes de déclaration TVA."""
        
        # TVA collectée (comptes 44571x)
        tva_collectee = self._calculer_tva_collectee(periode_debut, periode_fin)
        if tva_collectee:
            LigneDeclaration.objects.create(
                declaration=declaration,
                rubrique='TVA_COLLECTEE',
                libelle='TVA collectée',
                base_calcul=tva_collectee['base'],
                taux=tva_collectee['taux_moyen'],
                montant=tva_collectee['montant'],
                ordre_affichage=1
            )
        
        # TVA déductible (comptes 44566x)
        tva_deductible = self._calculer_tva_deductible(periode_debut, periode_fin)
        if tva_deductible:
            LigneDeclaration.objects.create(
                declaration=declaration,
                rubrique='TVA_DEDUCTIBLE',
                libelle='TVA déductible',
                base_calcul=tva_deductible['base'],
                taux=tva_deductible['taux_moyen'],
                montant=tva_deductible['montant'],
                ordre_affichage=2
            )
        
        # TVA à payer
        montant_tva = (tva_collectee['montant'] if tva_collectee else 0) - (tva_deductible['montant'] if tva_deductible else 0)
        LigneDeclaration.objects.create(
            declaration=declaration,
            rubrique='TVA_A_PAYER',
            libelle='TVA nette à payer',
            montant=max(montant_tva, 0),
            ordre_affichage=3
        )
        
        # Crédit de TVA
        if montant_tva < 0:
            LigneDeclaration.objects.create(
                declaration=declaration,
                rubrique='CREDIT_TVA',
                libelle='Crédit de TVA',
                montant=abs(montant_tva),
                ordre_affichage=4
            )
    
    def _generer_lignes_is(self, declaration: DeclarationFiscale, periode_debut: date, periode_fin: date):
        """Génère les lignes de déclaration IS (Impôt sur les Sociétés)."""
        
        # Chiffre d'affaires
        ca = self._calculer_chiffre_affaires(periode_debut, periode_fin)
        LigneDeclaration.objects.create(
            declaration=declaration,
            rubrique='CHIFFRE_AFFAIRES',
            libelle='Chiffre d\'affaires',
            montant=ca,
            ordre_affichage=1
        )
        
        # Résultat comptable
        resultat = self._calculer_resultat_comptable(periode_debut, periode_fin)
        LigneDeclaration.objects.create(
            declaration=declaration,
            rubrique='RESULTAT_COMPTABLE',
            libelle='Résultat comptable',
            montant=resultat,
            ordre_affichage=2
        )
        
        # Réintégrations fiscales
        reintegrations = self._calculer_reintegrations_fiscales(periode_debut, periode_fin)
        LigneDeclaration.objects.create(
            declaration=declaration,
            rubrique='REINTEGRATIONS',
            libelle='Réintégrations fiscales',
            montant=reintegrations,
            ordre_affichage=3
        )
        
        # Déductions fiscales
        deductions = self._calculer_deductions_fiscales(periode_debut, periode_fin)
        LigneDeclaration.objects.create(
            declaration=declaration,
            rubrique='DEDUCTIONS',
            libelle='Déductions fiscales',
            montant=deductions,
            ordre_affichage=4
        )
        
        # Résultat fiscal
        resultat_fiscal = resultat + reintegrations - deductions
        LigneDeclaration.objects.create(
            declaration=declaration,
            rubrique='RESULTAT_FISCAL',
            libelle='Résultat fiscal',
            montant=resultat_fiscal,
            ordre_affichage=5
        )
        
        # IS à payer
        if resultat_fiscal > 0:
            regime = declaration.type_declaration.regime_fiscal
            taux_is = regime.parametres.get('taux_is', 25)  # Taux standard OHADA 25%
            is_a_payer = resultat_fiscal * Decimal(taux_is) / 100
            
            LigneDeclaration.objects.create(
                declaration=declaration,
                rubrique='IS_A_PAYER',
                libelle='Impôt sur les sociétés à payer',
                base_calcul=resultat_fiscal,
                taux=taux_is,
                montant=is_a_payer,
                ordre_affichage=6
            )
    
    def _generer_lignes_bic(self, declaration: DeclarationFiscale, periode_debut: date, periode_fin: date):
        """Génère les lignes de déclaration BIC (Bénéfices Industriels et Commerciaux)."""
        
        # Recettes
        recettes = self._calculer_recettes_bic(periode_debut, periode_fin)
        LigneDeclaration.objects.create(
            declaration=declaration,
            rubrique='RECETTES_BIC',
            libelle='Recettes BIC',
            montant=recettes,
            ordre_affichage=1
        )
        
        # Charges déductibles
        charges = self._calculer_charges_deductibles_bic(periode_debut, periode_fin)
        LigneDeclaration.objects.create(
            declaration=declaration,
            rubrique='CHARGES_BIC',
            libelle='Charges déductibles',
            montant=charges,
            ordre_affichage=2
        )
        
        # Bénéfice BIC
        benefice_bic = recettes - charges
        LigneDeclaration.objects.create(
            declaration=declaration,
            rubrique='BENEFICE_BIC',
            libelle='Bénéfice BIC imposable',
            montant=max(benefice_bic, 0),
            ordre_affichage=3
        )
    
    def calculer_impot_du(
        self, 
        type_impot: str,
        base_calcul: Decimal,
        periode: date,
        parametres_specifiques: Dict = None
    ) -> Dict[str, Any]:
        """
        Calcule le montant d'un impôt selon les règles OHADA.
        """
        try:
            regime_fiscal = RegimeFiscal.objects.get(
                societe=self.societe,
                actif=True
            )
            
            parametres = regime_fiscal.parametres.copy()
            if parametres_specifiques:
                parametres.update(parametres_specifiques)
            
            montant_impot = Decimal('0')
            details = {}
            
            if type_impot == 'TVA':
                taux_tva = parametres.get('taux_tva', 18)  # Taux standard OHADA 18%
                montant_impot = base_calcul * Decimal(taux_tva) / 100
                details = {
                    'taux': taux_tva,
                    'base': base_calcul,
                    'exoneration': parametres.get('exoneration_tva', False)
                }
            
            elif type_impot == 'IS':
                taux_is = parametres.get('taux_is', 25)  # Taux standard OHADA 25%
                if base_calcul > 0:
                    montant_impot = base_calcul * Decimal(taux_is) / 100
                details = {
                    'taux': taux_is,
                    'base': base_calcul,
                    'minimum': parametres.get('minimum_is', Decimal('0'))
                }
            
            elif type_impot == 'PATENTE':
                montant_impot = self._calculer_patente(base_calcul, parametres)
                details = {
                    'barème': parametres.get('bareme_patente', {}),
                    'base': base_calcul
                }
            
            elif type_impot == 'CENTIMES_ADDITIONNELS':
                taux_centimes = parametres.get('taux_centimes_additionnels', 10)  # 10% standard
                montant_impot = base_calcul * Decimal(taux_centimes) / 100
                details = {
                    'taux': taux_centimes,
                    'base': base_calcul
                }
            
            return {
                'montant': montant_impot.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP),
                'details': details,
                'date_calcul': timezone.now(),
                'regime': regime_fiscal.code
            }
            
        except Exception as e:
            logger.error(f"Erreur calcul impôt {type_impot}: {str(e)}")
            raise ValidationError(f"Impossible de calculer l'impôt: {str(e)}")
    
    def verifier_obligations_fiscales(self, exercice: Exercice = None) -> List[Dict]:
        """
        Vérifie les obligations fiscales en cours et à venir.
        """
        if not exercice:
            exercice = self.societe.exercice_en_cours
        
        obligations = []
        regime_fiscal = RegimeFiscal.objects.get(societe=self.societe, actif=True)
        
        # Obligations périodiques
        types_declarations = TypeDeclaration.objects.filter(regime_fiscal=regime_fiscal)
        
        for type_decl in types_declarations:
            if type_decl.frequence == 'MENSUELLE':
                obligations.extend(self._generer_obligations_mensuelles(type_decl, exercice))
            elif type_decl.frequence == 'TRIMESTRIELLE':
                obligations.extend(self._generer_obligations_trimestrielles(type_decl, exercice))
            elif type_decl.frequence == 'ANNUELLE':
                obligations.extend(self._generer_obligations_annuelles(type_decl, exercice))
        
        # Vérifier les retards
        for obligation in obligations:
            if obligation['date_limite'] < date.today():
                obligation['en_retard'] = True
                obligation['jours_retard'] = (date.today() - obligation['date_limite']).days
                
                # Calculer pénalités si applicable
                penalites = self._calculer_penalites_retard(
                    obligation['type_declaration'], 
                    obligation['jours_retard']
                )
                obligation['penalites'] = penalites
        
        return obligations
    
    def generer_rapport_conformite(self, periode_debut: date, periode_fin: date) -> Dict[str, Any]:
        """
        Génère un rapport de conformité fiscale pour une période donnée.
        """
        rapport = {
            'periode': {'debut': periode_debut, 'fin': periode_fin},
            'societe': self.societe.raison_sociale,
            'regime_fiscal': RegimeFiscal.objects.get(societe=self.societe, actif=True).code,
            'declarations': [],
            'obligations_respectees': 0,
            'obligations_en_retard': 0,
            'montant_penalites': Decimal('0'),
            'score_conformite': 0,
            'recommandations': []
        }
        
        # Analyser les déclarations de la période
        declarations = DeclarationFiscale.objects.filter(
            societe=self.societe,
            periode_debut__gte=periode_debut,
            periode_fin__lte=periode_fin
        )
        
        for declaration in declarations:
            info_decl = {
                'type': declaration.type_declaration.libelle,
                'periode': f"{declaration.periode_debut} - {declaration.periode_fin}",
                'statut': declaration.statut,
                'date_depot': declaration.date_depot,
                'en_retard': False,
                'penalites': Decimal('0')
            }
            
            # Vérifier si en retard
            if declaration.date_depot and declaration.type_declaration.date_limite:
                if declaration.date_depot > declaration.type_declaration.date_limite:
                    info_decl['en_retard'] = True
                    rapport['obligations_en_retard'] += 1
                    
                    # Calculer pénalités
                    jours_retard = (declaration.date_depot - declaration.type_declaration.date_limite).days
                    penalites = self._calculer_penalites_retard(declaration.type_declaration, jours_retard)
                    info_decl['penalites'] = penalites
                    rapport['montant_penalites'] += penalites
                else:
                    rapport['obligations_respectees'] += 1
            
            rapport['declarations'].append(info_decl)
        
        # Calculer score de conformité
        total_obligations = rapport['obligations_respectees'] + rapport['obligations_en_retard']
        if total_obligations > 0:
            rapport['score_conformite'] = round(
                (rapport['obligations_respectees'] / total_obligations) * 100, 2
            )
        
        # Générer recommandations
        rapport['recommandations'] = self._generer_recommandations_conformite(rapport)
        
        return rapport
    
    def detecter_anomalies_fiscales(self, periode_debut: date, periode_fin: date) -> List[Dict]:
        """
        Détecte les anomalies fiscales potentielles dans les écritures comptables.
        """
        anomalies = []
        
        # Vérifier cohérence TVA
        anomalies.extend(self._detecter_anomalies_tva(periode_debut, periode_fin))
        
        # Vérifier ratios suspects
        anomalies.extend(self._detecter_ratios_suspects(periode_debut, periode_fin))
        
        # Vérifier régularité des déclarations
        anomalies.extend(self._detecter_irregularites_declarations(periode_debut, periode_fin))
        
        # Créer alertes pour anomalies critiques
        for anomalie in anomalies:
            if anomalie.get('niveau_gravite') == 'CRITIQUE':
                AlerteFiscale.objects.get_or_create(
                    societe=self.societe,
                    type_alerte='ANOMALIE_CRITIQUE',
                    message=anomalie['description'],
                    defaults={
                        'niveau_priorite': 'HAUTE',
                        'date_creation': timezone.now(),
                        'resolu': False
                    }
                )
        
        return anomalies
    
    def _calculer_tva_collectee(self, periode_debut: date, periode_fin: date) -> Dict:
        """Calcule la TVA collectée pour une période."""
        # Comptes TVA collectée (44571x)
        comptes_tva_collectee = CompteComptable.objects.filter(
            societe=self.societe,
            numero__startswith='44571'
        )
        
        if not comptes_tva_collectee:
            return None
        
        # Calculer via les lignes d'écriture
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    SUM(CASE WHEN le.sens = 'CREDIT' THEN le.montant ELSE -le.montant END) as montant_tva,
                    COUNT(*) as nb_operations
                FROM apps_accounting_ligneecriture le
                JOIN apps_accounting_ecriture e ON le.ecriture_id = e.id
                WHERE le.compte_id IN %s
                AND e.date_ecriture BETWEEN %s AND %s
                AND e.societe_id = %s
                AND e.statut = 'VALIDEE'
            """, [
                tuple(comptes_tva_collectee.values_list('id', flat=True)),
                periode_debut,
                periode_fin,
                self.societe.id
            ])
            
            result = cursor.fetchone()
            
        if result and result[0]:
            # Estimer la base en appliquant le taux inverse
            taux_tva = RegimeFiscal.objects.get(societe=self.societe, actif=True).parametres.get('taux_tva', 18)
            base_estimee = result[0] * 100 / Decimal(taux_tva)
            
            return {
                'montant': result[0],
                'base': base_estimee,
                'taux_moyen': taux_tva,
                'nb_operations': result[1]
            }
        
        return None
    
    def _calculer_tva_deductible(self, periode_debut: date, periode_fin: date) -> Dict:
        """Calcule la TVA déductible pour une période."""
        # Comptes TVA déductible (44566x)
        comptes_tva_deductible = CompteComptable.objects.filter(
            societe=self.societe,
            numero__startswith='44566'
        )
        
        if not comptes_tva_deductible:
            return None
        
        # Calculer via les lignes d'écriture
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    SUM(CASE WHEN le.sens = 'DEBIT' THEN le.montant ELSE -le.montant END) as montant_tva,
                    COUNT(*) as nb_operations
                FROM apps_accounting_ligneecriture le
                JOIN apps_accounting_ecriture e ON le.ecriture_id = e.id
                WHERE le.compte_id IN %s
                AND e.date_ecriture BETWEEN %s AND %s
                AND e.societe_id = %s
                AND e.statut = 'VALIDEE'
            """, [
                tuple(comptes_tva_deductible.values_list('id', flat=True)),
                periode_debut,
                periode_fin,
                self.societe.id
            ])
            
            result = cursor.fetchone()
            
        if result and result[0]:
            # Estimer la base en appliquant le taux inverse
            taux_tva = RegimeFiscal.objects.get(societe=self.societe, actif=True).parametres.get('taux_tva', 18)
            base_estimee = result[0] * 100 / Decimal(taux_tva)
            
            return {
                'montant': result[0],
                'base': base_estimee,
                'taux_moyen': taux_tva,
                'nb_operations': result[1]
            }
        
        return None
    
    def _calculer_chiffre_affaires(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule le chiffre d'affaires pour une période."""
        # Comptes de ventes (70xxxx)
        comptes_ventes = CompteComptable.objects.filter(
            societe=self.societe,
            numero__startswith='70'
        )
        
        montant_ca = Decimal('0')
        
        for compte in comptes_ventes:
            lignes = LigneEcriture.objects.filter(
                compte=compte,
                ecriture__date_ecriture__range=[periode_debut, periode_fin],
                ecriture__statut='VALIDEE'
            )
            
            for ligne in lignes:
                if ligne.sens == 'CREDIT':
                    montant_ca += ligne.montant
                else:
                    montant_ca -= ligne.montant
        
        return montant_ca
    
    def _calculer_resultat_comptable(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule le résultat comptable pour une période."""
        # Simplification: CA - Charges
        ca = self._calculer_chiffre_affaires(periode_debut, periode_fin)
        
        # Comptes de charges (6xxxxx)
        comptes_charges = CompteComptable.objects.filter(
            societe=self.societe,
            numero__startswith='6'
        )
        
        montant_charges = Decimal('0')
        
        for compte in comptes_charges:
            lignes = LigneEcriture.objects.filter(
                compte=compte,
                ecriture__date_ecriture__range=[periode_debut, periode_fin],
                ecriture__statut='VALIDEE'
            )
            
            for ligne in lignes:
                if ligne.sens == 'DEBIT':
                    montant_charges += ligne.montant
                else:
                    montant_charges -= ligne.montant
        
        return ca - montant_charges
    
    def _calculer_reintegrations_fiscales(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les réintégrations fiscales (charges non déductibles)."""
        # Logique simplifiée - à adapter selon les règles OHADA
        # Ex: Amendes, dons non autorisés, charges excessives, etc.
        
        # Comptes d'amendes et pénalités (635x)
        comptes_amendes = CompteComptable.objects.filter(
            societe=self.societe,
            numero__startswith='635'
        )
        
        montant_reintegrations = Decimal('0')
        
        for compte in comptes_amendes:
            lignes = LigneEcriture.objects.filter(
                compte=compte,
                ecriture__date_ecriture__range=[periode_debut, periode_fin],
                ecriture__statut='VALIDEE'
            )
            
            for ligne in lignes:
                if ligne.sens == 'DEBIT':
                    montant_reintegrations += ligne.montant
        
        # Ajouter autres réintégrations selon paramètres
        regime = RegimeFiscal.objects.get(societe=self.societe, actif=True)
        reintegrations_auto = regime.parametres.get('reintegrations_automatiques', {})
        
        for compte_numero, pourcentage in reintegrations_auto.items():
            compte = CompteComptable.objects.filter(
                societe=self.societe,
                numero=compte_numero
            ).first()
            
            if compte:
                montant_compte = self._calculer_solde_compte(compte, periode_debut, periode_fin)
                montant_reintegrations += montant_compte * Decimal(pourcentage) / 100
        
        return montant_reintegrations
    
    def _calculer_deductions_fiscales(self, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule les déductions fiscales autorisées."""
        # Logique simplifiée - à adapter selon les règles OHADA
        montant_deductions = Decimal('0')
        
        regime = RegimeFiscal.objects.get(societe=self.societe, actif=True)
        deductions_auto = regime.parametres.get('deductions_automatiques', {})
        
        for compte_numero, montant_max in deductions_auto.items():
            compte = CompteComptable.objects.filter(
                societe=self.societe,
                numero=compte_numero
            ).first()
            
            if compte:
                montant_compte = self._calculer_solde_compte(compte, periode_debut, periode_fin)
                deduction = min(montant_compte, Decimal(montant_max))
                montant_deductions += deduction
        
        return montant_deductions
    
    def _calculer_solde_compte(self, compte: CompteComptable, periode_debut: date, periode_fin: date) -> Decimal:
        """Calcule le solde d'un compte pour une période."""
        lignes = LigneEcriture.objects.filter(
            compte=compte,
            ecriture__date_ecriture__range=[periode_debut, periode_fin],
            ecriture__statut='VALIDEE'
        )
        
        solde = Decimal('0')
        for ligne in lignes:
            if ligne.sens == 'DEBIT':
                solde += ligne.montant
            else:
                solde -= ligne.montant
        
        return solde
    
    def _calculer_totaux_declaration(self, declaration: DeclarationFiscale):
        """Calcule les totaux d'une déclaration."""
        lignes = declaration.lignes.all()
        
        declaration.montant_total = sum(ligne.montant for ligne in lignes if ligne.montant > 0)
        declaration.save()
    
    def _detecter_anomalies_tva(self, periode_debut: date, periode_fin: date) -> List[Dict]:
        """Détecte les anomalies liées à la TVA."""
        anomalies = []
        
        # Vérifier cohérence entre ventes et TVA collectée
        ca = self._calculer_chiffre_affaires(periode_debut, periode_fin)
        tva_collectee = self._calculer_tva_collectee(periode_debut, periode_fin)
        
        if ca > 0 and tva_collectee:
            taux_reel = (tva_collectee['montant'] / ca) * 100
            taux_attendu = RegimeFiscal.objects.get(societe=self.societe, actif=True).parametres.get('taux_tva', 18)
            
            ecart = abs(taux_reel - Decimal(taux_attendu))
            if ecart > 2:  # Tolérance de 2%
                anomalies.append({
                    'type': 'TVA_INCOHERENCE_TAUX',
                    'description': f'Taux TVA réel ({taux_reel:.2f}%) différent du taux attendu ({taux_attendu}%)',
                    'niveau_gravite': 'MOYENNE',
                    'periode': f"{periode_debut} - {periode_fin}",
                    'montant_impact': ca * (ecart / 100)
                })
        
        return anomalies
    
    def _generer_recommandations_conformite(self, rapport: Dict) -> List[str]:
        """Génère des recommandations basées sur le rapport de conformité."""
        recommandations = []
        
        if rapport['score_conformite'] < 80:
            recommandations.append("Améliorer le respect des échéances de déclaration")
        
        if rapport['montant_penalites'] > 0:
            recommandations.append("Mettre en place un système d'alerte pour éviter les retards")
        
        if rapport['obligations_en_retard'] > 0:
            recommandations.append("Régulariser les déclarations en retard dans les plus brefs délais")
        
        return recommandations