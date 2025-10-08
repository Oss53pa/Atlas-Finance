"""
Services pour États Financiers SYSCOHADA WiseBook
Génération automatique conforme normes comptables
"""
from typing import Dict, List, Any, Optional
from decimal import Decimal
from datetime import date
from django.db.models import Sum, Q
from django.utils import timezone

from .models import (
    BilanComptable, CompteResultat, SoldesIntermediaires,
    RatioFinancier, TableauFluxTresorerie, TableFinancement,
    FinancialReport, AuditTrail
)
from apps.accounting.models import Company, FiscalYear, ChartOfAccounts, JournalEntryLine


class FinancialStatementsService:
    """
    Service principal de génération des états financiers
    Conforme cahier des charges - Production automatique
    """

    def __init__(self, company: Company, fiscal_year: FiscalYear):
        self.company = company
        self.fiscal_year = fiscal_year

    def generer_etats_financiers_complets(self) -> Dict[str, Any]:
        """
        Génération complète de tous les états financiers SYSCOHADA
        Conforme objectif : < 5 secondes pour 1M écritures
        """
        start_time = timezone.now()

        resultats = {
            'company': self.company.name,
            'fiscal_year': self.fiscal_year.name,
            'generation_start': start_time,
            'etats_generes': {}
        }

        try:
            # 1. Bilan comptable
            bilan = self.generer_bilan_comptable()
            resultats['etats_generes']['bilan'] = bilan

            # 2. Compte de résultat
            compte_resultat = self.generer_compte_resultat()
            resultats['etats_generes']['compte_resultat'] = compte_resultat

            # 3. Soldes intermédiaires de gestion
            sig = self.generer_sig()
            resultats['etats_generes']['sig'] = sig

            # 4. Tableau des flux (TAFIRE)
            tafire = self.generer_tafire()
            resultats['etats_generes']['tafire'] = tafire

            # 5. Ratios financiers
            ratios = self.generer_ratios_financiers()
            resultats['etats_generes']['ratios'] = ratios

            # Temps de génération
            end_time = timezone.now()
            generation_time = (end_time - start_time).total_seconds()

            resultats.update({
                'generation_end': end_time,
                'generation_time_seconds': generation_time,
                'performance_target_met': generation_time < 5.0,
                'success': True
            })

        except Exception as e:
            resultats.update({
                'success': False,
                'error': str(e),
                'generation_end': timezone.now()
            })

        return resultats

    def generer_bilan_comptable(self) -> Dict[str, Any]:
        """
        Génération du bilan comptable SYSCOHADA
        Tables normalisées Actif/Passif
        """
        # Suppression ancien bilan pour regénération
        BilanComptable.objects.filter(
            company=self.company,
            fiscal_year=self.fiscal_year
        ).delete()

        # Structure du bilan SYSCOHADA
        structure_bilan = self._get_structure_bilan_syscohada()

        lignes_creees = []

        for ligne_config in structure_bilan:
            # Récupération des comptes pour cette ligne
            comptes = ChartOfAccounts.objects.filter(
                company=self.company,
                code__in=ligne_config['comptes']
            )

            # Création ligne bilan
            ligne_bilan = BilanComptable.objects.create(
                company=self.company,
                fiscal_year=self.fiscal_year,
                bilan_type=ligne_config['type'],
                section=ligne_config['section'],
                ligne_numero=ligne_config['numero'],
                libelle=ligne_config['libelle'],
                ordre_affichage=ligne_config['ordre']
            )

            # Association des comptes
            ligne_bilan.comptes_inclus.set(comptes)

            # Calcul automatique des montants
            ligne_bilan.calculer_montants()

            lignes_creees.append({
                'numero': ligne_bilan.ligne_numero,
                'libelle': ligne_bilan.libelle,
                'montant_net': float(ligne_bilan.montant_net),
                'comptes_count': comptes.count()
            })

        return {
            'lignes_creees': len(lignes_creees),
            'detail_lignes': lignes_creees,
            'total_actif': self._calculer_total_actif(),
            'total_passif': self._calculer_total_passif(),
            'equilibre_verifie': self._verifier_equilibre_bilan()
        }

    def _get_structure_bilan_syscohada(self) -> List[Dict[str, Any]]:
        """Structure standard du bilan SYSCOHADA"""
        return [
            # ACTIF
            {
                'type': 'ACTIF',
                'section': 'ACTIF_IMMOBILISE',
                'numero': 'AA',
                'libelle': 'Charges immobilisées',
                'comptes': ['201'],
                'ordre': 1
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_IMMOBILISE',
                'numero': 'AB',
                'libelle': 'Frais de recherche et développement',
                'comptes': ['202'],
                'ordre': 2
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_IMMOBILISE',
                'numero': 'AC',
                'libelle': 'Brevets, licences, logiciels',
                'comptes': ['203', '204', '205'],
                'ordre': 3
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_IMMOBILISE',
                'numero': 'AD',
                'libelle': 'Fonds commercial',
                'comptes': ['206', '207'],
                'ordre': 4
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_IMMOBILISE',
                'numero': 'AE',
                'libelle': 'Autres immobilisations incorporelles',
                'comptes': ['208'],
                'ordre': 5
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_IMMOBILISE',
                'numero': 'AF',
                'libelle': 'Terrains',
                'comptes': ['211', '212'],
                'ordre': 6
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_IMMOBILISE',
                'numero': 'AG',
                'libelle': 'Bâtiments',
                'comptes': ['213', '214'],
                'ordre': 7
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_IMMOBILISE',
                'numero': 'AH',
                'libelle': 'Installations et agencements',
                'comptes': ['215', '218'],
                'ordre': 8
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_IMMOBILISE',
                'numero': 'AI',
                'libelle': 'Matériel',
                'comptes': ['216', '217'],
                'ordre': 9
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_CIRCULANT',
                'numero': 'BA',
                'libelle': 'Marchandises',
                'comptes': ['31'],
                'ordre': 20
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_CIRCULANT',
                'numero': 'BB',
                'libelle': 'Matières premières',
                'comptes': ['32'],
                'ordre': 21
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_CIRCULANT',
                'numero': 'BC',
                'libelle': 'Autres approvisionnements',
                'comptes': ['33'],
                'ordre': 22
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_CIRCULANT',
                'numero': 'BD',
                'libelle': 'En-cours',
                'comptes': ['34', '35'],
                'ordre': 23
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_CIRCULANT',
                'numero': 'BE',
                'libelle': 'Produits fabriqués',
                'comptes': ['36', '37'],
                'ordre': 24
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_CIRCULANT',
                'numero': 'BF',
                'libelle': 'Fournisseurs, avances versées',
                'comptes': ['409'],
                'ordre': 25
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_CIRCULANT',
                'numero': 'BG',
                'libelle': 'Clients',
                'comptes': ['411', '413', '416'],
                'ordre': 26
            },
            {
                'type': 'ACTIF',
                'section': 'ACTIF_CIRCULANT',
                'numero': 'BH',
                'libelle': 'Autres créances',
                'comptes': ['418', '42', '43', '44', '45', '46', '47'],
                'ordre': 27
            },

            # PASSIF
            {
                'type': 'PASSIF',
                'section': 'CAPITAUX_PROPRES',
                'numero': 'CA',
                'libelle': 'Capital',
                'comptes': ['101'],
                'ordre': 50
            },
            {
                'type': 'PASSIF',
                'section': 'CAPITAUX_PROPRES',
                'numero': 'CB',
                'libelle': 'Primes liées au capital social',
                'comptes': ['104'],
                'ordre': 51
            },
            {
                'type': 'PASSIF',
                'section': 'CAPITAUX_PROPRES',
                'numero': 'CC',
                'libelle': 'Réserves',
                'comptes': ['106', '107', '108'],
                'ordre': 52
            },
            {
                'type': 'PASSIF',
                'section': 'CAPITAUX_PROPRES',
                'numero': 'CD',
                'libelle': 'Report à nouveau',
                'comptes': ['110', '111', '112'],
                'ordre': 53
            },
            {
                'type': 'PASSIF',
                'section': 'CAPITAUX_PROPRES',
                'numero': 'CE',
                'libelle': 'Résultat net de l\'exercice',
                'comptes': ['120', '129'],
                'ordre': 54
            },
            {
                'type': 'PASSIF',
                'section': 'DETTES_FINANCIERES',
                'numero': 'DA',
                'libelle': 'Emprunts et dettes financières',
                'comptes': ['161', '162', '163', '164', '165', '166', '167', '168'],
                'ordre': 60
            },
            {
                'type': 'PASSIF',
                'section': 'PASSIF_CIRCULANT',
                'numero': 'EA',
                'libelle': 'Fournisseurs et comptes rattachés',
                'comptes': ['401', '403', '405', '408'],
                'ordre': 70
            },
            {
                'type': 'PASSIF',
                'section': 'PASSIF_CIRCULANT',
                'numero': 'EB',
                'libelle': 'Clients, avances reçues',
                'comptes': ['419'],
                'ordre': 71
            },
            {
                'type': 'PASSIF',
                'section': 'PASSIF_CIRCULANT',
                'numero': 'EC',
                'libelle': 'Dettes fiscales et sociales',
                'comptes': ['44'],
                'ordre': 72
            },
        ]

    def generer_compte_resultat(self) -> Dict[str, Any]:
        """
        Génération du compte de résultat SYSCOHADA
        Classification par nature conforme
        """
        # Suppression ancien
        CompteResultat.objects.filter(
            company=self.company,
            fiscal_year=self.fiscal_year
        ).delete()

        # Structure compte de résultat SYSCOHADA
        structure_cr = self._get_structure_compte_resultat()

        lignes_creees = []

        for ligne_config in structure_cr:
            # Récupération des comptes
            comptes = ChartOfAccounts.objects.filter(
                company=self.company,
                code__regex=ligne_config['pattern_comptes']
            )

            # Création ligne
            ligne_cr = CompteResultat.objects.create(
                company=self.company,
                fiscal_year=self.fiscal_year,
                ligne_numero=ligne_config['numero'],
                libelle=ligne_config['libelle'],
                nature=ligne_config['nature'],
                type_element=ligne_config['type'],
                ordre_affichage=ligne_config['ordre']
            )

            # Association comptes
            ligne_cr.comptes_inclus.set(comptes)

            # Calcul automatique
            ligne_cr.calculer_montant()

            lignes_creees.append({
                'numero': ligne_cr.ligne_numero,
                'libelle': ligne_cr.libelle,
                'montant': float(ligne_cr.montant_exercice),
                'type': ligne_cr.type_element
            })

        return {
            'lignes_creees': len(lignes_creees),
            'detail_lignes': lignes_creees,
            'total_produits': self._calculer_total_produits(),
            'total_charges': self._calculer_total_charges(),
            'resultat_net': self._calculer_resultat_net()
        }

    def _get_structure_compte_resultat(self) -> List[Dict[str, Any]]:
        """Structure standard du compte de résultat SYSCOHADA"""
        return [
            # PRODUITS D'EXPLOITATION
            {
                'numero': 'TA',
                'libelle': 'Ventes de marchandises',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'PRODUITS',
                'pattern_comptes': r'^701',
                'ordre': 1
            },
            {
                'numero': 'TB',
                'libelle': 'Ventes de produits fabriqués',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'PRODUITS',
                'pattern_comptes': r'^702',
                'ordre': 2
            },
            {
                'numero': 'TC',
                'libelle': 'Travaux, services vendus',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'PRODUITS',
                'pattern_comptes': r'^704|^705|^706',
                'ordre': 3
            },
            {
                'numero': 'TD',
                'libelle': 'Production stockée',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'PRODUITS',
                'pattern_comptes': r'^72',
                'ordre': 4
            },
            {
                'numero': 'TE',
                'libelle': 'Production immobilisée',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'PRODUITS',
                'pattern_comptes': r'^73',
                'ordre': 5
            },
            {
                'numero': 'TF',
                'libelle': 'Subventions d\'exploitation',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'PRODUITS',
                'pattern_comptes': r'^741',
                'ordre': 6
            },
            {
                'numero': 'TG',
                'libelle': 'Autres produits d\'exploitation',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'PRODUITS',
                'pattern_comptes': r'^75',
                'ordre': 7
            },

            # CHARGES D'EXPLOITATION
            {
                'numero': 'TH',
                'libelle': 'Achats de marchandises',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'CHARGES',
                'pattern_comptes': r'^601',
                'ordre': 10
            },
            {
                'numero': 'TI',
                'libelle': 'Variation stock marchandises',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'CHARGES',
                'pattern_comptes': r'^6031',
                'ordre': 11
            },
            {
                'numero': 'TJ',
                'libelle': 'Achats de matières premières',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'CHARGES',
                'pattern_comptes': r'^602',
                'ordre': 12
            },
            {
                'numero': 'TK',
                'libelle': 'Variation stocks matières',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'CHARGES',
                'pattern_comptes': r'^6032',
                'ordre': 13
            },
            {
                'numero': 'TL',
                'libelle': 'Autres achats',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'CHARGES',
                'pattern_comptes': r'^604|^605|^608',
                'ordre': 14
            },
            {
                'numero': 'TM',
                'libelle': 'Transport',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'CHARGES',
                'pattern_comptes': r'^61',
                'ordre': 15
            },
            {
                'numero': 'TN',
                'libelle': 'Services extérieurs',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'CHARGES',
                'pattern_comptes': r'^62',
                'ordre': 16
            },
            {
                'numero': 'TO',
                'libelle': 'Impôts et taxes',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'CHARGES',
                'pattern_comptes': r'^63',
                'ordre': 17
            },
            {
                'numero': 'TP',
                'libelle': 'Charges de personnel',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'CHARGES',
                'pattern_comptes': r'^64',
                'ordre': 18
            },
            {
                'numero': 'TQ',
                'libelle': 'Autres charges d\'exploitation',
                'nature': 'ACTIVITE_EXPLOITATION',
                'type': 'CHARGES',
                'pattern_comptes': r'^65',
                'ordre': 19
            },

            # CHARGES FINANCIÈRES
            {
                'numero': 'TR',
                'libelle': 'Charges financières',
                'nature': 'ACTIVITE_FINANCIERE',
                'type': 'CHARGES',
                'pattern_comptes': r'^67',
                'ordre': 30
            },

            # PRODUITS FINANCIERS
            {
                'numero': 'TS',
                'libelle': 'Produits financiers',
                'nature': 'ACTIVITE_FINANCIERE',
                'type': 'PRODUITS',
                'pattern_comptes': r'^77',
                'ordre': 31
            },
        ]

    def generer_sig(self) -> Dict[str, Any]:
        """
        Génération des Soldes Intermédiaires de Gestion
        9 soldes SYSCOHADA conforme cahier des charges
        """
        # Suppression anciens SIG
        SoldesIntermediaires.objects.filter(
            company=self.company,
            fiscal_year=self.fiscal_year
        ).delete()

        # Récupération des données de base du compte de résultat
        ventes_marchandises = self._get_montant_compte_resultat('TA')
        achats_marchandises = self._get_montant_compte_resultat('TH')
        production_vendue = self._get_montant_compte_resultat('TB') + self._get_montant_compte_resultat('TC')
        production_stockee = self._get_montant_compte_resultat('TD')
        production_immobilisee = self._get_montant_compte_resultat('TE')
        charges_exploitation = self._get_total_charges_exploitation()
        produits_financiers = self._get_montant_compte_resultat('TS')
        charges_financieres = self._get_montant_compte_resultat('TR')

        # Calcul des 9 soldes SYSCOHADA
        soldes_calcules = []

        # 1. Marge commerciale
        marge_commerciale = ventes_marchandises - achats_marchandises
        soldes_calcules.append(self._creer_solde_sig(
            'MARGE_COMMERCIALE',
            'Marge commerciale',
            marge_commerciale,
            'Ventes marchandises - Coût d\'achat marchandises',
            1
        ))

        # 2. Production de l'exercice
        production_exercice = production_vendue + production_stockee + production_immobilisee
        soldes_calcules.append(self._creer_solde_sig(
            'PRODUCTION',
            'Production de l\'exercice',
            production_exercice,
            'Production vendue + Production stockée + Production immobilisée',
            2
        ))

        # 3. Valeur ajoutée
        valeur_ajoutee = marge_commerciale + production_exercice - charges_exploitation
        soldes_calcules.append(self._creer_solde_sig(
            'VALEUR_AJOUTEE',
            'Valeur ajoutée',
            valeur_ajoutee,
            'Marge commerciale + Production - Consommations',
            3
        ))

        # 4. Excédent Brut d'Exploitation (EBE)
        charges_personnel = self._get_montant_compte_resultat('TP')
        impots_taxes = self._get_montant_compte_resultat('TO')
        ebe = valeur_ajoutee - charges_personnel - impots_taxes
        soldes_calcules.append(self._creer_solde_sig(
            'EBE',
            'Excédent brut d\'exploitation',
            ebe,
            'Valeur ajoutée - Charges personnel - Impôts et taxes',
            4
        ))

        # 5. Résultat d'exploitation
        dotations_amortissements = self._get_dotations_amortissements()
        autres_charges = self._get_montant_compte_resultat('TQ')
        autres_produits = self._get_montant_compte_resultat('TG')

        resultat_exploitation = ebe + autres_produits - autres_charges - dotations_amortissements
        soldes_calcules.append(self._creer_solde_sig(
            'RESULTAT_EXPLOITATION',
            'Résultat d\'exploitation',
            resultat_exploitation,
            'EBE + Autres produits - Autres charges - Dotations',
            5
        ))

        # 6. Résultat courant avant impôts
        resultat_courant = resultat_exploitation + produits_financiers - charges_financieres
        soldes_calcules.append(self._creer_solde_sig(
            'RESULTAT_COURANT',
            'Résultat courant avant impôts',
            resultat_courant,
            'Résultat exploitation + Résultat financier',
            6
        ))

        # 7. Résultat exceptionnel
        resultat_exceptionnel = self._get_resultat_exceptionnel()
        soldes_calcules.append(self._creer_solde_sig(
            'RESULTAT_EXCEPTIONNEL',
            'Résultat exceptionnel',
            resultat_exceptionnel,
            'Produits exceptionnels - Charges exceptionnelles',
            7
        ))

        # 8. Résultat net
        impots_societes = self._get_impots_societes()
        resultat_net = resultat_courant + resultat_exceptionnel - impots_societes
        soldes_calcules.append(self._creer_solde_sig(
            'RESULTAT_NET',
            'Résultat net de l\'exercice',
            resultat_net,
            'Résultat courant + Résultat exceptionnel - Impôts',
            8
        ))

        # 9. Capacité d'autofinancement
        caf = resultat_net + dotations_amortissements
        soldes_calcules.append(self._creer_solde_sig(
            'CAPACITE_AUTOFINANCEMENT',
            'Capacité d\'autofinancement',
            caf,
            'Résultat net + Dotations aux amortissements et provisions',
            9
        ))

        return {
            'soldes_calcules': len(soldes_calcules),
            'sig_detail': [
                {
                    'libelle': s.libelle,
                    'montant': float(s.montant_exercice),
                    'formule': s.formule_calcul
                }
                for s in soldes_calcules
            ]
        }

    def _creer_solde_sig(
        self,
        solde_type: str,
        libelle: str,
        montant: Decimal,
        formule: str,
        ordre: int
    ) -> SoldesIntermediaires:
        """Création d'un solde intermédiaire"""
        return SoldesIntermediaires.objects.create(
            company=self.company,
            fiscal_year=self.fiscal_year,
            solde_type=solde_type,
            libelle=libelle,
            montant_exercice=montant,
            formule_calcul=formule,
            ordre_affichage=ordre
        )

    def generer_ratios_financiers(self) -> Dict[str, Any]:
        """
        Génération automatique des ratios financiers
        Structure, rentabilité, liquidité, activité
        """
        # Suppression anciens ratios
        RatioFinancier.objects.filter(
            company=self.company,
            fiscal_year=self.fiscal_year
        ).delete()

        # Récupération des données de base
        total_actif = self._calculer_total_actif()
        capitaux_propres = self._calculer_capitaux_propres()
        dettes_totales = self._calculer_dettes_totales()
        ca = self._get_chiffre_affaires()
        resultat_net = self._calculer_resultat_net()

        ratios_calcules = []

        # RATIOS DE STRUCTURE
        if total_actif > 0:
            # Autonomie financière
            autonomie = (capitaux_propres / total_actif * 100)
            ratios_calcules.append(self._creer_ratio(
                'STRUCTURE', 'AUTONOMIE_FINANCIERE', 'Autonomie financière',
                'Capitaux propres / Total actif * 100', autonomie, '%',
                capitaux_propres, total_actif, 30, 50
            ))

            # Ratio d'endettement
            endettement = (dettes_totales / total_actif * 100)
            ratios_calcules.append(self._creer_ratio(
                'STRUCTURE', 'RATIO_ENDETTEMENT', 'Ratio d\'endettement',
                'Dettes totales / Total actif * 100', endettement, '%',
                dettes_totales, total_actif, 20, 70
            ))

        # RATIOS DE RENTABILITÉ
        if total_actif > 0 and ca > 0:
            # ROA
            roa = (resultat_net / total_actif * 100)
            ratios_calcules.append(self._creer_ratio(
                'RENTABILITE', 'ROA', 'Return on Assets',
                'Résultat net / Total actif * 100', roa, '%',
                resultat_net, total_actif, 5, 15
            ))

            # ROE
            if capitaux_propres > 0:
                roe = (resultat_net / capitaux_propres * 100)
                ratios_calcules.append(self._creer_ratio(
                    'RENTABILITE', 'ROE', 'Return on Equity',
                    'Résultat net / Capitaux propres * 100', roe, '%',
                    resultat_net, capitaux_propres, 10, 20
                ))

            # Marge nette
            marge_nette = (resultat_net / ca * 100)
            ratios_calcules.append(self._creer_ratio(
                'RENTABILITE', 'MARGE_NETTE', 'Marge nette',
                'Résultat net / CA * 100', marge_nette, '%',
                resultat_net, ca, 3, 10
            ))

        return {
            'ratios_calcules': len(ratios_calcules),
            'categories': {
                'structure': len([r for r in ratios_calcules if r.category == 'STRUCTURE']),
                'rentabilite': len([r for r in ratios_calcules if r.category == 'RENTABILITE']),
            }
        }

    def _creer_ratio(
        self,
        category: str,
        ratio_type: str,
        libelle: str,
        formule: str,
        valeur: Decimal,
        unite: str,
        numerateur: Decimal,
        denominateur: Decimal,
        optimal_min: float,
        optimal_max: float
    ) -> RatioFinancier:
        """Création d'un ratio financier"""
        ratio = RatioFinancier.objects.create(
            company=self.company,
            fiscal_year=self.fiscal_year,
            category=category,
            ratio_type=ratio_type,
            libelle=libelle,
            formule=formule,
            valeur_exercice=valeur,
            unite=unite,
            numerateur=numerateur,
            denominateur=denominateur,
            valeur_optimale_min=Decimal(str(optimal_min)),
            valeur_optimale_max=Decimal(str(optimal_max))
        )

        # Évaluation automatique
        ratio.evaluer_performance()
        return ratio

    # Méthodes utilitaires pour calculs
    def _get_montant_compte_resultat(self, ligne_numero: str) -> Decimal:
        """Récupère le montant d'une ligne du compte de résultat"""
        try:
            ligne = CompteResultat.objects.get(
                company=self.company,
                fiscal_year=self.fiscal_year,
                ligne_numero=ligne_numero
            )
            return ligne.montant_exercice
        except CompteResultat.DoesNotExist:
            return Decimal('0.00')

    def _calculer_total_actif(self) -> Decimal:
        """Calcul du total actif"""
        return BilanComptable.objects.filter(
            company=self.company,
            fiscal_year=self.fiscal_year,
            bilan_type='ACTIF'
        ).aggregate(total=Sum('montant_net'))['total'] or Decimal('0.00')

    def _calculer_total_passif(self) -> Decimal:
        """Calcul du total passif"""
        return BilanComptable.objects.filter(
            company=self.company,
            fiscal_year=self.fiscal_year,
            bilan_type='PASSIF'
        ).aggregate(total=Sum('montant_net'))['total'] or Decimal('0.00')

    def _calculer_capitaux_propres(self) -> Decimal:
        """Calcul des capitaux propres"""
        return BilanComptable.objects.filter(
            company=self.company,
            fiscal_year=self.fiscal_year,
            section='CAPITAUX_PROPRES'
        ).aggregate(total=Sum('montant_net'))['total'] or Decimal('0.00')

    def _calculer_dettes_totales(self) -> Decimal:
        """Calcul des dettes totales"""
        return BilanComptable.objects.filter(
            company=self.company,
            fiscal_year=self.fiscal_year,
            section__in=['DETTES_FINANCIERES', 'PASSIF_CIRCULANT']
        ).aggregate(total=Sum('montant_net'))['total'] or Decimal('0.00')

    def _get_chiffre_affaires(self) -> Decimal:
        """Calcul du chiffre d'affaires"""
        return (
            self._get_montant_compte_resultat('TA') +  # Ventes marchandises
            self._get_montant_compte_resultat('TB') +  # Ventes produits
            self._get_montant_compte_resultat('TC')    # Services vendus
        )

    def _calculer_resultat_net(self) -> Decimal:
        """Calcul du résultat net"""
        return self._get_montant_compte_resultat('RESULTAT_NET') if hasattr(self, '_sig_generated') else Decimal('0.00')

    def _get_total_charges_exploitation(self) -> Decimal:
        """Total des charges d'exploitation (consommations)"""
        charges = Decimal('0.00')
        for ligne in ['TH', 'TI', 'TJ', 'TK', 'TL']:  # Achats et variations stocks
            charges += self._get_montant_compte_resultat(ligne)
        return charges

    def _get_dotations_amortissements(self) -> Decimal:
        """Dotations aux amortissements et provisions"""
        # Comptes 681x, 691x
        return JournalEntryLine.objects.filter(
            account__code__regex=r'^(681|691)',
            entry__fiscal_year=self.fiscal_year,
            entry__is_validated=True
        ).aggregate(total=Sum('debit_amount'))['total'] or Decimal('0.00')

    def _get_resultat_exceptionnel(self) -> Decimal:
        """Résultat exceptionnel (produits - charges exceptionnels)"""
        produits_except = JournalEntryLine.objects.filter(
            account__code__startswith='78',
            entry__fiscal_year=self.fiscal_year,
            entry__is_validated=True
        ).aggregate(total=Sum('credit_amount'))['total'] or Decimal('0.00')

        charges_except = JournalEntryLine.objects.filter(
            account__code__startswith='68',
            entry__fiscal_year=self.fiscal_year,
            entry__is_validated=True
        ).aggregate(total=Sum('debit_amount'))['total'] or Decimal('0.00')

        return produits_except - charges_except

    def _get_impots_societes(self) -> Decimal:
        """Impôts sur les sociétés"""
        return JournalEntryLine.objects.filter(
            account__code__startswith='891',
            entry__fiscal_year=self.fiscal_year,
            entry__is_validated=True
        ).aggregate(total=Sum('debit_amount'))['total'] or Decimal('0.00')

    def _calculer_total_produits(self) -> Decimal:
        """Total des produits"""
        return CompteResultat.objects.filter(
            company=self.company,
            fiscal_year=self.fiscal_year,
            type_element='PRODUITS'
        ).aggregate(total=Sum('montant_exercice'))['total'] or Decimal('0.00')

    def _calculer_total_charges(self) -> Decimal:
        """Total des charges"""
        return CompteResultat.objects.filter(
            company=self.company,
            fiscal_year=self.fiscal_year,
            type_element='CHARGES'
        ).aggregate(total=Sum('montant_exercice'))['total'] or Decimal('0.00')

    def _verifier_equilibre_bilan(self) -> bool:
        """Vérification équilibre Actif = Passif"""
        total_actif = self._calculer_total_actif()
        total_passif = self._calculer_total_passif()
        ecart = abs(total_actif - total_passif)

        return ecart <= Decimal('0.01')  # Tolérance 1 centime


