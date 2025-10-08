from decimal import Decimal
from datetime import date, datetime, timedelta
from django.db import transaction
from django.db.models import Sum, Q, F
from typing import List, Dict, Any, Optional
from dateutil.relativedelta import relativedelta

from ..models import (
    AxeAnalytique, SectionAnalytique, CleRepartition, DetailCleRepartition,
    EcritureAnalytique, CessionInterne, AbonnementAnalytique, EcheanceAbonnement
)
from apps.accounting.models import EcritureComptable, CompteComptable, ExerciceComptable


class AnalyticalService:
    """
    Service principal pour la gestion de la comptabilité analytique
    Implémentation complète SYSCOHADA avec multi-axes d'analyse
    """
    
    def __init__(self):
        self.taux_change_defaut = Decimal('1')
    
    def ventiler_ecriture_generale(self, ecriture_generale: EcritureComptable, 
                                  ventilation_config: Dict[str, Any]) -> List[EcritureAnalytique]:
        """
        Ventile une écriture comptable générale en écritures analytiques
        
        Args:
            ecriture_generale: Écriture comptable à ventiler
            ventilation_config: Configuration de ventilation {
                'method': 'DIRECT'|'REPARTITION'|'CLE_REPARTITION',
                'sections': [{'section_id': int, 'percentage': float}],
                'axes': {axe_id: section_id},
                'cle_repartition_id': int (optionnel)
            }
        """
        ecritures_analytiques = []
        
        with transaction.atomic():
            method = ventilation_config.get('method', 'DIRECT')
            
            if method == 'DIRECT':
                ecritures_analytiques = self._ventilation_directe(ecriture_generale, ventilation_config)
            elif method == 'REPARTITION':
                ecritures_analytiques = self._ventilation_repartition(ecriture_generale, ventilation_config)
            elif method == 'CLE_REPARTITION':
                ecritures_analytiques = self._ventilation_cle_repartition(ecriture_generale, ventilation_config)
                
        return ecritures_analytiques
    
    def _ventilation_directe(self, ecriture_generale: EcritureComptable, 
                           config: Dict[str, Any]) -> List[EcritureAnalytique]:
        """Ventilation directe 100% sur une section"""
        ecritures = []
        section_id = config.get('section_id')
        axes = config.get('axes', {})
        
        section = SectionAnalytique.objects.get(id=section_id)
        
        ecriture_analytique = EcritureAnalytique.objects.create(
            company=ecriture_generale.company,
            numero_piece=ecriture_generale.numero_piece,
            date_ecriture=ecriture_generale.date_ecriture,
            exercice=ecriture_generale.exercice,
            ecriture_generale=ecriture_generale,
            compte_general=ecriture_generale.compte,
            section_analytique=section,
            axes_analytiques=axes,
            montant_debit=ecriture_generale.montant_debit,
            montant_credit=ecriture_generale.montant_credit,
            devise=ecriture_generale.devise,
            taux_change=ecriture_generale.taux_change,
            libelle=ecriture_generale.libelle,
            type_ecriture='DIRECTE',
            statut='VALIDEE',
            utilisateur=ecriture_generale.utilisateur,
            pourcentage_repartition=Decimal('100')
        )
        
        ecritures.append(ecriture_analytique)
        return ecritures
    
    def _ventilation_repartition(self, ecriture_generale: EcritureComptable,
                               config: Dict[str, Any]) -> List[EcritureAnalytique]:
        """Ventilation selon pourcentages définis"""
        ecritures = []
        sections_config = config.get('sections', [])
        axes = config.get('axes', {})
        
        for section_config in sections_config:
            section = SectionAnalytique.objects.get(id=section_config['section_id'])
            pourcentage = Decimal(str(section_config['percentage']))
            
            montant_debit = (ecriture_generale.montant_debit * pourcentage / Decimal('100')).quantize(Decimal('0.01'))
            montant_credit = (ecriture_generale.montant_credit * pourcentage / Decimal('100')).quantize(Decimal('0.01'))
            
            ecriture_analytique = EcritureAnalytique.objects.create(
                company=ecriture_generale.company,
                numero_piece=ecriture_generale.numero_piece,
                date_ecriture=ecriture_generale.date_ecriture,
                exercice=ecriture_generale.exercice,
                ecriture_generale=ecriture_generale,
                compte_general=ecriture_generale.compte,
                section_analytique=section,
                axes_analytiques=axes,
                montant_debit=montant_debit,
                montant_credit=montant_credit,
                devise=ecriture_generale.devise,
                taux_change=ecriture_generale.taux_change,
                libelle=f"{ecriture_generale.libelle} ({pourcentage}%)",
                type_ecriture='REPARTITION',
                statut='VALIDEE',
                utilisateur=ecriture_generale.utilisateur,
                pourcentage_repartition=pourcentage
            )
            
            ecritures.append(ecriture_analytique)
        
        return ecritures
    
    def _ventilation_cle_repartition(self, ecriture_generale: EcritureComptable,
                                   config: Dict[str, Any]) -> List[EcritureAnalytique]:
        """Ventilation selon une clé de répartition prédéfinie"""
        ecritures = []
        cle_id = config.get('cle_repartition_id')
        axes = config.get('axes', {})
        
        cle = CleRepartition.objects.get(id=cle_id)
        details = DetailCleRepartition.objects.filter(cle_repartition=cle).order_by('ordre')
        
        for detail in details:
            if detail.pourcentage:
                pourcentage = detail.pourcentage
                montant_debit = (ecriture_generale.montant_debit * pourcentage / Decimal('100')).quantize(Decimal('0.01'))
                montant_credit = (ecriture_generale.montant_credit * pourcentage / Decimal('100')).quantize(Decimal('0.01'))
            else:
                # Montant fixe
                montant_debit = detail.montant_fixe if ecriture_generale.montant_debit > 0 else Decimal('0')
                montant_credit = detail.montant_fixe if ecriture_generale.montant_credit > 0 else Decimal('0')
                pourcentage = Decimal('0')  # À calculer après
            
            ecriture_analytique = EcritureAnalytique.objects.create(
                company=ecriture_generale.company,
                numero_piece=ecriture_generale.numero_piece,
                date_ecriture=ecriture_generale.date_ecriture,
                exercice=ecriture_generale.exercice,
                ecriture_generale=ecriture_generale,
                compte_general=ecriture_generale.compte,
                section_analytique=detail.section_destination,
                axes_analytiques=axes,
                montant_debit=montant_debit,
                montant_credit=montant_credit,
                devise=ecriture_generale.devise,
                taux_change=ecriture_generale.taux_change,
                libelle=f"{ecriture_generale.libelle} - Clé {cle.code}",
                type_ecriture='REPARTITION',
                statut='VALIDEE',
                utilisateur=ecriture_generale.utilisateur,
                cle_repartition=cle,
                pourcentage_repartition=pourcentage
            )
            
            ecritures.append(ecriture_analytique)
        
        return ecritures
    
    def creer_cession_interne(self, section_cedante_id: int, section_cessionnaire_id: int,
                            quantite: Decimal, prix_unitaire: Decimal, 
                            date_cession: date, libelle: str,
                            methode_valorisation: str = 'COUT_COMPLET',
                            unite: str = 'unité') -> CessionInterne:
        """
        Crée une cession interne entre deux sections analytiques
        """
        section_cedante = SectionAnalytique.objects.get(id=section_cedante_id)
        section_cessionnaire = SectionAnalytique.objects.get(id=section_cessionnaire_id)
        
        montant_total = (quantite * prix_unitaire).quantize(Decimal('0.01'))
        
        # Générer le code automatique
        code = f"CI{date_cession.strftime('%Y%m')}{section_cedante.code}{section_cessionnaire.code}"
        
        with transaction.atomic():
            cession = CessionInterne.objects.create(
                company=section_cedante.company,
                code=code,
                section_cedante=section_cedante,
                section_cessionnaire=section_cessionnaire,
                methode_valorisation=methode_valorisation,
                prix_unitaire=prix_unitaire,
                unite=unite,
                date_debut=date_cession,
                quantite=quantite,
                montant_total=montant_total,
                numero_piece=code,
                date_cession=date_cession,
                libelle=libelle
            )
            
            # Créer les écritures analytiques correspondantes
            self._generer_ecritures_cession_interne(cession)
            
        return cession
    
    def _generer_ecritures_cession_interne(self, cession: CessionInterne):
        """Génère les écritures analytiques pour une cession interne"""
        exercice = ExerciceComptable.objects.filter(
            company=cession.company,
            date_debut__lte=cession.date_cession,
            date_fin__gte=cession.date_cession
        ).first()
        
        if not exercice:
            raise ValueError(f"Aucun exercice trouvé pour la date {cession.date_cession}")
        
        # Compte de produits pour la section cédante (crédit)
        compte_produit = cession.section_cedante.compte_produits_directs
        if compte_produit:
            EcritureAnalytique.objects.create(
                company=cession.company,
                numero_piece=cession.numero_piece,
                date_ecriture=cession.date_cession,
                exercice=exercice,
                compte_general=compte_produit,
                section_analytique=cession.section_cedante,
                montant_credit=cession.montant_total,
                montant_debit=Decimal('0'),
                devise_id=1,  # EUR par défaut
                libelle=f"Cession interne vers {cession.section_cessionnaire.code} - {cession.libelle}",
                type_ecriture='CESSION_INTERNE',
                statut='VALIDEE',
                utilisateur_id=1,  # À ajuster selon le contexte
                pourcentage_repartition=Decimal('100')
            )
        
        # Compte de charges pour la section cessionnaire (débit)
        compte_charge = cession.section_cessionnaire.compte_charges_directes
        if compte_charge:
            EcritureAnalytique.objects.create(
                company=cession.company,
                numero_piece=cession.numero_piece,
                date_ecriture=cession.date_cession,
                exercice=exercice,
                compte_general=compte_charge,
                section_analytique=cession.section_cessionnaire,
                montant_debit=cession.montant_total,
                montant_credit=Decimal('0'),
                devise_id=1,  # EUR par défaut
                libelle=f"Cession interne de {cession.section_cedante.code} - {cession.libelle}",
                type_ecriture='CESSION_INTERNE',
                statut='VALIDEE',
                utilisateur_id=1,  # À ajuster selon le contexte
                pourcentage_repartition=Decimal('100')
            )
    
    def calculer_cout_section(self, section_id: int, periode_debut: date, periode_fin: date) -> Dict[str, Any]:
        """
        Calcule le coût complet d'une section analytique sur une période
        """
        section = SectionAnalytique.objects.get(id=section_id)
        
        # Charges directes
        charges_directes = EcritureAnalytique.objects.filter(
            section_analytique=section,
            date_ecriture__gte=periode_debut,
            date_ecriture__lte=periode_fin,
            compte_general__numero__startswith='6'  # Classe 6 = charges
        ).aggregate(
            total_debit=Sum('montant_debit'),
            total_credit=Sum('montant_credit')
        )
        
        cout_charges_directes = (charges_directes['total_debit'] or Decimal('0')) - (charges_directes['total_credit'] or Decimal('0'))
        
        # Charges indirectes (répartitions reçues)
        charges_indirectes = EcritureAnalytique.objects.filter(
            section_analytique=section,
            date_ecriture__gte=periode_debut,
            date_ecriture__lte=periode_fin,
            type_ecriture='REPARTITION',
            montant_debit__gt=0
        ).aggregate(total=Sum('montant_debit'))
        
        cout_charges_indirectes = charges_indirectes['total'] or Decimal('0')
        
        # Cessions reçues
        cessions_recues = EcritureAnalytique.objects.filter(
            section_analytique=section,
            date_ecriture__gte=periode_debut,
            date_ecriture__lte=periode_fin,
            type_ecriture='CESSION_INTERNE',
            montant_debit__gt=0
        ).aggregate(total=Sum('montant_debit'))
        
        cout_cessions_recues = cessions_recues['total'] or Decimal('0')
        
        # Produits directs
        produits_directs = EcritureAnalytique.objects.filter(
            section_analytique=section,
            date_ecriture__gte=periode_debut,
            date_ecriture__lte=periode_fin,
            compte_general__numero__startswith='7'  # Classe 7 = produits
        ).aggregate(
            total_debit=Sum('montant_debit'),
            total_credit=Sum('montant_credit')
        )
        
        montant_produits_directs = (produits_directs['total_credit'] or Decimal('0')) - (produits_directs['total_debit'] or Decimal('0'))
        
        # Cessions effectuées
        cessions_effectuees = EcritureAnalytique.objects.filter(
            section_analytique=section,
            date_ecriture__gte=periode_debut,
            date_ecriture__lte=periode_fin,
            type_ecriture='CESSION_INTERNE',
            montant_credit__gt=0
        ).aggregate(total=Sum('montant_credit'))
        
        montant_cessions_effectuees = cessions_effectuees['total'] or Decimal('0')
        
        # Calculs finaux
        cout_total = cout_charges_directes + cout_charges_indirectes + cout_cessions_recues
        produit_total = montant_produits_directs + montant_cessions_effectuees
        resultat_analytique = produit_total - cout_total
        
        return {
            'section': section,
            'periode': {'debut': periode_debut, 'fin': periode_fin},
            'charges_directes': float(cout_charges_directes),
            'charges_indirectes': float(cout_charges_indirectes),
            'cessions_recues': float(cout_cessions_recues),
            'cout_total': float(cout_total),
            'produits_directs': float(montant_produits_directs),
            'cessions_effectuees': float(montant_cessions_effectuees),
            'produit_total': float(produit_total),
            'resultat_analytique': float(resultat_analytique),
            'rentabilite_pct': float((resultat_analytique / produit_total * 100).quantize(Decimal('0.01'))) if produit_total > 0 else 0
        }
    
    def generer_abonnement(self, abonnement_id: int) -> List[EcheanceAbonnement]:
        """
        Génère les échéances d'un abonnement analytique
        """
        abonnement = AbonnementAnalytique.objects.get(id=abonnement_id)
        echeances = []
        
        # Calculer les dates d'échéance
        date_courante = abonnement.date_debut
        numero_echeance = 1
        
        while date_courante <= abonnement.date_fin and numero_echeance <= abonnement.nombre_echeances:
            echeance = EcheanceAbonnement.objects.create(
                abonnement=abonnement,
                numero_echeance=numero_echeance,
                date_echeance=date_courante,
                montant=abonnement.montant_par_echeance
            )
            echeances.append(echeance)
            
            # Calculer la prochaine date selon la fréquence
            if abonnement.frequence == 'MENSUEL':
                date_courante = date_courante + relativedelta(months=1)
            elif abonnement.frequence == 'TRIMESTRIEL':
                date_courante = date_courante + relativedelta(months=3)
            elif abonnement.frequence == 'SEMESTRIEL':
                date_courante = date_courante + relativedelta(months=6)
            elif abonnement.frequence == 'ANNUEL':
                date_courante = date_courante + relativedelta(years=1)
            
            numero_echeance += 1
        
        return echeances
    
    def generer_ecritures_abonnement(self, echeance_id: int) -> EcritureAnalytique:
        """
        Génère l'écriture analytique pour une échéance d'abonnement
        """
        echeance = EcheanceAbonnement.objects.get(id=echeance_id)
        abonnement = echeance.abonnement
        
        exercice = ExerciceComptable.objects.filter(
            company=abonnement.company,
            date_debut__lte=echeance.date_echeance,
            date_fin__gte=echeance.date_echeance
        ).first()
        
        if not exercice:
            raise ValueError(f"Aucun exercice trouvé pour la date {echeance.date_echeance}")
        
        # Déterminer débit/crédit selon le type
        if abonnement.type_abonnement in ['CHARGES', 'MIXTE']:
            montant_debit = echeance.montant
            montant_credit = Decimal('0')
        else:  # PRODUITS
            montant_debit = Decimal('0')
            montant_credit = echeance.montant
        
        numero_piece = f"ABON-{abonnement.code}-{echeance.numero_echeance:03d}"
        
        with transaction.atomic():
            ecriture_analytique = EcritureAnalytique.objects.create(
                company=abonnement.company,
                numero_piece=numero_piece,
                date_ecriture=echeance.date_echeance,
                exercice=exercice,
                compte_general=abonnement.compte_general,
                section_analytique=abonnement.section_analytique,
                montant_debit=montant_debit,
                montant_credit=montant_credit,
                devise_id=1,  # EUR par défaut
                libelle=f"Abonnement {abonnement.nom} - Échéance {echeance.numero_echeance}",
                type_ecriture='ABONNEMENT',
                statut='VALIDEE',
                utilisateur_id=1,  # À ajuster selon le contexte
                cle_repartition=abonnement.cle_repartition,
                pourcentage_repartition=Decimal('100')
            )
            
            # Mettre à jour l'échéance
            echeance.genere = True
            echeance.date_generation = datetime.now()
            echeance.ecriture_analytique = ecriture_analytique
            echeance.save()
            
            # Incrémenter le compteur d'échéances générées
            abonnement.echeances_generees += 1
            abonnement.save()
        
        return ecriture_analytique
    
    def analyser_performance_section(self, section_id: int, periode_debut: date, 
                                   periode_fin: date) -> Dict[str, Any]:
        """
        Analyse détaillée de la performance d'une section analytique
        """
        cout_data = self.calculer_cout_section(section_id, periode_debut, periode_fin)
        section = SectionAnalytique.objects.get(id=section_id)
        
        # Calculs d'indicateurs supplémentaires
        indicateurs = {
            'rotation_stocks': 0,  # À implémenter selon les besoins
            'marge_brute_pct': 0,
            'cout_unitaire': 0,
            'productivite': 0
        }
        
        # Évolution par rapport à la période précédente
        duree = (periode_fin - periode_debut).days
        periode_precedente_debut = periode_debut - timedelta(days=duree)
        periode_precedente_fin = periode_debut - timedelta(days=1)
        
        cout_precedent = self.calculer_cout_section(section_id, periode_precedente_debut, periode_precedente_fin)
        
        evolution = {
            'charges_directes_pct': self._calculer_evolution(cout_data['charges_directes'], cout_precedent['charges_directes']),
            'produits_directs_pct': self._calculer_evolution(cout_data['produits_directs'], cout_precedent['produits_directs']),
            'resultat_analytique_pct': self._calculer_evolution(cout_data['resultat_analytique'], cout_precedent['resultat_analytique'])
        }
        
        return {
            **cout_data,
            'indicateurs': indicateurs,
            'evolution': evolution,
            'recommandations': self._generer_recommandations(cout_data, evolution)
        }
    
    def _calculer_evolution(self, valeur_actuelle: float, valeur_precedente: float) -> float:
        """Calcule l'évolution en pourcentage"""
        if valeur_precedente == 0:
            return 0 if valeur_actuelle == 0 else 100
        return ((valeur_actuelle - valeur_precedente) / valeur_precedente * 100)
    
    def _generer_recommandations(self, cout_data: Dict, evolution: Dict) -> List[str]:
        """Génère des recommandations basées sur l'analyse"""
        recommandations = []
        
        if cout_data['resultat_analytique'] < 0:
            recommandations.append("⚠️ Résultat analytique négatif - Analyser les causes de perte")
        
        if evolution['charges_directes_pct'] > 10:
            recommandations.append("📈 Augmentation significative des charges directes (+{:.1f}%)".format(evolution['charges_directes_pct']))
        
        if evolution['produits_directs_pct'] < -5:
            recommandations.append("📉 Baisse des produits directs ({:.1f}%) - Revoir la stratégie commerciale".format(evolution['produits_directs_pct']))
        
        if cout_data['rentabilite_pct'] < 10:
            recommandations.append("🎯 Rentabilité faible ({:.1f}%) - Optimiser les coûts ou revaloriser les prix".format(cout_data['rentabilite_pct']))
        
        return recommandations