from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
import json

from .models import (
    ConfigurationCategory,
    ConfigurationParameter,
    ConfigurationValue,
    ConfigurationTemplate,
    ConfigurationAudit,
    ConfigurationExport,
    ConfigurationImport
)


@admin.register(ConfigurationCategory)
class ConfigurationCategoryAdmin(admin.ModelAdmin):
    list_display = ['code', 'nom', 'icone', 'ordre', 'active', 'parameter_count']
    list_filter = ['active']
    search_fields = ['code', 'nom', 'description']
    ordering = ['ordre', 'nom']
    prepopulated_fields = {'code': ('nom',)}
    
    def parameter_count(self, obj):
        count = obj.parameters.count()
        if count > 0:
            url = reverse('admin:configuration_configurationparameter_changelist')
            return format_html(
                '<a href="{}?category__id={}">{} paramètres</a>',
                url, obj.id, count
            )
        return "0 paramètre"
    parameter_count.short_description = "Paramètres"
    parameter_count.admin_order_field = 'parameters__count'


@admin.register(ConfigurationParameter)
class ConfigurationParameterAdmin(admin.ModelAdmin):
    list_display = [
        'code', 'nom', 'category', 'type_parametre', 'scope',
        'obligatoire', 'modifiable', 'active', 'values_count'
    ]
    list_filter = [
        'category', 'type_parametre', 'scope',
        'obligatoire', 'modifiable', 'active'
    ]
    search_fields = ['code', 'nom', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['category__ordre', 'ordre', 'nom']
    
    fieldsets = (
        ('Identification', {
            'fields': ('code', 'nom', 'description', 'category')
        }),
        ('Type et Scope', {
            'fields': ('type_parametre', 'scope')
        }),
        ('Valeurs', {
            'fields': ('valeur_defaut', 'valeurs_possibles', 'contraintes')
        }),
        ('Options', {
            'fields': ('obligatoire', 'modifiable', 'visible', 'ordre')
        }),
        ('Documentation', {
            'fields': ('aide', 'exemples'),
            'classes': ('collapse',)
        }),
        ('Système', {
            'fields': ('active', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def values_count(self, obj):
        count = obj.values.count()
        if count > 0:
            url = reverse('admin:configuration_configurationvalue_changelist')
            return format_html(
                '<a href="{}?parameter__id={}">{} valeurs</a>',
                url, obj.id, count
            )
        return "0 valeur"
    values_count.short_description = "Valeurs"
    values_count.admin_order_field = 'values__count'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('category')


@admin.register(ConfigurationValue)
class ConfigurationValueAdmin(admin.ModelAdmin):
    list_display = [
        'parameter', 'societe', 'get_typed_value_display',
        'date_modification', 'modifie_par'
    ]
    list_filter = ['parameter__category', 'parameter__type_parametre', 'date_modification']
    search_fields = ['parameter__nom', 'societe__nom', 'valeur']
    readonly_fields = ['date_modification']
    raw_id_fields = ['parameter', 'societe', 'modifie_par']
    
    def get_typed_value_display(self, obj):
        """Affiche la valeur typée."""
        typed_value = obj.get_typed_value()
        
        if obj.parameter.type_parametre == 'boolean':
            return "✓" if typed_value else "✗"
        elif obj.parameter.type_parametre == 'json':
            return format_html('<code>{}</code>', json.dumps(typed_value, indent=2)[:100])
        else:
            return str(typed_value)[:100]
    
    get_typed_value_display.short_description = "Valeur"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'parameter', 'parameter__category', 'societe', 'modifie_par'
        )


@admin.register(ConfigurationTemplate)
class ConfigurationTemplateAdmin(admin.ModelAdmin):
    list_display = ['nom', 'type_template', 'active', 'ordre', 'parameter_count', 'import_count']
    list_filter = ['type_template', 'active']
    search_fields = ['nom', 'description']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['type_template', 'ordre', 'nom']
    
    fieldsets = (
        ('Général', {
            'fields': ('nom', 'description', 'type_template')
        }),
        ('Critères d\'application', {
            'fields': ('criteres',),
            'description': 'JSON définissant les critères d\'application du template'
        }),
        ('Configuration', {
            'fields': ('configuration_data',),
            'description': 'JSON avec les paramètres et leurs valeurs'
        }),
        ('Options', {
            'fields': ('active', 'ordre')
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def parameter_count(self, obj):
        return len(obj.configuration_data)
    parameter_count.short_description = "Nb paramètres"
    
    def import_count(self, obj):
        count = obj.imports.count()
        if count > 0:
            url = reverse('admin:configuration_configurationimport_changelist')
            return format_html(
                '<a href="{}?source_template__id={}">{} imports</a>',
                url, obj.id, count
            )
        return "0 import"
    import_count.short_description = "Imports"


@admin.register(ConfigurationAudit)
class ConfigurationAuditAdmin(admin.ModelAdmin):
    list_display = [
        'parameter', 'societe', 'ancienne_valeur_short', 'nouvelle_valeur_short',
        'date_modification', 'modifie_par', 'raison'
    ]
    list_filter = ['parameter__category', 'date_modification', 'raison']
    search_fields = ['parameter__nom', 'societe__nom', 'modifie_par__email']
    readonly_fields = ['date_modification']
    date_hierarchy = 'date_modification'
    ordering = ['-date_modification']
    
    def ancienne_valeur_short(self, obj):
        return (obj.ancienne_valeur[:50] + '...') if len(obj.ancienne_valeur) > 50 else obj.ancienne_valeur
    ancienne_valeur_short.short_description = "Ancienne valeur"
    
    def nouvelle_valeur_short(self, obj):
        return (obj.nouvelle_valeur[:50] + '...') if len(obj.nouvelle_valeur) > 50 else obj.nouvelle_valeur
    nouvelle_valeur_short.short_description = "Nouvelle valeur"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'parameter', 'parameter__category', 'societe', 'modifie_par'
        )


@admin.register(ConfigurationExport)
class ConfigurationExportAdmin(admin.ModelAdmin):
    list_display = ['nom', 'societe', 'date_export', 'exporte_par', 'parameter_count']
    list_filter = ['date_export']
    search_fields = ['nom', 'societe__nom', 'exporte_par__email']
    readonly_fields = ['date_export', 'created_at', 'updated_at']
    date_hierarchy = 'date_export'
    ordering = ['-date_export']
    
    fieldsets = (
        ('Général', {
            'fields': ('nom', 'description', 'societe')
        }),
        ('Filtres', {
            'fields': ('categories', 'parameters'),
            'classes': ('collapse',)
        }),
        ('Données exportées', {
            'fields': ('configuration_data',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('date_export', 'exporte_par', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    filter_horizontal = ['categories', 'parameters']
    
    def parameter_count(self, obj):
        return len(obj.configuration_data)
    parameter_count.short_description = "Nb paramètres"
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('societe', 'exporte_par')


@admin.register(ConfigurationImport)
class ConfigurationImportAdmin(admin.ModelAdmin):
    list_display = [
        'nom', 'societe', 'get_status_display_colored', 'date_import',
        'parameters_imported', 'parameters_failed', 'importe_par'
    ]
    list_filter = ['status', 'date_import', 'overwrite_existing']
    search_fields = ['nom', 'societe__nom', 'importe_par__email']
    readonly_fields = [
        'date_import', 'parameters_imported', 'parameters_failed', 
        'created_at', 'updated_at'
    ]
    date_hierarchy = 'date_import'
    ordering = ['-date_import']
    
    fieldsets = (
        ('Général', {
            'fields': ('nom', 'description', 'societe')
        }),
        ('Source', {
            'fields': ('source_export', 'source_template')
        }),
        ('Options', {
            'fields': ('overwrite_existing',)
        }),
        ('Résultats', {
            'fields': ('status', 'parameters_imported', 'parameters_failed', 'errors'),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('date_import', 'importe_par', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        })
    )
    
    def get_status_display_colored(self, obj):
        """Affiche le statut avec des couleurs."""
        colors = {
            'pending': '#ffc107',
            'processing': '#17a2b8',
            'completed': '#28a745',
            'failed': '#dc3545'
        }
        color = colors.get(obj.status, '#6c757d')
        
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    
    get_status_display_colored.short_description = "Statut"
    get_status_display_colored.admin_order_field = 'status'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'societe', 'source_export', 'source_template', 'importe_par'
        )