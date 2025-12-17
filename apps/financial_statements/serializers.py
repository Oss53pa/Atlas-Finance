"""
Serializers pour les états financiers SYSCOHADA
"""
from rest_framework import serializers
from decimal import Decimal
from .models import (
    BilanComptable, CompteResultat, SoldesIntermediaires, RatioFinancier,
    TableauFluxTresorerie, TableFinancement, FinancialReport,
    AuditTrail, FinancialDashboard
)


def decimal_to_float(value):
    """Conversion sécurisée Decimal -> float"""
    if value is None:
        return 0.0
    return float(value)


class BilanComptableSerializer(serializers.ModelSerializer):
    """Serializer pour le bilan comptable"""

    company_name = serializers.CharField(source='company.name', read_only=True)
    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    montant_brut = serializers.SerializerMethodField()
    amortissements_provisions = serializers.SerializerMethodField()
    montant_net = serializers.SerializerMethodField()
    montant_exercice_precedent = serializers.SerializerMethodField()

    def get_montant_brut(self, obj):
        return decimal_to_float(obj.montant_brut)

    def get_amortissements_provisions(self, obj):
        return decimal_to_float(obj.amortissements_provisions)

    def get_montant_net(self, obj):
        return decimal_to_float(obj.montant_net)

    def get_montant_exercice_precedent(self, obj):
        return decimal_to_float(obj.montant_exercice_precedent)

    class Meta:
        model = BilanComptable
        fields = [
            'id', 'company', 'company_name', 'fiscal_year', 'fiscal_year_name',
            'bilan_type', 'section', 'ligne_numero', 'libelle',
            'comptes_inclus', 'montant_brut', 'amortissements_provisions',
            'montant_net', 'montant_exercice_precedent', 'ordre_affichage',
            'date_generation', 'generated_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'date_generation']


class CompteResultatSerializer(serializers.ModelSerializer):
    """Serializer pour le compte de résultat"""

    company_name = serializers.CharField(source='company.name', read_only=True)
    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    montant_exercice = serializers.SerializerMethodField()
    montant_exercice_precedent = serializers.SerializerMethodField()
    pourcentage_ca = serializers.SerializerMethodField()

    def get_montant_exercice(self, obj):
        return decimal_to_float(obj.montant_exercice)

    def get_montant_exercice_precedent(self, obj):
        return decimal_to_float(obj.montant_exercice_precedent)

    def get_pourcentage_ca(self, obj):
        return decimal_to_float(obj.pourcentage_ca)

    class Meta:
        model = CompteResultat
        fields = [
            'id', 'company', 'company_name', 'fiscal_year', 'fiscal_year_name',
            'ligne_numero', 'libelle', 'nature', 'type_element',
            'comptes_inclus', 'montant_exercice', 'montant_exercice_precedent',
            'pourcentage_ca', 'ordre_affichage',
            'date_generation', 'generated_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'date_generation']


class SoldesIntermediairesSerializer(serializers.ModelSerializer):
    """Serializer pour les soldes intermédiaires de gestion"""

    company_name = serializers.CharField(source='company.name', read_only=True)
    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    montant_exercice = serializers.SerializerMethodField()
    montant_exercice_precedent = serializers.SerializerMethodField()
    evolution_absolue = serializers.SerializerMethodField()
    evolution_relative = serializers.SerializerMethodField()
    pourcentage_ca = serializers.SerializerMethodField()

    def get_montant_exercice(self, obj):
        return decimal_to_float(obj.montant_exercice)

    def get_montant_exercice_precedent(self, obj):
        return decimal_to_float(obj.montant_exercice_precedent)

    def get_evolution_absolue(self, obj):
        return decimal_to_float(obj.evolution_absolue)

    def get_evolution_relative(self, obj):
        return decimal_to_float(obj.evolution_relative)

    def get_pourcentage_ca(self, obj):
        return decimal_to_float(obj.pourcentage_ca)

    class Meta:
        model = SoldesIntermediaires
        fields = [
            'id', 'company', 'company_name', 'fiscal_year', 'fiscal_year_name',
            'solde_type', 'libelle', 'formule_calcul',
            'montant_exercice', 'montant_exercice_precedent',
            'evolution_absolue', 'evolution_relative', 'pourcentage_ca',
            'composants_calcul', 'ordre_affichage', 'date_generation',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'date_generation']


class RatioFinancierSerializer(serializers.ModelSerializer):
    """Serializer pour les ratios financiers"""

    company_name = serializers.CharField(source='company.name', read_only=True)
    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    valeur_exercice = serializers.SerializerMethodField()
    valeur_exercice_precedent = serializers.SerializerMethodField()
    valeur_optimale_min = serializers.SerializerMethodField()
    valeur_optimale_max = serializers.SerializerMethodField()
    numerateur = serializers.SerializerMethodField()
    denominateur = serializers.SerializerMethodField()
    evolution_absolue = serializers.SerializerMethodField()
    evolution_relative = serializers.SerializerMethodField()

    def get_valeur_exercice(self, obj):
        return decimal_to_float(obj.valeur_exercice)

    def get_valeur_exercice_precedent(self, obj):
        return decimal_to_float(obj.valeur_exercice_precedent)

    def get_valeur_optimale_min(self, obj):
        return decimal_to_float(obj.valeur_optimale_min)

    def get_valeur_optimale_max(self, obj):
        return decimal_to_float(obj.valeur_optimale_max)

    def get_numerateur(self, obj):
        return decimal_to_float(obj.numerateur)

    def get_denominateur(self, obj):
        return decimal_to_float(obj.denominateur)

    def get_evolution_absolue(self, obj):
        return decimal_to_float(obj.evolution_absolue)

    def get_evolution_relative(self, obj):
        return decimal_to_float(obj.evolution_relative)

    class Meta:
        model = RatioFinancier
        fields = [
            'id', 'company', 'company_name', 'fiscal_year', 'fiscal_year_name',
            'category', 'ratio_type', 'libelle', 'formule',
            'valeur_exercice', 'valeur_exercice_precedent',
            'unite', 'valeur_optimale_min', 'valeur_optimale_max',
            'evaluation', 'numerateur', 'denominateur',
            'composants_calcul', 'evolution_absolue', 'evolution_relative',
            'ordre_affichage', 'date_generation',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'date_generation']


class TableauFluxTresorerieSerializer(serializers.ModelSerializer):
    """Serializer pour le tableau des flux de trésorerie"""

    company_name = serializers.CharField(source='company.name', read_only=True)
    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    montant_exercice = serializers.SerializerMethodField()
    montant_exercice_precedent = serializers.SerializerMethodField()

    def get_montant_exercice(self, obj):
        return decimal_to_float(obj.montant_exercice)

    def get_montant_exercice_precedent(self, obj):
        return decimal_to_float(obj.montant_exercice_precedent)

    class Meta:
        model = TableauFluxTresorerie
        fields = [
            'id', 'company', 'company_name', 'fiscal_year', 'fiscal_year_name',
            'flux_type', 'sens', 'ligne_numero', 'libelle',
            'montant_exercice', 'montant_exercice_precedent',
            'methode_calcul', 'comptes_source', 'formule_calcul',
            'ordre_affichage', 'date_generation',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'date_generation']


class TableFinancementSerializer(serializers.ModelSerializer):
    """Serializer pour la table de financement"""

    company_name = serializers.CharField(source='company.name', read_only=True)
    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    montant_exercice = serializers.SerializerMethodField()
    montant_exercice_precedent = serializers.SerializerMethodField()
    variation_absolue = serializers.SerializerMethodField()

    def get_montant_exercice(self, obj):
        return decimal_to_float(obj.montant_exercice)

    def get_montant_exercice_precedent(self, obj):
        return decimal_to_float(obj.montant_exercice_precedent)

    def get_variation_absolue(self, obj):
        return decimal_to_float(obj.variation_absolue)

    class Meta:
        model = TableFinancement
        fields = [
            'id', 'company', 'company_name', 'fiscal_year', 'fiscal_year_name',
            'nature', 'type_element', 'ligne_numero', 'libelle',
            'montant_exercice', 'montant_exercice_precedent',
            'variation_absolue', 'comptes_inclus', 'ordre_affichage',
            'date_generation',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'date_generation']


class FinancialReportSerializer(serializers.ModelSerializer):
    """Serializer pour les rapports financiers"""

    company_name = serializers.CharField(source='company.name', read_only=True)
    fiscal_year_name = serializers.CharField(source='fiscal_year.name', read_only=True)
    generated_by_name = serializers.CharField(
        source='generated_by.get_full_name', read_only=True, allow_null=True
    )
    file_url = serializers.SerializerMethodField()

    def get_file_url(self, obj):
        if obj.generated_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.generated_file.url)
        return None

    class Meta:
        model = FinancialReport
        fields = [
            'id', 'company', 'company_name', 'fiscal_year', 'fiscal_year_name',
            'report_type', 'report_name', 'output_format',
            'period_start', 'period_end', 'status',
            'generated_file', 'file_url', 'file_size',
            'include_comparisons', 'include_graphs', 'include_ratios',
            'generated_at', 'generated_by', 'generated_by_name',
            'generation_time_seconds', 'report_data',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'created_at', 'updated_at', 'generated_at',
            'generation_time_seconds', 'file_size'
        ]


class AuditTrailSerializer(serializers.ModelSerializer):
    """Serializer pour la piste d'audit"""

    company_name = serializers.CharField(source='company.name', read_only=True)
    user_name = serializers.CharField(
        source='user.get_full_name', read_only=True, allow_null=True
    )
    fiscal_year_name = serializers.CharField(
        source='fiscal_year.name', read_only=True, allow_null=True
    )

    class Meta:
        model = AuditTrail
        fields = [
            'id', 'company', 'company_name', 'action', 'object_type', 'object_id',
            'user', 'user_name', 'session_id', 'ip_address', 'user_agent',
            'description', 'old_values', 'new_values',
            'fiscal_year', 'fiscal_year_name', 'business_context',
            'timestamp', 'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'timestamp']


class FinancialDashboardSerializer(serializers.ModelSerializer):
    """Serializer pour les tableaux de bord financiers"""

    company_name = serializers.CharField(source='company.name', read_only=True)
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True
    )

    class Meta:
        model = FinancialDashboard
        fields = [
            'id', 'company', 'company_name', 'dashboard_type',
            'name', 'description', 'created_by', 'created_by_name',
            'is_public', 'widgets_config', 'layout_config',
            'auto_refresh', 'refresh_interval_minutes',
            'cached_data', 'last_refresh',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at', 'last_refresh']
