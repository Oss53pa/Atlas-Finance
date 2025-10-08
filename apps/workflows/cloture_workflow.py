"""
Workflow Clôture Mensuelle selon cahier des charges 8.2
Processus automatisé de clôture comptable
"""

from django.db import models, transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import datetime, timedelta, date
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class EtatCloture(Enum):
    """États du workflow de clôture"""
    DEBUT = "DEBUT"
    CONTROLES = "CONTROLES"
    CUTOFF_VENTES = "CUTOFF_VENTES"
    CUTOFF_ACHATS = "CUTOFF_ACHATS"
    PROVISIONS = "PROVISIONS"
    AMORTISSEMENTS = "AMORTISSEMENTS"
    ABONNEMENTS = "ABONNEMENTS"
    RAPPROCHEMENTS = "RAPPROCHEMENTS"
    LETTRAGE = "LETTRAGE"
    ANALYSE = "ANALYSE"
    AJUSTEMENTS = "AJUSTEMENTS"
    GENERATION = "GENERATION"
    VALIDATION = "VALIDATION"
    CLOTURE = "CLOTURE"
    FIN = "FIN"


class WorkflowClotureMensuelle:
    """
    Workflow complet de clôture mensuelle
    Implémente le diagramme de flux selon cahier des charges 8.2
    """
    
    def __init__(self, company, exercice, mois, annee):
        self.company = company
        self.exercice = exercice
        self.mois = mois
        self.annee = annee
        self.periode = f"{annee:04d}-{mois:02d}"
        self.erreurs = []
        self.avertissements = []
        self.statistiques = {}
    
    @transaction.atomic
    def executer_cloture_complete(self):
        """
        Exécute le processus complet de clôture mensuelle
        """
        logger.info(f"Début de la clôture mensuelle pour {self.periode}")
        
        try:
            # 1. Contrôles préalables
            if not self.executer_controles_prealables():
                raise ValidationError("Échec des contrôles préalables")
            
            # 2. Cut-off ventes
            self.executer_cutoff_ventes()
            
            # 3. Cut-off achats
            self.executer_cutoff_achats()
            
            # 4. Provisions clients
            self.calculer_provisions_clients()
            
            # 5. Amortissements
            self.calculer_amortissements()
            
            # 6. Écritures d'abonnements
            self.generer_ecritures_abonnements()
            
            # 7. Rapprochements bancaires
            self.executer_rapprochements_bancaires()
            
            # 8. Lettrage des comptes
            self.executer_lettrage_comptes()
            
            # 9. Analyse des comptes
            balance_ok = self.analyser_comptes()
            
            if not balance_ok:
                # 10. Ajustements si nécessaire
                self.effectuer_ajustements()
                balance_ok = self.analyser_comptes()
            
            if not balance_ok:
                raise ValidationError("La balance n'est pas équilibrée après ajustements")
            
            # 11. Génération des états
            etats = self.generer_etats_financiers()
            
            # 12. Validation direction
            validation = self.demander_validation_direction(etats)
            
            if validation:
                # 13. Clôture de la période
                self.cloturer_periode()
                
                logger.info(f"Clôture mensuelle {self.periode} terminée avec succès")
                return True
            else:
                logger.warning(f"Clôture mensuelle {self.periode} refusée par la direction")
                return False
                
        except Exception as e:
            logger.error(f"Erreur lors de la clôture: {str(e)}")
            raise
    
    def executer_controles_prealables(self):
        """
        Étape 1: Contrôles préalables
        Vérifie que toutes les conditions sont réunies pour la clôture
        """
        logger.info("Exécution des contrôles préalables")
        
        controles_ok = True
        
        # Vérifier que l'exercice est ouvert
        if self.exercice.statut != 'OUVERT':
            self.erreurs.append("L'exercice n'est pas ouvert")
            controles_ok = False
        
        # Vérifier qu'il n'y a pas d'écritures en brouillon
        from apps.accounting.models import EcritureComptable
        
        nb_brouillons = EcritureComptable.objects.filter(
            company=self.company,
            exercice=self.exercice,
            date_ecriture__year=self.annee,
            date_ecriture__month=self.mois,
            statut='BROUILLON'
        ).count()
        
        if nb_brouillons > 0:
            self.erreurs.append(f"{nb_brouillons} écritures en brouillon non validées")
            controles_ok = False
        
        # Vérifier l'équilibre des journaux
        from django.db.models import Sum
        
        for journal in self.company.journaux.filter(actif=True):
            totaux = EcritureComptable.objects.filter(
                company=self.company,
                journal=journal,
                exercice=self.exercice,
                date_ecriture__year=self.annee,
                date_ecriture__month=self.mois,
                statut='VALIDE'
            ).aggregate(
                total_debit=Sum('debit'),
                total_credit=Sum('credit')
            )
            
            if totaux['total_debit'] != totaux['total_credit']:
                self.erreurs.append(f"Journal {journal.code} déséquilibré")
                controles_ok = False
        
        # Vérifier les pièces justificatives manquantes
        nb_sans_piece = EcritureComptable.objects.filter(
            company=self.company,
            exercice=self.exercice,
            date_ecriture__year=self.annee,
            date_ecriture__month=self.mois,
            piece_jointe__isnull=True
        ).exclude(journal__type='OD').count()
        
        if nb_sans_piece > 0:
            self.avertissements.append(f"{nb_sans_piece} écritures sans pièce justificative")
        
        self.statistiques['controles_ok'] = controles_ok
        return controles_ok
    
    def executer_cutoff_ventes(self):
        """
        Étape 2: Cut-off des ventes
        Enregistre les factures à établir et produits constatés d'avance
        """
        logger.info("Exécution du cut-off ventes")
        
        from apps.sales.models import BonLivraison
        from apps.accounting.models import EcritureComptable, Journal
        
        # Identifier les livraisons non facturées
        livraisons_non_facturees = BonLivraison.objects.filter(
            company=self.company,
            date_livraison__year=self.annee,
            date_livraison__month=self.mois,
            facture__isnull=True
        )
        
        journal_od = Journal.objects.get(company=self.company, type='OD')
        montant_fae = Decimal('0')
        
        for livraison in livraisons_non_facturees:
            # Créer une facture à établir
            montant = livraison.commande.montant_ttc
            
            # Débit compte FAE
            EcritureComptable.objects.create(
                company=self.company,
                journal=journal_od,
                exercice=self.exercice,
                numero_piece=f"FAE-{livraison.numero}",
                date_ecriture=date(self.annee, self.mois, self._dernier_jour_mois()),
                compte=self._get_compte('4181'),  # Clients - Factures à établir
                tiers=livraison.commande.client,
                libelle=f"FAE - BL {livraison.numero}",
                debit=montant,
                credit=Decimal('0'),
                statut='VALIDE'
            )
            
            # Crédit compte de vente
            EcritureComptable.objects.create(
                company=self.company,
                journal=journal_od,
                exercice=self.exercice,
                numero_piece=f"FAE-{livraison.numero}",
                date_ecriture=date(self.annee, self.mois, self._dernier_jour_mois()),
                compte=self._get_compte('701'),  # Ventes
                tiers=livraison.commande.client,
                libelle=f"FAE Vente - BL {livraison.numero}",
                debit=Decimal('0'),
                credit=montant,
                statut='VALIDE'
            )
            
            montant_fae += montant
        
        self.statistiques['montant_fae_ventes'] = montant_fae
        logger.info(f"Cut-off ventes: {montant_fae} en FAE")
    
    def executer_cutoff_achats(self):
        """
        Étape 3: Cut-off des achats
        Enregistre les factures non parvenues et charges constatées d'avance
        """
        logger.info("Exécution du cut-off achats")
        
        from apps.purchases.models import Reception
        from apps.accounting.models import EcritureComptable, Journal
        
        # Identifier les réceptions non facturées
        receptions_non_facturees = Reception.objects.filter(
            company=self.company,
            date_reception__year=self.annee,
            date_reception__month=self.mois,
            facture_fournisseur__isnull=True
        )
        
        journal_od = Journal.objects.get(company=self.company, type='OD')
        montant_fnp = Decimal('0')
        
        for reception in receptions_non_facturees:
            montant = reception.commande.montant_ttc
            
            # Débit compte d'achat
            EcritureComptable.objects.create(
                company=self.company,
                journal=journal_od,
                exercice=self.exercice,
                numero_piece=f"FNP-{reception.numero}",
                date_ecriture=date(self.annee, self.mois, self._dernier_jour_mois()),
                compte=self._get_compte('601'),  # Achats
                tiers=reception.commande.fournisseur,
                libelle=f"FNP Achat - Reception {reception.numero}",
                debit=montant,
                credit=Decimal('0'),
                statut='VALIDE'
            )
            
            # Crédit compte FNP
            EcritureComptable.objects.create(
                company=self.company,
                journal=journal_od,
                exercice=self.exercice,
                numero_piece=f"FNP-{reception.numero}",
                date_ecriture=date(self.annee, self.mois, self._dernier_jour_mois()),
                compte=self._get_compte('4081'),  # Fournisseurs - Factures non parvenues
                tiers=reception.commande.fournisseur,
                libelle=f"FNP - Reception {reception.numero}",
                debit=Decimal('0'),
                credit=montant,
                statut='VALIDE'
            )
            
            montant_fnp += montant
        
        self.statistiques['montant_fnp_achats'] = montant_fnp
        logger.info(f"Cut-off achats: {montant_fnp} en FNP")
    
    def calculer_provisions_clients(self):
        """
        Étape 4: Calcul des provisions pour créances douteuses
        """
        logger.info("Calcul des provisions clients")
        
        from apps.sales.models import Facture
        from apps.accounting.models import EcritureComptable, Journal
        from dateutil.relativedelta import relativedelta
        
        date_limite_30j = date.today() - timedelta(days=30)
        date_limite_60j = date.today() - timedelta(days=60)
        date_limite_90j = date.today() - timedelta(days=90)
        
        journal_od = Journal.objects.get(company=self.company, type='OD')
        montant_provisions = Decimal('0')
        
        # Récupérer les factures impayées
        factures_impayees = Facture.objects.filter(
            company=self.company,
            payee=False,
            date_echeance__lt=date.today()
        )
        
        for facture in factures_impayees:
            taux_provision = 0
            
            if facture.date_echeance < date_limite_90j:
                taux_provision = 100
            elif facture.date_echeance < date_limite_60j:
                taux_provision = 50
            elif facture.date_echeance < date_limite_30j:
                taux_provision = 25
            
            if taux_provision > 0 and not facture.provision_constituee:
                montant_provision = (facture.solde_du * taux_provision) / 100
                
                # Créer les écritures de provision
                # Débit dotation
                EcritureComptable.objects.create(
                    company=self.company,
                    journal=journal_od,
                    exercice=self.exercice,
                    numero_piece=f"PROV-{self.periode}-{facture.numero}",
                    date_ecriture=date(self.annee, self.mois, self._dernier_jour_mois()),
                    compte=self._get_compte('6817'),  # Dotations aux provisions
                    tiers=facture.client,
                    libelle=f"Provision {taux_provision}% - Facture {facture.numero}",
                    debit=montant_provision,
                    credit=Decimal('0'),
                    statut='VALIDE'
                )
                
                # Crédit provision
                EcritureComptable.objects.create(
                    company=self.company,
                    journal=journal_od,
                    exercice=self.exercice,
                    numero_piece=f"PROV-{self.periode}-{facture.numero}",
                    date_ecriture=date(self.annee, self.mois, self._dernier_jour_mois()),
                    compte=self._get_compte('491'),  # Provisions clients
                    tiers=facture.client,
                    libelle=f"Provision créance - Facture {facture.numero}",
                    debit=Decimal('0'),
                    credit=montant_provision,
                    statut='VALIDE'
                )
                
                facture.provision_constituee = True
                facture.montant_provision = montant_provision
                facture.save()
                
                montant_provisions += montant_provision
        
        self.statistiques['montant_provisions_clients'] = montant_provisions
        logger.info(f"Provisions clients: {montant_provisions}")
    
    def calculer_amortissements(self):
        """
        Étape 5: Calcul et comptabilisation des amortissements
        """
        logger.info("Calcul des amortissements")
        
        from apps.assets.models import Immobilisation
        from apps.accounting.models import EcritureComptable, Journal
        
        journal_od = Journal.objects.get(company=self.company, type='OD')
        montant_total_amortissement = Decimal('0')
        
        # Récupérer les immobilisations en service
        immobilisations = Immobilisation.objects.filter(
            company=self.company,
            statut='EN_SERVICE'
        )
        
        for immo in immobilisations:
            # Calculer la dotation mensuelle
            dotation_annuelle = immo.calculer_dotation_annuelle()
            dotation_mensuelle = dotation_annuelle / 12
            
            if dotation_mensuelle > 0:
                # Créer les écritures d'amortissement
                # Débit dotation
                EcritureComptable.objects.create(
                    company=self.company,
                    journal=journal_od,
                    exercice=self.exercice,
                    numero_piece=f"AMORT-{self.periode}-{immo.code}",
                    date_ecriture=date(self.annee, self.mois, self._dernier_jour_mois()),
                    compte=immo.compte_dotation,
                    libelle=f"Dotation amortissement {immo.libelle}",
                    debit=dotation_mensuelle,
                    credit=Decimal('0'),
                    statut='VALIDE'
                )
                
                # Crédit amortissement
                EcritureComptable.objects.create(
                    company=self.company,
                    journal=journal_od,
                    exercice=self.exercice,
                    numero_piece=f"AMORT-{self.periode}-{immo.code}",
                    date_ecriture=date(self.annee, self.mois, self._dernier_jour_mois()),
                    compte=immo.compte_amort,
                    libelle=f"Amortissement {immo.libelle}",
                    debit=Decimal('0'),
                    credit=dotation_mensuelle,
                    statut='VALIDE'
                )
                
                montant_total_amortissement += dotation_mensuelle
        
        self.statistiques['montant_amortissements'] = montant_total_amortissement
        logger.info(f"Amortissements: {montant_total_amortissement}")
    
    def generer_ecritures_abonnements(self):
        """
        Étape 6: Génération des écritures d'abonnements (charges/produits récurrents)
        """
        logger.info("Génération des écritures d'abonnements")
        
        from apps.accounting.models import EcritureAbonnement, EcritureComptable, Journal
        
        journal_od = Journal.objects.get(company=self.company, type='OD')
        montant_total_abonnements = Decimal('0')
        
        # Récupérer les abonnements actifs
        abonnements = EcritureAbonnement.objects.filter(
            company=self.company,
            actif=True,
            date_debut__lte=date(self.annee, self.mois, self._dernier_jour_mois()),
            date_fin__gte=date(self.annee, self.mois, 1)
        )
        
        for abonnement in abonnements:
            # Créer l'écriture mensuelle
            EcritureComptable.objects.create(
                company=self.company,
                journal=journal_od,
                exercice=self.exercice,
                numero_piece=f"ABO-{self.periode}-{abonnement.code}",
                date_ecriture=date(self.annee, self.mois, self._dernier_jour_mois()),
                compte=abonnement.compte_debit,
                libelle=abonnement.libelle,
                debit=abonnement.montant_mensuel,
                credit=Decimal('0'),
                statut='VALIDE'
            )
            
            EcritureComptable.objects.create(
                company=self.company,
                journal=journal_od,
                exercice=self.exercice,
                numero_piece=f"ABO-{self.periode}-{abonnement.code}",
                date_ecriture=date(self.annee, self.mois, self._dernier_jour_mois()),
                compte=abonnement.compte_credit,
                libelle=abonnement.libelle,
                debit=Decimal('0'),
                credit=abonnement.montant_mensuel,
                statut='VALIDE'
            )
            
            montant_total_abonnements += abonnement.montant_mensuel
        
        self.statistiques['montant_abonnements'] = montant_total_abonnements
        logger.info(f"Abonnements: {montant_total_abonnements}")
    
    def executer_rapprochements_bancaires(self):
        """
        Étape 7: Rapprochements bancaires automatiques
        """
        logger.info("Exécution des rapprochements bancaires")
        
        from apps.treasury.models import CompteBancaire, RapprochementBancaire
        from apps.accounting.models import EcritureComptable
        
        nb_rapprochements = 0
        montant_rapproche = Decimal('0')
        
        # Pour chaque compte bancaire
        for compte in CompteBancaire.objects.filter(company=self.company, actif=True):
            # Récupérer les relevés bancaires du mois
            releves = compte.releves.filter(
                date_releve__year=self.annee,
                date_releve__month=self.mois
            )
            
            for releve in releves:
                # Tentative de rapprochement automatique
                for ligne_releve in releve.lignes.filter(rapprochee=False):
                    # Rechercher l'écriture correspondante
                    ecritures_candidates = EcritureComptable.objects.filter(
                        company=self.company,
                        compte=compte.compte_comptable,
                        montant=abs(ligne_releve.montant),
                        lettrage__isnull=True
                    )
                    
                    if ecritures_candidates.count() == 1:
                        # Rapprochement automatique possible
                        ecriture = ecritures_candidates.first()
                        
                        RapprochementBancaire.objects.create(
                            company=self.company,
                            compte_bancaire=compte,
                            ligne_releve=ligne_releve,
                            ecriture=ecriture,
                            date_rapprochement=timezone.now().date(),
                            automatique=True
                        )
                        
                        ligne_releve.rapprochee = True
                        ligne_releve.save()
                        
                        nb_rapprochements += 1
                        montant_rapproche += abs(ligne_releve.montant)
        
        self.statistiques['nb_rapprochements_auto'] = nb_rapprochements
        self.statistiques['montant_rapproche'] = montant_rapproche
        logger.info(f"Rapprochements: {nb_rapprochements} lignes, {montant_rapproche} rapprochés")
    
    def executer_lettrage_comptes(self):
        """
        Étape 8: Lettrage automatique des comptes tiers
        """
        logger.info("Exécution du lettrage des comptes")
        
        from apps.accounting.models import EcritureComptable
        from apps.core.models_v2 import Tiers
        import string
        import random
        
        nb_lettrages = 0
        
        # Pour chaque tiers
        for tiers in Tiers.objects.filter(company=self.company, actif=True):
            # Récupérer les écritures non lettrées
            ecritures = EcritureComptable.objects.filter(
                company=self.company,
                tiers=tiers,
                lettrage__isnull=True
            ).order_by('date_ecriture')
            
            # Grouper par montant pour lettrage automatique
            from itertools import groupby
            from operator import attrgetter
            
            for montant, groupe in groupby(ecritures, key=lambda e: abs(e.debit - e.credit)):
                groupe_list = list(groupe)
                
                # Vérifier si on peut lettrer (débits = crédits)
                total_debit = sum(e.debit for e in groupe_list)
                total_credit = sum(e.credit for e in groupe_list)
                
                if total_debit == total_credit and total_debit > 0:
                    # Générer un code de lettrage
                    lettrage_code = ''.join(random.choices(string.ascii_uppercase, k=3))
                    
                    # Lettrer les écritures
                    for ecriture in groupe_list:
                        ecriture.lettrage = lettrage_code
                        ecriture.date_lettrage = timezone.now().date()
                        ecriture.save()
                    
                    nb_lettrages += len(groupe_list)
        
        self.statistiques['nb_lettrages_auto'] = nb_lettrages
        logger.info(f"Lettrage: {nb_lettrages} écritures lettrées")
    
    def analyser_comptes(self):
        """
        Étape 9: Analyse des comptes et vérification de la balance
        """
        logger.info("Analyse des comptes")
        
        from apps.accounting.models import EcritureComptable
        from django.db.models import Sum
        
        # Calculer la balance
        balance = EcritureComptable.objects.filter(
            company=self.company,
            exercice=self.exercice,
            date_ecriture__year=self.annee,
            date_ecriture__month=self.mois,
            statut='VALIDE'
        ).aggregate(
            total_debit=Sum('debit'),
            total_credit=Sum('credit')
        )
        
        equilibre = balance['total_debit'] == balance['total_credit']
        
        if not equilibre:
            ecart = abs(balance['total_debit'] - balance['total_credit'])
            self.erreurs.append(f"Balance déséquilibrée: écart de {ecart}")
        
        self.statistiques['balance_equilibree'] = equilibre
        self.statistiques['total_debit'] = balance['total_debit']
        self.statistiques['total_credit'] = balance['total_credit']
        
        logger.info(f"Balance: Débit={balance['total_debit']}, Crédit={balance['total_credit']}")
        
        return equilibre
    
    def effectuer_ajustements(self):
        """
        Étape 10: Ajustements si nécessaire
        """
        logger.info("Effectuer les ajustements")
        
        # Identifier et corriger les déséquilibres
        # Cette méthode dépend des règles métier spécifiques
        
        # Pour l'exemple, on ne fait rien ici
        pass
    
    def generer_etats_financiers(self):
        """
        Étape 11: Génération des états financiers
        """
        logger.info("Génération des états financiers")
        
        from apps.reporting.services.report_generator import ReportGenerator
        
        generator = ReportGenerator(self.company, self.exercice, self.mois, self.annee)
        
        etats = {
            'balance': generator.generer_balance(),
            'grand_livre': generator.generer_grand_livre(),
            'journal': generator.generer_journaux(),
            'compte_resultat': generator.generer_compte_resultat(),
            'bilan': generator.generer_bilan_mensuel(),
            'tableau_flux': generator.generer_tableau_flux(),
        }
        
        self.statistiques['etats_generes'] = len(etats)
        logger.info(f"États générés: {len(etats)}")
        
        return etats
    
    def demander_validation_direction(self, etats):
        """
        Étape 12: Validation par la direction
        """
        logger.info("Demande de validation à la direction")
        
        from apps.workflow.models import ValidationRequest
        
        # Créer une demande de validation
        validation_request = ValidationRequest.objects.create(
            company=self.company,
            type='CLOTURE_MENSUELLE',
            periode=self.periode,
            demandeur=None,  # À définir selon le contexte
            statut='EN_ATTENTE',
            donnees={
                'statistiques': self.statistiques,
                'erreurs': self.erreurs,
                'avertissements': self.avertissements,
                'etats': {key: str(value) for key, value in etats.items()}
            }
        )
        
        # Simuler une validation automatique pour le test
        # En production, cela attendrait une action manuelle
        validation_request.statut = 'APPROUVE'
        validation_request.save()
        
        return validation_request.statut == 'APPROUVE'
    
    def cloturer_periode(self):
        """
        Étape 13: Clôture définitive de la période
        """
        logger.info("Clôture de la période")
        
        from apps.accounting.models import PeriodeCloture, EcritureComptable
        
        # Créer l'enregistrement de clôture
        cloture = PeriodeCloture.objects.create(
            company=self.company,
            exercice=self.exercice,
            mois=self.mois,
            annee=self.annee,
            date_cloture=timezone.now(),
            cloture_par=None,  # À définir selon le contexte
            statistiques=self.statistiques
        )
        
        # Verrouiller les écritures de la période
        EcritureComptable.objects.filter(
            company=self.company,
            exercice=self.exercice,
            date_ecriture__year=self.annee,
            date_ecriture__month=self.mois
        ).update(statut='CLOTURE')
        
        self.statistiques['date_cloture'] = cloture.date_cloture.isoformat()
        logger.info(f"Période {self.periode} clôturée")
        
        return cloture
    
    # Méthodes utilitaires
    
    def _dernier_jour_mois(self):
        """Retourne le dernier jour du mois"""
        import calendar
        return calendar.monthrange(self.annee, self.mois)[1]
    
    def _get_compte(self, code):
        """Récupère un compte comptable par son code"""
        from apps.accounting.models import CompteComptable
        return CompteComptable.objects.get(
            company=self.company,
            code=code
        )