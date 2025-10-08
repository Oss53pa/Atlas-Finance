from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal
import uuid

from apps.core.models import BaseModel, Societe, Exercice
from apps.third_party.models import Tiers

class TypeAppelFonds(BaseModel):
    """
    Types d'appels de fonds (capital social, augmentation capital, emprunt obligataire, etc.)
    """
    
    CATEGORIES = [
        ('CAPITAL_SOCIAL', 'Capital Social'),
        ('AUGMENTATION_CAPITAL', 'Augmentation de Capital'),
        ('EMPRUNT_OBLIGATAIRE', 'Emprunt Obligataire'),
        ('PRET_PARTICIPATIF', 'Prêt Participatif'),
        ('AVANCE_ACTIONNAIRE', 'Avance d\'Actionnaire'),
        ('COMPTE_COURANT', 'Compte Courant d\'Associé'),
        ('AUTRE', 'Autre')
    ]
    
    societe = models.ForeignKey(
        Societe, 
        on_delete=models.CASCADE, 
        related_name='types_appel_fonds'
    )
    code = models.CharField(max_length=20, unique=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    categorie = models.CharField(max_length=30, choices=CATEGORIES)
    taux_interet_defaut = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0,
        help_text="Taux d'intérêt par défaut (%)"
    )
    duree_defaut = models.PositiveIntegerField(
        default=365,
        help_text="Durée par défaut en jours"
    )
    garanties_requises = models.JSONField(
        default=list,
        help_text="Liste des garanties requises"
    )
    actif = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'apps_fund_calls_typeappelfonds'
        verbose_name = 'Type d\'Appel de Fonds'
        verbose_name_plural = 'Types d\'Appel de Fonds'
        ordering = ['categorie', 'libelle']
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"

class CampagneAppelFonds(BaseModel):
    """
    Campagne d'appel de fonds regroupant plusieurs appels individuels
    """
    
    STATUTS = [
        ('PREPARATION', 'En Préparation'),
        ('ACTIVE', 'Active'),
        ('CLOTUREE', 'Clôturée'),
        ('ANNULEE', 'Annulée')
    ]
    
    societe = models.ForeignKey(
        Societe, 
        on_delete=models.CASCADE, 
        related_name='campagnes_appel_fonds'
    )
    exercice = models.ForeignKey(
        Exercice, 
        on_delete=models.CASCADE, 
        related_name='campagnes_appel_fonds'
    )
    type_appel_fonds = models.ForeignKey(
        TypeAppelFonds, 
        on_delete=models.CASCADE, 
        related_name='campagnes'
    )
    
    numero_campagne = models.CharField(max_length=50, unique=True, blank=True)
    libelle = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # Montants
    montant_total_prevu = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    montant_total_appele = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        default=0
    )
    montant_total_verse = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        default=0
    )
    
    # Dates
    date_debut = models.DateField()
    date_fin_prevue = models.DateField()
    date_fin_reelle = models.DateField(null=True, blank=True)
    
    # Conditions
    taux_interet = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0,
        help_text="Taux d'intérêt annuel (%)"
    )
    duree_remboursement = models.PositiveIntegerField(
        help_text="Durée de remboursement en jours"
    )
    modalites_remboursement = models.TextField(blank=True)
    
    statut = models.CharField(max_length=20, choices=STATUTS, default='PREPARATION')
    
    # Métadonnées
    conditions_particulieres = models.JSONField(
        default=dict,
        help_text="Conditions particulières de la campagne"
    )
    documents_requis = models.JSONField(
        default=list,
        help_text="Liste des documents requis"
    )
    
    class Meta:
        db_table = 'apps_fund_calls_campagneappelfonds'
        verbose_name = 'Campagne d\'Appel de Fonds'
        verbose_name_plural = 'Campagnes d\'Appel de Fonds'
        ordering = ['-date_creation']
        unique_together = ['societe', 'numero_campagne']
    
    def save(self, *args, **kwargs):
        if not self.numero_campagne:
            self.numero_campagne = self._generer_numero_campagne()
        super().save(*args, **kwargs)
    
    def _generer_numero_campagne(self):
        """Génère un numéro de campagne unique"""
        annee = timezone.now().year
        dernier_numero = CampagneAppelFonds.objects.filter(
            societe=self.societe,
            numero_campagne__startswith=f"CAF{annee}"
        ).count()
        return f"CAF{annee}{str(dernier_numero + 1).zfill(4)}"
    
    def __str__(self):
        return f"{self.numero_campagne} - {self.libelle}"
    
    @property
    def pourcentage_realisation(self):
        """Pourcentage de réalisation de la campagne"""
        if self.montant_total_prevu > 0:
            return (self.montant_total_verse / self.montant_total_prevu) * 100
        return 0
    
    @property
    def pourcentage_appel(self):
        """Pourcentage d'appel par rapport au prévisionnel"""
        if self.montant_total_prevu > 0:
            return (self.montant_total_appele / self.montant_total_prevu) * 100
        return 0
    
    @property
    def taux_reponse(self):
        """Taux de réponse aux appels"""
        if self.montant_total_appele > 0:
            return (self.montant_total_verse / self.montant_total_appele) * 100
        return 0

