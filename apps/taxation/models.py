"""
Modèles pour la fiscalité et conformité OHADA.
"""
from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date, timedelta
from typing import List
from dateutil.relativedelta import relativedelta
from apps.core.models import BaseModel, Societe
from apps.accounting.models import PlanComptable, Ecriture
from apps.third_party.models import Tiers


class RegimeFiscal(BaseModel):
    """Régimes fiscaux OHADA."""
    
    TYPE_REGIME_CHOICES = [
        ('RSI', 'Régime Simplifié d\'Imposition'),
        ('RNI', 'Régime Normal d\'Imposition'),
        ('CGU', 'Centre de Gestion Unique'),
        ('REEL', 'Régime du Réel'),
        ('MICRO', 'Régime de la Micro-entreprise'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='regimes_fiscaux')
    
    # Informations de base
    code = models.CharField(max_length=20, db_index=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    type_regime = models.CharField(max_length=20, choices=TYPE_REGIME_CHOICES)
    
    # Paramètres fiscaux
    taux_is = models.DecimalField(
        max_digits=5, decimal_places=2, default=30,
        help_text="Taux d'Impôt sur les Sociétés en %"
    )
    taux_tva_standard = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('19.25'),
        help_text="Taux de TVA standard en %"
    )
    taux_tva_reduit = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        help_text="Taux de TVA réduit en %"
    )
    
    # Seuils et plafonds
    seuil_ca_annual = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Seuil de chiffre d'affaires annuel"
    )
    plafond_deduc_charges = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Plafond de déduction des charges"
    )
    
    # Obligations déclaratives
    declarations_obligatoires = models.JSONField(
        default=list,
        help_text="Liste des déclarations obligatoires"
    )
    
    # Périodes de validité
    date_debut_validite = models.DateField()
    date_fin_validite = models.DateField(null=True, blank=True)
    
    # Configuration
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'taxation_regime_fiscal'
        unique_together = [('societe', 'code')]
        indexes = [
            models.Index(fields=['societe', 'type_regime']),
            models.Index(fields=['date_debut_validite', 'date_fin_validite']),
        ]
        verbose_name = "Régime fiscal"
        verbose_name_plural = "Régimes fiscaux"
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"
    
    def clean(self):
        super().clean()
        
        if self.date_fin_validite and self.date_fin_validite <= self.date_debut_validite:
            raise ValidationError("La date de fin doit être postérieure à la date de début")


class TypeDeclaration(BaseModel):
    """Types de déclarations fiscales."""
    
    FREQUENCE_CHOICES = [
        ('MENSUELLE', 'Mensuelle'),
        ('BIMESTRIELLE', 'Bimestrielle'),
        ('TRIMESTRIELLE', 'Trimestrielle'),
        ('SEMESTRIELLE', 'Semestrielle'),
        ('ANNUELLE', 'Annuelle'),
        ('EXCEPTIONNELLE', 'Exceptionnelle'),
    ]
    
    STATUT_CHOICES = [
        ('OBLIGATOIRE', 'Obligatoire'),
        ('FACULTATIVE', 'Facultative'),
        ('CONDITIONNELLE', 'Conditionnelle'),
    ]
    
    # Informations de base
    code = models.CharField(max_length=20, unique=True, db_index=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Configuration
    frequence = models.CharField(max_length=20, choices=FREQUENCE_CHOICES)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='OBLIGATOIRE')
    
    # Échéances
    jour_echeance = models.PositiveIntegerField(
        default=15, help_text="Jour du mois d'échéance"
    )
    mois_offset = models.IntegerField(
        default=1, help_text="Offset en mois par rapport à la période"
    )
    
    # Paramètres de calcul
    formule_calcul = models.TextField(
        blank=True, null=True,
        help_text="Formule de calcul de l'impôt/taxe"
    )
    comptes_base_calcul = models.ManyToManyField(
        PlanComptable, blank=True,
        help_text="Comptes servant de base au calcul"
    )
    
    # Pénalités
    taux_penalite_retard = models.DecimalField(
        max_digits=5, decimal_places=2, default=10,
        help_text="Taux de pénalité de retard en %"
    )
    penalite_fixe = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Pénalité fixe en cas de retard"
    )
    
    # Métadonnées
    is_active = models.BooleanField(default=True)
    ordre_affichage = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'taxation_type_declaration'
        verbose_name = "Type de déclaration"
        verbose_name_plural = "Types de déclarations"
        ordering = ['ordre_affichage', 'libelle']
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"


