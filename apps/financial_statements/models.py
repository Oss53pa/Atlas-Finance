"""
Module États Financiers SYSCOHADA - WiseBook
Génération automatique des états financiers conformes
Conforme au cahier des charges - Tables normalisées
"""
from django.db import models
from django.db.models import JSONField
from django.conf import settings
from decimal import Decimal
import uuid
from datetime import date

from apps.core.models import TimeStampedModel
from apps.accounting.models import Company, FiscalYear, ChartOfAccounts, JournalEntry


class BilanComptable(TimeStampedModel):
    """
    Table Bilan Comptable SYSCOHADA - Actif/Passif
    Génération automatique conforme cahier des charges
    """

    BILAN_TYPE_CHOICES = [
        ('ACTIF', 'Actif'),
        ('PASSIF', 'Passif'),
    ]

    SECTION_CHOICES = [
        # ACTIF
        ('ACTIF_IMMOBILISE', 'Actif immobilisé'),
        ('ACTIF_CIRCULANT', 'Actif circulant'),
        ('TRESORERIE_ACTIF', 'Trésorerie - Actif'),

        # PASSIF
        ('CAPITAUX_PROPRES', 'Capitaux propres'),
        ('DETTES_FINANCIERES', 'Dettes financières'),
        ('PASSIF_CIRCULANT', 'Passif circulant'),
        ('TRESORERIE_PASSIF', 'Trésorerie - Passif'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='bilans')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='bilans')

    # Classification SYSCOHADA
    bilan_type = models.CharField(max_length=10, choices=BILAN_TYPE_CHOICES)
    section = models.CharField(max_length=30, choices=SECTION_CHOICES)

    # Ligne du bilan
    ligne_numero = models.CharField(max_length=10, help_text="Ex: AA, AB, AC...")
    libelle = models.CharField(max_length=200)

    # Comptes associés
    comptes_inclus = models.ManyToManyField(
        ChartOfAccounts,
        related_name='bilan_lines',
        help_text="Comptes SYSCOHADA inclus dans cette ligne"
    )

    # Montants
    montant_brut = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    amortissements_provisions = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    montant_net = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    montant_exercice_precedent = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Ordre d'affichage
    ordre_affichage = models.IntegerField(default=1)

    # Métadonnées de calcul
    date_generation = models.DateTimeField(auto_now=True)
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'financial_bilan_comptable'
        unique_together = [('company', 'fiscal_year', 'ligne_numero')]
        ordering = ['bilan_type', 'ordre_affichage']
        verbose_name = 'Ligne Bilan Comptable'
        verbose_name_plural = 'Lignes Bilan Comptable'

    def __str__(self):
        return f"{self.ligne_numero} - {self.libelle}"

    def calculer_montants(self):
        """Calcul automatique depuis les comptes comptables"""
        total_brut = Decimal('0.00')
        total_amort_prov = Decimal('0.00')

        for account in self.comptes_inclus.all():
            # Calcul du solde depuis les écritures
            solde_data = account.calculate_balance(self.fiscal_year)

            if self.bilan_type == 'ACTIF':
                # Pour l'actif : solde débiteur
                total_brut += solde_data.get('solde_debiteur', Decimal('0.00'))
            else:
                # Pour le passif : solde créditeur
                total_brut += solde_data.get('solde_crediteur', Decimal('0.00'))

        # Calcul amortissements et provisions (comptes 28x, 39x, 49x, 59x, 69x)
        if self.bilan_type == 'ACTIF':
            for account in self.comptes_inclus.filter(code__regex=r'^[2-6][89]'):
                solde_amort = account.calculate_balance(self.fiscal_year)
                total_amort_prov += solde_amort.get('solde_crediteur', Decimal('0.00'))

        self.montant_brut = total_brut
        self.amortissements_provisions = total_amort_prov
        self.montant_net = total_brut - total_amort_prov

        self.save(update_fields=['montant_brut', 'amortissements_provisions', 'montant_net'])


