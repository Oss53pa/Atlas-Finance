from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
from datetime import date
import uuid

from apps.accounting.models import CompteComptable, EcritureComptable, ExerciceComptable, Devise
from apps.company.models import Company


class AxeAnalytique(models.Model):
    """
    EXF-CA-001: Axes d'analyse (jusqu'à 10 axes simultanés)
    Structure hiérarchique flexible pour l'analyse multi-dimensionnelle
    """
    TYPES_AXE = [
        ('CENTRE_COUT', 'Centre de Coût'),
        ('CENTRE_PROFIT', 'Centre de Profit'),
        ('CENTRE_RESPONSABILITE', 'Centre de Responsabilité'),
        ('CENTRE_INVESTISSEMENT', 'Centre d\'Investissement'),
        ('ACTIVITE', 'Activité/Service'),
        ('PRODUIT', 'Produit/Gamme'),
        ('PROJET', 'Projet/Affaire'),
        ('GEOGRAPHIQUE', 'Zone Géographique'),
        ('CLIENT', 'Client/Segment'),
        ('CANAL_DISTRIBUTION', 'Canal de Distribution'),
        ('FONCTION', 'Fonction'),
        ('PERSONNALISE', 'Personnalisé')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    code = models.CharField(max_length=10, unique=True)
    nom = models.CharField(max_length=100)
    type_axe = models.CharField(max_length=30, choices=TYPES_AXE)
    description = models.TextField(blank=True)
    
    # Structure hiérarchique
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='enfants')
    niveau = models.IntegerField(default=1)  # 1 = racine, 2 = sous-niveau, etc.
    ordre = models.IntegerField(default=0)  # Pour tri dans interface
    
    # Configuration
    obligatoire = models.BooleanField(default=False)  # Saisie obligatoire sur écritures
    actif = models.BooleanField(default=True)
    
    # Comptes associés (filtrage par préfixe compte)
    comptes_concernes = models.ManyToManyField(CompteComptable, blank=True)
    classes_comptes = models.CharField(max_length=10, blank=True)  # ex: "6,7" pour charges et produits
    
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'analytical_axes'
        ordering = ['ordre', 'code']
        unique_together = ['company', 'code']
    
    def __str__(self):
        return f"{self.code} - {self.nom}"
    
    def get_full_path(self):
        """Retourne le chemin hiérarchique complet"""
        if self.parent:
            return f"{self.parent.get_full_path()} > {self.nom}"
        return self.nom
    
    def get_descendants(self):
        """Retourne tous les descendants de cet axe"""
        descendants = []
        for enfant in self.enfants.all():
            descendants.append(enfant)
            descendants.extend(enfant.get_descendants())
        return descendants


