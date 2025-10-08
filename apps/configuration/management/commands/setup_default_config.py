from django.core.management.base import BaseCommand
from django.db import transaction
import json
import os
from pathlib import Path

from apps.configuration.models import ConfigurationCategory, ConfigurationParameter, ConfigurationTemplate


class Command(BaseCommand):
    help = 'Configure les paramètres par défaut de WiseBook'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force la recréation des paramètres existants',
        )
        parser.add_argument(
            '--categories-only',
            action='store_true',
            help='Créer seulement les catégories',
        )
        parser.add_argument(
            '--templates-only',
            action='store_true',
            help='Créer seulement les templates',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Configuration de WiseBook V3.0...'))
        
        with transaction.atomic():
            # Créer les catégories
            self.create_categories()
            
            if not options['templates_only']:
                # Créer les paramètres
                self.create_parameters(force=options['force'])
            
            if not options['categories_only']:
                # Créer les templates
                self.create_templates()
        
        self.stdout.write(self.style.SUCCESS('Configuration terminée avec succès!'))
    
    def create_categories(self):
        """Créer les catégories de configuration."""
        
        categories = [
            {
                'code': 'general',
                'nom': 'Général',
                'description': 'Paramètres généraux du système',
                'icone': 'settings',
                'ordre': 1
            },
            {
                'code': 'comptabilite',
                'nom': 'Comptabilité',
                'description': 'Configuration comptable et plan de comptes',
                'icone': 'account_balance',
                'ordre': 2
            },
            {
                'code': 'fiscalite',
                'nom': 'Fiscalité',
                'description': 'Paramètres fiscaux et déclarations',
                'icone': 'receipt_long',
                'ordre': 3
            },
            {
                'code': 'tresorerie',
                'nom': 'Trésorerie',
                'description': 'Configuration bancaire et trésorerie',
                'icone': 'account_balance_wallet',
                'ordre': 4
            },
            {
                'code': 'tiers',
                'nom': 'Tiers',
                'description': 'Gestion des clients et fournisseurs',
                'icone': 'people',
                'ordre': 5
            },
            {
                'code': 'facturation',
                'nom': 'Facturation',
                'description': 'Paramètres de facturation et devis',
                'icone': 'description',
                'ordre': 6
            },
            {
                'code': 'budget',
                'nom': 'Budget',
                'description': 'Contrôle budgétaire et prévisions',
                'icone': 'trending_up',
                'ordre': 7
            },
            {
                'code': 'reporting',
                'nom': 'Reporting',
                'description': 'Configuration des rapports et tableaux de bord',
                'icone': 'analytics',
                'ordre': 8
            },
            {
                'code': 'securite',
                'nom': 'Sécurité',
                'description': 'Paramètres de sécurité et authentification',
                'icone': 'security',
                'ordre': 9
            },
            {
                'code': 'integrations',
                'nom': 'Intégrations',
                'description': 'APIs et connexions externes',
                'icone': 'sync',
                'ordre': 10
            },
            {
                'code': 'notifications',
                'nom': 'Notifications',
                'description': 'Emails et alertes système',
                'icone': 'notifications',
                'ordre': 11
            },
            {
                'code': 'performance',
                'nom': 'Performance',
                'description': 'Optimisations et cache',
                'icone': 'speed',
                'ordre': 12
            }
        ]
        
        created_count = 0
        for cat_data in categories:
            category, created = ConfigurationCategory.objects.get_or_create(
                code=cat_data['code'],
                defaults=cat_data
            )
            if created:
                created_count += 1
                self.stdout.write(f"  ✓ Catégorie créée: {category.nom}")
        
        self.stdout.write(self.style.SUCCESS(f"{created_count} catégories créées"))
    
    def create_parameters(self, force=False):
        """Créer les paramètres de configuration."""
        
        # Paramètres généraux
        general_params = [
            {
                'code': 'company_name',
                'nom': 'Nom de la société',
                'description': 'Nom officiel de la société',
                'category': 'general',
                'type_parametre': 'string',
                'scope': 'societe',
                'obligatoire': True,
                'ordre': 1
            },
            {
                'code': 'company_logo',
                'nom': 'Logo de la société',
                'description': 'Logo affiché sur les documents',
                'category': 'general',
                'type_parametre': 'file',
                'scope': 'societe',
                'ordre': 2
            },
            {
                'code': 'default_language',
                'nom': 'Langue par défaut',
                'description': 'Langue par défaut de l\'interface',
                'category': 'general',
                'type_parametre': 'choice',
                'scope': 'societe',
                'valeur_defaut': 'fr',
                'valeurs_possibles': {
                    'options': ['fr', 'en', 'es'],
                    'labels': {'fr': 'Français', 'en': 'English', 'es': 'Español'}
                },
                'ordre': 3
            },
            {
                'code': 'default_timezone',
                'nom': 'Fuseau horaire',
                'description': 'Fuseau horaire par défaut',
                'category': 'general',
                'type_parametre': 'choice',
                'scope': 'societe',
                'valeur_defaut': 'Africa/Douala',
                'valeurs_possibles': {
                    'options': ['Africa/Douala', 'Africa/Dakar', 'Africa/Abidjan', 'UTC'],
                    'labels': {
                        'Africa/Douala': 'Afrique Centrale',
                        'Africa/Dakar': 'Afrique de l\'Ouest',
                        'Africa/Abidjan': 'Côte d\'Ivoire',
                        'UTC': 'UTC'
                    }
                },
                'ordre': 4
            }
        ]
        
        # Paramètres comptables
        accounting_params = [
            {
                'code': 'accounting_standard',
                'nom': 'Référentiel comptable',
                'description': 'Standard comptable utilisé',
                'category': 'comptabilite',
                'type_parametre': 'choice',
                'scope': 'societe',
                'valeur_defaut': 'SYSCOHADA',
                'valeurs_possibles': {
                    'options': ['SYSCOHADA', 'IFRS', 'FRENCH_GAAP'],
                    'labels': {
                        'SYSCOHADA': 'SYSCOHADA 2017',
                        'IFRS': 'IFRS International',
                        'FRENCH_GAAP': 'Plan Comptable Français'
                    }
                },
                'obligatoire': True,
                'ordre': 1
            },
            {
                'code': 'default_currency',
                'nom': 'Devise principale',
                'description': 'Devise de référence de la société',
                'category': 'comptabilite',
                'type_parametre': 'choice',
                'scope': 'societe',
                'valeur_defaut': 'XOF',
                'valeurs_possibles': {
                    'options': ['XOF', 'XAF', 'EUR', 'USD'],
                    'labels': {
                        'XOF': 'Franc CFA BCEAO',
                        'XAF': 'Franc CFA BEAC',
                        'EUR': 'Euro',
                        'USD': 'Dollar US'
                    }
                },
                'obligatoire': True,
                'ordre': 2
            },
            {
                'code': 'decimal_precision',
                'nom': 'Précision décimale',
                'description': 'Nombre de décimales pour les montants',
                'category': 'comptabilite',
                'type_parametre': 'integer',
                'scope': 'societe',
                'valeur_defaut': '2',
                'contraintes': {'min': 0, 'max': 6},
                'ordre': 3
            },
            {
                'code': 'auto_journal_numbering',
                'nom': 'Numérotation automatique des journaux',
                'description': 'Numérotation automatique des pièces comptables',
                'category': 'comptabilite',
                'type_parametre': 'boolean',
                'scope': 'societe',
                'valeur_defaut': 'true',
                'ordre': 4
            }
        ]
        
        # Paramètres fiscaux
        fiscal_params = [
            {
                'code': 'vat_rate_default',
                'nom': 'Taux de TVA par défaut',
                'description': 'Taux de TVA standard',
                'category': 'fiscalite',
                'type_parametre': 'decimal',
                'scope': 'societe',
                'valeur_defaut': '18.0',
                'contraintes': {'min': 0.0, 'max': 50.0},
                'obligatoire': True,
                'ordre': 1
            },
            {
                'code': 'fiscal_year_start',
                'nom': 'Début d\'exercice fiscal',
                'description': 'Date de début de l\'exercice fiscal',
                'category': 'fiscalite',
                'type_parametre': 'choice',
                'scope': 'societe',
                'valeur_defaut': '01-01',
                'valeurs_possibles': {
                    'options': ['01-01', '04-01', '07-01', '10-01'],
                    'labels': {
                        '01-01': '1er Janvier',
                        '04-01': '1er Avril',
                        '07-01': '1er Juillet',
                        '10-01': '1er Octobre'
                    }
                },
                'ordre': 2
            },
            {
                'code': 'auto_tax_calculation',
                'nom': 'Calcul automatique des taxes',
                'description': 'Calculer automatiquement les taxes',
                'category': 'fiscalite',
                'type_parametre': 'boolean',
                'scope': 'societe',
                'valeur_defaut': 'true',
                'ordre': 3
            }
        ]
        
        # Paramètres de trésorerie
        treasury_params = [
            {
                'code': 'bank_sync_frequency',
                'nom': 'Fréquence de synchronisation bancaire',
                'description': 'Intervalle de synchronisation avec les banques (minutes)',
                'category': 'tresorerie',
                'type_parametre': 'integer',
                'scope': 'societe',
                'valeur_defaut': '5',
                'contraintes': {'min': 1, 'max': 1440},
                'ordre': 1
            },
            {
                'code': 'auto_bank_reconciliation',
                'nom': 'Rapprochement automatique',
                'description': 'Rapprochement bancaire automatique',
                'category': 'tresorerie',
                'type_parametre': 'boolean',
                'scope': 'societe',
                'valeur_defaut': 'true',
                'ordre': 2
            },
            {
                'code': 'payment_terms_default',
                'nom': 'Conditions de paiement par défaut',
                'description': 'Délai de paiement par défaut en jours',
                'category': 'tresorerie',
                'type_parametre': 'integer',
                'scope': 'societe',
                'valeur_defaut': '30',
                'contraintes': {'min': 0, 'max': 365},
                'ordre': 3
            }
        ]
        
        # Paramètres de sécurité
        security_params = [
            {
                'code': 'password_min_length',
                'nom': 'Longueur minimale du mot de passe',
                'description': 'Nombre minimum de caractères',
                'category': 'securite',
                'type_parametre': 'integer',
                'scope': 'global',
                'valeur_defaut': '8',
                'contraintes': {'min': 6, 'max': 32},
                'ordre': 1
            },
            {
                'code': 'session_timeout',
                'nom': 'Délai d\'expiration de session (minutes)',
                'description': 'Durée avant déconnexion automatique',
                'category': 'securite',
                'type_parametre': 'integer',
                'scope': 'societe',
                'valeur_defaut': '30',
                'contraintes': {'min': 5, 'max': 480},
                'ordre': 2
            },
            {
                'code': 'mfa_required',
                'nom': 'Authentification à deux facteurs obligatoire',
                'description': 'Forcer l\'utilisation du MFA',
                'category': 'securite',
                'type_parametre': 'boolean',
                'scope': 'societe',
                'valeur_defaut': 'false',
                'ordre': 3
            }
        ]
        
        # Combiner tous les paramètres
        all_params = (
            general_params + accounting_params + fiscal_params + 
            treasury_params + security_params
        )
        
        created_count = 0
        updated_count = 0
        
        for param_data in all_params:
            # Récupérer la catégorie
            try:
                category = ConfigurationCategory.objects.get(code=param_data.pop('category'))
                param_data['category'] = category
            except ConfigurationCategory.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f"Catégorie non trouvée: {param_data.get('category')}")
                )
                continue
            
            # Créer ou mettre à jour le paramètre
            parameter, created = ConfigurationParameter.objects.get_or_create(
                code=param_data['code'],
                defaults=param_data
            )
            
            if created:
                created_count += 1
                self.stdout.write(f"  ✓ Paramètre créé: {parameter.nom}")
            elif force:
                # Mettre à jour si force
                for key, value in param_data.items():
                    if key != 'code':
                        setattr(parameter, key, value)
                parameter.save()
                updated_count += 1
                self.stdout.write(f"  ↻ Paramètre mis à jour: {parameter.nom}")
        
        if force and updated_count > 0:
            self.stdout.write(self.style.SUCCESS(f"{created_count} paramètres créés, {updated_count} mis à jour"))
        else:
            self.stdout.write(self.style.SUCCESS(f"{created_count} paramètres créés"))
    
    def create_templates(self):
        """Créer les templates de configuration."""
        
        templates = [
            {
                'nom': 'PME Commerciale - Côte d\'Ivoire',
                'description': 'Configuration pour une PME commerciale en Côte d\'Ivoire',
                'type_template': 'secteur',
                'criteres': {
                    'pays': ['CI'],
                    'secteur': ['commerce', 'distribution'],
                    'effectif_max': 50
                },
                'configuration_data': {
                    'default_currency': 'XOF',
                    'vat_rate_default': 18.0,
                    'fiscal_year_start': '01-01',
                    'payment_terms_default': 30,
                    'auto_tax_calculation': True
                }
            },
            {
                'nom': 'Grande Entreprise - CEMAC',
                'description': 'Configuration pour une grande entreprise CEMAC',
                'type_template': 'taille',
                'criteres': {
                    'pays': ['CM', 'GA', 'CF', 'TD', 'CG', 'GQ'],
                    'effectif_min': 100
                },
                'configuration_data': {
                    'default_currency': 'XAF',
                    'vat_rate_default': 19.25,
                    'fiscal_year_start': '01-01',
                    'decimal_precision': 2,
                    'mfa_required': True,
                    'session_timeout': 60
                }
            },
            {
                'nom': 'Startup Tech - Multi-pays',
                'description': 'Configuration pour une startup technologique',
                'type_template': 'secteur',
                'criteres': {
                    'secteur': ['technologie', 'services', 'consulting'],
                    'effectif_max': 20
                },
                'configuration_data': {
                    'default_language': 'fr',
                    'auto_journal_numbering': True,
                    'bank_sync_frequency': 5,
                    'auto_bank_reconciliation': True,
                    'password_min_length': 12
                }
            },
            {
                'nom': 'ONG/Association',
                'description': 'Configuration pour les ONG et associations',
                'type_template': 'secteur',
                'criteres': {
                    'secteur': ['ong', 'association', 'non-profit']
                },
                'configuration_data': {
                    'vat_rate_default': 0.0,
                    'auto_tax_calculation': False,
                    'payment_terms_default': 15,
                    'decimal_precision': 2
                }
            }
        ]
        
        created_count = 0
        for template_data in templates:
            template, created = ConfigurationTemplate.objects.get_or_create(
                nom=template_data['nom'],
                defaults=template_data
            )
            if created:
                created_count += 1
                self.stdout.write(f"  ✓ Template créé: {template.nom}")
        
        self.stdout.write(self.style.SUCCESS(f"{created_count} templates créés"))