class AppelFonds(BaseModel):
    """
    Appel de fonds individuel pour un tiers spécifique
    """
    
    STATUTS = [
        ('BROUILLON', 'Brouillon'),
        ('ENVOYE', 'Envoyé'),
        ('ACCEPTE', 'Accepté'),
        ('REFUSE', 'Refusé'),
        ('PARTIELLEMENT_VERSE', 'Partiellement Versé'),
        ('TOTALEMENT_VERSE', 'Totalement Versé'),
        ('EXPIRE', 'Expiré'),
        ('ANNULE', 'Annulé')
    ]
    
    PRIORITES = [
        ('BASSE', 'Basse'),
        ('NORMALE', 'Normale'),
        ('HAUTE', 'Haute'),
        ('URGENTE', 'Urgente')
    ]
    
    societe = models.ForeignKey(
        Societe, 
        on_delete=models.CASCADE, 
        related_name='appels_fonds'
    )
    campagne = models.ForeignKey(
        CampagneAppelFonds, 
        on_delete=models.CASCADE, 
        related_name='appels_fonds'
    )
    tiers = models.ForeignKey(
        Tiers, 
        on_delete=models.CASCADE, 
        related_name='appels_fonds_recus'
    )
    
    numero_appel = models.CharField(max_length=50, unique=True, blank=True)
    
    # Montants
    montant_appele = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    montant_verse = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        default=0
    )
    
    # Dates
    date_appel = models.DateField(default=timezone.now)
    date_limite_reponse = models.DateField()
    date_versement_souhaite = models.DateField()
    date_reponse_tiers = models.DateField(null=True, blank=True)
    date_premier_versement = models.DateField(null=True, blank=True)
    date_dernier_versement = models.DateField(null=True, blank=True)
    
    # Statut et priorité
    statut = models.CharField(max_length=25, choices=STATUTS, default='BROUILLON')
    priorite = models.CharField(max_length=15, choices=PRIORITES, default='NORMALE')
    
    # Conditions spécifiques
    taux_interet_specifique = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        null=True, 
        blank=True,
        help_text="Taux spécifique pour ce tiers (surcharge le taux de campagne)"
    )
    conditions_particulieres = models.TextField(blank=True)
    garanties_demandees = models.JSONField(
        default=list,
        help_text="Garanties spécifiques demandées à ce tiers"
    )
    
    # Suivi
    commentaires_internes = models.TextField(blank=True)
    historique_relances = models.JSONField(
        default=list,
        help_text="Historique des relances effectuées"
    )
    
    class Meta:
        db_table = 'apps_fund_calls_appelfonds'
        verbose_name = 'Appel de Fonds'
        verbose_name_plural = 'Appels de Fonds'
        ordering = ['-date_creation']
        unique_together = ['societe', 'numero_appel']
    
    def save(self, *args, **kwargs):
        if not self.numero_appel:
            self.numero_appel = self._generer_numero_appel()
        super().save(*args, **kwargs)
    
    def _generer_numero_appel(self):
        """Génère un numéro d'appel unique"""
        prefixe = f"AF{self.campagne.numero_campagne[-4:]}"
        dernier_numero = AppelFonds.objects.filter(
            societe=self.societe,
            numero_appel__startswith=prefixe
        ).count()
        return f"{prefixe}-{str(dernier_numero + 1).zfill(4)}"
    
    def __str__(self):
        return f"{self.numero_appel} - {self.tiers.denomination} - {self.montant_appele}€"
    
    @property
    def pourcentage_verse(self):
        """Pourcentage du montant versé"""
        if self.montant_appele > 0:
            return (self.montant_verse / self.montant_appele) * 100
        return 0
    
    @property
    def solde_restant(self):
        """Solde restant à verser"""
        return self.montant_appele - self.montant_verse
    
    @property
    def est_en_retard(self):
        """Indique si l'appel est en retard"""
        return (
            self.statut not in ['TOTALEMENT_VERSE', 'ANNULE', 'EXPIRE'] and
            timezone.now().date() > self.date_limite_reponse
        )
    
    @property
    def jours_retard(self):
        """Nombre de jours de retard"""
        if self.est_en_retard:
            return (timezone.now().date() - self.date_limite_reponse).days
        return 0
    
    @property
    def taux_interet_applicable(self):
        """Taux d'intérêt applicable (spécifique ou campagne)"""
        return self.taux_interet_specifique or self.campagne.taux_interet

