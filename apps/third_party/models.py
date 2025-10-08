"""
Modèles pour la gestion des tiers (clients, fournisseurs, etc.).
"""
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from apps.core.models import BaseModel, Societe, Devise
from apps.accounting.models import PlanComptable


class Tiers(BaseModel):
    """Modèle principal pour les tiers."""
    
    TYPE_CHOICES = [
        ('CLIENT', 'Client'),
        ('FOURNISSEUR', 'Fournisseur'),
        ('CLIENT_FOURNISSEUR', 'Client et Fournisseur'),
        ('SALARIE', 'Salarié'),
        ('BANQUE', 'Banque'),
        ('ORGANISME_SOCIAL', 'Organisme Social'),
        ('ADMINISTRATION', 'Administration'),
        ('AUTRE', 'Autre'),
    ]
    
    FORME_JURIDIQUE_CHOICES = [
        ('SA', 'Société Anonyme'),
        ('SARL', 'Société à Responsabilité Limitée'),
        ('SAS', 'Société par Actions Simplifiée'),
        ('SASU', 'Société par Actions Simplifiée Unipersonnelle'),
        ('EURL', 'Entreprise Unipersonnelle à Responsabilité Limitée'),
        ('EI', 'Entreprise Individuelle'),
        ('EIRL', 'Entreprise Individuelle à Responsabilité Limitée'),
        ('SNC', 'Société en Nom Collectif'),
        ('SCS', 'Société en Commandite Simple'),
        ('SCA', 'Société en Commandite par Actions'),
        ('GIE', 'Groupement d\'Intérêt Économique'),
        ('ASSOCIATION', 'Association'),
        ('COOPERATIVE', 'Coopérative'),
        ('AUTRE', 'Autre'),
    ]
    
    MODE_REGLEMENT_CHOICES = [
        ('ESPECES', 'Espèces'),
        ('CHEQUE', 'Chèque'),
        ('VIREMENT', 'Virement bancaire'),
        ('PRELEVEMENT', 'Prélèvement'),
        ('CARTE', 'Carte bancaire'),
        ('TRAITE', 'Traite'),
        ('EFFET_COMMERCE', 'Effet de commerce'),
        ('COMPENSATION', 'Compensation'),
        ('AUTRE', 'Autre'),
    ]
    
    STATUT_CHOICES = [
        ('ACTIF', 'Actif'),
        ('BLOQUE', 'Bloqué'),
        ('SUSPENDU', 'Suspendu'),
        ('ARCHIVE', 'Archivé'),
    ]
    
    # Informations de base
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='tiers')
    code = models.CharField(max_length=20, db_index=True)
    type_tiers = models.CharField(max_length=20, choices=TYPE_CHOICES)
    
    # Identification
    raison_sociale = models.CharField(max_length=200)
    nom_commercial = models.CharField(max_length=200, blank=True, null=True)
    sigle = models.CharField(max_length=50, blank=True, null=True)
    forme_juridique = models.CharField(max_length=20, choices=FORME_JURIDIQUE_CHOICES, blank=True, null=True)
    
    # Numéros d'identification
    rccm = models.CharField(max_length=50, blank=True, null=True, verbose_name="RCCM")
    nif = models.CharField(max_length=50, blank=True, null=True, verbose_name="NIF")
    niu = models.CharField(max_length=50, blank=True, null=True, verbose_name="NIU")
    numero_tva = models.CharField(max_length=50, blank=True, null=True, verbose_name="Numéro TVA")
    
    # Coordonnées principales
    email = models.EmailField(blank=True, null=True)
    telephone = models.CharField(max_length=20, blank=True, null=True)
    mobile = models.CharField(max_length=20, blank=True, null=True)
    fax = models.CharField(max_length=20, blank=True, null=True)
    site_web = models.URLField(blank=True, null=True)
    
    # Informations comptables
    compte_client = models.ForeignKey(
        PlanComptable, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='tiers_clients', verbose_name="Compte client"
    )
    compte_fournisseur = models.ForeignKey(
        PlanComptable, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='tiers_fournisseurs', verbose_name="Compte fournisseur"
    )
    
    # Conditions commerciales
    conditions_paiement = models.PositiveIntegerField(
        default=30, verbose_name="Conditions de paiement (jours)"
    )
    mode_reglement = models.CharField(
        max_length=20, choices=MODE_REGLEMENT_CHOICES, default='VIREMENT'
    )
    devise = models.ForeignKey(Devise, on_delete=models.PROTECT)
    
    # Limites et risques
    limite_credit = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal('0'))]
    )
    plafond_escompte = models.DecimalField(
        max_digits=15, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal('0'))]
    )
    
    # Remises et escomptes
    taux_remise = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))]
    )
    taux_escompte = models.DecimalField(
        max_digits=5, decimal_places=2, default=0,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))]
    )
    
    # TVA
    exonere_tva = models.BooleanField(default=False)
    numero_exoneration_tva = models.CharField(max_length=50, blank=True, null=True)
    
    # Informations bancaires
    iban = models.CharField(max_length=34, blank=True, null=True)
    bic = models.CharField(max_length=11, blank=True, null=True)
    domiciliation = models.CharField(max_length=200, blank=True, null=True)
    
    # Évaluation et suivi
    score_credit = models.PositiveIntegerField(
        default=100, validators=[MinValueValidator(0), MaxValueValidator(1000)]
    )
    encours_actuel = models.DecimalField(
        max_digits=15, decimal_places=2, default=0, editable=False
    )
    retard_moyen = models.PositiveIntegerField(default=0, editable=False)
    
    # Statut et blocage
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ACTIF')
    motif_blocage = models.TextField(blank=True, null=True)
    date_blocage = models.DateTimeField(blank=True, null=True)
    bloque_par = models.ForeignKey(
        'authentication.User', on_delete=models.SET_NULL, null=True, blank=True,
        related_name='tiers_bloques'
    )
    
    # Informations diverses
    secteur_activite = models.CharField(max_length=100, blank=True, null=True)
    effectif = models.PositiveIntegerField(blank=True, null=True)
    capital = models.DecimalField(
        max_digits=15, decimal_places=2, blank=True, null=True,
        validators=[MinValueValidator(Decimal('0'))]
    )
    chiffre_affaires = models.DecimalField(
        max_digits=15, decimal_places=2, blank=True, null=True,
        validators=[MinValueValidator(Decimal('0'))]
    )
    
    # Dates importantes
    date_creation_entreprise = models.DateField(blank=True, null=True)
    date_premiere_relation = models.DateField(blank=True, null=True)
    date_derniere_commande = models.DateField(blank=True, null=True, editable=False)
    date_dernier_paiement = models.DateField(blank=True, null=True, editable=False)
    
    # Métadonnées
    observations = models.TextField(blank=True, null=True)
    tags = models.JSONField(default=list, blank=True)
    
    class Meta:
        db_table = 'third_party_tiers'
        unique_together = [('societe', 'code')]
        indexes = [
            models.Index(fields=['societe', 'type_tiers']),
            models.Index(fields=['societe', 'statut']),
            models.Index(fields=['raison_sociale']),
            models.Index(fields=['nif']),
            models.Index(fields=['rccm']),
            models.Index(fields=['created_at']),
        ]
        verbose_name = "Tiers"
        verbose_name_plural = "Tiers"
    
    def __str__(self):
        return f"{self.code} - {self.raison_sociale}"
    
    def clean(self):
        super().clean()
        
        # Validation des comptes selon le type de tiers
        if self.type_tiers in ['CLIENT', 'CLIENT_FOURNISSEUR'] and not self.compte_client:
            raise ValidationError("Un compte client est requis pour ce type de tiers")
        
        if self.type_tiers in ['FOURNISSEUR', 'CLIENT_FOURNISSEUR'] and not self.compte_fournisseur:
            raise ValidationError("Un compte fournisseur est requis pour ce type de tiers")
        
        # Validation de l'IBAN si fourni
        if self.iban and len(self.iban.replace(' ', '')) < 15:
            raise ValidationError("L'IBAN doit contenir au moins 15 caractères")
    
    @property
    def nom_complet(self):
        """Retourne le nom complet du tiers."""
        if self.nom_commercial and self.nom_commercial != self.raison_sociale:
            return f"{self.raison_sociale} ({self.nom_commercial})"
        return self.raison_sociale
    
    @property
    def is_client(self):
        return self.type_tiers in ['CLIENT', 'CLIENT_FOURNISSEUR']
    
    @property
    def is_fournisseur(self):
        return self.type_tiers in ['FOURNISSEUR', 'CLIENT_FOURNISSEUR']
    
    @property
    def disponible_credit(self):
        """Calcule le crédit disponible."""
        return max(0, self.limite_credit - self.encours_actuel)
    
    def update_encours(self):
        """Met à jour l'encours actuel."""
        from apps.accounting.models import LigneEcriture
        
        # Calcul de l'encours clients
        if self.is_client and self.compte_client:
            solde = LigneEcriture.objects.filter(
                compte=self.compte_client,
                tiers=self,
                ecriture__statut='VALIDE',
                lettrage__isnull=True
            ).aggregate(
                debit=models.Sum('debit') or Decimal('0'),
                credit=models.Sum('credit') or Decimal('0')
            )
            self.encours_actuel = max(0, solde['debit'] - solde['credit'])
        
        # Calcul de l'encours fournisseurs
        elif self.is_fournisseur and self.compte_fournisseur:
            solde = LigneEcriture.objects.filter(
                compte=self.compte_fournisseur,
                tiers=self,
                ecriture__statut='VALIDE',
                lettrage__isnull=True
            ).aggregate(
                debit=models.Sum('debit') or Decimal('0'),
                credit=models.Sum('credit') or Decimal('0')
            )
            self.encours_actuel = max(0, solde['credit'] - solde['debit'])
        
        self.save(update_fields=['encours_actuel'])