class CompteResultat(TimeStampedModel):
    """
    Table Compte de Résultat SYSCOHADA
    Production automatique conforme cahier des charges
    """

    NATURE_CHOICES = [
        ('ACTIVITE_EXPLOITATION', 'Activité d\'exploitation'),
        ('ACTIVITE_FINANCIERE', 'Activité financière'),
        ('ACTIVITE_EXCEPTIONNELLE', 'Activité exceptionnelle'),
        ('PARTICIPATION_SALARIES', 'Participation des salariés'),
        ('IMPOTS_TAXES', 'Impôts sur les sociétés'),
    ]

    TYPE_CHOICES = [
        ('PRODUITS', 'Produits'),
        ('CHARGES', 'Charges'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='comptes_resultat')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='comptes_resultat')

    # Classification SYSCOHADA
    ligne_numero = models.CharField(max_length=10, help_text="Ex: TA, TB, TC...")
    libelle = models.CharField(max_length=200)
    nature = models.CharField(max_length=30, choices=NATURE_CHOICES)
    type_element = models.CharField(max_length=10, choices=TYPE_CHOICES)

    # Comptes inclus
    comptes_inclus = models.ManyToManyField(
        ChartOfAccounts,
        related_name='compte_resultat_lines',
        help_text="Comptes SYSCOHADA (6x pour charges, 7x pour produits)"
    )

    # Montants
    montant_exercice = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    montant_exercice_precedent = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Pourcentage du CA (pour analyses)
    pourcentage_ca = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    # Ordre d'affichage
    ordre_affichage = models.IntegerField(default=1)

    # Métadonnées
    date_generation = models.DateTimeField(auto_now=True)
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    class Meta:
        db_table = 'financial_compte_resultat'
        unique_together = [('company', 'fiscal_year', 'ligne_numero')]
        ordering = ['ordre_affichage']
        verbose_name = 'Ligne Compte de Résultat'
        verbose_name_plural = 'Lignes Compte de Résultat'

    def __str__(self):
        return f"{self.ligne_numero} - {self.libelle}"

    def calculer_montant(self):
        """Calcul automatique depuis les comptes"""
        total = Decimal('0.00')

        for account in self.comptes_inclus.all():
            solde_data = account.calculate_balance(self.fiscal_year)

            if self.type_element == 'PRODUITS':
                # Produits : solde créditeur
                total += solde_data.get('solde_crediteur', Decimal('0.00'))
            else:
                # Charges : solde débiteur
                total += solde_data.get('solde_debiteur', Decimal('0.00'))

        self.montant_exercice = total
        self.save(update_fields=['montant_exercice'])


class SoldesIntermediaires(TimeStampedModel):
    """
    Table SIG - Soldes Intermédiaires de Gestion
    9 soldes SYSCOHADA conforme cahier des charges
    """

    SOLDE_CHOICES = [
        ('MARGE_COMMERCIALE', 'Marge commerciale'),
        ('PRODUCTION', 'Production de l\'exercice'),
        ('VALEUR_AJOUTEE', 'Valeur ajoutée'),
        ('EBE', 'Excédent brut d\'exploitation'),
        ('RESULTAT_EXPLOITATION', 'Résultat d\'exploitation'),
        ('RESULTAT_COURANT', 'Résultat courant avant impôts'),
        ('RESULTAT_EXCEPTIONNEL', 'Résultat exceptionnel'),
        ('RESULTAT_NET', 'Résultat net comptable'),
        ('CAPACITE_AUTOFINANCEMENT', 'Capacité d\'autofinancement'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='soldes_intermediaires')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='soldes_intermediaires')

    # Type de solde
    solde_type = models.CharField(max_length=30, choices=SOLDE_CHOICES)
    libelle = models.CharField(max_length=200)

    # Formule de calcul
    formule_calcul = models.TextField(help_text="Formule de calcul du solde")

    # Montants
    montant_exercice = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    montant_exercice_precedent = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Évolution
    evolution_absolue = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    evolution_relative = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    # Pourcentage du CA
    pourcentage_ca = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    # Composants du calcul
    composants_calcul = JSONField(default=dict, help_text="Détail des composants du calcul")

    # Ordre d'affichage
    ordre_affichage = models.IntegerField(default=1)

    # Métadonnées
    date_generation = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'financial_soldes_intermediaires'
        unique_together = [('company', 'fiscal_year', 'solde_type')]
        ordering = ['ordre_affichage']
        verbose_name = 'Solde Intermédiaire de Gestion'
        verbose_name_plural = 'Soldes Intermédiaires de Gestion'

    def __str__(self):
        return f"{self.libelle} - {self.fiscal_year.name}"


