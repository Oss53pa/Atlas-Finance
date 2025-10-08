from decimal import Decimal
from datetime import date, datetime, timedelta
from django.db import transaction, connection
from django.db.models import Sum, Count, Q, F, Avg
from django.utils import timezone
from typing import List, Dict, Any, Optional
import json
import hashlib

from ..models import TableauBord, Widget, ModeleRapport, Rapport
from apps.accounting.models import EcritureComptable, CompteComptable, ExerciceComptable
from apps.company.models import Company
from apps.analytical_accounting.models import EcritureAnalytique, SectionAnalytique
from apps.budget_control.models import VersionBudget, SuiviBudgetaire


class DashboardService:
    """
    Service principal pour la gestion des tableaux de bord et widgets
    Implémentation EXF-BI-001: Dashboards Clarity UI
    """
    
    def __init__(self):
        self.cache_duration = 300  # 5 minutes par défaut
        
    def creer_tableau_bord(self, company_id: int, nom: str, type_tableau: str,
                          utilisateur_id: int, description: str = '') -> TableauBord:
        """
        Crée un nouveau tableau de bord personnalisé
        """
        tableau = TableauBord.objects.create(
            company_id=company_id,
            nom=nom,
            description=description,
            type_tableau=type_tableau,
            utilisateur_creation_id=utilisateur_id,
            configuration_widgets=[],
            layout_configuration={
                'grid_size': 12,
                'row_height': 100,
                'margin': [10, 10],
                'responsive_breakpoints': {
                    'lg': 1200,
                    'md': 996,
                    'sm': 768,
                    'xs': 480,
                    'xxs': 0
                }
            }
        )
        
        # Créer des widgets par défaut selon le type
        self._creer_widgets_defaut(tableau, type_tableau)
        
        return tableau
    
    def _creer_widgets_defaut(self, tableau: TableauBord, type_tableau: str):
        """
        Crée des widgets par défaut selon le type de tableau
        """
        widgets_defaut = {
            'DIRECTION': [
                {
                    'nom': 'Chiffre d\'Affaires du Mois',
                    'type': 'METRIC',
                    'position': (0, 0),
                    'taille': (3, 1),
                    'source': self._get_ca_mois_query(),
                    'config': {
                        'format': 'currency',
                        'icon': 'money-bill-alt',
                        'color': '#10B981'
                    }
                },
                {
                    'nom': 'Résultat Net',
                    'type': 'METRIC',
                    'position': (3, 0),
                    'taille': (3, 1),
                    'source': self._get_resultat_net_query(),
                    'config': {
                        'format': 'currency',
                        'icon': 'chart-line',
                        'color': '#3B82F6'
                    }
                },
                {
                    'nom': 'Trésorerie',
                    'type': 'METRIC',
                    'position': (6, 0),
                    'taille': (3, 1),
                    'source': self._get_tresorerie_query(),
                    'config': {
                        'format': 'currency',
                        'icon': 'university',
                        'color': '#F59E0B'
                    }
                },
                {
                    'nom': 'Évolution CA',
                    'type': 'CHART_LINE',
                    'position': (0, 1),
                    'taille': (6, 2),
                    'source': self._get_evolution_ca_query(),
                    'config': {
                        'x_axis': 'mois',
                        'y_axis': 'montant',
                        'color': '#10B981'
                    }
                },
                {
                    'nom': 'Répartition Charges',
                    'type': 'CHART_PIE',
                    'position': (6, 1),
                    'taille': (6, 2),
                    'source': self._get_repartition_charges_query(),
                    'config': {
                        'label_field': 'categorie',
                        'value_field': 'montant'
                    }
                }
            ],
            'COMPTABLE': [
                {
                    'nom': 'Écritures en Attente',
                    'type': 'METRIC',
                    'position': (0, 0),
                    'taille': (3, 1),
                    'source': self._get_ecritures_attente_query(),
                    'config': {
                        'format': 'number',
                        'icon': 'clock',
                        'color': '#EF4444'
                    }
                },
                {
                    'nom': 'Balance Non Équilibrée',
                    'type': 'METRIC',
                    'position': (3, 0),
                    'taille': (3, 1),
                    'source': self._get_ecart_balance_query(),
                    'config': {
                        'format': 'currency',
                        'icon': 'balance-scale',
                        'color': '#F59E0B'
                    }
                },
                {
                    'nom': 'Dernières Écritures',
                    'type': 'TABLE',
                    'position': (0, 1),
                    'taille': (12, 2),
                    'source': self._get_dernieres_ecritures_query(),
                    'config': {
                        'columns': ['Date', 'Numéro', 'Compte', 'Libellé', 'Débit', 'Crédit'],
                        'max_rows': 10
                    }
                }
            ],
            'FINANCIER': [
                {
                    'nom': 'Ratio de Liquidité',
                    'type': 'GAUGE',
                    'position': (0, 0),
                    'taille': (3, 2),
                    'source': self._get_ratio_liquidite_query(),
                    'config': {
                        'min': 0,
                        'max': 3,
                        'target': 1.5,
                        'format': 'decimal'
                    }
                },
                {
                    'nom': 'Endettement',
                    'type': 'GAUGE',
                    'position': (3, 0),
                    'taille': (3, 2),
                    'source': self._get_ratio_endettement_query(),
                    'config': {
                        'min': 0,
                        'max': 100,
                        'target': 30,
                        'format': 'percentage'
                    }
                },
                {
                    'nom': 'Évolution BFR',
                    'type': 'CHART_LINE',
                    'position': (6, 0),
                    'taille': (6, 2),
                    'source': self._get_evolution_bfr_query(),
                    'config': {
                        'x_axis': 'mois',
                        'y_axis': 'bfr'
                    }
                }
            ]
        }
        
        if type_tableau in widgets_defaut:
            for widget_config in widgets_defaut[type_tableau]:
                self._creer_widget_depuis_config(tableau, widget_config)
    
    def _creer_widget_depuis_config(self, tableau: TableauBord, config: Dict):
        """
        Crée un widget depuis une configuration
        """
        Widget.objects.create(
            company=tableau.company,
            tableau_bord=tableau,
            nom=config['nom'],
            type_widget=config['type'],
            position_x=config['position'][0],
            position_y=config['position'][1],
            largeur=config['taille'][0],
            hauteur=config['taille'][1],
            source_donnees=config['source'],
            parametres_widget=config.get('config', {}),
            utilisateur_creation=tableau.utilisateur_creation
        )
    
    def get_donnees_widget(self, widget_id: int, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Récupère les données d'un widget avec gestion du cache
        """
        widget = Widget.objects.get(id=widget_id)
        
        # Vérifier le cache si pas de force refresh
        if not force_refresh and not widget.cache_expire and widget.donnees_cache:
            return {
                'widget_id': widget_id,
                'data': widget.donnees_cache,
                'cached': True,
                'cache_date': widget.date_cache
            }
        
        try:
            # Exécuter la requête
            donnees = self._executer_requete_widget(widget)
            
            # Mettre à jour le cache
            with transaction.atomic():
                widget.donnees_cache = donnees
                widget.date_cache = timezone.now()
                widget.save(update_fields=['donnees_cache', 'date_cache'])
            
            return {
                'widget_id': widget_id,
                'data': donnees,
                'cached': False,
                'cache_date': widget.date_cache
            }
            
        except Exception as e:
            return {
                'widget_id': widget_id,
                'error': str(e),
                'cached': False
            }
    
    def _executer_requete_widget(self, widget: Widget) -> Any:
        """
        Exécute la requête d'un widget selon son type
        """
        if widget.type_widget == 'METRIC':
            return self._executer_requete_metric(widget)
        elif widget.type_widget.startswith('CHART_'):
            return self._executer_requete_chart(widget)
        elif widget.type_widget == 'TABLE':
            return self._executer_requete_table(widget)
        elif widget.type_widget == 'GAUGE':
            return self._executer_requete_gauge(widget)
        else:
            return self._executer_requete_sql(widget.source_donnees)
    
    def _executer_requete_metric(self, widget: Widget) -> Dict[str, Any]:
        """
        Exécute une requête pour widget métrique
        """
        result = self._executer_requete_sql(widget.source_donnees)
        
        if result and len(result) > 0:
            valeur = result[0].get('valeur', 0) if isinstance(result[0], dict) else result[0][0]
            
            return {
                'value': float(valeur) if valeur else 0,
                'format': widget.parametres_widget.get('format', 'number'),
                'icon': widget.parametres_widget.get('icon', 'chart-bar'),
                'color': widget.parametres_widget.get('color', '#3B82F6'),
                'trend': self._calculer_tendance(widget) if widget.parametres_widget.get('show_trend', False) else None
            }
        
        return {'value': 0, 'error': 'Aucune donnée'}
    
    def _executer_requete_chart(self, widget: Widget) -> Dict[str, Any]:
        """
        Exécute une requête pour widget graphique
        """
        result = self._executer_requete_sql(widget.source_donnees)
        
        if not result:
            return {'labels': [], 'datasets': []}
        
        # Adapter selon le type de graphique
        if widget.type_widget == 'CHART_PIE':
            return {
                'labels': [row.get('label', row[0]) for row in result],
                'data': [float(row.get('value', row[1])) for row in result],
                'backgroundColor': self._generer_couleurs(len(result))
            }
        else:  # LINE, BAR, AREA
            return {
                'labels': [row.get('label', row[0]) for row in result],
                'datasets': [{
                    'data': [float(row.get('value', row[1])) for row in result],
                    'backgroundColor': widget.parametres_widget.get('color', '#3B82F6'),
                    'borderColor': widget.parametres_widget.get('color', '#3B82F6'),
                    'fill': widget.type_widget == 'CHART_AREA'
                }]
            }
    
    def _executer_requete_table(self, widget: Widget) -> Dict[str, Any]:
        """
        Exécute une requête pour widget tableau
        """
        result = self._executer_requete_sql(widget.source_donnees)
        
        max_rows = widget.parametres_widget.get('max_rows', 100)
        columns = widget.parametres_widget.get('columns', [])
        
        return {
            'columns': columns,
            'rows': result[:max_rows] if result else [],
            'total_rows': len(result) if result else 0,
            'truncated': len(result) > max_rows if result else False
        }
    
    def _executer_requete_gauge(self, widget: Widget) -> Dict[str, Any]:
        """
        Exécute une requête pour widget jauge
        """
        result = self._executer_requete_sql(widget.source_donnees)
        
        if result and len(result) > 0:
            valeur = result[0].get('valeur', 0) if isinstance(result[0], dict) else result[0][0]
            
            return {
                'value': float(valeur) if valeur else 0,
                'min': widget.parametres_widget.get('min', 0),
                'max': widget.parametres_widget.get('max', 100),
                'target': widget.parametres_widget.get('target', 50),
                'format': widget.parametres_widget.get('format', 'number'),
                'color': self._get_couleur_jauge(float(valeur), widget.parametres_widget)
            }
        
        return {'value': 0, 'error': 'Aucune donnée'}
    
    def _executer_requete_sql(self, query: str) -> List[Dict]:
        """
        Exécute une requête SQL et retourne les résultats
        """
        with connection.cursor() as cursor:
            cursor.execute(query)
            columns = [col[0] for col in cursor.description]
            results = []
            
            for row in cursor.fetchall():
                results.append(dict(zip(columns, row)))
            
            return results
    
    def _calculer_tendance(self, widget: Widget) -> Optional[Dict[str, Any]]:
        """
        Calcule la tendance d'évolution pour un widget métrique
        """
        # Logique de calcul de tendance (à implémenter selon les besoins)
        return None
    
    def _generer_couleurs(self, nombre: int) -> List[str]:
        """
        Génère une palette de couleurs pour les graphiques
        """
        couleurs_base = [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
            '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
        ]
        
        couleurs = []
        for i in range(nombre):
            couleurs.append(couleurs_base[i % len(couleurs_base)])
        
        return couleurs
    
    def _get_couleur_jauge(self, valeur: float, params: Dict) -> str:
        """
        Détermine la couleur d'une jauge selon la valeur et les seuils
        """
        target = params.get('target', 50)
        min_val = params.get('min', 0)
        max_val = params.get('max', 100)
        
        # Normaliser la valeur par rapport à la cible
        ratio = valeur / target if target > 0 else 0
        
        if ratio >= 1:
            return '#10B981'  # Vert
        elif ratio >= 0.8:
            return '#F59E0B'  # Orange
        else:
            return '#EF4444'  # Rouge
    
    # Requêtes prédéfinies pour les widgets par défaut
    def _get_ca_mois_query(self) -> str:
        return """
            SELECT COALESCE(SUM(ec.montant_credit - ec.montant_debit), 0) as valeur
            FROM accounting_ecriturecomptable ec
            JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
            WHERE cc.numero LIKE '70%'
            AND EXTRACT(YEAR FROM ec.date_ecriture) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND EXTRACT(MONTH FROM ec.date_ecriture) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND ec.statut = 'VALIDE'
        """
    
    def _get_resultat_net_query(self) -> str:
        return """
            SELECT COALESCE(
                (SELECT SUM(ec.montant_credit - ec.montant_debit) 
                 FROM accounting_ecriturecomptable ec
                 JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
                 WHERE cc.numero LIKE '7%' AND ec.statut = 'VALIDE'
                 AND EXTRACT(YEAR FROM ec.date_ecriture) = EXTRACT(YEAR FROM CURRENT_DATE)
                ) - 
                (SELECT SUM(ec.montant_debit - ec.montant_credit) 
                 FROM accounting_ecriturecomptable ec
                 JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
                 WHERE cc.numero LIKE '6%' AND ec.statut = 'VALIDE'
                 AND EXTRACT(YEAR FROM ec.date_ecriture) = EXTRACT(YEAR FROM CURRENT_DATE)
                ), 0
            ) as valeur
        """
    
    def _get_tresorerie_query(self) -> str:
        return """
            SELECT COALESCE(SUM(
                CASE 
                    WHEN cc.numero LIKE '5%' THEN ec.montant_debit - ec.montant_credit
                    ELSE 0
                END
            ), 0) as valeur
            FROM accounting_ecriturecomptable ec
            JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
            WHERE cc.numero LIKE '5%' AND ec.statut = 'VALIDE'
        """
    
    def _get_evolution_ca_query(self) -> str:
        return """
            SELECT 
                TO_CHAR(ec.date_ecriture, 'YYYY-MM') as label,
                SUM(ec.montant_credit - ec.montant_debit) as value
            FROM accounting_ecriturecomptable ec
            JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
            WHERE cc.numero LIKE '70%'
            AND ec.date_ecriture >= CURRENT_DATE - INTERVAL '12 months'
            AND ec.statut = 'VALIDE'
            GROUP BY TO_CHAR(ec.date_ecriture, 'YYYY-MM')
            ORDER BY label
        """
    
    def _get_repartition_charges_query(self) -> str:
        return """
            SELECT 
                CASE 
                    WHEN cc.numero LIKE '60%' THEN 'Achats'
                    WHEN cc.numero LIKE '61%' THEN 'Transport'
                    WHEN cc.numero LIKE '62%' THEN 'Services Ext. A'
                    WHEN cc.numero LIKE '63%' THEN 'Services Ext. B'
                    WHEN cc.numero LIKE '64%' THEN 'Impôts et Taxes'
                    WHEN cc.numero LIKE '65%' THEN 'Autres Charges'
                    WHEN cc.numero LIKE '66%' THEN 'Personnel'
                    ELSE 'Autres'
                END as label,
                SUM(ec.montant_debit - ec.montant_credit) as value
            FROM accounting_ecriturecomptable ec
            JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
            WHERE cc.numero LIKE '6%'
            AND EXTRACT(YEAR FROM ec.date_ecriture) = EXTRACT(YEAR FROM CURRENT_DATE)
            AND ec.statut = 'VALIDE'
            GROUP BY 1
            HAVING SUM(ec.montant_debit - ec.montant_credit) > 0
            ORDER BY value DESC
        """
    
    def _get_ecritures_attente_query(self) -> str:
        return """
            SELECT COUNT(*) as valeur
            FROM accounting_ecriturecomptable ec
            WHERE ec.statut = 'BROUILLARD'
        """
    
    def _get_ecart_balance_query(self) -> str:
        return """
            SELECT ABS(COALESCE(SUM(montant_debit - montant_credit), 0)) as valeur
            FROM accounting_ecriturecomptable
            WHERE statut = 'VALIDE'
        """
    
    def _get_dernieres_ecritures_query(self) -> str:
        return """
            SELECT 
                ec.date_ecriture as "Date",
                ec.numero_piece as "Numéro",
                cc.numero as "Compte",
                ec.libelle as "Libellé",
                ec.montant_debit as "Débit",
                ec.montant_credit as "Crédit"
            FROM accounting_ecriturecomptable ec
            JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
            WHERE ec.statut = 'VALIDE'
            ORDER BY ec.date_creation DESC
            LIMIT 20
        """
    
    def _get_ratio_liquidite_query(self) -> str:
        return """
            SELECT COALESCE(
                CASE 
                    WHEN dettes.total > 0 THEN actif_circulant.total / dettes.total
                    ELSE 0
                END, 0
            ) as valeur
            FROM 
                (SELECT SUM(ec.montant_debit - ec.montant_credit) as total
                 FROM accounting_ecriturecomptable ec
                 JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
                 WHERE cc.numero LIKE '3%' OR cc.numero LIKE '5%'
                 AND ec.statut = 'VALIDE') actif_circulant,
                (SELECT SUM(ec.montant_credit - ec.montant_debit) as total
                 FROM accounting_ecriturecomptable ec
                 JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
                 WHERE cc.numero LIKE '40%' OR cc.numero LIKE '42%' OR cc.numero LIKE '43%'
                 AND ec.statut = 'VALIDE') dettes
        """
    
    def _get_ratio_endettement_query(self) -> str:
        return """
            SELECT COALESCE(
                CASE 
                    WHEN total_actif.total > 0 THEN (dettes.total / total_actif.total) * 100
                    ELSE 0
                END, 0
            ) as valeur
            FROM 
                (SELECT SUM(ec.montant_debit - ec.montant_credit) as total
                 FROM accounting_ecriturecomptable ec
                 JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
                 WHERE cc.numero LIKE '2%' OR cc.numero LIKE '3%' OR cc.numero LIKE '5%'
                 AND ec.statut = 'VALIDE') total_actif,
                (SELECT SUM(ec.montant_credit - ec.montant_debit) as total
                 FROM accounting_ecriturecomptable ec
                 JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
                 WHERE cc.numero LIKE '16%' OR cc.numero LIKE '40%'
                 AND ec.statut = 'VALIDE') dettes
        """
    
    def _get_evolution_bfr_query(self) -> str:
        return """
            SELECT 
                TO_CHAR(ec.date_ecriture, 'YYYY-MM') as label,
                SUM(
                    CASE 
                        WHEN cc.numero LIKE '3%' OR cc.numero LIKE '41%' THEN ec.montant_debit - ec.montant_credit
                        WHEN cc.numero LIKE '40%' OR cc.numero LIKE '42%' THEN ec.montant_credit - ec.montant_debit
                        ELSE 0
                    END
                ) as bfr
            FROM accounting_ecriturecomptable ec
            JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
            WHERE (cc.numero LIKE '3%' OR cc.numero LIKE '40%' OR cc.numero LIKE '41%' OR cc.numero LIKE '42%')
            AND ec.date_ecriture >= CURRENT_DATE - INTERVAL '12 months'
            AND ec.statut = 'VALIDE'
            GROUP BY TO_CHAR(ec.date_ecriture, 'YYYY-MM')
            ORDER BY label
        """
    
    def actualiser_tableau_bord(self, tableau_id: int, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Actualise tous les widgets d'un tableau de bord
        """
        tableau = TableauBord.objects.get(id=tableau_id)
        widgets = tableau.widgets.filter(actif=True)
        
        resultats = []
        erreurs = 0
        
        for widget in widgets:
            try:
                donnees = self.get_donnees_widget(widget.id, force_refresh)
                resultats.append(donnees)
                if 'error' in donnees:
                    erreurs += 1
            except Exception as e:
                resultats.append({
                    'widget_id': widget.id,
                    'error': str(e)
                })
                erreurs += 1
        
        # Mettre à jour la date d'actualisation du tableau
        tableau.derniere_actualisation = timezone.now()
        tableau.save(update_fields=['derniere_actualisation'])
        
        return {
            'tableau_id': tableau_id,
            'widgets_actualises': len(resultats),
            'erreurs': erreurs,
            'date_actualisation': tableau.derniere_actualisation,
            'widgets': resultats
        }
    
    def dupliquer_tableau_bord(self, tableau_id: int, nouveau_nom: str, 
                              utilisateur_id: int) -> TableauBord:
        """
        Duplique un tableau de bord existant
        """
        tableau_original = TableauBord.objects.get(id=tableau_id)
        
        with transaction.atomic():
            nouveau_tableau = TableauBord.objects.create(
                company=tableau_original.company,
                nom=nouveau_nom,
                description=f"Copie de {tableau_original.nom}",
                type_tableau=tableau_original.type_tableau,
                configuration_widgets=tableau_original.configuration_widgets,
                layout_configuration=tableau_original.layout_configuration,
                filtres_globaux=tableau_original.filtres_globaux,
                utilisateur_creation_id=utilisateur_id
            )
            
            # Dupliquer tous les widgets
            for widget_original in tableau_original.widgets.all():
                Widget.objects.create(
                    company=widget_original.company,
                    tableau_bord=nouveau_tableau,
                    nom=widget_original.nom,
                    description=widget_original.description,
                    type_widget=widget_original.type_widget,
                    taille=widget_original.taille,
                    position_x=widget_original.position_x,
                    position_y=widget_original.position_y,
                    largeur=widget_original.largeur,
                    hauteur=widget_original.hauteur,
                    source_donnees=widget_original.source_donnees,
                    parametres_widget=widget_original.parametres_widget,
                    filtres_widget=widget_original.filtres_widget,
                    titre=widget_original.titre,
                    sous_titre=widget_original.sous_titre,
                    couleur_primaire=widget_original.couleur_primaire,
                    couleur_secondaire=widget_original.couleur_secondaire,
                    utilisateur_creation_id=utilisateur_id
                )
        
        return nouveau_tableau