class DeclarationFiscale(BaseModel):
    """Déclarations fiscales."""
    
    STATUT_CHOICES = [
        ('BROUILLON', 'Brouillon'),
        ('EN_COURS', 'En cours de saisie'),
        ('VALIDEE', 'Validée'),
        ('TRANSMISE', 'Transmise'),
        ('ACCEPTEE', 'Acceptée par l\'administration'),
        ('REJETEE', 'Rejetée'),
        ('PAYEE', 'Payée'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='declarations_fiscales')
    regime_fiscal = models.ForeignKey(RegimeFiscal, on_delete=models.PROTECT, related_name='declarations')
    type_declaration = models.ForeignKey(TypeDeclaration, on_delete=models.PROTECT, related_name='declarations')
    
    # Identification
    numero_declaration = models.CharField(max_length=50, db_index=True)
    reference_administration = models.CharField(max_length=100, blank=True, null=True)
    
    # Période concernée
    exercice = models.IntegerField()
    periode_debut = models.DateField()
    periode_fin = models.DateField()
    
    # Échéances
    date_limite_depot = models.DateField()
    date_limite_paiement = models.DateField()
    
    # Montants calculés
    base_imposable = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    montant_impot = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    credit_impot = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    acompte_verse = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    montant_du = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False)
    
    # Pénalités
    penalite_retard = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    majorations = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    
    # Statut et workflow
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='BROUILLON')
    
    # Dates de traitement
    date_validation = models.DateTimeField(null=True, blank=True)
    date_transmission = models.DateTimeField(null=True, blank=True)
    date_paiement = models.DateTimeField(null=True, blank=True)
    
    # Responsables
    valide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='declarations_validees'
    )
    transmise_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='declarations_transmises'
    )
    
    # Documents et références
    fichier_declaration = models.FileField(upload_to='declarations/', blank=True, null=True)
    accuse_reception = models.FileField(upload_to='accusations/', blank=True, null=True)
    
    # Données détaillées
    donnees_declaration = models.JSONField(
        default=dict,
        help_text="Données détaillées de la déclaration"
    )
    
    # Commentaires et observations
    observations = models.TextField(blank=True, null=True)
    commentaires_administration = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'taxation_declaration'
        unique_together = [('societe', 'numero_declaration')]
        indexes = [
            models.Index(fields=['societe', 'exercice', 'statut']),
            models.Index(fields=['type_declaration', 'periode_debut']),
            models.Index(fields=['date_limite_depot']),
            models.Index(fields=['statut']),
        ]
        verbose_name = "Déclaration fiscale"
        verbose_name_plural = "Déclarations fiscales"
        ordering = ['-date_limite_depot']
    
    def __str__(self):
        return f"{self.numero_declaration} - {self.type_declaration.libelle}"
    
    def save(self, *args, **kwargs):
        # Calcul automatique du montant dû
        self.montant_du = max(
            0, 
            self.montant_impot - self.credit_impot - self.acompte_verse + 
            self.penalite_retard + self.majorations
        )
        super().save(*args, **kwargs)
    
    @property
    def is_en_retard(self):
        """Vérifie si la déclaration est en retard."""
        return (
            date.today() > self.date_limite_depot and 
            self.statut not in ['TRANSMISE', 'ACCEPTEE', 'PAYEE']
        )
    
    @property
    def jours_retard(self):
        """Calcule le nombre de jours de retard."""
        if not self.is_en_retard:
            return 0
        return (date.today() - self.date_limite_depot).days


