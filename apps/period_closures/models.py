from django.db import models
from django.conf import settings
from decimal import Decimal
from datetime import date, datetime
import uuid

from apps.accounting.models import CompteComptable, EcritureComptable, ExerciceComptable, Devise
from apps.core.models import Societe as Company
from apps.analytical_accounting.models import SectionAnalytique


class TypeCloture(models.Model):
    """
    EXF-CL-001: Types de clôtures disponibles
    Configuration des différentes procédures de clôture
    """
    FREQUENCES = [
        ('MENSUELLE', 'Mensuelle'),
        ('TRIMESTRIELLE', 'Trimestrielle'),
        ('SEMESTRIELLE', 'Semestrielle'),
        ('ANNUELLE', 'Annuelle'),
        ('EXCEPTIONNELLE', 'Exceptionnelle')
    ]
    
    NIVEAUX_CLOTURE = [
        ('PROVISOIRE', 'Clôture Provisoire'),
        ('DEFINITIVE', 'Clôture Définitive'),
        ('FISCALE', 'Clôture Fiscale'),
        ('CONSOLIDATION', 'Consolidation')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    code = models.CharField(max_length=10, unique=True)
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    frequence = models.CharField(max_length=15, choices=FREQUENCES)
    niveau_cloture = models.CharField(max_length=15, choices=NIVEAUX_CLOTURE)
    
    # Configuration des contrôles
    controles_obligatoires = models.JSONField(default=list)  # Liste des contrôles requis
    ecritures_automatiques = models.JSONField(default=list)  # Écritures à générer
    etapes_cloture = models.JSONField(default=list)  # Séquencement des étapes
    
    # Seuils et paramètres
    seuil_ecart_balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.01'))
    autoriser_cloture_avec_anomalies = models.BooleanField(default=False)
    
    # Workflow d'approbation
    approbation_requise = models.BooleanField(default=True)
    approbateurs = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='types_clotures_approbateur')
    
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'closure_types'
        ordering = ['frequence', 'nom']
        unique_together = ['company', 'code']
    
    def __str__(self):
        return f"{self.code} - {self.nom}"


class ProcedureCloture(models.Model):
    """
    EXF-CL-002: Procédures de clôture
    Gestion complète du processus de clôture périodique
    """
    STATUTS = [
        ('PLANIFIEE', 'Planifiée'),
        ('EN_COURS', 'En Cours'),
        ('CONTROLES_EN_COURS', 'Contrôles en Cours'),
        ('EN_ATTENTE_APPROBATION', 'En Attente d\'Approbation'),
        ('APPROUVEE', 'Approuvée'),
        ('REJETEE', 'Rejetée'),
        ('CLOTUE', 'Clôturée'),
        ('REOUVERTE', 'Réouverte')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    type_cloture = models.ForeignKey(TypeCloture, on_delete=models.CASCADE)
    
    # Identification
    numero_cloture = models.CharField(max_length=20, unique=True)
    libelle = models.CharField(max_length=200)
    
    # Période de clôture
    exercice = models.ForeignKey(ExerciceComptable, on_delete=models.CASCADE)
    date_debut_periode = models.DateField()
    date_fin_periode = models.DateField()
    
    # Dates de traitement
    date_planification = models.DateTimeField(auto_now_add=True)
    date_debut_cloture = models.DateTimeField(null=True, blank=True)
    date_fin_cloture = models.DateTimeField(null=True, blank=True)
    date_limite = models.DateTimeField(null=True, blank=True)  # Date limite imposée
    
    # État de la procédure
    statut = models.CharField(max_length=25, choices=STATUTS, default='PLANIFIEE')
    pourcentage_avancement = models.IntegerField(default=0)  # 0 à 100%
    
    # Responsables
    responsable_cloture = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='clotures_responsable')
    equipe_cloture = models.ManyToManyField(settings.AUTH_USER_MODEL, blank=True, related_name='clotures_equipe')
    
    # Périmètre
    sections_incluses = models.ManyToManyField(SectionAnalytique, blank=True)
    comptes_exclus = models.ManyToManyField(CompteComptable, blank=True)
    
    # Résultats des contrôles
    nombre_anomalies = models.IntegerField(default=0)
    nombre_anomalies_critiques = models.IntegerField(default=0)
    ecart_balance = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    
    # Documentation
    commentaires = models.TextField(blank=True)
    pieces_jointes = models.JSONField(default=list)  # URLs des documents
    
    # Approbation
    date_approbation = models.DateTimeField(null=True, blank=True)
    approbateur = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='clotures_approuvees')
    commentaires_approbation = models.TextField(blank=True)
    
    class Meta:
        db_table = 'closure_procedures'
        ordering = ['-date_planification']
        unique_together = ['company', 'numero_cloture']
    
    def __str__(self):
        return f"{self.numero_cloture} - {self.libelle}"