class RatioFinancier(TimeStampedModel):
    """
    Table Ratios Financiers - Calculs automatiques
    Structure, rentabilité, liquidité, activité
    """

    CATEGORY_CHOICES = [
        ('STRUCTURE', 'Structure financière'),
        ('RENTABILITE', 'Rentabilité'),
        ('LIQUIDITE', 'Liquidité et solvabilité'),
        ('ACTIVITE', 'Activité et rotation'),
        ('ENDETTEMENT', 'Endettement'),
        ('PRODUCTIVITE', 'Productivité'),
    ]

    RATIO_TYPE_CHOICES = [
        # Structure financière
        ('AUTONOMIE_FINANCIERE', 'Autonomie financière'),
        ('RATIO_ENDETTEMENT', 'Ratio d\'endettement'),
        ('COUVERTURE_CAPITAUX', 'Couverture des capitaux'),

        # Rentabilité
        ('ROA', 'Return on Assets (ROA)'),
        ('ROE', 'Return on Equity (ROE)'),
        ('MARGE_NETTE', 'Marge nette'),
        ('MARGE_BRUTE', 'Marge brute'),

        # Liquidité
        ('LIQUIDITE_GENERALE', 'Liquidité générale'),
        ('LIQUIDITE_REDUITE', 'Liquidité réduite'),
        ('LIQUIDITE_IMMEDIATE', 'Liquidité immédiate'),

        # Activité
        ('ROTATION_STOCKS', 'Rotation des stocks'),
        ('ROTATION_CLIENTS', 'Rotation clients'),
        ('ROTATION_FOURNISSEURS', 'Rotation fournisseurs'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='ratios_financiers')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='ratios_financiers')

    # Classification
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    ratio_type = models.CharField(max_length=30, choices=RATIO_TYPE_CHOICES)
    libelle = models.CharField(max_length=200)

    # Formule
    formule = models.CharField(max_length=500, help_text="Formule de calcul du ratio")

    # Valeurs
    valeur_exercice = models.DecimalField(max_digits=10, decimal_places=4, default=Decimal('0.0000'))
    valeur_exercice_precedent = models.DecimalField(max_digits=10, decimal_places=4, default=Decimal('0.0000'))

    # Unité et interprétation
    unite = models.CharField(max_length=20, default='%', help_text="%, ratio, jours, fois...")
    valeur_optimale_min = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    valeur_optimale_max = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)

    # Évaluation automatique
    evaluation = models.CharField(max_length=20, choices=[
        ('EXCELLENT', 'Excellent'),
        ('BON', 'Bon'),
        ('ACCEPTABLE', 'Acceptable'),
        ('FAIBLE', 'Faible'),
        ('CRITIQUE', 'Critique'),
    ], default='ACCEPTABLE')

    # Détails du calcul
    numerateur = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    denominateur = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    composants_calcul = JSONField(default=dict, help_text="Détail des composants")

    # Évolution
    evolution_absolue = models.DecimalField(max_digits=10, decimal_places=4, default=Decimal('0.0000'))
    evolution_relative = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))

    # Ordre d'affichage
    ordre_affichage = models.IntegerField(default=1)

    # Métadonnées
    date_generation = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'financial_ratios'
        unique_together = [('company', 'fiscal_year', 'ratio_type')]
        ordering = ['category', 'ordre_affichage']
        verbose_name = 'Ratio Financier'
        verbose_name_plural = 'Ratios Financiers'

    def __str__(self):
        return f"{self.libelle} - {self.valeur_exercice}"

    def evaluer_performance(self):
        """Évaluation automatique du ratio"""
        if self.valeur_optimale_min and self.valeur_optimale_max:
            if self.valeur_optimale_min <= self.valeur_exercice <= self.valeur_optimale_max:
                self.evaluation = 'EXCELLENT'
            elif self.valeur_exercice >= self.valeur_optimale_min * Decimal('0.8'):
                self.evaluation = 'BON'
            elif self.valeur_exercice >= self.valeur_optimale_min * Decimal('0.6'):
                self.evaluation = 'ACCEPTABLE'
            elif self.valeur_exercice >= self.valeur_optimale_min * Decimal('0.4'):
                self.evaluation = 'FAIBLE'
            else:
                self.evaluation = 'CRITIQUE'

        self.save(update_fields=['evaluation'])