class LigneDeclaration(BaseModel):
    """Lignes détaillées d'une déclaration fiscale."""
    
    # Relations
    declaration = models.ForeignKey(DeclarationFiscale, on_delete=models.CASCADE, related_name='lignes')
    compte = models.ForeignKey(PlanComptable, on_delete=models.CASCADE, null=True, blank=True)
    
    # Identification de la ligne
    code_ligne = models.CharField(max_length=20)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Valeurs
    montant_base = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    taux_applique = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    montant_calcule = models.DecimalField(max_digits=15, decimal_places=2, default=0, editable=False)
    
    # Configuration
    obligatoire = models.BooleanField(default=True)
    calculee_auto = models.BooleanField(default=True)
    
    # Formule de calcul
    formule = models.TextField(
        blank=True, null=True,
        help_text="Formule de calcul spécifique à cette ligne"
    )
    
    # Métadonnées
    ordre = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'taxation_ligne_declaration'
        unique_together = [('declaration', 'code_ligne')]
        indexes = [
            models.Index(fields=['declaration', 'ordre']),
            models.Index(fields=['compte']),
        ]
        verbose_name = "Ligne de déclaration"
        verbose_name_plural = "Lignes de déclaration"
        ordering = ['ordre', 'code_ligne']
    
    def __str__(self):
        return f"{self.declaration.numero_declaration} - {self.code_ligne}"
    
    def save(self, *args, **kwargs):
        # Calcul automatique du montant
        if self.calculee_auto:
            self.montant_calcule = (self.montant_base * self.taux_applique) / 100
        super().save(*args, **kwargs)