class EtapeCloture(models.Model):
    """
    Étapes détaillées d'une procédure de clôture
    """
    TYPES_ETAPE = [
        ('CONTROLE', 'Contrôle'),
        ('CALCUL', 'Calcul/Traitement'),
        ('ECRITURE', 'Génération d\'Écritures'),
        ('VALIDATION', 'Validation'),
        ('EXPORT', 'Export/Édition'),
        ('NOTIFICATION', 'Notification')
    ]
    
    STATUTS_ETAPE = [
        ('EN_ATTENTE', 'En Attente'),
        ('EN_COURS', 'En Cours'),
        ('COMPLETEE', 'Complétée'),
        ('ERREUR', 'En Erreur'),
        ('IGNOREE', 'Ignorée')
    ]
    
    procedure_cloture = models.ForeignKey(ProcedureCloture, on_delete=models.CASCADE, related_name='etapes')
    
    # Identification
    numero_etape = models.CharField(max_length=10)  # 1.1, 1.2, 2.1, etc.
    nom_etape = models.CharField(max_length=100)
    type_etape = models.CharField(max_length=15, choices=TYPES_ETAPE)
    
    # Configuration
    description = models.TextField(blank=True)
    obligatoire = models.BooleanField(default=True)
    automatique = models.BooleanField(default=False)
    ordre_execution = models.IntegerField()
    
    # Dépendances
    etapes_prerequises = models.ManyToManyField('self', blank=True, symmetrical=False)
    
    # État d'exécution
    statut = models.CharField(max_length=15, choices=STATUTS_ETAPE, default='EN_ATTENTE')
    date_debut = models.DateTimeField(null=True, blank=True)
    date_fin = models.DateTimeField(null=True, blank=True)
    duree_prevue_heures = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    
    # Résultats
    resultat_execution = models.JSONField(default=dict)
    messages_erreur = models.TextField(blank=True)
    
    # Responsable
    responsable_etape = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    
    class Meta:
        db_table = 'closure_steps'
        ordering = ['ordre_execution']
        unique_together = ['procedure_cloture', 'numero_etape']
    
    def __str__(self):
        return f"{self.numero_etape} - {self.nom_etape}"


class ControleCloture(models.Model):
    """
    Contrôles automatiques et manuels lors des clôtures
    """
    TYPES_CONTROLE = [
        ('BALANCE', 'Équilibre de Balance'),
        ('COHERENCE', 'Cohérence Comptable'),
        ('COMPLETUDE', 'Complétude des Données'),
        ('CONCORDANCE', 'Concordance Auxiliaires'),
        ('FISCALITE', 'Contrôles Fiscaux'),
        ('ANALYTIQUE', 'Contrôles Analytiques'),
        ('INVENTAIRE', 'Contrôles d\'Inventaire'),
        ('PROVISIONS', 'Contrôles de Provisions')
    ]
    
    NIVEAUX_CRITICITE = [
        ('INFO', 'Information'),
        ('AVERTISSEMENT', 'Avertissement'),
        ('BLOQUANT', 'Bloquant')
    ]
    
    etape_cloture = models.ForeignKey(EtapeCloture, on_delete=models.CASCADE, related_name='controles')
    
    # Type et configuration
    type_controle = models.CharField(max_length=15, choices=TYPES_CONTROLE)
    nom_controle = models.CharField(max_length=100)
    description = models.TextField()
    
    # Paramètres du contrôle
    configuration_json = models.JSONField(default=dict)  # Paramètres spécifiques
    seuil_tolerance = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    niveau_criticite = models.CharField(max_length=15, choices=NIVEAUX_CRITICITE, default='AVERTISSEMENT')
    
    # Exécution
    execute = models.BooleanField(default=False)
    date_execution = models.DateTimeField(null=True, blank=True)
    duree_execution_ms = models.IntegerField(null=True, blank=True)
    
    # Résultats
    resultat_conforme = models.BooleanField(null=True, blank=True)
    valeur_constatee = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    nombre_anomalies = models.IntegerField(default=0)
    
    # Détails des anomalies
    details_anomalies = models.JSONField(default=list)
    message_resultat = models.TextField(blank=True)
    
    actif = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'closure_controls'
        ordering = ['niveau_criticite', 'nom_controle']
    
    def __str__(self):
        return f"{self.nom_controle} ({self.type_controle})"


