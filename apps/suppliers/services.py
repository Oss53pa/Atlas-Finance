"""
Services métier pour Module Fournisseur WiseBook
Logique métier et automatisation selon cahier des charges
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta, date
from decimal import Decimal
from django.db.models import Q, Count, Sum, Avg, Max, Min
from django.utils import timezone
from django.db import transaction

from .models import (
    Supplier, SupplierContact, SupplierDocument, SupplierInvoice,
    SupplierPayment, SupplierAnalytics, SupplierEvaluation
)
from apps.accounting.models import JournalEntry, JournalEntryLine


class SupplierService:
    """
    Service principal pour gestion fournisseurs
    Conforme sections 2.1-2.5 du cahier des charges
    """

    def __init__(self, supplier: Optional[Supplier] = None, company=None):
        self.supplier = supplier
        self.company = company

    @staticmethod
    def creer_fournisseur_complet(company, data: Dict[str, Any], user) -> Supplier:
        """
        Création complète d'un fournisseur
        Conforme section 2.1.1 - Gestion des fiches fournisseurs
        """
        # Génération automatique du code fournisseur
        code_fournisseur = SupplierService._generer_code_fournisseur(company, data.get('supplier_type', 'GOODS'))

        # Création du fournisseur
        supplier = Supplier.objects.create(
            company=company,
            code=code_fournisseur,
            legal_name=data['raison_sociale'],
            commercial_name=data.get('nom_commercial', ''),
            legal_form=data.get('forme_juridique', 'SARL'),
            supplier_type=data.get('supplier_type', 'GOODS'),
            main_address=data.get('adresse', ''),
            city=data.get('ville', ''),
            country=data.get('pays', 'France'),
            main_phone=data.get('telephone', ''),
            email=data.get('email', ''),
            payment_terms=data.get('conditions_paiement', 30),
            preferred_payment_method=data.get('mode_reglement', 'TRANSFER'),
            currency=data.get('devise', 'EUR'),
        )

        # Initialisation automatique
        SupplierService._initialiser_fournisseur(supplier, user)

        return supplier

    @staticmethod
    def _generer_code_fournisseur(company, supplier_type: str) -> str:
        """Génération automatique du code fournisseur"""

        # Préfixes selon type
        prefixes = {
            'GOODS': 'FG',      # Fournisseur Goods
            'SERVICES': 'FS',   # Fournisseur Services
            'SUBCONTRACTOR': 'FC', # Fournisseur Contract
            'CONSULTING': 'FE',    # Fournisseur Expert
            'MAINTENANCE': 'FM',   # Fournisseur Maintenance
            'TRANSPORT': 'FT',     # Fournisseur Transport
            'UTILITIES': 'FU',     # Fournisseur Utilities
            'OTHER': 'FO',         # Fournisseur Other
        }

        prefix = prefixes.get(supplier_type, 'FO')

        # Dernier numéro
        last_supplier = Supplier.objects.filter(
            company=company,
            code__startswith=prefix
        ).order_by('-code').first()

        if last_supplier:
            try:
                last_number = int(last_supplier.code[2:])
                new_number = last_number + 1
            except ValueError:
                new_number = 1
        else:
            new_number = 1

        return f"{prefix}{new_number:04d}"

    @staticmethod
    def _initialiser_fournisseur(supplier: Supplier, user) -> None:
        """Initialisation automatique des données complémentaires"""

        # Création analytics
        SupplierAnalytics.objects.get_or_create(
            supplier=supplier,
            defaults={
                'total_orders_count': 0,
                'total_amount_ordered': Decimal('0.00'),
                'on_time_delivery_rate': Decimal('100.00'),
                'quality_defect_rate': Decimal('0.00'),
            }
        )

    def valider_siret_externe(self) -> Dict[str, Any]:
        """
        Validation SIRET via API externe
        Conforme aux contrôles automatiques
        """
        if not self.supplier or not self.supplier.numero_siret:
            return {'valide': False, 'erreur': 'SIRET manquant'}

        try:
            # Simulation validation API INSEE
            # En production, utiliser l'API réelle
            numero = self.supplier.numero_siret

            if len(numero) != 14 or not numero.isdigit():
                return {'valide': False, 'erreur': 'Format SIRET invalide'}

            # Validation basique algorithme Luhn pour SIRET
            checksum = self._valider_checksum_siret(numero)

            if checksum:
                return {
                    'valide': True,
                    'donnees': {
                        'siret': numero,
                        'valide_algorithme': True
                    }
                }
            else:
                return {'valide': False, 'erreur': 'SIRET invalide (checksum)'}

        except Exception as e:
            return {'valide': False, 'erreur': str(e)}

    def _valider_checksum_siret(self, siret: str) -> bool:
        """Validation checksum SIRET (algorithme Luhn)"""
        try:
            total = 0
            for i, digit in enumerate(siret):
                n = int(digit)
                if i % 2 == 1:  # Position paire (en comptant de 0)
                    n *= 2
                    if n > 9:
                        n = n // 10 + n % 10
                total += n
            return total % 10 == 0
        except:
            return False

    def calculer_performance_globale(self) -> Dict[str, Any]:
        """
        Calcul des indicateurs de performance
        Conforme section 2.4 - Analyse Fournisseurs
        """
        if not self.supplier:
            raise ValueError("Fournisseur requis")

        # Période d'analyse (12 mois)
        fin_periode = date.today()
        debut_periode = fin_periode - timedelta(days=365)

        # Récupération des données
        factures = self.supplier.invoices.filter(
            invoice_date__range=[debut_periode, fin_periode]
        )

        if not factures.exists():
            return {'erreur': 'Pas de données sur la période'}

        # Calculs des métriques
        metrics = {
            'nombre_factures': factures.count(),
            'montant_total': factures.aggregate(
                total=Sum('amount_incl_tax')
            )['total'] or Decimal('0'),
            'montant_moyen_facture': factures.aggregate(
                avg=Avg('amount_incl_tax')
            )['avg'] or Decimal('0'),
            'delai_paiement_moyen': self._calculer_delai_paiement_moyen(factures),
            'taux_litige': self._calculer_taux_litige(factures),
            'performance_livraison': self._calculer_performance_livraison(),
        }

        # Score global
        metrics['score_global'] = self._calculer_score_global(metrics)

        return metrics

    def _calculer_delai_paiement_moyen(self, factures) -> float:
        """Calcul du délai moyen de paiement réel"""
        factures_payees = factures.filter(
            status='PAID',
            payment_date__isnull=False
        )

        if not factures_payees.exists():
            return 0.0

        delais = []
        for facture in factures_payees:
            delai = (facture.payment_date - facture.due_date).days
            delais.append(delai)

        return sum(delais) / len(delais) if delais else 0.0

    def _calculer_taux_litige(self, factures) -> float:
        """Calcul du taux de litige"""
        total = factures.count()
        if total == 0:
            return 0.0

        litiges = factures.filter(status='DISPUTED').count()
        return (litiges / total) * 100

    def _calculer_performance_livraison(self) -> float:
        """Performance livraison basée sur les délais"""
        # Simulation - en production, lier aux bons de livraison
        return 85.0  # 85% de livraisons à temps

    def _calculer_score_global(self, metrics: Dict[str, Any]) -> int:
        """Calcul du score de performance global"""
        score = 50  # Base

        # Facteurs positifs
        if metrics['delai_paiement_moyen'] <= 0:  # Paiement dans les délais
            score += 20
        elif metrics['delai_paiement_moyen'] <= 5:  # Léger retard acceptable
            score += 10

        if metrics['taux_litige'] <= 2:  # Taux de litige faible
            score += 15

        if metrics['performance_livraison'] >= 90:
            score += 15

        # Facteurs négatifs
        if metrics['delai_paiement_moyen'] > 30:  # Retards importants
            score -= 30

        if metrics['taux_litige'] > 10:  # Taux de litige élevé
            score -= 25

        return max(0, min(100, score))


class SupplierAnalyticsService:
    """
    Service d'analyse et reporting fournisseurs
    Conforme section 2.4 - Business Intelligence
    """

    def __init__(self, company):
        self.company = company

    def generer_dashboard_echeances(self) -> Dict[str, Any]:
        """
        Génère le tableau de bord des échéances
        Conforme section 2.3.1 - Tableau de bord des échéances
        """
        today = date.today()

        # Échéances par période
        echeances_stats = {
            'aujourd_hui': self._get_echeances_periode(today, today),
            'cette_semaine': self._get_echeances_periode(today, today + timedelta(days=7)),
            'ce_mois': self._get_echeances_periode(today, today + timedelta(days=30)),
            'en_retard': self._get_echeances_retard(),
        }

        # Prévisionnel trésorerie
        previsionnel = self._calculer_previsionnel_tresorerie()

        return {
            'echeances': echeances_stats,
            'previsionnel_tresorerie': previsionnel,
            'statistiques_globales': self._get_stats_globales(),
            'top_fournisseurs_encours': self._get_top_fournisseurs_encours(),
        }

    def _get_echeances_periode(self, date_debut: date, date_fin: date) -> Dict[str, Any]:
        """Échéances pour une période donnée"""
        factures = SupplierInvoice.objects.filter(
            supplier__company=self.company,
            due_date__range=[date_debut, date_fin],
            status__in=['VALIDATED', 'ACCOUNTING_OK', 'APPROVED']
        ).select_related('supplier')

        return {
            'nombre': factures.count(),
            'montant_total': factures.aggregate(
                total=Sum('amount_incl_tax')
            )['total'] or Decimal('0'),
            'factures': [
                {
                    'fournisseur': f.supplier.legal_name,
                    'numero': f.invoice_number,
                    'montant': f.amount_incl_tax,
                    'echeance': f.due_date,
                }
                for f in factures[:10]  # Limité aux 10 premières
            ]
        }

    def _get_echeances_retard(self) -> Dict[str, Any]:
        """Échéances en retard"""
        factures_retard = SupplierInvoice.objects.filter(
            supplier__company=self.company,
            due_date__lt=date.today(),
            status__in=['VALIDATED', 'ACCOUNTING_OK', 'APPROVED']
        )

        return {
            'nombre': factures_retard.count(),
            'montant_total': factures_retard.aggregate(
                total=Sum('amount_incl_tax')
            )['total'] or Decimal('0'),
            'retard_moyen_jours': self._calculer_retard_moyen(factures_retard),
        }

    def _calculer_retard_moyen(self, factures) -> int:
        """Calcul du retard moyen en jours"""
        if not factures.exists():
            return 0

        retards = [
            (date.today() - f.due_date).days
            for f in factures
        ]
        return sum(retards) // len(retards)

    def _calculer_previsionnel_tresorerie(self) -> Dict[str, Any]:
        """Prévisionnel de trésorerie sur 3 mois"""
        previsions = {}
        today = date.today()

        for i in range(12):  # 12 semaines
            semaine_debut = today + timedelta(weeks=i)
            semaine_fin = semaine_debut + timedelta(days=6)

            montant_semaine = SupplierInvoice.objects.filter(
                supplier__company=self.company,
                due_date__range=[semaine_debut, semaine_fin],
                status__in=['VALIDATED', 'ACCOUNTING_OK', 'APPROVED']
            ).aggregate(
                total=Sum('amount_incl_tax')
            )['total'] or Decimal('0')

            previsions[f'semaine_{i+1}'] = {
                'periode': f"{semaine_debut.strftime('%d/%m')} - {semaine_fin.strftime('%d/%m')}",
                'montant': montant_semaine
            }

        return previsions

    def _get_stats_globales(self) -> Dict[str, Any]:
        """Statistiques globales"""
        suppliers = Supplier.objects.filter(company=self.company)

        return {
            'total_fournisseurs': suppliers.count(),
            'fournisseurs_actifs': suppliers.filter(status='ACTIVE').count(),
            'fournisseurs_bloques': suppliers.filter(status='BLOCKED').count(),
            'encours_total': suppliers.aggregate(
                total=Sum('current_outstanding')
            )['total'] or Decimal('0'),
            'notation_moyenne': suppliers.aggregate(
                avg=Avg('overall_performance')
            )['avg'] or 0,
        }

    def _get_top_fournisseurs_encours(self) -> List[Dict[str, Any]]:
        """Top 10 fournisseurs par encours"""
        return list(
            Supplier.objects.filter(
                company=self.company,
                current_outstanding__gt=0
            ).order_by('-current_outstanding')[:10].values(
                'code', 'legal_name', 'current_outstanding'
            )
        )

    def generer_analyse_abc(self) -> Dict[str, Any]:
        """
        Analyse ABC des fournisseurs
        Conforme section 2.4.2 - Analyses comparatives
        """
        # Calcul des montants sur 12 mois
        un_an = date.today() - timedelta(days=365)

        fournisseurs_avec_montants = []

        for supplier in Supplier.objects.filter(company=self.company, status='ACTIVE'):
            montant_12m = SupplierInvoice.objects.filter(
                supplier=supplier,
                invoice_date__gte=un_an,
                status='PAID'
            ).aggregate(
                total=Sum('amount_incl_tax')
            )['total'] or Decimal('0')

            if montant_12m > 0:
                fournisseurs_avec_montants.append({
                    'supplier': supplier,
                    'montant': montant_12m
                })

        # Tri par montant décroissant
        fournisseurs_avec_montants.sort(key=lambda x: x['montant'], reverse=True)

        # Calcul cumuls et classification ABC
        montant_total = sum(f['montant'] for f in fournisseurs_avec_montants)
        cumul = Decimal('0')

        analyse_abc = {'A': [], 'B': [], 'C': []}

        for data in fournisseurs_avec_montants:
            cumul += data['montant']
            pourcentage_cumul = (cumul / montant_total * 100) if montant_total > 0 else 0

            fournisseur_data = {
                'supplier': data['supplier'],
                'montant': data['montant'],
                'pourcentage': (data['montant'] / montant_total * 100) if montant_total > 0 else 0,
                'pourcentage_cumul': pourcentage_cumul
            }

            if pourcentage_cumul <= 70:
                classe = 'A'
            elif pourcentage_cumul <= 90:
                classe = 'B'
            else:
                classe = 'C'

            analyse_abc[classe].append(fournisseur_data)

        return {
            'analyse_abc': analyse_abc,
            'montant_total': montant_total,
            'nombre_fournisseurs': len(fournisseurs_avec_montants),
            'repartition': {
                'classe_A': {'count': len(analyse_abc['A']), 'pourcentage': 70},
                'classe_B': {'count': len(analyse_abc['B']), 'pourcentage': 20},
                'classe_C': {'count': len(analyse_abc['C']), 'pourcentage': 10},
            }
        }

    def generer_matrice_risques(self) -> Dict[str, Any]:
        """
        Matrice de risques fournisseurs
        Analyse criticité vs performance
        """
        suppliers = Supplier.objects.filter(company=self.company, status='ACTIVE')

        matrice = []

        for supplier in suppliers:
            # Calcul criticité (basé sur volume achats)
            montant_12m = SupplierInvoice.objects.filter(
                supplier=supplier,
                invoice_date__gte=date.today() - timedelta(days=365)
            ).aggregate(
                total=Sum('amount_incl_tax')
            )['total'] or Decimal('0')

            # Criticité : LOW/MEDIUM/HIGH basé sur montant
            if montant_12m > Decimal('100000'):
                criticite = 'HIGH'
            elif montant_12m > Decimal('10000'):
                criticite = 'MEDIUM'
            else:
                criticite = 'LOW'

            # Performance basée sur score global
            performance = supplier.overall_performance

            matrice.append({
                'supplier': {
                    'code': supplier.code,
                    'name': supplier.legal_name,
                    'rating': supplier.supplier_rating
                },
                'criticite': criticite,
                'performance': float(performance),
                'montant_12m': montant_12m,
                'quadrant': self._determiner_quadrant(criticite, performance)
            })

        return {
            'matrice': matrice,
            'recommandations': self._generer_recommandations_matrice(matrice)
        }

    def _determiner_quadrant(self, criticite: str, performance: Decimal) -> str:
        """Détermine le quadrant de la matrice risques"""
        high_performance = performance >= 75
        high_criticite = criticite == 'HIGH'

        if high_criticite and high_performance:
            return 'STRATEGIC'  # Partenaires stratégiques
        elif high_criticite and not high_performance:
            return 'BOTTLENECK'  # Goulots d'étranglement
        elif not high_criticite and high_performance:
            return 'LEVERAGE'  # Effet de levier
        else:
            return 'ROUTINE'  # Achats de routine

    def _generer_recommandations_matrice(self, matrice: List[Dict]) -> Dict[str, List[str]]:
        """Génère les recommandations par quadrant"""
        return {
            'STRATEGIC': [
                'Développer le partenariat',
                'Négocier des accords-cadres',
                'Mettre en place des SLA'
            ],
            'BOTTLENECK': [
                'Plan d\'amélioration urgent',
                'Rechercher des alternatives',
                'Surveiller étroitement'
            ],
            'LEVERAGE': [
                'Exploiter le potentiel',
                'Négocier de meilleures conditions',
                'Augmenter les volumes'
            ],
            'ROUTINE': [
                'Automatiser les achats',
                'Simplifier les processus',
                'Consolider les fournisseurs'
            ]
        }


class SupplierPaymentService:
    """
    Service de gestion des paiements fournisseurs
    Conforme section 2.3 - Gestion des échéances
    """

    def __init__(self, company):
        self.company = company

    def planifier_paiements_optimaux(self, date_limite: date) -> Dict[str, Any]:
        """
        Planification optimale des paiements
        Conforme section 2.3.2 - Planification des paiements
        """
        factures_a_payer = SupplierInvoice.objects.filter(
            supplier__company=self.company,
            due_date__lte=date_limite,
            status__in=['VALIDATED', 'ACCOUNTING_OK', 'APPROVED']
        ).select_related('supplier')

        # Stratégies de paiement
        strategies = {
            'paiement_echeance': self._strategy_paiement_echeance(factures_a_payer),
            'paiement_anticipe': self._strategy_paiement_anticipe(factures_a_payer),
            'paiement_groupe': self._strategy_paiement_groupe(factures_a_payer),
        }

        # Recommandation optimale
        recommandation = self._choisir_strategie_optimale(strategies)

        return {
            'strategies': strategies,
            'recommandation': recommandation,
            'economies_potentielles': self._calculer_economies_potentielles(strategies),
            'impact_tresorerie': self._calculer_impact_tresorerie(strategies),
        }

    def _strategy_paiement_echeance(self, factures) -> Dict[str, Any]:
        """Stratégie : paiement à échéance"""
        montant_total = factures.aggregate(
            total=Sum('amount_incl_tax')
        )['total'] or Decimal('0')

        return {
            'nom': 'Paiement à échéance',
            'factures_count': factures.count(),
            'montant_total': montant_total,
            'economies': Decimal('0'),
            'impact_tresorerie': 'NEUTRE'
        }

    def _strategy_paiement_anticipe(self, factures) -> Dict[str, Any]:
        """Stratégie : paiement anticipé avec escompte"""
        factures_escomptables = factures.filter(
            supplier__discount_rate__gt=0
        )

        economies_totales = Decimal('0')
        for facture in factures_escomptables:
            taux_escompte = facture.supplier.discount_rate
            economie = facture.amount_incl_tax * taux_escompte / 100
            economies_totales += economie

        return {
            'nom': 'Paiement anticipé',
            'factures_count': factures_escomptables.count(),
            'montant_total': factures_escomptables.aggregate(
                total=Sum('amount_incl_tax')
            )['total'] or Decimal('0'),
            'economies': economies_totales,
            'impact_tresorerie': 'NEGATIF'
        }

    def _strategy_paiement_groupe(self, factures) -> Dict[str, Any]:
        """Stratégie : paiements groupés par fournisseur"""
        # Groupement par fournisseur
        groupes = {}
        for facture in factures:
            supplier_id = facture.supplier.id
            if supplier_id not in groupes:
                groupes[supplier_id] = {
                    'supplier': facture.supplier,
                    'factures': [],
                    'montant_total': Decimal('0')
                }
            groupes[supplier_id]['factures'].append(facture)
            groupes[supplier_id]['montant_total'] += facture.amount_incl_tax

        return {
            'nom': 'Paiements groupés',
            'groupes_count': len(groupes),
            'economies_frais': len(groupes) * Decimal('5.00'),  # 5€ économisé par groupe
            'impact_tresorerie': 'POSITIF'
        }

    def _choisir_strategie_optimale(self, strategies: Dict) -> str:
        """Choix de la stratégie optimale basée sur les économies"""
        max_economies = Decimal('0')
        meilleure_strategie = 'paiement_echeance'

        for nom, strategy in strategies.items():
            economies = strategy.get('economies', Decimal('0'))
            if economies > max_economies:
                max_economies = economies
                meilleure_strategie = nom

        return meilleure_strategie

    def _calculer_economies_potentielles(self, strategies: Dict) -> Decimal:
        """Calcul des économies potentielles totales"""
        return sum(
            strategy.get('economies', Decimal('0'))
            for strategy in strategies.values()
        )

    def _calculer_impact_tresorerie(self, strategies: Dict) -> Dict[str, str]:
        """Impact sur la trésorerie par stratégie"""
        return {
            nom: strategy.get('impact_tresorerie', 'NEUTRE')
            for nom, strategy in strategies.items()
        }

    def generer_fichier_virement_sepa(self, paiements_ids: List[str]) -> Dict[str, Any]:
        """
        Génération fichier SEPA XML
        Conforme section 2.3.2 - Génération de fichiers de virement SEPA
        """
        # Récupération des paiements
        paiements = SupplierPayment.objects.filter(
            id__in=paiements_ids,
            status='APPROVED'
        ).select_related('supplier')

        if not paiements.exists():
            return {'erreur': 'Aucun paiement approuvé trouvé'}

        # Génération du fichier SEPA (simplifié)
        sepa_data = {
            'header': {
                'message_id': f"SEPA_{timezone.now().strftime('%Y%m%d_%H%M%S')}",
                'creation_datetime': timezone.now().isoformat(),
                'nb_transactions': paiements.count(),
                'montant_total': paiements.aggregate(
                    total=Sum('net_amount')
                )['total']
            },
            'transactions': []
        }

        for paiement in paiements:
            sepa_data['transactions'].append({
                'end_to_end_id': str(paiement.id)[:35],
                'beneficiary_name': paiement.supplier.legal_name[:70],
                'beneficiary_iban': paiement.supplier.iban,
                'beneficiary_bic': paiement.supplier.bic,
                'amount': float(paiement.net_amount),
                'currency': 'EUR',
                'reference': paiement.payment_reference[:140],
                'execution_date': paiement.payment_date.isoformat()
            })

        return {
            'sepa_data': sepa_data,
            'nb_paiements': paiements.count(),
            'montant_total': sepa_data['header']['montant_total'],
            'fichier_genere': True
        }


class SupplierMatchingService:
    """
    Service de lettrage fournisseurs
    Conforme section 2.5 - Lettrage Fournisseurs
    """

    def __init__(self, company):
        self.company = company

    def lettrage_automatique_global(self) -> Dict[str, Any]:
        """
        Lettrage automatique pour tous les fournisseurs
        Conforme section 2.5.2 - Lettrage automatique
        """
        resultats = {
            'fournisseurs_traites': 0,
            'ecritures_lettrees': 0,
            'montant_lettre': Decimal('0'),
            'erreurs': []
        }

        # Traitement par fournisseur
        for supplier in Supplier.objects.filter(company=self.company, status='ACTIVE'):
            try:
                resultat_supplier = self.lettrage_automatique_supplier(supplier)
                resultats['fournisseurs_traites'] += 1
                resultats['ecritures_lettrees'] += resultat_supplier['ecritures_lettrees']
                resultats['montant_lettre'] += resultat_supplier['montant_lettre']
            except Exception as e:
                resultats['erreurs'].append({
                    'supplier': supplier.code,
                    'erreur': str(e)
                })

        return resultats

    def lettrage_automatique_supplier(self, supplier: Supplier) -> Dict[str, Any]:
        """Lettrage automatique pour un fournisseur spécifique"""
        if not supplier.account:
            raise ValueError("Compte comptable manquant")

        # Récupération des écritures non lettrées
        ecritures_non_lettrees = JournalEntryLine.objects.filter(
            account=supplier.account,
            third_party=supplier,
            entry__is_validated=True,
            is_reconciled=False
        ).order_by('entry__entry_date')

        if not ecritures_non_lettrees.exists():
            return {
                'ecritures_lettrees': 0,
                'montant_lettre': Decimal('0'),
                'message': 'Aucune écriture à lettrer'
            }

        # Algorithme de lettrage par montant exact
        ecritures_lettrees = 0
        montant_total_lettre = Decimal('0')

        # Groupement par montant (recherche montants compensés)
        montants_debit = {}
        montants_credit = {}

        for ecriture in ecritures_non_lettrees:
            if ecriture.debit_amount > 0:
                montant = ecriture.debit_amount
                if montant not in montants_debit:
                    montants_debit[montant] = []
                montants_debit[montant].append(ecriture)

            if ecriture.credit_amount > 0:
                montant = ecriture.credit_amount
                if montant not in montants_credit:
                    montants_credit[montant] = []
                montants_credit[montant].append(ecriture)

        # Lettrage des montants identiques
        for montant, ecritures_debit in montants_debit.items():
            if montant in montants_credit:
                ecritures_credit = montants_credit[montant]

                # Lettrage 1:1
                nb_lettrages = min(len(ecritures_debit), len(ecritures_credit))

                for i in range(nb_lettrages):
                    code_lettrage = self._generer_code_lettrage()

                    # Marquage lettré
                    ecritures_debit[i].is_reconciled = True
                    ecritures_debit[i].reconciliation_code = code_lettrage
                    ecritures_debit[i].save()

                    ecritures_credit[i].is_reconciled = True
                    ecritures_credit[i].reconciliation_code = code_lettrage
                    ecritures_credit[i].save()

                    ecritures_lettrees += 2
                    montant_total_lettre += montant

        return {
            'ecritures_lettrees': ecritures_lettrees,
            'montant_lettre': montant_total_lettre,
            'message': f'{ecritures_lettrees} écritures lettrées automatiquement'
        }

    def _generer_code_lettrage(self) -> str:
        """Génère un code de lettrage unique"""
        import uuid
        return f"LET{str(uuid.uuid4())[:8].upper()}"

    def proposer_lettrage_manuel(self, supplier: Supplier) -> Dict[str, Any]:
        """
        Propose des lettrages manuels avec tolérances
        Conforme section 2.5.1 - Lettrage manuel
        """
        if not supplier.account:
            return {'erreur': 'Compte comptable manquant'}

        # Écritures non lettrées
        ecritures = JournalEntryLine.objects.filter(
            account=supplier.account,
            third_party=supplier,
            entry__is_validated=True,
            is_reconciled=False
        ).select_related('entry')

        # Propositions de lettrage avec tolérance
        propositions = []
        tolerance = Decimal('0.01')  # 1 centime de tolérance

        ecritures_debit = [e for e in ecritures if e.debit_amount > 0]
        ecritures_credit = [e for e in ecritures if e.credit_amount > 0]

        for debit in ecritures_debit:
            for credit in ecritures_credit:
                ecart = abs(debit.debit_amount - credit.credit_amount)

                if ecart <= tolerance:
                    propositions.append({
                        'ecritures': [debit.id, credit.id],
                        'montant_debit': debit.debit_amount,
                        'montant_credit': credit.credit_amount,
                        'ecart': ecart,
                        'confiance': 'HAUTE' if ecart == 0 else 'MOYENNE',
                        'references': [
                            debit.entry.reference,
                            credit.entry.reference
                        ]
                    })

        return {
            'supplier': {
                'code': supplier.code,
                'name': supplier.legal_name
            },
            'propositions': propositions[:20],  # Limité aux 20 meilleures
            'nb_ecritures_non_lettrees': ecritures.count(),
            'solde_non_lettre': sum(
                e.credit_amount - e.debit_amount for e in ecritures
            )
        }