class EvenementFiscal(BaseModel):
    """Événements fiscaux impactant les obligations."""
    
    TYPE_EVENEMENT_CHOICES = [
        ('CREATION', 'Création d\'entreprise'),
        ('MODIFICATION', 'Modification statuts'),
        ('FUSION', 'Fusion'),
        ('SCISSION', 'Scission'),
        ('DISSOLUTION', 'Dissolution'),
        ('CHANGEMENT_REGIME', 'Changement de régime'),
        ('CHANGEMENT_ACTIVITE', 'Changement d\'activité'),
        ('AUTRE', 'Autre événement'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='evenements_fiscaux')
    
    # Informations de base
    type_evenement = models.CharField(max_length=30, choices=TYPE_EVENEMENT_CHOICES)
    date_evenement = models.DateField()
    date_effet_fiscal = models.DateField(help_text="Date d'effet fiscal de l'événement")
    
    # Description
    libelle = models.CharField(max_length=200)
    description = models.TextField()
    
    # Impact fiscal
    nouveau_regime = models.ForeignKey(
        RegimeFiscal, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Nouveau régime fiscal si applicable"
    )
    declarations_impactees = models.ManyToManyField(
        TypeDeclaration, blank=True,
        help_text="Types de déclarations impactées"
    )
    
    # Obligations particulières
    obligations_specifiques = models.JSONField(
        default=list, blank=True,
        help_text="Obligations fiscales spécifiques liées à l'événement"
    )
    
    # Suivi
    traite = models.BooleanField(default=False)
    date_traitement = models.DateTimeField(null=True, blank=True)
    traite_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Documents
    pieces_justificatives = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = 'taxation_evenement_fiscal'
        indexes = [
            models.Index(fields=['societe', 'date_evenement']),
            models.Index(fields=['type_evenement']),
            models.Index(fields=['traite']),
        ]
        verbose_name = "Événement fiscal"
        verbose_name_plural = "Événements fiscaux"
        ordering = ['-date_evenement']
    
    def __str__(self):
        return f"{self.get_type_evenement_display()} - {self.date_evenement}"


class ObligationFiscale(BaseModel):
    """Obligations fiscales récurrentes."""
    
    STATUT_CHOICES = [
        ('ACTIVE', 'Active'),
        ('SUSPENDUE', 'Suspendue'),
        ('TERMINEE', 'Terminée'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='obligations_fiscales')
    type_declaration = models.ForeignKey(TypeDeclaration, on_delete=models.CASCADE, related_name='obligations')
    regime_fiscal = models.ForeignKey(RegimeFiscal, on_delete=models.CASCADE, related_name='obligations')
    
    # Paramètres de l'obligation
    debut_obligation = models.DateField()
    fin_obligation = models.DateField(null=True, blank=True)
    
    # Configuration des rappels
    rappel_actif = models.BooleanField(default=True)
    nb_jours_rappel = models.PositiveIntegerField(
        default=15, help_text="Nombre de jours avant échéance pour le rappel"
    )
    
    # Responsable
    responsable = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Responsable de cette obligation"
    )
    
    # Statut
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ACTIVE')
    
    # Métadonnées
    observations = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'taxation_obligation'
        unique_together = [('societe', 'type_declaration', 'regime_fiscal')]
        indexes = [
            models.Index(fields=['societe', 'statut']),
            models.Index(fields=['debut_obligation', 'fin_obligation']),
            models.Index(fields=['responsable']),
        ]
        verbose_name = "Obligation fiscale"
        verbose_name_plural = "Obligations fiscales"
    
    def __str__(self):
        return f"{self.societe.raison_sociale} - {self.type_declaration.libelle}"
    
    def generer_prochaines_echeances(self, nb_periodes: int = 12) -> List[date]:
        """Génère les prochaines échéances d'après la fréquence."""
        echeances = []
        date_courante = date.today()
        
        # Détermination de la fréquence en mois
        freq_map = {
            'MENSUELLE': 1,
            'BIMESTRIELLE': 2,
            'TRIMESTRIELLE': 3,
            'SEMESTRIELLE': 6,
            'ANNUELLE': 12,
        }
        
        increment_mois = freq_map.get(self.type_declaration.frequence, 1)
        
        for i in range(nb_periodes):
            # Calcul de la date d'échéance
            date_echeance = date_courante + relativedelta(
                months=increment_mois * i + self.type_declaration.mois_offset,
                day=self.type_declaration.jour_echeance
            )
            
            # Vérification que l'échéance est dans la période d'obligation
            if self.fin_obligation and date_echeance > self.fin_obligation:
                break
            
            if date_echeance >= self.debut_obligation:
                echeances.append(date_echeance)
        
        return echeances


class PlanificationDeclaration(BaseModel):
    """Planification automatique des déclarations."""
    
    # Relations
    obligation = models.ForeignKey(ObligationFiscale, on_delete=models.CASCADE, related_name='planifications')
    
    # Période planifiée
    periode_debut = models.DateField()
    periode_fin = models.DateField()
    date_echeance_depot = models.DateField()
    date_echeance_paiement = models.DateField()
    
    # Statut de la planification
    declaration_generee = models.BooleanField(default=False)
    declaration = models.ForeignKey(
        DeclarationFiscale, on_delete=models.SET_NULL, null=True, blank=True
    )
    
    # Rappels
    rappel_envoye = models.BooleanField(default=False)
    date_rappel = models.DateTimeField(null=True, blank=True)
    
    # Estimations
    montant_estime = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        help_text="Montant estimé basé sur l'historique"
    )
    
    class Meta:
        db_table = 'taxation_planification'
        unique_together = [('obligation', 'periode_debut')]
        indexes = [
            models.Index(fields=['date_echeance_depot']),
            models.Index(fields=['declaration_generee']),
            models.Index(fields=['rappel_envoye']),
        ]
        verbose_name = "Planification de déclaration"
        verbose_name_plural = "Planifications de déclarations"
        ordering = ['date_echeance_depot']
    
    def __str__(self):
        return f"{self.obligation} - {self.periode_debut} au {self.periode_fin}"
    
    @property
    def est_en_retard(self):
        """Vérifie si l'échéance est dépassée."""
        return date.today() > self.date_echeance_depot and not self.declaration_generee