class EcritureClotureAutomatique(models.Model):
    """
    Écritures générées automatiquement lors des clôtures
    """
    TYPES_ECRITURE_CLOTURE = [
        ('AMORTISSEMENT', 'Amortissements'),
        ('PROVISION', 'Provisions'),
        ('REGULARISATION', 'Régularisations'),
        ('RECLASSEMENT', 'Reclassements'),
        ('ABONNEMENT', 'Abonnements'),
        ('CHARGES_PAYER', 'Charges à Payer'),
        ('PRODUITS_RECEVOIR', 'Produits à Recevoir'),
        ('CHARGES_CONSTATEES_AVANCE', 'Charges Constatées d\'Avance'),
        ('PRODUITS_CONSTATES_AVANCE', 'Produits Constatés d\'Avance'),
        ('CESSION_INTERNE', 'Cessions Internes'),
        ('REPARTITION_COUTS', 'Répartition des Coûts')
    ]
    
    procedure_cloture = models.ForeignKey(ProcedureCloture, on_delete=models.CASCADE, related_name='ecritures_automatiques')
    etape_cloture = models.ForeignKey(EtapeCloture, on_delete=models.CASCADE, related_name='ecritures_generees')
    
    # Configuration de génération
    type_ecriture_cloture = models.CharField(max_length=25, choices=TYPES_ECRITURE_CLOTURE)
    nom_modele = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Règles de génération
    condition_generation = models.JSONField(default=dict)  # Conditions pour générer
    template_ecriture = models.JSONField(default=dict)  # Modèle d'écriture
    
    # Périmètre
    comptes_concernes = models.ManyToManyField(CompteComptable, blank=True)
    sections_concernees = models.ManyToManyField(SectionAnalytique, blank=True)
    
    # Paramètres de calcul
    base_calcul = models.CharField(max_length=100, blank=True)  # Formule ou base
    methode_calcul = models.JSONField(default=dict)
    
    # Résultats
    genere = models.BooleanField(default=False)
    date_generation = models.DateTimeField(null=True, blank=True)
    ecriture_generale = models.ForeignKey(EcritureComptable, null=True, blank=True, on_delete=models.SET_NULL)
    montant_genere = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    
    actif = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'closure_automatic_entries'
        ordering = ['nom_modele']
    
    def __str__(self):
        return f"{self.nom_modele} - {self.type_ecriture_cloture}"


class JournalCloture(models.Model):
    """
    Journal des événements et actions réalisées durant les clôtures
    """
    TYPES_EVENEMENT = [
        ('DEBUT_CLOTURE', 'Début de Clôture'),
        ('FIN_ETAPE', 'Fin d\'Étape'),
        ('CONTROLE_OK', 'Contrôle Validé'),
        ('CONTROLE_KO', 'Contrôle en Échec'),
        ('ECRITURE_GENEREE', 'Écriture Générée'),
        ('ANOMALIE_DETECTEE', 'Anomalie Détectée'),
        ('CORRECTION_MANUELLE', 'Correction Manuelle'),
        ('APPROBATION', 'Approbation'),
        ('CLOTURE_DEFINITIVE', 'Clôture Définitive'),
        ('REOUVERTURE', 'Réouverture')
    ]
    
    procedure_cloture = models.ForeignKey(ProcedureCloture, on_delete=models.CASCADE, related_name='journal_events')
    etape_cloture = models.ForeignKey(EtapeCloture, null=True, blank=True, on_delete=models.CASCADE)
    
    # Événement
    type_evenement = models.CharField(max_length=20, choices=TYPES_EVENEMENT)
    titre = models.CharField(max_length=200)
    description = models.TextField()
    
    # Contexte
    donnees_contexte = models.JSONField(default=dict)  # Données additionnelles
    
    # Traçabilité
    utilisateur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    date_evenement = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        db_table = 'closure_journal'
        ordering = ['-date_evenement']
    
    def __str__(self):
        return f"{self.date_evenement.strftime('%Y-%m-%d %H:%M')} - {self.titre}"


