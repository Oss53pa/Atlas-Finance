"""
Modèles de Clôture Comptable Périodique WiseBook
Système complet de bout en bout pour opérations comptables réelles
"""
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
import uuid
from datetime import date

from apps.core.models import TimeStampedModel
from apps.accounting.models import Company, FiscalYear, ChartOfAccounts, JournalEntry, Journal


class PeriodeClotureComptable(TimeStampedModel):
    """
    Période de clôture comptable avec opérations réelles
    """

    TYPE_CLOTURE = [
        ('MENSUELLE', 'Clôture Mensuelle'),
        ('TRIMESTRIELLE', 'Clôture Trimestrielle'),
        ('SEMESTRIELLE', 'Clôture Semestrielle'),
        ('ANNUELLE', 'Clôture Annuelle'),
    ]

    STATUT_CLOTURE = [
        ('OUVERTE', 'Ouverte'),
        ('EN_COURS', 'En Cours'),
        ('TERMINEE', 'Terminée'),
        ('VALIDEE', 'Validée'),
        ('CLOTUREE', 'Clôturée'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    societe = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='clotures_comptables')
    exercice = models.ForeignKey(FiscalYear, on_delete=models.CASCADE, related_name='clotures_comptables')

    # Identification
    nom_periode = models.CharField(max_length=100, verbose_name="Nom de la période")
    type_cloture = models.CharField(max_length=20, choices=TYPE_CLOTURE)
    mois_cloture = models.PositiveSmallIntegerField(verbose_name="Mois de clôture (1-12)")

    # Dates
    date_debut_periode = models.DateField(verbose_name="Début de période")
    date_fin_periode = models.DateField(verbose_name="Fin de période")
    date_limite_cloture = models.DateField(verbose_name="Date limite clôture")
    date_cloture_reelle = models.DateTimeField(null=True, blank=True, verbose_name="Date clôture réelle")

    # État
    statut = models.CharField(max_length=20, choices=STATUT_CLOTURE, default='OUVERTE')
    pourcentage_avancement = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0'))

    # Responsables
    cree_par = models.ForeignKey(User, on_delete=models.PROTECT, related_name='clotures_creees')
    responsable = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='clotures_assignees')
    valide_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='clotures_validees')

    # Résultats comptables
    nombre_ecritures_generees = models.PositiveIntegerField(default=0)
    montant_total_provisions = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    montant_total_amortissements = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    montant_total_regularisations = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))

    # Contrôles
    balance_equilibree = models.BooleanField(default=False)
    controles_passes = models.PositiveIntegerField(default=0)
    controles_echecs = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'periodes_cloture_comptable'
        unique_together = [('societe', 'exercice', 'mois_cloture')]
        ordering = ['-date_fin_periode']
        verbose_name = "Période Clôture Comptable"
        verbose_name_plural = "Périodes Clôture Comptable"

    def __str__(self):
        return f"{self.societe.name} - {self.nom_periode}"