class AdresseTiers(BaseModel):
    """Adresses associées à un tiers."""
    
    TYPE_CHOICES = [
        ('PRINCIPALE', 'Adresse principale'),
        ('FACTURATION', 'Adresse de facturation'),
        ('LIVRAISON', 'Adresse de livraison'),
        ('COURRIER', 'Adresse de courrier'),
        ('AUTRE', 'Autre'),
    ]
    
    tiers = models.ForeignKey(Tiers, on_delete=models.CASCADE, related_name='adresses')
    type_adresse = models.CharField(max_length=20, choices=TYPE_CHOICES)
    libelle = models.CharField(max_length=100, blank=True, null=True)
    
    # Adresse détaillée
    ligne1 = models.CharField(max_length=100)
    ligne2 = models.CharField(max_length=100, blank=True, null=True)
    ligne3 = models.CharField(max_length=100, blank=True, null=True)
    code_postal = models.CharField(max_length=10, blank=True, null=True)
    ville = models.CharField(max_length=100)
    region = models.CharField(max_length=100, blank=True, null=True)
    pays = models.CharField(max_length=100, default='Cameroun')
    
    # Géolocalisation
    latitude = models.DecimalField(max_digits=10, decimal_places=8, blank=True, null=True)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, blank=True, null=True)
    
    # Informations complémentaires
    telephone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    
    is_default = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'third_party_adresse'
        unique_together = [('tiers', 'type_adresse', 'is_default')]
        verbose_name = "Adresse"
        verbose_name_plural = "Adresses"
    
    def __str__(self):
        return f"{self.tiers.code} - {self.get_type_adresse_display()}"
    
    @property
    def adresse_complete(self):
        """Retourne l'adresse formatée."""
        parts = [self.ligne1]
        if self.ligne2:
            parts.append(self.ligne2)
        if self.ligne3:
            parts.append(self.ligne3)
        if self.code_postal:
            parts.append(f"{self.code_postal} {self.ville}")
        else:
            parts.append(self.ville)
        if self.region:
            parts.append(self.region)
        if self.pays and self.pays != 'Cameroun':
            parts.append(self.pays)
        
        return '\n'.join(parts)


