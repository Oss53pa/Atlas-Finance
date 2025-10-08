from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
import uuid

class Exercise(models.Model):
    """Modèle pour les exercices comptables"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=20, unique=True)
    libelle = models.CharField(max_length=200)
    date_debut = models.DateField()
    date_fin = models.DateField()
    statut = models.CharField(
        max_length=20,
        choices=[
            ('ouvert', 'Ouvert'),
            ('en_cloture', 'En cours de clôture'),
            ('cloture', 'Clôturé'),
            ('archive', 'Archivé')
        ],
        default='ouvert'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date_debut']

    def __str__(self):
        return f"{self.code} - {self.libelle}"


class ClotureMensuelle(models.Model):
    """Modèle pour les clôtures mensuelles"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exercice = models.ForeignKey(Exercise, on_delete=models.CASCADE, related_name='clotures_mensuelles')
    mois = models.IntegerField()
    annee = models.IntegerField()
    statut = models.CharField(
        max_length=30,
        choices=[
            ('en_attente', 'En attente'),
            ('en_cours', 'En cours'),
            ('validation', 'En validation'),
            ('validee', 'Validée'),
            ('cloturee', 'Clôturée'),
            ('annulee', 'Annulée')
        ],
        default='en_attente'
    )

    # Étapes de clôture
    saisie_complete = models.BooleanField(default=False)
    ecritures_validees = models.BooleanField(default=False)
    comptes_lettres = models.BooleanField(default=False)
    rapprochements_bancaires = models.BooleanField(default=False)
    provisions_calculees = models.BooleanField(default=False)
    amortissements_calcules = models.BooleanField(default=False)
    balance_equilibree = models.BooleanField(default=False)
    etats_generes = models.BooleanField(default=False)

    # Statistiques
    nombre_ecritures = models.IntegerField(default=0)
    nombre_comptes = models.IntegerField(default=0)
    total_debit = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    total_credit = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    # Dates importantes
    date_ouverture = models.DateTimeField(null=True, blank=True)
    date_cloture = models.DateTimeField(null=True, blank=True)
    date_validation = models.DateTimeField(null=True, blank=True)

    # Utilisateurs
    cree_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='clotures_mensuelles_creees')
    valide_par = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='clotures_mensuelles_validees')

    # Commentaires
    commentaires = models.TextField(blank=True)
    anomalies = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['exercice', 'mois', 'annee']
        ordering = ['-annee', '-mois']

    def __str__(self):
        mois_noms = ['', 'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                     'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
        return f"Clôture {mois_noms[self.mois]} {self.annee}"

    def get_progression(self):
        """Calcule le pourcentage de progression"""
        etapes = [
            self.saisie_complete, self.ecritures_validees, self.comptes_lettres,
            self.rapprochements_bancaires, self.provisions_calculees,
            self.amortissements_calcules, self.balance_equilibree, self.etats_generes
        ]
        return int((sum(etapes) / len(etapes)) * 100)


class ClotureAnnuelle(models.Model):
    """Modèle pour les clôtures annuelles"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exercice = models.OneToOneField(Exercise, on_delete=models.CASCADE, related_name='cloture_annuelle')
    statut = models.CharField(
        max_length=30,
        choices=[
            ('preparation', 'En préparation'),
            ('inventaire', 'Inventaire en cours'),
            ('regularisation', 'Régularisation'),
            ('provisionnement', 'Provisionnement'),
            ('amortissement', 'Amortissements'),
            ('controle', 'Contrôles finaux'),
            ('validation', 'En validation'),
            ('generation_etats', 'Génération états'),
            ('cloturee', 'Clôturée'),
            ('archivee', 'Archivée')
        ],
        default='preparation'
    )

    # Étapes principales
    inventaire_physique = models.BooleanField(default=False)
    ecritures_regularisation = models.BooleanField(default=False)
    provisions_fin_exercice = models.BooleanField(default=False)
    amortissements_fin_exercice = models.BooleanField(default=False)
    variation_stocks = models.BooleanField(default=False)
    charges_constatees_avance = models.BooleanField(default=False)
    produits_constates_avance = models.BooleanField(default=False)
    ecarts_conversion = models.BooleanField(default=False)
    impots_differes = models.BooleanField(default=False)
    resultat_exercice_calcule = models.BooleanField(default=False)

    # États financiers
    bilan_genere = models.BooleanField(default=False)
    compte_resultat_genere = models.BooleanField(default=False)
    tafire_genere = models.BooleanField(default=False)
    annexes_generees = models.BooleanField(default=False)

    # Validations SYSCOHADA
    conformite_syscohada = models.BooleanField(default=False)
    controle_coherence = models.BooleanField(default=False)
    audit_trail_complete = models.BooleanField(default=False)

    # Résultats financiers
    resultat_net = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    total_actif = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    total_passif = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    capitaux_propres = models.DecimalField(max_digits=20, decimal_places=2, default=0)

    # Dates clés
    date_debut_cloture = models.DateTimeField(null=True, blank=True)
    date_inventaire = models.DateField(null=True, blank=True)
    date_arrete_comptes = models.DateField(null=True, blank=True)
    date_validation_ca = models.DateField(null=True, blank=True)
    date_depot_legal = models.DateField(null=True, blank=True)

    # Responsables
    responsable_cloture = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='clotures_annuelles_responsable')
    commissaire_comptes = models.CharField(max_length=200, blank=True)
    expert_comptable = models.CharField(max_length=200, blank=True)

    # Documents et commentaires
    rapport_gestion = models.TextField(blank=True)
    observations_cac = models.TextField(blank=True)
    reserves = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-exercice__date_debut']

    def __str__(self):
        return f"Clôture annuelle {self.exercice.code}"

    def get_progression(self):
        """Calcule le pourcentage de progression"""
        etapes = [
            self.inventaire_physique, self.ecritures_regularisation,
            self.provisions_fin_exercice, self.amortissements_fin_exercice,
            self.variation_stocks, self.charges_constatees_avance,
            self.produits_constates_avance, self.ecarts_conversion,
            self.impots_differes, self.resultat_exercice_calcule,
            self.bilan_genere, self.compte_resultat_genere,
            self.tafire_genere, self.annexes_generees,
            self.conformite_syscohada, self.controle_coherence,
            self.audit_trail_complete
        ]
        return int((sum(etapes) / len(etapes)) * 100)


class HistoriqueCloture(models.Model):
    """Historique des actions sur les clôtures"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type_cloture = models.CharField(
        max_length=20,
        choices=[('mensuelle', 'Mensuelle'), ('annuelle', 'Annuelle')]
    )
    cloture_mensuelle = models.ForeignKey(ClotureMensuelle, on_delete=models.CASCADE, null=True, blank=True)
    cloture_annuelle = models.ForeignKey(ClotureAnnuelle, on_delete=models.CASCADE, null=True, blank=True)
    action = models.CharField(max_length=100)
    description = models.TextField()
    utilisateur = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    date_action = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_action']

    def __str__(self):
        return f"{self.action} - {self.date_action}"