class TableauFluxTresorerie(TimeStampedModel):
    """
    Tableau des Flux de Trésorerie (TAFIRE) SYSCOHADA
    Conforme cahier des charges
    """

    FLUX_TYPE_CHOICES = [
        ('EXPLOITATION', 'Flux liés à l\'activité d\'exploitation'),
        ('INVESTISSEMENT', 'Flux liés aux opérations d\'investissement'),
        ('FINANCEMENT', 'Flux liés aux opérations de financement'),
    ]

    SENS_CHOICES = [
        ('ENTREE', 'Flux d\'entrée (+)'),
        ('SORTIE', 'Flux de sortie (-)'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='flux_tresorerie')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='flux_tresorerie')

    # Classification
    flux_type = models.CharField(max_length=20, choices=FLUX_TYPE_CHOICES)
    sens = models.CharField(max_length=10, choices=SENS_CHOICES)

    # Ligne du tableau
    ligne_numero = models.CharField(max_length=10, help_text="Ex: FA, FB, FC...")
    libelle = models.CharField(max_length=200)

    # Montants
    montant_exercice = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    montant_exercice_precedent = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Méthode de calcul
    methode_calcul = models.CharField(max_length=20, choices=[
        ('DIRECTE', 'Méthode directe'),
        ('INDIRECTE', 'Méthode indirecte'),
    ], default='INDIRECTE')

    # Comptes source pour le calcul
    comptes_source = models.ManyToManyField(
        ChartOfAccounts,
        related_name='flux_tresorerie_lines',
        blank=True
    )

    # Formule de calcul
    formule_calcul = models.TextField(blank=True)

    # Ordre d'affichage
    ordre_affichage = models.IntegerField(default=1)

    # Métadonnées
    date_generation = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'financial_flux_tresorerie'
        unique_together = [('company', 'fiscal_year', 'ligne_numero')]
        ordering = ['flux_type', 'ordre_affichage']
        verbose_name = 'Ligne Flux de Trésorerie'
        verbose_name_plural = 'Lignes Flux de Trésorerie'

    def __str__(self):
        return f"{self.ligne_numero} - {self.libelle}"


class TableFinancement(TimeStampedModel):
    """
    Table de Financement SYSCOHADA
    Ressources et emplois
    """

    NATURE_CHOICES = [
        ('RESSOURCES', 'Ressources'),
        ('EMPLOIS', 'Emplois'),
    ]

    TYPE_CHOICES = [
        ('DURABLES', 'Ressources/Emplois durables'),
        ('CIRCULANT', 'Variation du circulant'),
        ('TRESORERIE', 'Variation de trésorerie'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='tables_financement')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='tables_financement')

    # Classification
    nature = models.CharField(max_length=15, choices=NATURE_CHOICES)
    type_element = models.CharField(max_length=15, choices=TYPE_CHOICES)

    # Ligne
    ligne_numero = models.CharField(max_length=10)
    libelle = models.CharField(max_length=200)

    # Montants
    montant_exercice = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))
    montant_exercice_precedent = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Calculs intermédiaires
    variation_absolue = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0.00'))

    # Comptes associés
    comptes_inclus = models.ManyToManyField(ChartOfAccounts, related_name='table_financement_lines')

    # Ordre d'affichage
    ordre_affichage = models.IntegerField(default=1)

    # Métadonnées
    date_generation = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'financial_table_financement'
        unique_together = [('company', 'fiscal_year', 'ligne_numero')]
        ordering = ['nature', 'ordre_affichage']
        verbose_name = 'Ligne Table de Financement'
        verbose_name_plural = 'Lignes Table de Financement'


class FinancialReport(TimeStampedModel):
    """
    Rapports financiers générés
    Consolidation et génération PDF/Excel
    """

    REPORT_TYPE_CHOICES = [
        ('BILAN_COMPTABLE', 'Bilan comptable'),
        ('COMPTE_RESULTAT', 'Compte de résultat'),
        ('TAFIRE', 'Tableau des flux (TAFIRE)'),
        ('TABLE_FINANCEMENT', 'Table de financement'),
        ('SIG', 'Soldes intermédiaires de gestion'),
        ('RATIOS', 'Ratios financiers'),
        ('SYNTHESE_COMPLETE', 'Synthèse complète'),
    ]

    OUTPUT_FORMAT_CHOICES = [
        ('PDF', 'PDF'),
        ('EXCEL', 'Excel'),
        ('CSV', 'CSV'),
        ('JSON', 'JSON'),
        ('WEB', 'Dashboard Web'),
    ]

    STATUS_CHOICES = [
        ('GENERATING', 'En cours de génération'),
        ('READY', 'Prêt'),
        ('ERROR', 'Erreur'),
        ('ARCHIVED', 'Archivé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='financial_reports')
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='financial_reports')

    # Configuration rapport
    report_type = models.CharField(max_length=30, choices=REPORT_TYPE_CHOICES)
    report_name = models.CharField(max_length=200)
    output_format = models.CharField(max_length=10, choices=OUTPUT_FORMAT_CHOICES)

    # Période couverte
    period_start = models.DateField()
    period_end = models.DateField()

    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='GENERATING')

    # Fichier généré
    generated_file = models.FileField(upload_to='financial_reports/%Y/%m/', blank=True)
    file_size = models.PositiveIntegerField(null=True, blank=True)

    # Configuration génération
    include_comparisons = models.BooleanField(default=True, help_text="Inclure comparaisons N-1")
    include_graphs = models.BooleanField(default=True, help_text="Inclure graphiques")
    include_ratios = models.BooleanField(default=False, help_text="Inclure ratios")

    # Métadonnées génération
    generated_at = models.DateTimeField(null=True, blank=True)
    generated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    generation_time_seconds = models.IntegerField(null=True, blank=True)

    # Données du rapport
    report_data = JSONField(default=dict, help_text="Données du rapport en JSON")

    class Meta:
        db_table = 'financial_reports'
        ordering = ['-generated_at']
        verbose_name = 'Rapport Financier'
        verbose_name_plural = 'Rapports Financiers'

    def __str__(self):
        return f"{self.report_name} - {self.fiscal_year.name}"