class ContactTiers(BaseModel):
    """Contacts associés à un tiers."""
    
    FONCTION_CHOICES = [
        ('DIRIGEANT', 'Dirigeant'),
        ('COMPTABLE', 'Comptable'),
        ('ACHETEUR', 'Acheteur'),
        ('VENDEUR', 'Commercial'),
        ('TECHNIQUE', 'Contact technique'),
        ('JURIDIQUE', 'Contact juridique'),
        ('AUTRE', 'Autre'),
    ]
    
    tiers = models.ForeignKey(Tiers, on_delete=models.CASCADE, related_name='contacts')
    
    # Informations personnelles
    civilite = models.CharField(max_length=10, choices=[('M', 'Monsieur'), ('MME', 'Madame')], blank=True, null=True)
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100, blank=True, null=True)
    fonction = models.CharField(max_length=20, choices=FONCTION_CHOICES)
    titre = models.CharField(max_length=100, blank=True, null=True)
    
    # Coordonnées
    telephone_fixe = models.CharField(max_length=20, blank=True, null=True)
    telephone_mobile = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    
    # Préférences de communication
    preference_contact = models.CharField(
        max_length=20,
        choices=[
            ('EMAIL', 'Email'),
            ('TELEPHONE', 'Téléphone'),
            ('COURRIER', 'Courrier'),
        ],
        default='EMAIL'
    )
    
    # Métadonnées
    is_principal = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    observations = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'third_party_contact'
        verbose_name = "Contact"
        verbose_name_plural = "Contacts"
    
    def __str__(self):
        nom_complet = f"{self.prenom} {self.nom}" if self.prenom else self.nom
        return f"{self.tiers.code} - {nom_complet}"
    
    @property
    def nom_complet(self):
        if self.prenom:
            return f"{self.prenom} {self.nom}"
        return self.nom