class FinancialAlertsService:
    """
    Service d'alertes et recommandations automatisées
    Conforme système d'alertes cahier des charges
    """

    def __init__(self, company: Company, fiscal_year: FiscalYear):
        self.company = company
        self.fiscal_year = fiscal_year

    def analyser_sante_financiere(self) -> Dict[str, Any]:
        """Analyse automatique de la santé financière"""

        # Récupération des ratios
        ratios = RatioFinancier.objects.filter(
            company=self.company,
            fiscal_year=self.fiscal_year
        )

        alertes = []
        recommandations = []

        # Analyse par catégorie
        for ratio in ratios:
            if ratio.evaluation in ['CRITIQUE', 'FAIBLE']:
                alertes.append({
                    'type': 'RATIO_CRITIQUE',
                    'severity': 'WARNING' if ratio.evaluation == 'FAIBLE' else 'CRITICAL',
                    'ratio': ratio.libelle,
                    'valeur': float(ratio.valeur_exercice),
                    'optimal_min': float(ratio.valeur_optimale_min) if ratio.valeur_optimale_min else None,
                    'message': f'{ratio.libelle}: {ratio.valeur_exercice} (critique)'
                })

                # Recommandations spécifiques
                if ratio.ratio_type == 'AUTONOMIE_FINANCIERE' and ratio.valeur_exercice < 30:
                    recommandations.append("💰 Renforcer les capitaux propres (augmentation capital, mise en réserves)")

                elif ratio.ratio_type == 'LIQUIDITE_GENERALE' and ratio.valeur_exercice < 1:
                    recommandations.append("🚨 Problème de liquidité - Négocier délais paiement ou lignes crédit")

        # Score global de santé financière
        score_global = self._calculer_score_sante_globale(ratios)

        return {
            'score_sante_globale': score_global,
            'niveau_risque': self._get_niveau_risque(score_global),
            'alertes': alertes,
            'recommandations': recommandations,
            'nombre_ratios_analyses': ratios.count(),
            'ratios_critiques': len([r for r in ratios if r.evaluation == 'CRITIQUE']),
            'analyse_le': timezone.now()
        }

    def _calculer_score_sante_globale(self, ratios) -> int:
        """Score de santé financière global (0-100)"""
        if not ratios.exists():
            return 50  # Score neutre

        # Pondération par catégorie
        poids = {
            'STRUCTURE': 30,
            'RENTABILITE': 25,
            'LIQUIDITE': 25,
            'ACTIVITE': 20
        }

        score_total = 0
        poids_total = 0

        for category, poids_cat in poids.items():
            ratios_cat = ratios.filter(category=category)

            if ratios_cat.exists():
                score_cat = 0
                for ratio in ratios_cat:
                    if ratio.evaluation == 'EXCELLENT':
                        score_cat += 100
                    elif ratio.evaluation == 'BON':
                        score_cat += 80
                    elif ratio.evaluation == 'ACCEPTABLE':
                        score_cat += 60
                    elif ratio.evaluation == 'FAIBLE':
                        score_cat += 40
                    else:  # CRITIQUE
                        score_cat += 20

                score_cat_moyen = score_cat / ratios_cat.count()
                score_total += score_cat_moyen * poids_cat
                poids_total += poids_cat

        return int(score_total / poids_total) if poids_total > 0 else 50

    def _get_niveau_risque(self, score: int) -> str:
        """Niveau de risque selon score"""
        if score >= 80:
            return 'FAIBLE'
        elif score >= 60:
            return 'MODERE'
        elif score >= 40:
            return 'ELEVE'
        else:
            return 'CRITIQUE'