class VersementFonds(BaseModel):
    """
    Versement effectué en réponse à un appel de fonds
    """
    
    TYPES_VERSEMENT = [
        ('INITIAL', 'Versement Initial'),
        ('COMPLEMENTAIRE', 'Versement Complémentaire'),
        ('FINAL', 'Versement Final'),
        ('PARTIEL', 'Versement Partiel')
    ]
    
    MODES_VERSEMENT = [
        ('VIREMENT', 'Virement Bancaire'),
        ('CHEQUE', 'Chèque'),
        ('ESPECES', 'Espèces'),
        ('COMPENSATION', 'Compensation'),
        ('APPORT_NATURE', 'Apport en Nature'),
        ('AUTRE', 'Autre')
    ]
    
    STATUTS = [
        ('ATTENDU', 'Attendu'),
        ('RECU', 'Reçu'),
        ('COMPTABILISE', 'Comptabilisé'),
        ('REFUSE', 'Refusé'),
        ('REMBOURSE', 'Remboursé')
    ]
    
    societe = models.ForeignKey(
        Societe, 
        on_delete=models.CASCADE, 
        related_name='versements_fonds'
    )
    appel_fonds = models.ForeignKey(
        AppelFonds, 
        on_delete=models.CASCADE, 
        related_name='versements'
    )
    
    numero_versement = models.CharField(max_length=50, unique=True, blank=True)
    
    # Montants et dates
    montant_verse = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    date_versement = models.DateField()
    date_comptabilisation = models.DateField(null=True, blank=True)
    
    # Type et mode
    type_versement = models.CharField(max_length=20, choices=TYPES_VERSEMENT)
    mode_versement = models.CharField(max_length=20, choices=MODES_VERSEMENT)
    statut = models.CharField(max_length=20, choices=STATUTS, default='ATTENDU')
    
    # Références
    reference_externe = models.CharField(
        max_length=100, 
        blank=True,
        help_text="Référence du virement, numéro de chèque, etc."
    )
    compte_origine = models.CharField(
        max_length=50, 
        blank=True,
        help_text="Compte bancaire d'origine"
    )
    
    # Écriture comptable associée
    ecriture_comptable = models.ForeignKey(
        'accounting.Ecriture',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='versements_fonds'
    )
    
    # Détails
    description = models.TextField(blank=True)
    document_justificatif = models.FileField(
        upload_to='fund_calls/versements/',
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'apps_fund_calls_versementfonds'
        verbose_name = 'Versement de Fonds'
        verbose_name_plural = 'Versements de Fonds'
        ordering = ['-date_versement']
    
    def save(self, *args, **kwargs):
        if not self.numero_versement:
            self.numero_versement = self._generer_numero_versement()
        super().save(*args, **kwargs)
    
    def _generer_numero_versement(self):
        """Génère un numéro de versement unique"""
        prefixe = f"VF{timezone.now().year}"
        dernier_numero = VersementFonds.objects.filter(
            societe=self.societe,
            numero_versement__startswith=prefixe
        ).count()
        return f"{prefixe}{str(dernier_numero + 1).zfill(6)}"
    
    def __str__(self):
        return f"{self.numero_versement} - {self.montant_verse}€"
    
    def clean(self):
        """Validation des données"""
        if self.montant_verse > self.appel_fonds.montant_appele:
            raise ValidationError("Le montant versé ne peut excéder le montant appelé")
        
        # Vérifier que le total des versements ne dépasse pas le montant appelé
        total_autres_versements = VersementFonds.objects.filter(
            appel_fonds=self.appel_fonds
        ).exclude(id=self.id).aggregate(
            total=models.Sum('montant_verse')
        )['total'] or Decimal('0')
        
        if total_autres_versements + self.montant_verse > self.appel_fonds.montant_appele:
            raise ValidationError("Le total des versements dépasse le montant appelé")

class RelanceFonds(BaseModel):
    """
    Relance pour un appel de fonds non honoré
    """
    
    TYPES_RELANCE = [
        ('MAIL', 'E-mail'),
        ('COURRIER', 'Courrier'),
        ('TELEPHONE', 'Téléphone'),
        ('SMS', 'SMS'),
        ('VISITE', 'Visite'),
        ('MISE_DEMEURE', 'Mise en Demeure')
    ]
    
    NIVEAUX = [
        ('RAPPEL_AMICAL', 'Rappel Amical'),
        ('RELANCE_FERME', 'Relance Ferme'),
        ('MISE_DEMEURE', 'Mise en Demeure'),
        ('PROCEDURE_JUDICIAIRE', 'Procédure Judiciaire')
    ]
    
    societe = models.ForeignKey(
        Societe, 
        on_delete=models.CASCADE, 
        related_name='relances_fonds'
    )
    appel_fonds = models.ForeignKey(
        AppelFonds, 
        on_delete=models.CASCADE, 
        related_name='relances'
    )
    
    numero_relance = models.CharField(max_length=50, unique=True, blank=True)
    
    date_relance = models.DateField(default=timezone.now)
    type_relance = models.CharField(max_length=20, choices=TYPES_RELANCE)
    niveau_relance = models.CharField(max_length=20, choices=NIVEAUX)
    
    # Contenu
    objet = models.CharField(max_length=200)
    message = models.TextField()
    date_limite_nouvelle = models.DateField(null=True, blank=True)
    
    # Suivi
    envoye = models.BooleanField(default=False)
    date_envoi = models.DateTimeField(null=True, blank=True)
    accuse_reception = models.BooleanField(default=False)
    date_accuse_reception = models.DateTimeField(null=True, blank=True)
    
    # Réponse
    reponse_recue = models.BooleanField(default=False)
    date_reponse = models.DateTimeField(null=True, blank=True)
    contenu_reponse = models.TextField(blank=True)
    
    # Documents
    document_envoye = models.FileField(
        upload_to='fund_calls/relances/',
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'apps_fund_calls_relancefonds'
        verbose_name = 'Relance de Fonds'
        verbose_name_plural = 'Relances de Fonds'
        ordering = ['-date_relance']
    
    def save(self, *args, **kwargs):
        if not self.numero_relance:
            self.numero_relance = self._generer_numero_relance()
        super().save(*args, **kwargs)
    
    def _generer_numero_relance(self):
        """Génère un numéro de relance unique"""
        prefixe = f"RF{timezone.now().year}"
        dernier_numero = RelanceFonds.objects.filter(
            societe=self.societe,
            numero_relance__startswith=prefixe
        ).count()
        return f"{prefixe}{str(dernier_numero + 1).zfill(6)}"
    
    def __str__(self):
        return f"{self.numero_relance} - {self.type_relance} - {self.niveau_relance}"

class GarantieFonds(BaseModel):
    """
    Garanties associées aux appels de fonds
    """
    
    TYPES_GARANTIE = [
        ('HYPOTHEQUE', 'Hypothèque'),
        ('NANTISSEMENT', 'Nantissement'),
        ('CAUTION', 'Caution'),
        ('AVAL', 'Aval'),
        ('GAGE', 'Gage'),
        ('DEPOT_GARANTIE', 'Dépôt de Garantie'),
        ('ASSURANCE', 'Assurance'),
        ('AUTRE', 'Autre')
    ]
    
    STATUTS = [
        ('DEMANDEE', 'Demandée'),
        ('FOURNIE', 'Fournie'),
        ('VALIDEE', 'Validée'),
        ('REFUSEE', 'Refusée'),
        ('LIBEREE', 'Libérée')
    ]
    
    societe = models.ForeignKey(
        Societe, 
        on_delete=models.CASCADE, 
        related_name='garanties_fonds'
    )
    appel_fonds = models.ForeignKey(
        AppelFonds, 
        on_delete=models.CASCADE, 
        related_name='garanties'
    )
    
    type_garantie = models.CharField(max_length=20, choices=TYPES_GARANTIE)
    description = models.CharField(max_length=200)
    valeur_garantie = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        help_text="Valeur de la garantie"
    )
    
    # Dates
    date_demande = models.DateField(default=timezone.now)
    date_fourniture = models.DateField(null=True, blank=True)
    date_validation = models.DateField(null=True, blank=True)
    date_liberation = models.DateField(null=True, blank=True)
    
    statut = models.CharField(max_length=15, choices=STATUTS, default='DEMANDEE')
    
    # Détails spécifiques
    reference_garantie = models.CharField(max_length=100, blank=True)
    organisme_garant = models.CharField(max_length=200, blank=True)
    conditions_liberation = models.TextField(blank=True)
    
    # Documents
    document_garantie = models.FileField(
        upload_to='fund_calls/garanties/',
        null=True,
        blank=True
    )
    
    class Meta:
        db_table = 'apps_fund_calls_garantiefonds'
        verbose_name = 'Garantie de Fonds'
        verbose_name_plural = 'Garanties de Fonds'
        ordering = ['-date_demande']
    
    def __str__(self):
        return f"{self.type_garantie} - {self.description} - {self.valeur_garantie}€"

class StatutAppelFonds(BaseModel):
    """
    Historique des changements de statut des appels de fonds
    """
    
    societe = models.ForeignKey(
        Societe, 
        on_delete=models.CASCADE, 
        related_name='statuts_appel_fonds'
    )
    appel_fonds = models.ForeignKey(
        AppelFonds, 
        on_delete=models.CASCADE, 
        related_name='historique_statuts'
    )
    
    ancien_statut = models.CharField(max_length=25)
    nouveau_statut = models.CharField(max_length=25)
    date_changement = models.DateTimeField(default=timezone.now)
    utilisateur = models.ForeignKey(
        'auth.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    commentaire = models.TextField(blank=True)
    
    class Meta:
        db_table = 'apps_fund_calls_statutappelfonds'
        verbose_name = 'Statut Appel de Fonds'
        verbose_name_plural = 'Statuts Appel de Fonds'
        ordering = ['-date_changement']
    
    def __str__(self):
        return f"{self.appel_fonds.numero_appel}: {self.ancien_statut} → {self.nouveau_statut}"