class ControlesFiscaux(BaseModel):
    """Historique des contrôles fiscaux."""
    
    TYPE_CONTROLE_CHOICES = [
        ('CONTROLE_SUR_PIECES', 'Contrôle sur pièces'),
        ('VERIFICATION_COMPTABILITE', 'Vérification de comptabilité'),
        ('CONTROLE_PONCTUEL', 'Contrôle ponctuel'),
        ('CONTROLE_INATTENDU', 'Contrôle inattendu'),
    ]
    
    STATUT_CHOICES = [
        ('NOTIFIE', 'Notifié'),
        ('EN_COURS', 'En cours'),
        ('TERMINE', 'Terminé'),
        ('CONTESTE', 'Contesté'),
        ('CLOTURE', 'Clôturé'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='controles_fiscaux')
    
    # Informations du contrôle
    numero_controle = models.CharField(max_length=100, db_index=True)
    type_controle = models.CharField(max_length=30, choices=TYPE_CONTROLE_CHOICES)
    
    # Période contrôlée
    exercices_controles = models.CharField(max_length=100, help_text="Ex: 2020-2022")
    date_debut_controle = models.DateField()
    date_fin_controle = models.DateField(null=True, blank=True)
    
    # Administration
    service_controleur = models.CharField(max_length=200)
    nom_controleur = models.CharField(max_length=200, blank=True, null=True)
    
    # Documents
    lettre_notification = models.FileField(upload_to='controles/', blank=True, null=True)
    rapport_controle = models.FileField(upload_to='controles/', blank=True, null=True)
    
    # Résultats
    redressements_proposes = models.DecimalField(
        max_digits=15, decimal_places=2, default=0
    )
    penalites_proposees = models.DecimalField(
        max_digits=15, decimal_places=2, default=0
    )
    redressements_acceptes = models.DecimalField(
        max_digits=15, decimal_places=2, default=0
    )
    montant_paye = models.DecimalField(
        max_digits=15, decimal_places=2, default=0
    )
    
    # Suivi
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='NOTIFIE')
    
    # Observations et actions
    observations = models.TextField(blank=True, null=True)
    actions_correctives = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'taxation_controle'
        unique_together = [('societe', 'numero_controle')]
        indexes = [
            models.Index(fields=['societe', 'statut']),
            models.Index(fields=['date_debut_controle']),
            models.Index(fields=['type_controle']),
        ]
        verbose_name = "Contrôle fiscal"
        verbose_name_plural = "Contrôles fiscaux"
        ordering = ['-date_debut_controle']
    
    def __str__(self):
        return f"Contrôle {self.numero_controle} - {self.societe.raison_sociale}"