class AuditTrail(TimeStampedModel):
    """
    Piste d'audit pour états financiers
    Traçabilité complète conforme cahier des charges
    """

    ACTION_CHOICES = [
        ('GENERATION', 'Génération état'),
        ('MODIFICATION', 'Modification'),
        ('VALIDATION', 'Validation'),
        ('EXPORT', 'Export'),
        ('CONSULTATION', 'Consultation'),
        ('IMPRESSION', 'Impression'),
        ('SUPPRESSION', 'Suppression'),
    ]

    OBJECT_TYPE_CHOICES = [
        ('BILAN', 'Bilan'),
        ('COMPTE_RESULTAT', 'Compte de résultat'),
        ('SIG', 'SIG'),
        ('RATIOS', 'Ratios'),
        ('TAFIRE', 'TAFIRE'),
        ('REPORT', 'Rapport'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='financial_audit_trail')

    # Action tracée
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    object_type = models.CharField(max_length=20, choices=OBJECT_TYPE_CHOICES)
    object_id = models.CharField(max_length=50, help_text="ID de l'objet modifié")

    # Utilisateur et contexte
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    session_id = models.CharField(max_length=100, blank=True)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)

    # Détails de l'action
    description = models.TextField()
    old_values = JSONField(default=dict, help_text="Valeurs avant modification")
    new_values = JSONField(default=dict, help_text="Valeurs après modification")

    # Contexte métier
    fiscal_year = models.ForeignKey(FiscalYear, on_delete=models.SET_NULL, null=True)
    business_context = JSONField(default=dict, help_text="Contexte métier")

    # Horodatage précis
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'financial_audit_trail'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['company', 'object_type', '-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
        ]
        verbose_name = 'Trace Audit Financier'
        verbose_name_plural = 'Traces Audit Financier'

    def __str__(self):
        return f"{self.action} {self.object_type} by {self.user} at {self.timestamp}"


class FinancialDashboard(TimeStampedModel):
    """
    Configuration des tableaux de bord financiers
    Personnalisables par utilisateur/rôle
    """

    DASHBOARD_TYPE_CHOICES = [
        ('EXECUTIVE', 'Direction générale'),
        ('FINANCIAL', 'Direction financière'),
        ('OPERATIONAL', 'Opérationnel'),
        ('INVESTOR', 'Investisseurs'),
        ('AUDITOR', 'Auditeurs'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='financial_dashboards')

    # Configuration
    dashboard_type = models.CharField(max_length=20, choices=DASHBOARD_TYPE_CHOICES)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Utilisateur
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='financial_dashboards')
    is_public = models.BooleanField(default=False)

    # Configuration widgets
    widgets_config = JSONField(default=list, help_text="Configuration des widgets")
    layout_config = JSONField(default=dict, help_text="Configuration layout")

    # Actualisation
    auto_refresh = models.BooleanField(default=True)
    refresh_interval_minutes = models.IntegerField(default=60)

    # Données calculées
    cached_data = JSONField(default=dict, help_text="Données mises en cache")
    last_refresh = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'financial_dashboards'
        ordering = ['-created_at']
        verbose_name = 'Tableau de Bord Financier'
        verbose_name_plural = 'Tableaux de Bord Financiers'

    def __str__(self):
        return f"{self.name} - {self.dashboard_type}"