class OperationClotureComptable(TimeStampedModel):
    """
    Opération individuelle de clôture avec écritures générées
    """

    TYPE_OPERATION = [
        ('PROVISION_CLIENTS', 'Provisions Créances Clients'),
        ('AMORTISSEMENT', 'Calcul Amortissements'),
        ('CHARGES_A_PAYER', 'Charges à Payer'),
        ('PRODUITS_A_RECEVOIR', 'Produits à Recevoir'),
        ('CHARGES_CONSTATEES_AVANCE', 'Charges Constatées d\'Avance'),
        ('PRODUITS_CONSTATES_AVANCE', 'Produits Constatés d\'Avance'),
        ('BALANCE_GENERALE', 'Génération Balance Générale'),
    ]

    STATUT_OPERATION = [
        ('EN_ATTENTE', 'En Attente'),
        ('EN_COURS', 'En Cours'),
        ('TERMINEE', 'Terminée'),
        ('ERREUR', 'Erreur'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    periode_cloture = models.ForeignKey(PeriodeClotureComptable, on_delete=models.CASCADE, related_name='operations')

    # Configuration
    type_operation = models.CharField(max_length=30, choices=TYPE_OPERATION)
    nom_operation = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Exécution
    statut = models.CharField(max_length=20, choices=STATUT_OPERATION, default='EN_ATTENTE')
    date_execution = models.DateTimeField(null=True, blank=True)
    duree_execution_ms = models.PositiveIntegerField(default=0)
    execute_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    # Résultats comptables
    montant_calcule = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    nombre_ecritures_creees = models.PositiveIntegerField(default=0)
    nombre_comptes_affectes = models.PositiveIntegerField(default=0)

    # Écritures comptables générées
    ecritures_generees = models.ManyToManyField(JournalEntry, blank=True, related_name='operations_cloture')

    # Messages et logs
    message_resultat = models.TextField(blank=True)
    message_erreur = models.TextField(blank=True)
    log_execution = models.TextField(blank=True)

    # Conformité SYSCOHADA
    conforme_syscohada = models.BooleanField(default=False)
    reference_syscohada = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'operations_cloture_comptable'
        ordering = ['created_at']
        verbose_name = "Opération Clôture Comptable"
        verbose_name_plural = "Opérations Clôture Comptable"


class ProvisionClient(TimeStampedModel):
    """
    Calcul de provision pour créances clients selon SYSCOHADA
    """

    operation_cloture = models.ForeignKey(OperationClotureComptable, on_delete=models.CASCADE, related_name='provisions_clients')
    compte_client = models.ForeignKey(ChartOfAccounts, on_delete=models.CASCADE, related_name='provisions')

    # Données client
    solde_client = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Solde créance")
    anciennete_jours = models.PositiveIntegerField(verbose_name="Ancienneté en jours")

    # Calcul provision SYSCOHADA
    taux_provision_syscohada = models.DecimalField(max_digits=5, decimal_places=2, verbose_name="Taux SYSCOHADA (%)")
    montant_provision = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Montant provision")

    # Justification
    justification = models.TextField(verbose_name="Justification provision")

    # Écriture générée
    ecriture_provision = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'provisions_clients_cloture'
        verbose_name = "Provision Client"
        verbose_name_plural = "Provisions Clients"


class AmortissementImmobilisation(TimeStampedModel):
    """
    Calcul d'amortissement pour immobilisations selon SYSCOHADA
    """

    operation_cloture = models.ForeignKey(OperationClotureComptable, on_delete=models.CASCADE, related_name='amortissements')
    compte_immobilisation = models.ForeignKey(ChartOfAccounts, on_delete=models.CASCADE, related_name='amortissements')

    # Données immobilisation
    valeur_acquisition = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Valeur d'acquisition")
    date_acquisition = models.DateField(verbose_name="Date d'acquisition")
    duree_amortissement_annees = models.PositiveIntegerField(verbose_name="Durée amortissement (années)")

    # Calcul amortissement
    taux_amortissement_syscohada = models.DecimalField(max_digits=8, decimal_places=4, verbose_name="Taux SYSCOHADA")
    amortissement_annuel = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Amortissement annuel")
    amortissement_mensuel = models.DecimalField(max_digits=20, decimal_places=2, verbose_name="Amortissement mensuel")
    amortissement_cumule = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))

    # Références SYSCOHADA
    bareme_syscohada = models.CharField(max_length=100, verbose_name="Barème SYSCOHADA appliqué")

    # Écriture générée
    ecriture_amortissement = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'amortissements_cloture'
        verbose_name = "Amortissement Immobilisation"
        verbose_name_plural = "Amortissements Immobilisations"


class EcritureRegularisation(TimeStampedModel):
    """
    Écritures de régularisation automatiques
    """

    TYPE_REGULARISATION = [
        ('CHARGES_A_PAYER', 'Charges à Payer'),
        ('PRODUITS_A_RECEVOIR', 'Produits à Recevoir'),
        ('CHARGES_CONSTATEES_AVANCE', 'Charges Constatées d\'Avance'),
        ('PRODUITS_CONSTATES_AVANCE', 'Produits Constatés d\'Avance'),
    ]

    operation_cloture = models.ForeignKey(OperationClotureComptable, on_delete=models.CASCADE, related_name='regularisations')

    type_regularisation = models.CharField(max_length=30, choices=TYPE_REGULARISATION)
    libelle = models.CharField(max_length=200)
    montant = models.DecimalField(max_digits=20, decimal_places=2)

    # Comptes utilisés
    compte_debit = models.ForeignKey(ChartOfAccounts, on_delete=models.CASCADE, related_name='regularisations_debit')
    compte_credit = models.ForeignKey(ChartOfAccounts, on_delete=models.CASCADE, related_name='regularisations_credit')

    # Justification
    justification = models.TextField()
    base_calcul = models.TextField(verbose_name="Base de calcul")

    # Écriture générée
    ecriture_regularisation = models.ForeignKey(JournalEntry, on_delete=models.SET_NULL, null=True, blank=True)

    class Meta:
        db_table = 'ecritures_regularisation_cloture'
        verbose_name = "Écriture Régularisation"
        verbose_name_plural = "Écritures Régularisation"