class SectionAnalytique(models.Model):
    """
    EXF-CA-002: Sections analytiques
    Découpage de l'entreprise selon différents axes d'analyse
    """
    TYPES_SECTION = [
        ('OPERATIONNELLE', 'Section Opérationnelle'),
        ('AUXILIAIRE', 'Section Auxiliaire'),
        ('STRUCTURE', 'Section de Structure'),
        ('PRINCIPALE', 'Section Principale')
    ]
    
    METHODES_REPARTITION = [
        ('DIRECTE', 'Imputation Directe'),
        ('CLE_REPARTITION', 'Clé de Répartition'),
        ('UNITES_OEUVRE', 'Unités d\'Œuvre'),
        ('POURCENTAGE', 'Pourcentage Fixe'),
        ('MONTANT_FIXE', 'Montant Fixe'),
        ('PRORATA', 'Prorata Temporis')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    code = models.CharField(max_length=15, unique=True)
    nom = models.CharField(max_length=150)
    type_section = models.CharField(max_length=20, choices=TYPES_SECTION)
    
    # Axes d'analyse liés
    axe_principal = models.ForeignKey(AxeAnalytique, on_delete=models.CASCADE, related_name='sections_principales')
    axes_secondaires = models.ManyToManyField(AxeAnalytique, blank=True, related_name='sections_secondaires')
    
    # Responsabilité
    responsable = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    
    # Configuration analytique
    methode_repartition_defaut = models.CharField(max_length=20, choices=METHODES_REPARTITION, default='DIRECTE')
    unite_oeuvre = models.CharField(max_length=50, blank=True)  # Heures, KG, m², etc.
    
    # Budget et objectifs
    budget_annuel = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    objectif_cout_unitaire = models.DecimalField(max_digits=10, decimal_places=4, null=True, blank=True)
    
    # Comptes de rattachement
    compte_charges_directes = models.ForeignKey(
        CompteComptable, null=True, blank=True, on_delete=models.SET_NULL, related_name='sections_charges'
    )
    compte_produits_directs = models.ForeignKey(
        CompteComptable, null=True, blank=True, on_delete=models.SET_NULL, related_name='sections_produits'
    )
    
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'analytical_sections'
        ordering = ['code']
        unique_together = ['company', 'code']
    
    def __str__(self):
        return f"{self.code} - {self.nom}"


class CleRepartition(models.Model):
    """
    EXF-CA-003: Clés de répartition et ventilation
    Gestion des règles de répartition entre sections analytiques
    """
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    code = models.CharField(max_length=10, unique=True)
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Période de validité
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)
    
    # Configuration
    type_cle = models.CharField(max_length=20, choices=[
        ('POURCENTAGE', 'Pourcentage'),
        ('MONTANT', 'Montant Fixe'),
        ('UNITE_OEUVRE', 'Unité d\'Œuvre'),
        ('VARIABLE', 'Variable')
    ])
    
    base_calcul = models.CharField(max_length=50, blank=True)  # CA, heures, m², etc.
    
    # Sections concernées
    section_origine = models.ForeignKey(SectionAnalytique, on_delete=models.CASCADE, related_name='cles_repartition_origine')
    sections_destination = models.ManyToManyField(SectionAnalytique, through='DetailCleRepartition', related_name='cles_repartition_destination')
    
    # Comptes concernés (si spécifique)
    comptes_concernes = models.ManyToManyField(CompteComptable, blank=True)
    
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'analytical_keys'
        ordering = ['code']
        unique_together = ['company', 'code']
    
    def __str__(self):
        return f"{self.code} - {self.nom}"


class DetailCleRepartition(models.Model):
    """Détail des pourcentages/montants de répartition par section"""
    cle_repartition = models.ForeignKey(CleRepartition, on_delete=models.CASCADE)
    section_destination = models.ForeignKey(SectionAnalytique, on_delete=models.CASCADE)
    
    pourcentage = models.DecimalField(max_digits=6, decimal_places=3, null=True, blank=True)  # 0 à 100.000%
    montant_fixe = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    coefficient = models.DecimalField(max_digits=10, decimal_places=4, default=Decimal('1'))
    
    ordre = models.IntegerField(default=1)
    
    class Meta:
        db_table = 'analytical_key_details'
        unique_together = ['cle_repartition', 'section_destination']
        ordering = ['ordre']


