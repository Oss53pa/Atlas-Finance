from decimal import Decimal
from datetime import date, datetime, timedelta
from django.db import transaction
from django.db.models import Sum, Q, F
from typing import List, Dict, Any, Optional
from dateutil.relativedelta import relativedelta
import calendar

from ..models import (
    VersionBudget, LigneBudget, SuiviBudgetaire, AlerteBudgetaire, 
    ReglementBudgetaire, ReportingBudgetaire
)
from apps.accounting.models import EcritureComptable, CompteComptable, ExerciceComptable
from apps.analytical_accounting.models import EcritureAnalytique, SectionAnalytique


class BudgetService:
    """
    Service principal pour la gestion budgétaire et le contrôle de gestion
    Implémentation complète EXF-BG-001/002
    """
    
    def __init__(self):
        self.seuils_alerte_defaut = {
            'orange': Decimal('80'),  # 80% du budget
            'rouge': Decimal('100'),  # 100% du budget
            'sous_consommation': Decimal('50')  # 50% du budget
        }
    
    def creer_budget(self, company_id: int, nom: str, type_budget: str, 
                    exercice_id: int, date_debut: date, date_fin: date,
                    granularite: str = 'MENSUEL', responsable_id: int = None) -> VersionBudget:
        """
        Crée une nouvelle version de budget
        """
        # Générer le code automatique
        code = f"BUD-{date_debut.year}-{type_budget[:3]}-{datetime.now().strftime('%m%d')}"
        
        version_budget = VersionBudget.objects.create(
            company_id=company_id,
            code=code,
            nom=nom,
            version='1.0',
            type_budget=type_budget,
            exercice_id=exercice_id,
            date_debut=date_debut,
            date_fin=date_fin,
            devise_id=1,  # EUR par défaut
            granularite=granularite,
            responsable_budget_id=responsable_id,
            utilisateur_creation_id=responsable_id
        )
        
        return version_budget
    
    def dupliquer_budget(self, budget_id: int, nouvelle_version: str, 
                        motif_modification: str = '') -> VersionBudget:
        """
        Duplique un budget existant vers une nouvelle version
        """
        budget_original = VersionBudget.objects.get(id=budget_id)
        
        with transaction.atomic():
            nouveau_budget = VersionBudget.objects.create(
                company=budget_original.company,
                code=budget_original.code,
                nom=budget_original.nom,
                version=nouvelle_version,
                type_budget=budget_original.type_budget,
                exercice=budget_original.exercice,
                date_debut=budget_original.date_debut,
                date_fin=budget_original.date_fin,
                devise=budget_original.devise,
                granularite=budget_original.granularite,
                responsable_budget=budget_original.responsable_budget,
                utilisateur_creation=budget_original.responsable_budget,
                version_precedente=budget_original,
                motif_modification=motif_modification
            )
            
            # Copier les sections et axes inclus
            nouveau_budget.sections_incluses.set(budget_original.sections_incluses.all())
            nouveau_budget.axes_inclus.set(budget_original.axes_inclus.all())
            nouveau_budget.comptes_inclus.set(budget_original.comptes_inclus.all())
            
            # Copier toutes les lignes budgétaires
            for ligne_originale in budget_original.lignes.all():
                LigneBudget.objects.create(
                    version_budget=nouveau_budget,
                    numero_ligne=ligne_originale.numero_ligne,
                    libelle=ligne_originale.libelle,
                    type_ligne=ligne_originale.type_ligne,
                    compte_comptable=ligne_originale.compte_comptable,
                    section_analytique=ligne_originale.section_analytique,
                    axes_analytiques=ligne_originale.axes_analytiques,
                    montant_janvier=ligne_originale.montant_janvier,
                    montant_fevrier=ligne_originale.montant_fevrier,
                    montant_mars=ligne_originale.montant_mars,
                    montant_avril=ligne_originale.montant_avril,
                    montant_mai=ligne_originale.montant_mai,
                    montant_juin=ligne_originale.montant_juin,
                    montant_juillet=ligne_originale.montant_juillet,
                    montant_aout=ligne_originale.montant_aout,
                    montant_septembre=ligne_originale.montant_septembre,
                    montant_octobre=ligne_originale.montant_octobre,
                    montant_novembre=ligne_originale.montant_novembre,
                    montant_decembre=ligne_originale.montant_decembre,
                    base_calcul=ligne_originale.base_calcul,
                    coefficient_application=ligne_originale.coefficient_application,
                    commentaire=ligne_originale.commentaire,
                    hypotheses=ligne_originale.hypotheses,
                    ligne_calculee=ligne_originale.ligne_calculee,
                    ligne_consolidee=ligne_originale.ligne_consolidee
                )
        
        return nouveau_budget
    
    def ajouter_ligne_budget(self, version_budget_id: int, compte_id: int,
                           libelle: str, type_ligne: str = 'CHARGES',
                           section_analytique_id: int = None,
                           montants_mensuels: Dict[int, Decimal] = None) -> LigneBudget:
        """
        Ajoute une ligne budgétaire
        """
        version_budget = VersionBudget.objects.get(id=version_budget_id)
        compte = CompteComptable.objects.get(id=compte_id)
        
        # Générer le numéro de ligne automatique
        dernier_numero = LigneBudget.objects.filter(version_budget=version_budget).count()
        numero_ligne = f"{compte.numero}-{dernier_numero + 1:03d}"
        
        ligne = LigneBudget.objects.create(
            version_budget=version_budget,
            numero_ligne=numero_ligne,
            libelle=libelle,
            type_ligne=type_ligne,
            compte_comptable=compte,
            section_analytique_id=section_analytique_id
        )
        
        # Définir les montants mensuels si fournis
        if montants_mensuels:
            for mois, montant in montants_mensuels.items():
                if 1 <= mois <= 12:
                    ligne.set_montant_mois(mois, montant)
            ligne.save()  # Recalcule automatiquement le total annuel
        
        return ligne
    
    def repartir_budget_lineaire(self, ligne_id: int, montant_annuel: Decimal):
        """
        Répartit un montant annuel de façon linéaire sur 12 mois
        """
        ligne = LigneBudget.objects.get(id=ligne_id)
        montant_mensuel = (montant_annuel / Decimal('12')).quantize(Decimal('0.01'))
        
        for mois in range(1, 13):
            ligne.set_montant_mois(mois, montant_mensuel)
        
        # Ajuster le dernier mois pour compenser les arrondis
        total_reparti = montant_mensuel * 11
        ligne.set_montant_mois(12, montant_annuel - total_reparti)
        ligne.save()
    
    def repartir_budget_saisonnalite(self, ligne_id: int, montant_annuel: Decimal,
                                   coefficients_saisonnalite: Dict[int, Decimal]):
        """
        Répartit un montant selon des coefficients de saisonnalité
        coefficients_saisonnalite: {mois: coefficient} où la somme = 1.0
        """
        ligne = LigneBudget.objects.get(id=ligne_id)
        
        for mois, coefficient in coefficients_saisonnalite.items():
            if 1 <= mois <= 12:
                montant_mois = (montant_annuel * coefficient).quantize(Decimal('0.01'))
                ligne.set_montant_mois(mois, montant_mois)
        
        ligne.save()
    
    def calculer_suivi_budgetaire(self, version_budget_id: int, periode: date,
                                type_periode: str = 'MENSUEL') -> List[SuiviBudgetaire]:
        """
        Calcule le suivi budgétaire pour une période donnée
        Compare budget vs réalisé et calcule les écarts
        """
        version_budget = VersionBudget.objects.get(id=version_budget_id)
        suivis = []
        
        # Déterminer la plage de dates selon le type de période
        if type_periode == 'MENSUEL':
            debut_periode = periode.replace(day=1)
            fin_periode = (debut_periode + relativedelta(months=1)) - timedelta(days=1)
        elif type_periode == 'TRIMESTRIEL':
            debut_trimestre = ((periode.month - 1) // 3) * 3 + 1
            debut_periode = periode.replace(month=debut_trimestre, day=1)
            fin_periode = (debut_periode + relativedelta(months=3)) - timedelta(days=1)
        elif type_periode == 'SEMESTRIEL':
            debut_semestre = 1 if periode.month <= 6 else 7
            debut_periode = periode.replace(month=debut_semestre, day=1)
            fin_periode = (debut_periode + relativedelta(months=6)) - timedelta(days=1)
        else:  # ANNUEL
            debut_periode = periode.replace(month=1, day=1)
            fin_periode = periode.replace(month=12, day=31)
        
        # Calculer pour chaque ligne budgétaire
        with transaction.atomic():
            for ligne in version_budget.lignes.all():
                suivi = self._calculer_suivi_ligne(
                    ligne, periode, type_periode, debut_periode, fin_periode
                )
                suivis.append(suivi)
        
        return suivis
    
    def _calculer_suivi_ligne(self, ligne: LigneBudget, periode: date, type_periode: str,
                            debut_periode: date, fin_periode: date) -> SuiviBudgetaire:
        """
        Calcule le suivi budgétaire pour une ligne donnée
        """
        # Calculer le budget pour la période
        budget_periode = self._calculer_budget_periode(ligne, periode, type_periode)
        budget_cumule = self._calculer_budget_cumule(ligne, periode)
        
        # Calculer le réalisé à partir des écritures comptables/analytiques
        realise_periode = self._calculer_realise_periode(
            ligne, debut_periode, fin_periode
        )
        realise_cumule = self._calculer_realise_cumule(ligne, periode)
        
        # Calculer les écarts
        ecart_periode = realise_periode - budget_periode
        ecart_cumule = realise_cumule - budget_cumule
        
        ecart_periode_pct = (
            (ecart_periode / budget_periode * Decimal('100')).quantize(Decimal('0.001'))
            if budget_periode != 0 else Decimal('0')
        )
        ecart_cumule_pct = (
            (ecart_cumule / budget_cumule * Decimal('100')).quantize(Decimal('0.001'))
            if budget_cumule != 0 else Decimal('0')
        )
        
        # Calculer la prévision de fin d'année
        prevision_fin_annee = self._calculer_prevision_fin_annee(ligne, periode, realise_cumule)
        budget_annuel = ligne.montant_total_annuel
        ecart_previsionnel = prevision_fin_annee - budget_annuel
        
        # Déterminer le niveau d'alerte
        niveau_alerte = self._determiner_niveau_alerte(ecart_cumule_pct, ligne.version_budget.company)
        seuil_depasse = niveau_alerte in ['ORANGE', 'ROUGE']
        
        # Créer ou mettre à jour le suivi
        suivi, created = SuiviBudgetaire.objects.update_or_create(
            version_budget=ligne.version_budget,
            periode=periode,
            section_analytique=ligne.section_analytique,
            compte_comptable=ligne.compte_comptable,
            defaults={
                'type_periode': type_periode,
                'budget_periode': budget_periode,
                'budget_cumule': budget_cumule,
                'realise_periode': realise_periode,
                'realise_cumule': realise_cumule,
                'ecart_periode': ecart_periode,
                'ecart_cumule': ecart_cumule,
                'ecart_periode_pct': ecart_periode_pct,
                'ecart_cumule_pct': ecart_cumule_pct,
                'prevision_fin_annee': prevision_fin_annee,
                'ecart_previsionnel': ecart_previsionnel,
                'seuil_alerte_depasse': seuil_depasse,
                'niveau_alerte': niveau_alerte
            }
        )
        
        # Générer une alerte si nécessaire
        if seuil_depasse and created:
            self._generer_alerte_budgetaire(suivi)
        
        return suivi
    
    def _calculer_budget_periode(self, ligne: LigneBudget, periode: date, type_periode: str) -> Decimal:
        """Calcule le montant budgété pour une période donnée"""
        if type_periode == 'MENSUEL':
            return ligne.get_montant_mois(periode.month)
        elif type_periode == 'TRIMESTRIEL':
            trimestre = ((periode.month - 1) // 3) + 1
            debut_mois = (trimestre - 1) * 3 + 1
            fin_mois = trimestre * 3
            total = Decimal('0')
            for mois in range(debut_mois, fin_mois + 1):
                total += ligne.get_montant_mois(mois)
            return total
        elif type_periode == 'SEMESTRIEL':
            semestre = 1 if periode.month <= 6 else 2
            debut_mois = 1 if semestre == 1 else 7
            fin_mois = 6 if semestre == 1 else 12
            total = Decimal('0')
            for mois in range(debut_mois, fin_mois + 1):
                total += ligne.get_montant_mois(mois)
            return total
        else:  # ANNUEL
            return ligne.montant_total_annuel
    
    def _calculer_budget_cumule(self, ligne: LigneBudget, periode: date) -> Decimal:
        """Calcule le budget cumulé depuis le début de l'année"""
        total = Decimal('0')
        for mois in range(1, periode.month + 1):
            total += ligne.get_montant_mois(mois)
        return total
    
    def _calculer_realise_periode(self, ligne: LigneBudget, debut_periode: date, fin_periode: date) -> Decimal:
        """Calcule le montant réalisé pour une période"""
        # Si on a une section analytique, utiliser les écritures analytiques
        if ligne.section_analytique:
            ecritures = EcritureAnalytique.objects.filter(
                section_analytique=ligne.section_analytique,
                compte_general=ligne.compte_comptable,
                date_ecriture__gte=debut_periode,
                date_ecriture__lte=fin_periode,
                statut='VALIDEE'
            )
        else:
            # Sinon, utiliser les écritures comptables générales
            ecritures = EcritureComptable.objects.filter(
                compte=ligne.compte_comptable,
                date_ecriture__gte=debut_periode,
                date_ecriture__lte=fin_periode,
                statut='VALIDE'
            )
        
        total_debit = ecritures.aggregate(Sum('montant_debit'))['montant_debit__sum'] or Decimal('0')
        total_credit = ecritures.aggregate(Sum('montant_credit'))['montant_credit__sum'] or Decimal('0')
        
        # Pour les charges (débit normal), on prend débit - crédit
        # Pour les produits (crédit normal), on prend crédit - débit
        if ligne.type_ligne in ['CHARGES', 'INVESTISSEMENT']:
            return total_debit - total_credit
        else:
            return total_credit - total_debit
    
    def _calculer_realise_cumule(self, ligne: LigneBudget, periode: date) -> Decimal:
        """Calcule le montant réalisé cumulé depuis le début de l'année"""
        debut_annee = periode.replace(month=1, day=1)
        fin_cumul = periode.replace(day=calendar.monthrange(periode.year, periode.month)[1])
        
        return self._calculer_realise_periode(ligne, debut_annee, fin_cumul)
    
    def _calculer_prevision_fin_annee(self, ligne: LigneBudget, periode: date, realise_cumule: Decimal) -> Decimal:
        """Calcule une prévision de fin d'année basée sur la tendance"""
        mois_ecoules = periode.month
        if mois_ecoules == 0:
            return ligne.montant_total_annuel
        
        # Méthode simple: projection linéaire
        rythme_mensuel_moyen = realise_cumule / Decimal(str(mois_ecoules))
        mois_restants = 12 - mois_ecoules
        prevision = realise_cumule + (rythme_mensuel_moyen * Decimal(str(mois_restants)))
        
        return prevision.quantize(Decimal('0.01'))
    
    def _determiner_niveau_alerte(self, ecart_pct: Decimal, company) -> str:
        """Détermine le niveau d'alerte selon les règles de la société"""
        # Chercher les règlements budgétaires actifs
        reglements = ReglementBudgetaire.objects.filter(company=company, actif=True)
        
        if reglements.exists():
            reglement = reglements.first()
            if abs(ecart_pct) >= reglement.seuil_alerte_rouge:
                return 'ROUGE'
            elif abs(ecart_pct) >= reglement.seuil_alerte_orange:
                return 'ORANGE'
            else:
                return 'VERT'
        else:
            # Utiliser les seuils par défaut
            if abs(ecart_pct) >= self.seuils_alerte_defaut['rouge']:
                return 'ROUGE'
            elif abs(ecart_pct) >= self.seuils_alerte_defaut['orange']:
                return 'ORANGE'
            else:
                return 'VERT'
    
    def _generer_alerte_budgetaire(self, suivi: SuiviBudgetaire):
        """Génère une alerte budgétaire si les seuils sont dépassés"""
        if suivi.niveau_alerte in ['ORANGE', 'ROUGE']:
            type_alerte = 'DEPASSEMENT' if suivi.ecart_cumule > 0 else 'SOUS_CONSOMMATION'
            niveau_criticite = 'CRITIQUE' if suivi.niveau_alerte == 'ROUGE' else 'ALERTE'
            
            message = f"""
            Écart budgétaire significatif détecté:
            - Section: {suivi.section_analytique.nom if suivi.section_analytique else 'N/A'}
            - Compte: {suivi.compte_comptable.nom}
            - Écart cumulé: {suivi.ecart_cumule} ({suivi.ecart_cumule_pct}%)
            - Budget cumulé: {suivi.budget_cumule}
            - Réalisé cumulé: {suivi.realise_cumule}
            """
            
            AlerteBudgetaire.objects.create(
                company=suivi.version_budget.company,
                version_budget=suivi.version_budget,
                type_alerte=type_alerte,
                niveau_criticite=niveau_criticite,
                section_analytique=suivi.section_analytique,
                compte_comptable=suivi.compte_comptable,
                message=message.strip(),
                valeur_constatee=suivi.realise_cumule,
                ecart_pct=suivi.ecart_cumule_pct,
                periode_concernee=suivi.periode
            )
    
    def generer_synthese_budgetaire(self, version_budget_id: int, periode: date) -> Dict[str, Any]:
        """
        Génère une synthèse budgétaire complète pour une période
        """
        version_budget = VersionBudget.objects.get(id=version_budget_id)
        
        # Récupérer tous les suivis de la période
        suivis = SuiviBudgetaire.objects.filter(
            version_budget=version_budget,
            periode=periode
        )
        
        # Agrégations par type de ligne
        synthese = {
            'charges': {'budget': Decimal('0'), 'realise': Decimal('0'), 'ecart': Decimal('0')},
            'produits': {'budget': Decimal('0'), 'realise': Decimal('0'), 'ecart': Decimal('0')},
            'investissements': {'budget': Decimal('0'), 'realise': Decimal('0'), 'ecart': Decimal('0')},
            'tresorerie': {'budget': Decimal('0'), 'realise': Decimal('0'), 'ecart': Decimal('0')}
        }
        
        for suivi in suivis:
            ligne = LigneBudget.objects.filter(
                version_budget=version_budget,
                compte_comptable=suivi.compte_comptable,
                section_analytique=suivi.section_analytique
            ).first()
            
            if ligne:
                type_map = {
                    'CHARGES': 'charges',
                    'PRODUITS': 'produits',
                    'INVESTISSEMENT': 'investissements',
                    'TRESORERIE': 'tresorerie'
                }
                
                type_key = type_map.get(ligne.type_ligne, 'charges')
                synthese[type_key]['budget'] += suivi.budget_cumule
                synthese[type_key]['realise'] += suivi.realise_cumule
                synthese[type_key]['ecart'] += suivi.ecart_cumule
        
        # Calculs globaux
        resultat_budget = synthese['produits']['budget'] - synthese['charges']['budget']
        resultat_realise = synthese['produits']['realise'] - synthese['charges']['realise']
        ecart_resultat = resultat_realise - resultat_budget
        
        # Alertes et indicateurs
        nb_alertes_rouges = suivis.filter(niveau_alerte='ROUGE').count()
        nb_alertes_orange = suivis.filter(niveau_alerte='ORANGE').count()
        
        return {
            'version_budget': version_budget,
            'periode': periode,
            'synthese': synthese,
            'resultat_budget': float(resultat_budget),
            'resultat_realise': float(resultat_realise),
            'ecart_resultat': float(ecart_resultat),
            'nb_alertes_rouges': nb_alertes_rouges,
            'nb_alertes_orange': nb_alertes_orange,
            'taux_execution_global': float(
                (sum([s['realise'] for s in synthese.values()]) / 
                 sum([s['budget'] for s in synthese.values()]) * 100)
                if sum([s['budget'] for s in synthese.values()]) > 0 else 0
            ),
            'suivis_detail': list(suivis.values())
        }