class CategorieAnalytique(BaseModel):
    """Catégories analytiques pour les tiers."""
    
    societe = models.ForeignKey(Societe, on_delete=models.CASCADE, related_name='categories_tiers')
    code = models.CharField(max_length=20, db_index=True)
    libelle = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'third_party_categorie'
        unique_together = [('societe', 'code')]
        verbose_name = "Catégorie analytique"
        verbose_name_plural = "Catégories analytiques"
    
    def __str__(self):
        return f"{self.code} - {self.libelle}"


class ClassificationTiers(BaseModel):
    """Classification des tiers selon différents critères."""
    
    TYPE_CLASSIFICATION_CHOICES = [
        ('SECTEUR', 'Secteur d\'activité'),
        ('TAILLE', 'Taille'),
        ('REGION', 'Région géographique'),
        ('COMMERCIAL', 'Classification commerciale'),
        ('RISQUE', 'Niveau de risque'),
        ('AUTRE', 'Autre'),
    ]
    
    tiers = models.ForeignKey(Tiers, on_delete=models.CASCADE, related_name='classifications')
    type_classification = models.CharField(max_length=20, choices=TYPE_CLASSIFICATION_CHOICES)
    valeur = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    
    date_debut = models.DateField(blank=True, null=True)
    date_fin = models.DateField(blank=True, null=True)
    
    class Meta:
        db_table = 'third_party_classification'
        unique_together = [('tiers', 'type_classification')]
        verbose_name = "Classification"
        verbose_name_plural = "Classifications"
    
    def __str__(self):
        return f"{self.tiers.code} - {self.get_type_classification_display()}: {self.valeur}"


class HistoriqueTiers(BaseModel):
    """Historique des modifications importantes sur les tiers."""
    
    ACTION_CHOICES = [
        ('CREATE', 'Création'),
        ('UPDATE', 'Modification'),
        ('BLOCK', 'Blocage'),
        ('UNBLOCK', 'Déblocage'),
        ('ARCHIVE', 'Archivage'),
        ('REACTIVATE', 'Réactivation'),
        ('CREDIT_LIMIT_CHANGE', 'Modification limite crédit'),
        ('STATUS_CHANGE', 'Changement statut'),
    ]
    
    tiers = models.ForeignKey(Tiers, on_delete=models.CASCADE, related_name='historique')
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    description = models.TextField()
    
    # Valeurs avant/après modification
    anciennes_valeurs = models.JSONField(blank=True, null=True)
    nouvelles_valeurs = models.JSONField(blank=True, null=True)
    
    # Métadonnées
    utilisateur = models.ForeignKey('authentication.User', on_delete=models.SET_NULL, null=True)
    date_action = models.DateTimeField(auto_now_add=True)
    adresse_ip = models.GenericIPAddressField(blank=True, null=True)
    
    class Meta:
        db_table = 'third_party_historique'
        ordering = ['-date_action']
        verbose_name = "Historique"
        verbose_name_plural = "Historiques"
    
    def __str__(self):
        return f"{self.tiers.code} - {self.get_action_display()} - {self.date_action}"