class EcritureAnalytique(models.Model):
    """
    EXF-CA-004: Écritures analytiques
    Ventilation analytique des écritures comptables générales
    """
    TYPES_ECRITURE = [
        ('DIRECTE', 'Imputation Directe'),
        ('REPARTITION', 'Répartition'),
        ('CESSION_INTERNE', 'Cession Interne'),
        ('ABONNEMENT', 'Abonnement'),
        ('REGULARISATION', 'Régularisation')
    ]
    
    STATUTS = [
        ('BROUILLARD', 'Brouillard'),
        ('VALIDEE', 'Validée'),
        ('CLOTUREE', 'Clôturée')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    
    # Référence
    numero_piece = models.CharField(max_length=20)
    date_ecriture = models.DateField()
    exercice = models.ForeignKey(ExerciceComptable, on_delete=models.CASCADE)
    
    # Lien avec la comptabilité générale
    ecriture_generale = models.ForeignKey(EcritureComptable, null=True, blank=True, on_delete=models.SET_NULL)
    compte_general = models.ForeignKey(CompteComptable, on_delete=models.CASCADE)
    
    # Données analytiques
    section_analytique = models.ForeignKey(SectionAnalytique, on_delete=models.CASCADE)
    axes_analytiques = models.JSONField(default=dict)  # {axe_id: section_id, ...}
    
    # Montants
    montant_debit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    montant_credit = models.DecimalField(max_digits=15, decimal_places=2, default=Decimal('0'))
    devise = models.ForeignKey(Devise, on_delete=models.CASCADE)
    taux_change = models.DecimalField(max_digits=10, decimal_places=6, default=Decimal('1'))
    
    # Informations
    libelle = models.CharField(max_length=200)
    type_ecriture = models.CharField(max_length=20, choices=TYPES_ECRITURE, default='DIRECTE')
    statut = models.CharField(max_length=15, choices=STATUTS, default='BROUILLARD')
    
    # Répartition
    cle_repartition = models.ForeignKey(CleRepartition, null=True, blank=True, on_delete=models.SET_NULL)
    pourcentage_repartition = models.DecimalField(max_digits=6, decimal_places=3, default=Decimal('100'))
    
    # Traçabilité
    utilisateur = models.ForeignKey(User, on_delete=models.CASCADE)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'analytical_entries'
        ordering = ['-date_ecriture', 'numero_piece']
        indexes = [
            models.Index(fields=['date_ecriture', 'section_analytique']),
            models.Index(fields=['exercice', 'compte_general']),
            models.Index(fields=['numero_piece']),
        ]
    
    def __str__(self):
        return f"{self.numero_piece} - {self.section_analytique.code} - {self.montant_net()}"
    
    def montant_net(self):
        """Retourne le montant net (débit - crédit)"""
        return self.montant_debit - self.montant_credit
    
    def montant_absolu(self):
        """Retourne le montant en valeur absolue"""
        return max(self.montant_debit, self.montant_credit)


class CessionInterne(models.Model):
    """
    Gestion des cessions internes entre sections analytiques
    Valorisation des prestations internes
    """
    METHODES_VALORISATION = [
        ('COUT_COMPLET', 'Coût Complet'),
        ('COUT_VARIABLE', 'Coût Variable'),
        ('COUT_STANDARD', 'Coût Standard'),
        ('PRIX_MARCHE', 'Prix de Marché'),
        ('PRIX_TRANSFERT', 'Prix de Transfert')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    code = models.CharField(max_length=15, unique=True)
    
    # Sections
    section_cedante = models.ForeignKey(SectionAnalytique, on_delete=models.CASCADE, related_name='cessions_sortantes')
    section_cessionnaire = models.ForeignKey(SectionAnalytique, on_delete=models.CASCADE, related_name='cessions_entrantes')
    
    # Valorisation
    methode_valorisation = models.CharField(max_length=20, choices=METHODES_VALORISATION)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=4)
    unite = models.CharField(max_length=20)
    
    # Période
    date_debut = models.DateField()
    date_fin = models.DateField(null=True, blank=True)
    
    # Quantités et montants
    quantite = models.DecimalField(max_digits=15, decimal_places=4)
    montant_total = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Références
    numero_piece = models.CharField(max_length=20)
    date_cession = models.DateField()
    libelle = models.CharField(max_length=200)
    
    actif = models.BooleanField(default=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'analytical_internal_transfers'
        ordering = ['-date_cession']
        unique_together = ['company', 'code']


class TableauBordAnalytique(models.Model):
    """
    Tableaux de bord analytiques personnalisés
    KPIs et indicateurs de performance par section
    """
    TYPES_TABLEAU = [
        ('SECTION', 'Par Section'),
        ('AXE', 'Par Axe d\'Analyse'),
        ('COMPARATIVE', 'Analyse Comparative'),
        ('EVOLUTION', 'Évolution Temporelle'),
        ('BUDGET_REALISE', 'Budget vs Réalisé')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    nom = models.CharField(max_length=100)
    type_tableau = models.CharField(max_length=20, choices=TYPES_TABLEAU)
    
    # Périmètre d'analyse
    sections_incluses = models.ManyToManyField(SectionAnalytique, blank=True)
    axes_inclus = models.ManyToManyField(AxeAnalytique, blank=True)
    comptes_inclus = models.ManyToManyField(CompteComptable, blank=True)
    
    # Période d'analyse
    periode_debut = models.DateField()
    periode_fin = models.DateField()
    
    # Configuration d'affichage
    configuration_json = models.JSONField(default=dict)  # Structure du tableau, KPIs, etc.
    
    # Propriétaire et partage
    proprietaire = models.ForeignKey(User, on_delete=models.CASCADE)
    public = models.BooleanField(default=False)
    utilisateurs_autorises = models.ManyToManyField(User, blank=True, related_name='tableaux_analytiques_autorises')
    
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'analytical_dashboards'
        ordering = ['nom']


class AbonnementAnalytique(models.Model):
    """
    Gestion des abonnements analytiques
    Répartition automatique de charges/produits sur plusieurs périodes
    """
    TYPES_ABONNEMENT = [
        ('CHARGES', 'Charges'),
        ('PRODUITS', 'Produits'),
        ('MIXTE', 'Charges et Produits')
    ]
    
    FREQUENCES = [
        ('MENSUEL', 'Mensuel'),
        ('TRIMESTRIEL', 'Trimestriel'),
        ('SEMESTRIEL', 'Semestriel'),
        ('ANNUEL', 'Annuel')
    ]
    
    company = models.ForeignKey(Company, on_delete=models.CASCADE)
    code = models.CharField(max_length=15, unique=True)
    nom = models.CharField(max_length=100)
    
    # Configuration
    type_abonnement = models.CharField(max_length=15, choices=TYPES_ABONNEMENT)
    frequence = models.CharField(max_length=15, choices=FREQUENCES, default='MENSUEL')
    
    # Montants
    montant_total = models.DecimalField(max_digits=15, decimal_places=2)
    nombre_echeances = models.IntegerField()
    montant_par_echeance = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Période
    date_debut = models.DateField()
    date_fin = models.DateField()
    
    # Analytique
    section_analytique = models.ForeignKey(SectionAnalytique, on_delete=models.CASCADE)
    compte_general = models.ForeignKey(CompteComptable, on_delete=models.CASCADE)
    cle_repartition = models.ForeignKey(CleRepartition, null=True, blank=True, on_delete=models.SET_NULL)
    
    # État
    actif = models.BooleanField(default=True)
    echeances_generees = models.IntegerField(default=0)
    
    date_creation = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'analytical_subscriptions'
        ordering = ['code']
        unique_together = ['company', 'code']


class EcheanceAbonnement(models.Model):
    """Échéances générées pour les abonnements analytiques"""
    abonnement = models.ForeignKey(AbonnementAnalytique, on_delete=models.CASCADE, related_name='echeances')
    
    numero_echeance = models.IntegerField()
    date_echeance = models.DateField()
    montant = models.DecimalField(max_digits=15, decimal_places=2)
    
    # État
    genere = models.BooleanField(default=False)
    date_generation = models.DateTimeField(null=True, blank=True)
    ecriture_analytique = models.ForeignKey(EcritureAnalytique, null=True, blank=True, on_delete=models.SET_NULL)
    
    class Meta:
        db_table = 'analytical_subscription_schedules'
        unique_together = ['abonnement', 'numero_echeance']
        ordering = ['date_echeance']