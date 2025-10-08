"""
Services de clôture comptable intégrés au système WiseBook existant
Respecte exactement le cahier des charges fourni
"""
from django.db import transaction
from django.db.models import Sum, Count, Q
from decimal import Decimal
from datetime import datetime, timedelta
import logging

from apps.accounting.models import Company, FiscalYear, ChartOfAccounts, JournalEntry, JournalEntryLine, Journal
from .models import ClotureComptablePeriodique, OperationRegularisation, WorkflowValidation

logger = logging.getLogger(__name__)


class ServiceClotureComptable:
    """
    Service principal intégré au système comptable WiseBook existant
    """

    def __init__(self, company: Company, fiscal_year: FiscalYear):
        self.company = company
        self.fiscal_year = fiscal_year
        self.journal_cloture = self._obtenir_journal_cloture()

    def _obtenir_journal_cloture(self):
        """Utilise le système de journaux existant de WiseBook"""
        journal, created = Journal.objects.get_or_create(
            company=self.company,
            code='CL',
            defaults={
                'name': 'Journal de Clôture',
                'description': 'Écritures de clôture périodique',
                'type': 'general'
            }
        )
        return journal

    def analyser_provisions_clients_reelles(self):
        """
        Analyse les VRAIES créances clients du système WiseBook
        Respecte cahier des charges section B - Opérations de Régularisation
        """
        # Récupération des VRAIS comptes clients du système existant
        comptes_clients = ChartOfAccounts.objects.filter(
            company=self.company,
            code__startswith='411'  # Comptes clients SYSCOHADA
        )

        provisions_calculees = []

        for compte_client in comptes_clients:
            # Calcul du VRAI solde depuis les écritures existantes
            solde_actuel = self._calculer_solde_reel(compte_client)

            if solde_actuel > 0:  # Créance positive
                # Analyse VRAIE ancienneté depuis les écritures
                anciennete_jours = self._calculer_anciennete_reelle(compte_client)

                # Application barèmes SYSCOHADA selon cahier des charges
                if anciennete_jours >= 365:  # >12 mois
                    taux_provision = Decimal('100')
                elif anciennete_jours >= 180:  # 6-12 mois
                    taux_provision = Decimal('50')
                else:
                    taux_provision = Decimal('0')

                if taux_provision > 0:
                    montant_provision = (solde_actuel * taux_provision / 100).quantize(Decimal('0.01'))

                    provisions_calculees.append({
                        'compte': compte_client,
                        'solde': solde_actuel,
                        'anciennete': anciennete_jours,
                        'taux_syscohada': taux_provision,
                        'provision': montant_provision
                    })

        return provisions_calculees

    def _calculer_solde_reel(self, compte: ChartOfAccounts):
        """Calcule le solde réel depuis les écritures WiseBook existantes"""
        lignes = JournalEntryLine.objects.filter(
            account=compte,
            entry__fiscal_year=self.fiscal_year,
            entry__date__lte=self.fiscal_year.end_date
        )

        total_debit = lignes.aggregate(total=Sum('debit_amount'))['total'] or Decimal('0')
        total_credit = lignes.aggregate(total=Sum('credit_amount'))['total'] or Decimal('0')

        return total_debit - total_credit

    def _calculer_anciennete_reelle(self, compte_client: ChartOfAccounts):
        """Calcule l'ancienneté réelle depuis les vraies écritures"""
        plus_ancienne_creance = JournalEntryLine.objects.filter(
            account=compte_client,
            entry__fiscal_year=self.fiscal_year,
            debit_amount__gt=0
        ).order_by('entry__date').first()

        if plus_ancienne_creance:
            return (self.fiscal_year.end_date - plus_ancienne_creance.entry.date).days
        return 0

    def generer_balance_generale_reelle(self):
        """
        Génère la VRAIE balance depuis le système comptable WiseBook existant
        Respecte cahier des charges section D - États Financiers
        """
        # Récupération de TOUS les comptes utilisés dans WiseBook
        comptes_actifs = ChartOfAccounts.objects.filter(
            company=self.company,
            entry_lines__entry__fiscal_year=self.fiscal_year
        ).distinct()

        balance_reelle = []

        for compte in comptes_actifs:
            # Calcul des VRAIS mouvements
            mouvements = self._calculer_mouvements_reels(compte)

            if mouvements['total_debit'] > 0 or mouvements['total_credit'] > 0:
                # Calcul du solde selon nature SYSCOHADA
                solde = self._calculer_solde_par_nature_syscohada(compte, mouvements)

                balance_reelle.append({
                    'compte': compte.code,
                    'libelle': compte.name,
                    'total_debit': mouvements['total_debit'],
                    'total_credit': mouvements['total_credit'],
                    'solde_debiteur': solde['debiteur'],
                    'solde_crediteur': solde['crediteur'],
                    'nb_ecritures': mouvements['nb_ecritures']
                })

        return balance_reelle

    def _calculer_mouvements_reels(self, compte: ChartOfAccounts):
        """Calcule les mouvements réels depuis JournalEntryLine"""
        lignes = JournalEntryLine.objects.filter(
            account=compte,
            entry__fiscal_year=self.fiscal_year
        )

        aggregations = lignes.aggregate(
            total_debit=Sum('debit_amount'),
            total_credit=Sum('credit_amount'),
            nb_ecritures=Count('id')
        )

        return {
            'total_debit': aggregations['total_debit'] or Decimal('0'),
            'total_credit': aggregations['total_credit'] or Decimal('0'),
            'nb_ecritures': aggregations['nb_ecritures'] or 0
        }

    def _calculer_solde_par_nature_syscohada(self, compte: ChartOfAccounts, mouvements):
        """Calcul du solde selon nature SYSCOHADA"""
        total_debit = mouvements['total_debit']
        total_credit = mouvements['total_credit']

        # Classification SYSCOHADA selon premier chiffre
        premier_chiffre = compte.code[0]

        if premier_chiffre in ['1', '2', '3', '6']:
            # Comptes normalement débiteurs
            solde = total_debit - total_credit
            return {
                'debiteur': solde if solde > 0 else Decimal('0'),
                'crediteur': abs(solde) if solde < 0 else Decimal('0')
            }
        else:
            # Comptes normalement créditeurs (4, 5, 7, 8)
            solde = total_credit - total_debit
            return {
                'debiteur': abs(solde) if solde < 0 else Decimal('0'),
                'crediteur': solde if solde > 0 else Decimal('0')
            }

    def creer_ecriture_provision_reelle(self, provision_data, utilisateur):
        """
        Crée une VRAIE écriture dans le système WiseBook existant
        Respecte cahier des charges - Génération automatique d'écritures
        """
        with transaction.atomic():
            # Récupération/création des comptes SYSCOHADA
            compte_dotation = self._obtenir_compte_syscohada('681500', 'Dotations aux provisions pour créances douteuses')
            compte_provision = self._obtenir_compte_syscohada('491100', 'Provisions pour créances douteuses')

            # Génération numéro d'écriture selon WiseBook
            numero_ecriture = self._generer_numero_ecriture()

            # Création écriture dans le système existant
            ecriture = JournalEntry.objects.create(
                company=self.company,
                fiscal_year=self.fiscal_year,
                journal=self.journal_cloture,
                entry_number=numero_ecriture,
                date=self.fiscal_year.end_date,
                description=f"Provision créances douteuses - {provision_data['compte'].name}",
                reference=f"PROV-{provision_data['compte'].code}",
                total_amount=provision_data['provision']
            )

            # Lignes débit et crédit
            JournalEntryLine.objects.create(
                entry=ecriture,
                account=compte_dotation,
                description=f"Provision {provision_data['taux_syscohada']}% - {provision_data['compte'].name}",
                debit_amount=provision_data['provision'],
                credit_amount=Decimal('0')
            )

            JournalEntryLine.objects.create(
                entry=ecriture,
                account=compte_provision,
                description=f"Provision créances douteuses - {provision_data['compte'].name}",
                debit_amount=Decimal('0'),
                credit_amount=provision_data['provision']
            )

            logger.info(f"Écriture provision créée: {numero_ecriture} - {provision_data['provision']} XOF")
            return ecriture

    def _obtenir_compte_syscohada(self, code_compte, libelle):
        """Obtient ou crée un compte dans le plan comptable WiseBook existant"""
        compte, created = ChartOfAccounts.objects.get_or_create(
            company=self.company,
            code=code_compte,
            defaults={
                'name': libelle,
                'account_type': self._determiner_type_compte_syscohada(code_compte),
                'is_active': True
            }
        )
        if created:
            logger.info(f"Compte SYSCOHADA créé: {code_compte} - {libelle}")
        return compte

    def _determiner_type_compte_syscohada(self, code_compte):
        """Détermine le type selon classification SYSCOHADA"""
        premier_chiffre = code_compte[0]
        types_syscohada = {
            '1': 'equity',      # Ressources durables
            '2': 'asset',       # Actif immobilisé
            '3': 'asset',       # Stocks
            '4': 'liability',   # Tiers
            '5': 'asset',       # Trésorerie
            '6': 'expense',     # Charges
            '7': 'income',      # Produits
            '8': 'special'      # Autres
        }
        return types_syscohada.get(premier_chiffre, 'other')

    def _generer_numero_ecriture(self):
        """Génère numéro séquentiel dans le système WiseBook existant"""
        derniere_ecriture = JournalEntry.objects.filter(
            company=self.company,
            journal=self.journal_cloture,
            fiscal_year=self.fiscal_year
        ).order_by('-entry_number').first()

        if derniere_ecriture and derniere_ecriture.entry_number.startswith('CL'):
            dernier_numero = int(derniere_ecriture.entry_number.split('-')[1])
            return f'CL-{dernier_numero + 1:06d}'
        else:
            return 'CL-000001'

    def calculer_indicateurs_performance_temps_reel(self):
        """
        Calcule les indicateurs selon cahier des charges section F
        """
        clotures_actives = ClotureComptablePeriodique.objects.filter(
            company=self.company,
            statut__in=['EN_COURS', 'CONTROLE', 'VALIDATION']
        )

        if not clotures_actives.exists():
            return {}

        # Progression globale en temps réel
        progression_moyenne = clotures_actives.aggregate(
            moyenne=models.Avg('progression_pourcentage')
        )['moyenne'] or Decimal('0')

        # Délais moyens par étape
        delais_moyens = clotures_actives.aggregate(
            delai_moyen=models.Avg('delai_realisation_jours')
        )['delai_moyen'] or 0

        # Taux d'erreur et de rejet
        taux_erreur_moyen = clotures_actives.aggregate(
            taux_moyen=models.Avg('taux_erreur')
        )['taux_moyen'] or Decimal('0')

        return {
            'progression_globale': float(progression_moyenne),
            'delai_moyen_jours': delais_moyens,
            'taux_erreur': float(taux_erreur_moyen),
            'nombre_clotures_actives': clotures_actives.count()
        }