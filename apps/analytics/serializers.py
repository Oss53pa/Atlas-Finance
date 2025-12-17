"""
Serializers pour la comptabilité analytique multi-axes
"""
from rest_framework import serializers
from decimal import Decimal
from .models import (
    AxeAnalytique, SectionAnalytique, VentilationAnalytique, ModeleVentilation,
    BalanceAnalytique, RepartitionAutomatique, LigneRepartition, TableauBord,
    WidgetTableauBord, CleRepartition
)


def decimal_to_float(value):
    """Conversion sécurisée Decimal -> float"""
    if value is None:
        return 0.0
    return float(value)


class AxeAnalytiqueSerializer(serializers.ModelSerializer):
    """Serializer pour les axes analytiques"""

    nb_sections = serializers.SerializerMethodField()
    nb_comptes_concernes = serializers.SerializerMethodField()

    def get_nb_sections(self, obj):
        return obj.sections.count()

    def get_nb_comptes_concernes(self, obj):
        return obj.comptes_concernes.count()

    class Meta:
        model = AxeAnalytique
        fields = [
            'id', 'societe', 'code', 'libelle', 'description', 'type_axe',
            'obligatoire', 'ventilation_totale', 'hierarchique', 'profondeur_max',
            'is_active', 'ordre_affichage', 'couleur',
            'nb_sections', 'nb_comptes_concernes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class SectionAnalytiqueSerializer(serializers.ModelSerializer):
    """Serializer pour les sections analytiques"""

    axe_code = serializers.CharField(source='axe.code', read_only=True)
    axe_libelle = serializers.CharField(source='axe.libelle', read_only=True)
    parent_code = serializers.CharField(source='parent.code', read_only=True, allow_null=True)
    responsable_name = serializers.CharField(
        source='responsable.get_full_name', read_only=True, allow_null=True
    )
    code_complet = serializers.CharField(read_only=True)
    niveau = serializers.IntegerField(read_only=True)
    budget_annuel = serializers.SerializerMethodField()

    def get_budget_annuel(self, obj):
        return decimal_to_float(obj.budget_annuel)

    class Meta:
        model = SectionAnalytique
        fields = [
            'id', 'axe', 'axe_code', 'axe_libelle', 'parent', 'parent_code',
            'responsable', 'responsable_name', 'code', 'libelle', 'description',
            'budgetaire', 'budget_annuel', 'date_debut', 'date_fin',
            'coefficients_repartition', 'is_active', 'ordre_affichage', 'couleur',
            'code_complet', 'niveau',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'code_complet', 'niveau']


class VentilationAnalytiqueSerializer(serializers.ModelSerializer):
    """Serializer pour les ventilations analytiques"""

    section_code = serializers.CharField(source='section.code_complet', read_only=True)
    section_libelle = serializers.CharField(source='section.libelle', read_only=True)
    axe_code = serializers.CharField(source='section.axe.code', read_only=True)
    montant = serializers.SerializerMethodField()
    pourcentage = serializers.SerializerMethodField()

    def get_montant(self, obj):
        return decimal_to_float(obj.montant)

    def get_pourcentage(self, obj):
        return decimal_to_float(obj.pourcentage)

    class Meta:
        model = VentilationAnalytique
        fields = [
            'id', 'ligne_ecriture', 'section', 'section_code', 'section_libelle',
            'axe_code', 'montant', 'pourcentage', 'libelle', 'reference',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        """Validation de cohérence montant/pourcentage"""
        if 'montant' in data and 'pourcentage' in data and 'ligne_ecriture' in data:
            ligne = data['ligne_ecriture']
            montant_base = ligne.debit or ligne.credit
            montant_calcule = (montant_base * data['pourcentage']) / 100

            if abs(data['montant'] - montant_calcule) > Decimal('0.01'):
                raise serializers.ValidationError(
                    "Le montant ne correspond pas au pourcentage appliqué"
                )

        return data


class ModeleVentilationSerializer(serializers.ModelSerializer):
    """Serializer pour les modèles de ventilation"""

    compte_code = serializers.CharField(source='compte.code', read_only=True)
    compte_libelle = serializers.CharField(source='compte.libelle', read_only=True)

    class Meta:
        model = ModeleVentilation
        fields = [
            'id', 'societe', 'compte', 'compte_code', 'compte_libelle',
            'code', 'libelle', 'description', 'ventilations_defaut',
            'conditions', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class BalanceAnalytiqueSerializer(serializers.ModelSerializer):
    """Serializer pour les balances analytiques"""

    section_code = serializers.CharField(source='section.code_complet', read_only=True)
    section_libelle = serializers.CharField(source='section.libelle', read_only=True)
    compte_code = serializers.CharField(source='compte.code', read_only=True)
    compte_libelle = serializers.CharField(source='compte.libelle', read_only=True)
    solde_initial = serializers.SerializerMethodField()
    mouvement_debit = serializers.SerializerMethodField()
    mouvement_credit = serializers.SerializerMethodField()
    solde_final = serializers.SerializerMethodField()

    def get_solde_initial(self, obj):
        return decimal_to_float(obj.solde_initial)

    def get_mouvement_debit(self, obj):
        return decimal_to_float(obj.mouvement_debit)

    def get_mouvement_credit(self, obj):
        return decimal_to_float(obj.mouvement_credit)

    def get_solde_final(self, obj):
        return decimal_to_float(obj.solde_final)

    class Meta:
        model = BalanceAnalytique
        fields = [
            'id', 'societe', 'section', 'section_code', 'section_libelle',
            'compte', 'compte_code', 'compte_libelle',
            'exercice', 'periode', 'date_debut', 'date_fin',
            'solde_initial', 'mouvement_debit', 'mouvement_credit',
            'solde_final', 'type_solde', 'nb_mouvements', 'date_calcul',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'date_calcul']


class LigneRepartitionSerializer(serializers.ModelSerializer):
    """Serializer pour les lignes de répartition"""

    section_code = serializers.CharField(
        source='section_destination.code_complet', read_only=True
    )
    section_libelle = serializers.CharField(
        source='section_destination.libelle', read_only=True
    )
    pourcentage = serializers.SerializerMethodField()
    montant_fixe = serializers.SerializerMethodField()

    def get_pourcentage(self, obj):
        return decimal_to_float(obj.pourcentage)

    def get_montant_fixe(self, obj):
        return decimal_to_float(obj.montant_fixe)

    class Meta:
        model = LigneRepartition
        fields = [
            'id', 'repartition', 'section_destination', 'section_code',
            'section_libelle', 'pourcentage', 'montant_fixe',
            'conditions', 'ordre',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class RepartitionAutomatiqueSerializer(serializers.ModelSerializer):
    """Serializer pour les répartitions automatiques"""

    compte_source_code = serializers.CharField(source='compte_source.code', read_only=True)
    compte_source_libelle = serializers.CharField(source='compte_source.libelle', read_only=True)
    compte_base_code = serializers.CharField(
        source='compte_base.code', read_only=True, allow_null=True
    )
    lignes = LigneRepartitionSerializer(many=True, read_only=True)
    nb_lignes = serializers.SerializerMethodField()

    def get_nb_lignes(self, obj):
        return obj.lignes.count()

    class Meta:
        model = RepartitionAutomatique
        fields = [
            'id', 'societe', 'compte_source', 'compte_source_code', 'compte_source_libelle',
            'code', 'libelle', 'description', 'type_repartition', 'frequence',
            'compte_base', 'compte_base_code', 'parametres',
            'date_debut', 'date_fin', 'derniere_execution',
            'is_active', 'execution_auto',
            'lignes', 'nb_lignes',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'derniere_execution']


class WidgetTableauBordSerializer(serializers.ModelSerializer):
    """Serializer pour les widgets des tableaux de bord"""

    class Meta:
        model = WidgetTableauBord
        fields = [
            'id', 'tableau_bord', 'titre', 'type_graphique', 'requete',
            'position_x', 'position_y', 'largeur', 'hauteur',
            'couleurs', 'options_graphique', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class TableauBordSerializer(serializers.ModelSerializer):
    """Serializer pour les tableaux de bord analytiques"""

    widgets = WidgetTableauBordSerializer(many=True, read_only=True)
    nb_widgets = serializers.SerializerMethodField()
    axes_codes = serializers.SerializerMethodField()

    def get_nb_widgets(self, obj):
        return obj.widgets.filter(is_active=True).count()

    def get_axes_codes(self, obj):
        return list(obj.axes_analyses.values_list('code', flat=True))

    class Meta:
        model = TableauBord
        fields = [
            'id', 'societe', 'axes_analyses', 'axes_codes',
            'code', 'libelle', 'description', 'configuration',
            'public', 'utilisateurs_autorises',
            'is_active', 'favori',
            'widgets', 'nb_widgets',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class CleRepartitionSerializer(serializers.ModelSerializer):
    """Serializer pour les clés de répartition"""

    axe_code = serializers.CharField(source='axe.code', read_only=True)
    axe_libelle = serializers.CharField(source='axe.libelle', read_only=True)
    total_coefficients = serializers.SerializerMethodField()

    def get_total_coefficients(self, obj):
        if obj.coefficients:
            return sum(obj.coefficients.values())
        return 0

    class Meta:
        model = CleRepartition
        fields = [
            'id', 'societe', 'axe', 'axe_code', 'axe_libelle',
            'code', 'libelle', 'description', 'coefficients',
            'date_debut', 'date_fin', 'is_active',
            'total_coefficients',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']

    def validate_coefficients(self, value):
        """Valide que la somme des coefficients = 100"""
        if value:
            total = sum(value.values())
            if abs(total - 100) > 0.01:
                raise serializers.ValidationError(
                    "La somme des coefficients doit être égale à 100%"
                )
        return value