class BalanceGenerale(TimeStampedModel):
    """
    Balance générale générée lors de la clôture
    """

    periode_cloture = models.ForeignKey(PeriodeClotureComptable, on_delete=models.CASCADE, related_name='balances')

    # Métadonnées
    date_generation = models.DateTimeField(auto_now_add=True)
    type_balance = models.CharField(max_length=20, choices=[
        ('PRE_CLOTURE', 'Pré-clôture'),
        ('POST_CLOTURE', 'Post-clôture'),
    ])

    # Totaux
    total_debit = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    total_credit = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    difference = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    est_equilibree = models.BooleanField(default=False)

    # Compteurs
    nombre_comptes_actifs = models.PositiveIntegerField(default=0)
    nombre_comptes_debiteurs = models.PositiveIntegerField(default=0)
    nombre_comptes_crediteurs = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = 'balances_generales_cloture'
        verbose_name = "Balance Générale"
        verbose_name_plural = "Balances Générales"


class LigneBalanceGenerale(TimeStampedModel):
    """
    Ligne individuelle de la balance générale
    """

    balance = models.ForeignKey(BalanceGenerale, on_delete=models.CASCADE, related_name='lignes')
    compte = models.ForeignKey(ChartOfAccounts, on_delete=models.CASCADE)

    # Mouvements
    total_debit_periode = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    total_credit_periode = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))

    # Soldes
    solde_debiteur = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))
    solde_crediteur = models.DecimalField(max_digits=20, decimal_places=2, default=Decimal('0'))

    # Métadonnées
    nombre_ecritures = models.PositiveIntegerField(default=0)
    derniere_ecriture = models.DateField(null=True, blank=True)

    class Meta:
        db_table = 'lignes_balance_generale'
        unique_together = [('balance', 'compte')]
        ordering = ['compte__account_number']
        verbose_name = "Ligne Balance"
        verbose_name_plural = "Lignes Balance"


class ControleClotureComptable(TimeStampedModel):
    """
    Contrôles automatiques de cohérence comptable
    """

    TYPE_CONTROLE = [
        ('EQUILIBRE_BALANCE', 'Équilibre Balance'),
        ('COHERENCE_COMPTES', 'Cohérence Comptes'),
        ('PROVISIONS_SYSCOHADA', 'Provisions SYSCOHADA'),
        ('AMORTISSEMENTS_BAREMES', 'Amortissements Barèmes'),
        ('REGULARISATIONS_CUTOFF', 'Régularisations Cut-off'),
    ]

    periode_cloture = models.ForeignKey(PeriodeClotureComptable, on_delete=models.CASCADE, related_name='controles')

    nom_controle = models.CharField(max_length=200)
    type_controle = models.CharField(max_length=30, choices=TYPE_CONTROLE)
    description = models.TextField()

    # Exécution
    date_execution = models.DateTimeField(auto_now_add=True)
    resultat_controle = models.BooleanField(default=False, verbose_name="Contrôle réussi")
    valeur_attendue = models.TextField(blank=True)
    valeur_reelle = models.TextField(blank=True)
    ecart = models.DecimalField(max_digits=20, decimal_places=2, null=True, blank=True)

    # Messages
    message_succes = models.TextField(blank=True)
    message_erreur = models.TextField(blank=True)
    recommandations = models.TextField(blank=True)

    # Conformité
    obligatoire = models.BooleanField(default=True)
    bloquant = models.BooleanField(default=False)
    reference_syscohada = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = 'controles_cloture_comptable'
        ordering = ['date_execution']
        verbose_name = "Contrôle Clôture"
        verbose_name_plural = "Contrôles Clôture"