class ModeleEcritureCloture(models.Model):
    """
    Modèles prédéfinis d'écritures de clôture
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    code = models.CharField(max_length=15, unique=True)
    nom = models.CharField(max_length=100)
    
    # Type et fréquence d'utilisation
    type_cloture_associe = models.ForeignKey(TypeCloture, on_delete=models.CASCADE)
    frequence_utilisation = models.CharField(max_length=15, choices=[
        ('MENSUELLE', 'Mensuelle'),
        ('TRIMESTRIELLE', 'Trimestrielle'),
        ('ANNUELLE', 'Annuelle'),
        ('EXCEPTIONNELLE', 'Exceptionnelle')
    ])
    
    # Structure du modèle
    modele_json = models.JSONField(default=dict)  # Structure complète de l'écriture
    
    # Paramètres variables
    parametres_variables = models.JSONField(default=list)  # Variables à saisir
    
    # Validation
    regle_validation = models.JSONField(default=dict)  # Règles de validation
    
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'closure_entry_templates'
        ordering = ['nom']
        unique_together = ['company', 'code']
    
    def __str__(self):
        return f"{self.code} - {self.nom}"


class DeferredTax(models.Model):
    """
    Impôts Différés SYSCOHADA (EXF-CL-002)
    Gestion des différences temporelles et permanentes
    """
    
    DIFFERENCE_TYPES = [
        ('TEMPORELLE', 'Différence temporelle'),
        ('PERMANENTE', 'Différence permanente'),
    ]
    
    NATURE_CHOICES = [
        ('DEDUCTIBLE', 'Différence temporelle déductible'),
        ('IMPOSABLE', 'Différence temporelle imposable'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='deferred_taxes')
    fiscal_year = models.ForeignKey('accounting.FiscalYear', on_delete=models.CASCADE)
    
    # Classification
    difference_type = models.CharField(max_length=15, choices=DIFFERENCE_TYPES)
    nature = models.CharField(max_length=15, choices=NATURE_CHOICES, blank=True)
    
    # Description
    description = models.CharField(max_length=200, verbose_name="Description de la différence")
    origin_account = models.ForeignKey('accounting.ChartOfAccounts', on_delete=models.CASCADE, verbose_name="Compte d'origine")
    
    # Montants
    accounting_amount = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant comptable"
    )
    fiscal_amount = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Montant fiscal"
    )
    temporary_difference = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Différence temporelle"
    )
    
    # Taux d'impôt applicable
    tax_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('30'),
        verbose_name="Taux d'impôt (%)"
    )
    
    # Calculs automatiques
    deferred_tax_asset = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Actif d'impôt différé", editable=False
    )
    deferred_tax_liability = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Passif d'impôt différé", editable=False
    )
    
    # Échéancier de retournement
    reversal_schedule = models.JSONField(
        default=dict, verbose_name="Échéancier de retournement"
    )
    expected_reversal_years = models.PositiveIntegerField(
        default=1, verbose_name="Années de retournement prévues"
    )
    
    # Suivi
    created_date = models.DateTimeField(auto_now_add=True)
    last_calculation = models.DateTimeField(auto_now=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'period_closure_deferred_taxes'
        unique_together = [('company', 'fiscal_year', 'origin_account', 'description')]
        indexes = [
            models.Index(fields=['company', 'fiscal_year']),
            models.Index(fields=['difference_type', 'nature']),
        ]
        verbose_name = "Impôt différé"
        verbose_name_plural = "Impôts différés"
    
    def __str__(self):
        return f"{self.description} - {self.temporary_difference}"
    
    def save(self, *args, **kwargs):
        # Calcul automatique des actifs/passifs d'impôt différé
        self._calculate_deferred_tax()
        super().save(*args, **kwargs)
    
    def _calculate_deferred_tax(self):
        """Calcule les actifs/passifs d'impôt différé"""
        if self.difference_type == 'TEMPORELLE':
            tax_impact = self.temporary_difference * (self.tax_rate / 100)
            
            if self.nature == 'DEDUCTIBLE':
                # Différence temporelle déductible = Actif d'impôt différé
                self.deferred_tax_asset = tax_impact
                self.deferred_tax_liability = Decimal('0')
            else:  # IMPOSABLE
                # Différence temporelle imposable = Passif d'impôt différé
                self.deferred_tax_asset = Decimal('0')
                self.deferred_tax_liability = tax_impact