class DocumentFiscal(BaseModel):
    """Documents fiscaux et pièces justificatives."""
    
    TYPE_DOCUMENT_CHOICES = [
        ('DECLARATION', 'Déclaration fiscale'),
        ('ACCUSE_RECEPTION', 'Accusé de réception'),
        ('AVIS_IMPOSITION', 'Avis d\'imposition'),
        ('QUITTANCE', 'Quittance de paiement'),
        ('CORRESPONDANCE', 'Correspondance administrative'),
        ('PIECE_JUSTIFICATIVE', 'Pièce justificative'),
        ('AUTRE', 'Autre document'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='documents_fiscaux')
    declaration = models.ForeignKey(
        DeclarationFiscale, on_delete=models.CASCADE, null=True, blank=True,
        related_name='documents'
    )
    controle = models.ForeignKey(
        ControlesFiscaux, on_delete=models.CASCADE, null=True, blank=True,
        related_name='documents'
    )
    
    # Informations du document
    type_document = models.CharField(max_length=30, choices=TYPE_DOCUMENT_CHOICES)
    nom_document = models.CharField(max_length=200)
    description = models.TextField(blank=True, null=True)
    
    # Fichier
    fichier = models.FileField(upload_to='documents_fiscaux/')
    taille_fichier = models.PositiveIntegerField(editable=False)
    
    # Métadonnées
    date_document = models.DateField()
    date_reception = models.DateField(null=True, blank=True)
    numero_reference = models.CharField(max_length=100, blank=True, null=True)
    
    # Classification
    tags = models.JSONField(default=list, blank=True)
    confidentiel = models.BooleanField(default=False)
    
    class Meta:
        db_table = 'taxation_document'
        indexes = [
            models.Index(fields=['societe', 'type_document']),
            models.Index(fields=['date_document']),
            models.Index(fields=['declaration']),
            models.Index(fields=['controle']),
        ]
        verbose_name = "Document fiscal"
        verbose_name_plural = "Documents fiscaux"
        ordering = ['-date_document']
    
    def __str__(self):
        return f"{self.nom_document} - {self.date_document}"
    
    def save(self, *args, **kwargs):
        if self.fichier:
            self.taille_fichier = self.fichier.size
        super().save(*args, **kwargs)


class AlerteFiscale(BaseModel):
    """Alertes et notifications fiscales."""
    
    TYPE_ALERTE_CHOICES = [
        ('ECHEANCE_PROCHE', 'Échéance proche'),
        ('RETARD_DECLARATION', 'Retard de déclaration'),
        ('RETARD_PAIEMENT', 'Retard de paiement'),
        ('CHANGEMENT_REGLEMENTATION', 'Changement réglementation'),
        ('CONTROLE_FISCAL', 'Contrôle fiscal'),
        ('SEUIL_DEPASSE', 'Seuil dépassé'),
        ('AUTRE', 'Autre alerte'),
    ]
    
    NIVEAU_CHOICES = [
        ('INFO', 'Information'),
        ('WARNING', 'Avertissement'),
        ('ERROR', 'Erreur'),
        ('CRITICAL', 'Critique'),
    ]
    
    STATUT_CHOICES = [
        ('ACTIVE', 'Active'),
        ('ACQUITTEE', 'Acquittée'),
        ('RESOLUE', 'Résolue'),
        ('IGNOREE', 'Ignorée'),
    ]
    
    # Relations
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='alertes_fiscales')
    declaration = models.ForeignKey(
        DeclarationFiscale, on_delete=models.CASCADE, null=True, blank=True
    )
    obligation = models.ForeignKey(
        ObligationFiscale, on_delete=models.CASCADE, null=True, blank=True
    )
    
    # Informations de l'alerte
    type_alerte = models.CharField(max_length=30, choices=TYPE_ALERTE_CHOICES)
    niveau = models.CharField(max_length=10, choices=NIVEAU_CHOICES)
    titre = models.CharField(max_length=200)
    message = models.TextField()
    
    # Données contextuelles
    date_echeance = models.DateField(null=True, blank=True)
    montant_concerne = models.DecimalField(
        max_digits=15, decimal_places=2, null=True, blank=True
    )
    
    # Gestion
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ACTIVE')
    date_creation = models.DateTimeField(auto_now_add=True)
    date_acquittement = models.DateTimeField(null=True, blank=True)
    acquittee_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True
    )
    
    # Actions et suivi
    actions_recommandees = models.JSONField(default=list, blank=True)
    commentaires = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'taxation_alerte'
        indexes = [
            models.Index(fields=['societe', 'statut']),
            models.Index(fields=['type_alerte', 'niveau']),
            models.Index(fields=['date_creation']),
            models.Index(fields=['date_echeance']),
        ]
        verbose_name = "Alerte fiscale"
        verbose_name_plural = "Alertes fiscales"
        ordering = ['-date_creation']
    
    def __str__(self):
        return f"{self.titre} - {self.get_niveau_display()}"