from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import (
    RegimeFiscal, TypeDeclaration, DeclarationFiscale, 
    LigneDeclaration, EvenementFiscal, ObligationFiscale,
    PlanificationDeclaration, ControlesFiscaux, DocumentFiscal, AlerteFiscale
)

@admin.register(RegimeFiscal)
class RegimeFiscalAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'societe', 'actif', 'date_debut', 'date_fin']
    list_filter = ['actif', 'date_debut', 'societe']
    search_fields = ['code', 'libelle', 'societe__raison_sociale']
    readonly_fields = ['date_creation', 'date_modification']
    fieldsets = [
        ('Informations générales', {
            'fields': ['societe', 'code', 'libelle', 'description']
        }),
        ('Période de validité', {
            'fields': ['date_debut', 'date_fin', 'actif']
        }),
        ('Paramètres fiscaux', {
            'fields': ['parametres'],
            'classes': ['collapse']
        }),
        ('Suivi', {
            'fields': ['date_creation', 'date_modification'],
            'classes': ['collapse']
        })
    ]

class LigneDeclarationInline(admin.TabularInline):
    model = LigneDeclaration
    extra = 0
    fields = ['rubrique', 'libelle', 'base_calcul', 'taux', 'montant', 'ordre_affichage']
    readonly_fields = ['montant']

@admin.register(TypeDeclaration)
class TypeDeclarationAdmin(admin.ModelAdmin):
    list_display = ['code', 'libelle', 'regime_fiscal', 'frequence', 'actif']
    list_filter = ['frequence', 'actif', 'regime_fiscal']
    search_fields = ['code', 'libelle', 'regime_fiscal__libelle']

@admin.register(DeclarationFiscale)
class DeclarationFiscaleAdmin(admin.ModelAdmin):
    list_display = ['numero_declaration', 'type_declaration', 'periode_display', 'statut', 'montant_total', 'date_depot']
    list_filter = ['statut', 'type_declaration', 'date_depot']
    search_fields = ['numero_declaration', 'societe__raison_sociale']
    inlines = [LigneDeclarationInline]
    readonly_fields = ['numero_declaration', 'montant_total', 'date_creation']
    
    fieldsets = [
        ('Déclaration', {
            'fields': ['societe', 'type_declaration', 'exercice', 'numero_declaration']
        }),
        ('Période', {
            'fields': ['periode_debut', 'periode_fin']
        }),
        ('Statut et dépôt', {
            'fields': ['statut', 'date_depot', 'reference_depot']
        }),
        ('Montants', {
            'fields': ['montant_total', 'montant_paye', 'solde_restant']
        }),
        ('Documents', {
            'fields': ['document_pdf'],
            'classes': ['collapse']
        }),
        ('Suivi', {
            'fields': ['date_creation', 'commentaires'],
            'classes': ['collapse']
        })
    ]
    
    def periode_display(self, obj):
        return f"{obj.periode_debut} - {obj.periode_fin}"
    periode_display.short_description = "Période"

@admin.register(EvenementFiscal)
class EvenementFiscalAdmin(admin.ModelAdmin):
    list_display = ['societe', 'type_evenement', 'date_evenement', 'description']
    list_filter = ['type_evenement', 'date_evenement', 'societe']
    search_fields = ['description', 'societe__raison_sociale']
    readonly_fields = ['date_creation']

@admin.register(ObligationFiscale)
class ObligationFiscaleAdmin(admin.ModelAdmin):
    list_display = ['societe', 'type_obligation', 'date_echeance', 'statut', 'priorite']
    list_filter = ['statut', 'priorite', 'type_obligation', 'date_echeance']
    search_fields = ['description', 'societe__raison_sociale']
    readonly_fields = ['date_creation']
    
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related('societe')

@admin.register(PlanificationDeclaration)
class PlanificationDeclarationAdmin(admin.ModelAdmin):
    list_display = ['societe', 'type_declaration', 'date_prevue', 'statut', 'automatique']
    list_filter = ['statut', 'automatique', 'date_prevue']
    search_fields = ['societe__raison_sociale', 'type_declaration__libelle']

@admin.register(ControlesFiscaux)
class ControlesFiscauxAdmin(admin.ModelAdmin):
    list_display = ['societe', 'type_controle', 'date_debut', 'date_fin', 'statut', 'montant_redressement']
    list_filter = ['type_controle', 'statut', 'date_debut']
    search_fields = ['societe__raison_sociale', 'organisme_controleur']
    readonly_fields = ['date_creation']
    
    fieldsets = [
        ('Contrôle', {
            'fields': ['societe', 'type_controle', 'organisme_controleur']
        }),
        ('Période', {
            'fields': ['date_debut', 'date_fin', 'periode_controlee_debut', 'periode_controlee_fin']
        }),
        ('Résultats', {
            'fields': ['statut', 'montant_redressement', 'montant_penalites']
        }),
        ('Suivi', {
            'fields': ['date_creation', 'observations'],
            'classes': ['collapse']
        })
    ]

@admin.register(DocumentFiscal)
class DocumentFiscalAdmin(admin.ModelAdmin):
    list_display = ['societe', 'type_document', 'numero_document', 'date_document', 'statut']
    list_filter = ['type_document', 'statut', 'date_document']
    search_fields = ['numero_document', 'societe__raison_sociale']
    readonly_fields = ['date_creation']

@admin.register(AlerteFiscale)
class AlerteFiscaleAdmin(admin.ModelAdmin):
    list_display = ['societe', 'type_alerte', 'niveau_priorite', 'date_creation', 'resolu', 'action_status']
    list_filter = ['type_alerte', 'niveau_priorite', 'resolu', 'date_creation']
    search_fields = ['message', 'societe__raison_sociale']
    readonly_fields = ['date_creation', 'date_resolution']
    actions = ['marquer_resolu']
    
    def action_status(self, obj):
        if obj.resolu:
            return format_html('<span style="color: green;">✓ Résolu</span>')
        else:
            if obj.niveau_priorite == 'HAUTE':
                return format_html('<span style="color: red;">⚠ À traiter</span>')
            elif obj.niveau_priorite == 'MOYENNE':
                return format_html('<span style="color: orange;">⚠ À traiter</span>')
            else:
                return format_html('<span style="color: blue;">ⓘ À traiter</span>')
    action_status.short_description = "Statut"
    
    def marquer_resolu(self, request, queryset):
        queryset.update(resolu=True, date_resolution=timezone.now())
        self.message_user(request, f"{queryset.count()} alerte(s) marquée(s) comme résolue(s).")
    marquer_resolu.short_description = "Marquer comme résolu"