class AnnexNote(models.Model):
    """
    Notes Annexes SYSCOHADA (35 notes obligatoires)
    Complément d'information aux états financiers
    """
    
    NOTE_CATEGORIES = [
        ('ACCOUNTING_METHODS', 'Méthodes comptables'),
        ('BALANCE_SHEET', 'Informations relatives au bilan'),
        ('INCOME_STATEMENT', 'Informations relatives au compte de résultat'),
        ('CASH_FLOW', 'Informations relatives au tableau de flux'),
        ('COMMITMENTS', 'Engagements et éventualités'),
        ('SUBSEQUENT_EVENTS', 'Événements postérieurs'),
        ('RELATED_PARTIES', 'Parties liées'),
        ('SEGMENT_REPORTING', 'Information sectorielle'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name='annex_notes')
    fiscal_year = models.ForeignKey('accounting.FiscalYear', on_delete=models.CASCADE)
    closure_procedure = models.ForeignKey(ProcedureCloture, on_delete=models.CASCADE, related_name='annex_notes')
    
    # Identification de la note
    note_number = models.CharField(max_length=5, verbose_name="Numéro de note")  # 1, 2, 3...35
    note_title = models.CharField(max_length=200, verbose_name="Titre de la note")
    category = models.CharField(max_length=25, choices=NOTE_CATEGORIES)
    
    # Contenu
    content_text = models.TextField(verbose_name="Contenu textuel")
    content_tables = models.JSONField(default=list, verbose_name="Tableaux de données")
    content_calculations = models.JSONField(default=dict, verbose_name="Calculs automatiques")
    
    # Références comptables
    related_accounts = models.ManyToManyField('accounting.ChartOfAccounts', blank=True)
    related_amounts = models.JSONField(default=dict, verbose_name="Montants liés")
    
    # Métadonnées
    is_mandatory = models.BooleanField(default=True, verbose_name="Note obligatoire SYSCOHADA")
    is_auto_generated = models.BooleanField(default=False, verbose_name="Générée automatiquement")
    template_used = models.CharField(max_length=100, blank=True, verbose_name="Template utilisé")
    
    # Validation
    is_complete = models.BooleanField(default=False, verbose_name="Note complète")
    validated_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    validation_date = models.DateTimeField(null=True, blank=True)
    
    # Audit
    created_date = models.DateTimeField(auto_now_add=True)
    last_modified = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'period_closure_annex_notes'
        unique_together = [('company', 'fiscal_year', 'note_number')]
        indexes = [
            models.Index(fields=['company', 'fiscal_year', 'note_number']),
            models.Index(fields=['category', 'is_mandatory']),
        ]
        ordering = ['note_number']
        verbose_name = "Note annexe"
        verbose_name_plural = "Notes annexes"
    
    def __str__(self):
        return f"Note {self.note_number} - {self.note_title}"


class CarryForwardBalance(models.Model):
    """
    Report à-nouveaux automatique N+1 (EXF-CL-002)
    Gestion du passage d'exercice
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    
    # Exercices concernés
    closing_fiscal_year = models.ForeignKey(
        'accounting.FiscalYear', on_delete=models.CASCADE, 
        related_name='carry_forward_closing', verbose_name="Exercice clôturé"
    )
    opening_fiscal_year = models.ForeignKey(
        'accounting.FiscalYear', on_delete=models.CASCADE,
        related_name='carry_forward_opening', verbose_name="Exercice d'ouverture"
    )
    
    # Données du report
    account = models.ForeignKey('accounting.ChartOfAccounts', on_delete=models.CASCADE)
    third_party = models.ForeignKey('third_party.Tiers', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Soldes reportés
    closing_balance_debit = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Solde débiteur de clôture"
    )
    closing_balance_credit = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Solde créditeur de clôture"
    )
    
    # Calcul automatique du solde net
    net_balance = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Solde net", editable=False
    )
    balance_side = models.CharField(max_length=10, choices=[
        ('DEBIT', 'Débiteur'),
        ('CREDIT', 'Créditeur'),
        ('ZERO', 'Soldé'),
    ], editable=False)
    
    # Références des écritures
    closing_entry = models.ForeignKey(
        'accounting.JournalEntry', on_delete=models.SET_NULL, null=True,
        related_name='carry_forward_closing', verbose_name="Écriture de clôture"
    )
    opening_entry = models.ForeignKey(
        'accounting.JournalEntry', on_delete=models.SET_NULL, null=True,
        related_name='carry_forward_opening', verbose_name="Écriture d'ouverture"
    )
    
    # Traitement
    processed_date = models.DateTimeField(auto_now_add=True)
    processed_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    
    # Contrôles
    is_validated = models.BooleanField(default=False)
    validation_errors = models.JSONField(default=list, verbose_name="Erreurs de validation")
    
    class Meta:
        db_table = 'period_closure_carry_forward'
        unique_together = [('company', 'closing_fiscal_year', 'opening_fiscal_year', 'account')]
        indexes = [
            models.Index(fields=['company', 'closing_fiscal_year']),
            models.Index(fields=['opening_fiscal_year', 'is_validated']),
        ]
        ordering = ['account__code']
        verbose_name = "Report à-nouveaux"
        verbose_name_plural = "Reports à-nouveaux"
    
    def __str__(self):
        return f"RAN {self.account.code} - {self.closing_fiscal_year.name} → {self.opening_fiscal_year.name}"
    
    def save(self, *args, **kwargs):
        # Calcul automatique du solde net
        self._calculate_net_balance()
        super().save(*args, **kwargs)
    
    def _calculate_net_balance(self):
        """Calcule le solde net et détermine le sens"""
        net = self.closing_balance_debit - self.closing_balance_credit
        
        if net > Decimal('0.01'):
            self.net_balance = net
            self.balance_side = 'DEBIT'
        elif net < Decimal('-0.01'):
            self.net_balance = abs(net)
            self.balance_side = 'CREDIT'
        else:
            self.net_balance = Decimal('0')
            self.balance_side = 'ZERO'


class ResultAllocation(models.Model):
    """
    Affectation du Résultat selon décisions AG (EXF-CL-002)
    """
    
    ALLOCATION_TYPES = [
        ('RESERVES_LEGALES', 'Dotation réserves légales'),
        ('RESERVES_STATUTAIRES', 'Dotation réserves statutaires'),
        ('RESERVES_FACULTATIVES', 'Dotation réserves facultatives'),
        ('DIVIDENDES', 'Distribution dividendes'),
        ('REPORT_NOUVEAU', 'Report à nouveau'),
        ('COMPENSATION_PERTES', 'Compensation pertes antérieures'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    fiscal_year = models.ForeignKey('accounting.FiscalYear', on_delete=models.CASCADE)
    closure_procedure = models.ForeignKey(ProcedureCloture, on_delete=models.CASCADE)
    
    # Décision d'assemblée
    assembly_date = models.DateField(verbose_name="Date d'assemblée générale")
    assembly_minutes_ref = models.CharField(max_length=100, blank=True, verbose_name="Référence PV")
    
    # Résultat à affecter
    net_result = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Résultat net à affecter"
    )
    
    # Allocations détaillées
    legal_reserves_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dotation réserves légales (5% min)"
    )
    statutory_reserves_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dotation réserves statutaires"
    )
    optional_reserves_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dotation réserves facultatives"
    )
    dividends_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Dividendes distribués"
    )
    carried_forward_amount = models.DecimalField(
        max_digits=20, decimal_places=2, default=Decimal('0'),
        verbose_name="Report à nouveau", editable=False
    )
    
    # Contrôles légaux
    legal_reserves_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('5'),
        verbose_name="Taux réserves légales (%)"
    )
    capital_amount = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Capital social de référence"
    )
    legal_reserves_ceiling = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Plafond réserves légales (10% capital)", editable=False
    )
    
    # Calculs automatiques
    total_allocated = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Total affecté", editable=False
    )
    allocation_balance = models.DecimalField(
        max_digits=20, decimal_places=2, verbose_name="Écart d'affectation", editable=False
    )
    
    # Validation et approbation
    is_approved = models.BooleanField(default=False, verbose_name="Affectation approuvée")
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    approval_date = models.DateTimeField(null=True, blank=True)
    
    # Comptabilisation
    is_recorded = models.BooleanField(default=False, verbose_name="Comptabilisée")
    recording_date = models.DateTimeField(null=True, blank=True)
    journal_entries = models.JSONField(default=list, verbose_name="Références écritures")
    
    class Meta:
        db_table = 'period_closure_result_allocation'
        unique_together = [('company', 'fiscal_year')]
        indexes = [
            models.Index(fields=['company', '-assembly_date']),
            models.Index(fields=['fiscal_year', 'is_approved']),
        ]
        ordering = ['-assembly_date']
        verbose_name = "Affectation du résultat"
        verbose_name_plural = "Affectations du résultat"
    
    def __str__(self):
        return f"Affectation résultat {self.fiscal_year.name} - {self.assembly_date}"
    
    def save(self, *args, **kwargs):
        # Calculs automatiques
        self._calculate_allocations()
        super().save(*args, **kwargs)
    
    def _calculate_allocations(self):
        """Calcule les affectations automatiques"""
        # Plafond réserves légales (10% du capital)
        self.legal_reserves_ceiling = self.capital_amount * Decimal('0.1')
        
        # Total des affectations
        self.total_allocated = (
            self.legal_reserves_amount +
            self.statutory_reserves_amount +
            self.optional_reserves_amount +
            self.dividends_amount
        )
        
        # Report à nouveau automatique (solde)
        self.carried_forward_amount = self.net_result - self.total_allocated
        
        # Vérification équilibre
        self.allocation_balance = self.net_result - (self.total_allocated + self.carried_forward_amount)
    
    def validate_legal_compliance(self):
        """Valide la conformité légale de l'affectation"""
        errors = []
        
        # Vérification minimum réserves légales (5% du résultat)
        if self.net_result > 0:
            min_legal_reserves = self.net_result * (self.legal_reserves_rate / 100)
            if self.legal_reserves_amount < min_legal_reserves:
                errors.append(f"Dotation réserves légales insuffisante (min: {min_legal_reserves})")
        
        # Vérification plafond réserves légales
        current_legal_reserves = self._get_current_legal_reserves()
        if current_legal_reserves + self.legal_reserves_amount > self.legal_reserves_ceiling:
            excess = (current_legal_reserves + self.legal_reserves_amount) - self.legal_reserves_ceiling
            errors.append(f"Dépassement plafond réserves légales de {excess}")
        
        # Vérification équilibre
        if abs(self.allocation_balance) > Decimal('0.01'):
            errors.append(f"Déséquilibre d'affectation: {self.allocation_balance}")
        
        return errors
    
    def _get_current_legal_reserves(self):
        """Récupère le montant actuel des réserves légales"""
        from apps.accounting.models import ChartOfAccounts
        try:
            legal_reserves_account = ChartOfAccounts.objects.get(
                company=self.company, code='1061'  # Réserves légales
            )
            return legal_reserves_account.get_balance(self.fiscal_year)
        except ChartOfAccounts.DoesNotExist:
            return Decimal('0')


class ContinuityControl(models.Model):
    """
    Contrôles de Continuité d'Exploitation (EXF-CL-002)
    """
    
    CONTROL_TYPES = [
        ('LIQUIDITY', 'Contrôle liquidité'),
        ('SOLVENCY', 'Contrôle solvabilité'),
        ('PROFITABILITY', 'Contrôle rentabilité'),
        ('CASH_FLOW', 'Contrôle flux de trésorerie'),
        ('DEBT_COVENANT', 'Respect des covenants'),
        ('GOING_CONCERN', 'Continuité d\'exploitation'),
    ]
    
    RISK_LEVELS = [
        ('LOW', 'Faible'),
        ('MEDIUM', 'Moyen'),
        ('HIGH', 'Élevé'),
        ('CRITICAL', 'Critique'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    fiscal_year = models.ForeignKey('accounting.FiscalYear', on_delete=models.CASCADE)
    closure_procedure = models.ForeignKey(ProcedureCloture, on_delete=models.CASCADE)
    
    # Type de contrôle
    control_type = models.CharField(max_length=20, choices=CONTROL_TYPES)
    control_name = models.CharField(max_length=200, verbose_name="Nom du contrôle")
    description = models.TextField(verbose_name="Description du contrôle")
    
    # Métrique contrôlée
    metric_name = models.CharField(max_length=100, verbose_name="Métrique contrôlée")
    current_value = models.DecimalField(
        max_digits=20, decimal_places=4, verbose_name="Valeur actuelle"
    )
    threshold_value = models.DecimalField(
        max_digits=20, decimal_places=4, verbose_name="Seuil d'alerte"
    )
    critical_threshold = models.DecimalField(
        max_digits=20, decimal_places=4, verbose_name="Seuil critique"
    )
    
    # Évaluation
    risk_level = models.CharField(max_length=10, choices=RISK_LEVELS, verbose_name="Niveau de risque")
    is_compliant = models.BooleanField(verbose_name="Conforme")
    deviation_percentage = models.DecimalField(
        max_digits=8, decimal_places=2, default=Decimal('0'),
        verbose_name="Écart en %", editable=False
    )
    
    # Analyse et recommandations
    impact_analysis = models.TextField(blank=True, verbose_name="Analyse d'impact")
    recommendations = models.JSONField(default=list, verbose_name="Recommandations")
    mitigation_actions = models.JSONField(default=list, verbose_name="Actions d'atténuation")
    
    # Suivi temporel
    previous_value = models.DecimalField(
        max_digits=20, decimal_places=4, null=True, blank=True,
        verbose_name="Valeur période précédente"
    )
    trend = models.CharField(max_length=15, choices=[
        ('IMPROVING', 'En amélioration'),
        ('STABLE', 'Stable'),
        ('DETERIORATING', 'En dégradation'),
    ], blank=True)
    
    # Métadonnées
    calculation_date = models.DateTimeField(auto_now_add=True)
    calculation_method = models.CharField(max_length=200, blank=True, verbose_name="Méthode de calcul")
    data_sources = models.JSONField(default=list, verbose_name="Sources de données")
    
    class Meta:
        db_table = 'period_closure_continuity_controls'
        unique_together = [('company', 'fiscal_year', 'control_type', 'metric_name')]
        indexes = [
            models.Index(fields=['company', 'fiscal_year', 'risk_level']),
            models.Index(fields=['control_type', 'is_compliant']),
        ]
        ordering = ['control_type', 'metric_name']
        verbose_name = "Contrôle de continuité"
        verbose_name_plural = "Contrôles de continuité"
    
    def __str__(self):
        return f"{self.control_name} - {self.get_risk_level_display()}"
    
    def save(self, *args, **kwargs):
        # Calcul automatique des déviations et évaluations
        self._calculate_deviations()
        self._evaluate_compliance()
        super().save(*args, **kwargs)
    
    def _calculate_deviations(self):
        """Calcule les écarts par rapport aux seuils"""
        if self.threshold_value != 0:
            self.deviation_percentage = (
                (self.current_value - self.threshold_value) / abs(self.threshold_value) * 100
            ).quantize(Decimal('0.01'))
    
    def _evaluate_compliance(self):
        """Évalue la conformité et le niveau de risque"""
        if self.current_value <= self.critical_threshold:
            self.risk_level = 'CRITICAL'
            self.is_compliant = False
        elif self.current_value <= self.threshold_value:
            self.risk_level = 'HIGH'
            self.is_compliant = False
        elif self.current_value <= self.threshold_value * Decimal('1.2'):
            self.risk_level = 'MEDIUM'
            self.is_compliant = True
        else:
            self.risk_level = 'LOW'
            self.is_compliant = True