"""
Service de calculs dynamiques pour les widgets workspace
Génère les données en temps réel selon la configuration du widget
"""
from typing import Dict, Any, List, Optional
from django.db.models import Count, Sum, Avg, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone
from datetime import datetime, timedelta
from decimal import Decimal
from dateutil.relativedelta import relativedelta
import logging

logger = logging.getLogger(__name__)


class WidgetCalculator:
    """Calculateur dynamique pour les widgets"""

    @staticmethod
    def calculate_widget_data(widget_type: str, config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Point d'entrée principal pour calculer les données d'un widget

        Args:
            widget_type: Type de widget (stat, chart, list, etc.)
            config: Configuration du widget

        Returns:
            Données calculées pour le widget
        """
        calculators = {
            'stat': WidgetCalculator._calculate_stat_widget,
            'chart': WidgetCalculator._calculate_chart_widget,
            'list': WidgetCalculator._calculate_list_widget,
            'notification': WidgetCalculator._calculate_notification_widget,
        }

        calculator = calculators.get(widget_type)
        if calculator:
            return calculator(config)

        return {'error': f'Type de widget non supporté: {widget_type}'}

    @staticmethod
    def _calculate_stat_widget(config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcule les données pour un widget de type statistique

        Config attendue:
        {
            "source": "accounting.entries",  # Source des données
            "filter": "current_month",       # Filtre temporel
            "aggregation": "count"           # Type d'agrégation
        }
        """
        source = config.get('source', '')
        filter_type = config.get('filter', 'all')
        aggregation = config.get('aggregation', 'count')

        # Exemple de calcul basé sur la source
        if source == 'accounting.entries':
            return WidgetCalculator._calculate_accounting_entries_stat(filter_type, aggregation)
        elif source == 'treasury.balance':
            return WidgetCalculator._calculate_treasury_balance_stat(filter_type)
        elif source == 'clients.invoices':
            return WidgetCalculator._calculate_client_invoices_stat(filter_type)

        return {
            'value': 0,
            'label': 'N/A',
            'trend': None
        }

    @staticmethod
    def _calculate_chart_widget(config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcule les données pour un widget graphique

        Config attendue:
        {
            "chart_type": "line",           # Type de graphique
            "period": "12_months",          # Période
            "metrics": ["revenue", "expenses"]  # Métriques à afficher
        }
        """
        chart_type = config.get('chart_type', 'line')
        period = config.get('period', '12_months')
        metrics = config.get('metrics', [])

        # Génération des données de graphique
        labels, datasets = WidgetCalculator._generate_chart_data(period, metrics)

        return {
            'type': chart_type,
            'labels': labels,
            'datasets': datasets
        }

    @staticmethod
    def _calculate_list_widget(config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcule les données pour un widget liste

        Config attendue:
        {
            "source": "accounting.entries",
            "limit": 10,
            "sort": "-created_at"
        }
        """
        source = config.get('source', '')
        limit = config.get('limit', 10)
        sort = config.get('sort', '-created_at')

        # Récupération des derniers éléments
        items = WidgetCalculator._fetch_recent_items(source, limit, sort)

        return {
            'items': items,
            'count': len(items),
            'has_more': len(items) >= limit
        }

    @staticmethod
    def _calculate_notification_widget(config: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calcule les notifications/alertes

        Config attendue:
        {
            "priority": "high",
            "types": ["validation", "errors"]
        }
        """
        priority = config.get('priority', 'all')
        types = config.get('types', [])

        notifications = WidgetCalculator._fetch_notifications(priority, types)

        return {
            'notifications': notifications,
            'count': len(notifications),
            'unread': sum(1 for n in notifications if not n.get('read', False))
        }

    # Méthodes helpers pour les calculs spécifiques

    @staticmethod
    def _calculate_accounting_entries_stat(filter_type: str, aggregation: str) -> Dict[str, Any]:
        """Calcule les statistiques des écritures comptables"""
        try:
            from apps.accounting.models import JournalEntry

            now = timezone.now()

            # Définir les périodes selon le filtre
            if filter_type == 'current_month':
                start_date = now.replace(day=1)
                prev_start = (start_date - relativedelta(months=1))
                prev_end = start_date - timedelta(days=1)
            elif filter_type == 'current_year':
                start_date = now.replace(month=1, day=1)
                prev_start = start_date - relativedelta(years=1)
                prev_end = start_date - timedelta(days=1)
            else:
                start_date = None
                prev_start = None
                prev_end = None

            # Compter les écritures de la période actuelle
            current_query = JournalEntry.objects.filter(is_validated=True)
            if start_date:
                current_query = current_query.filter(entry_date__gte=start_date)
            value = current_query.count()

            # Compter les écritures de la période précédente
            previous_value = 0
            if prev_start and prev_end:
                previous_value = JournalEntry.objects.filter(
                    is_validated=True,
                    entry_date__gte=prev_start,
                    entry_date__lte=prev_end
                ).count()

            trend = ((value - previous_value) / previous_value) * 100 if previous_value > 0 else 0

            return {
                'value': value,
                'label': 'Écritures',
                'trend': round(trend, 2),
                'trend_direction': 'up' if trend > 0 else 'down' if trend < 0 else 'stable'
            }
        except Exception as e:
            logger.warning(f"Error calculating accounting entries stat: {e}")
            return {
                'value': 0,
                'label': 'Écritures',
                'trend': 0,
                'trend_direction': 'stable'
            }

    @staticmethod
    def _calculate_treasury_balance_stat(filter_type: str) -> Dict[str, Any]:
        """Calcule la position de trésorerie"""
        try:
            from apps.treasury.models import BankAccount

            # Calculer le solde total de tous les comptes bancaires actifs
            result = BankAccount.objects.filter(
                is_active=True
            ).aggregate(total=Sum('solde_actuel'))

            balance = float(result['total'] or 0)

            # Pour le trend, on devrait comparer avec une valeur historique
            # Pour l'instant, on retourne une tendance stable
            previous_balance = balance  # TODO: Récupérer depuis l'historique

            if previous_balance > 0:
                trend = ((balance - previous_balance) / previous_balance) * 100
            else:
                trend = 0

            trend_direction = 'up' if trend > 0 else 'down' if trend < 0 else 'stable'

            return {
                'value': f'{balance:,.0f} FCFA',
                'raw_value': balance,
                'label': 'Trésorerie',
                'trend': round(trend, 2),
                'trend_direction': trend_direction
            }
        except Exception as e:
            logger.warning(f"Error calculating treasury balance: {e}")
            return {
                'value': '0 FCFA',
                'raw_value': 0,
                'label': 'Trésorerie',
                'trend': 0,
                'trend_direction': 'stable'
            }

    @staticmethod
    def _calculate_client_invoices_stat(filter_type: str) -> Dict[str, Any]:
        """Calcule les statistiques des factures clients"""
        try:
            from apps.accounting.models import JournalEntryLine

            # Compter les créances clients (compte 41 - Clients SYSCOHADA)
            result = JournalEntryLine.objects.filter(
                account__code__startswith='41',
                entry__is_validated=True
            ).aggregate(
                total_debit=Sum('debit_amount'),
                total_credit=Sum('credit_amount')
            )

            debit = result['total_debit'] or Decimal('0')
            credit = result['total_credit'] or Decimal('0')
            pending_amount = float(debit - credit)  # Solde des créances

            # Compter les écritures clients en attente
            pending_count = JournalEntryLine.objects.filter(
                account__code__startswith='41',
                entry__is_validated=True
            ).values('entry').distinct().count()

            return {
                'value': pending_count,
                'amount': f'{pending_amount:,.0f} FCFA',
                'raw_amount': pending_amount,
                'label': 'Créances clients',
                'trend': None
            }
        except Exception as e:
            logger.warning(f"Error calculating client invoices stat: {e}")
            return {
                'value': 0,
                'amount': '0 FCFA',
                'raw_amount': 0,
                'label': 'Créances clients',
                'trend': None
            }

    @staticmethod
    def _generate_chart_data(period: str, metrics: List[str]) -> tuple:
        """Génère les données pour un graphique"""
        try:
            from apps.accounting.models import JournalEntryLine

            # Déterminer le nombre de mois et les labels
            now = timezone.now()
            month_names = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                           'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

            if period == '12_months':
                data_points = 12
            elif period == '6_months':
                data_points = 6
            else:
                data_points = 4

            # Calculer les vraies données par mois
            labels = []
            datasets_data = {metric: [] for metric in metrics}

            for i in range(data_points - 1, -1, -1):
                month_date = now - relativedelta(months=i)
                month_start = month_date.replace(day=1)
                month_end = (month_start + relativedelta(months=1)) - timedelta(days=1)

                labels.append(month_names[month_start.month - 1])

                for metric in metrics:
                    if metric == 'revenue':
                        # Classe 7 - Produits
                        result = JournalEntryLine.objects.filter(
                            account__code__startswith='7',
                            entry__is_validated=True,
                            entry__entry_date__gte=month_start,
                            entry__entry_date__lte=month_end
                        ).aggregate(
                            total=Sum('credit_amount') - Sum('debit_amount')
                        )
                        datasets_data[metric].append(float(result['total'] or 0))

                    elif metric == 'expenses':
                        # Classe 6 - Charges
                        result = JournalEntryLine.objects.filter(
                            account__code__startswith='6',
                            entry__is_validated=True,
                            entry__entry_date__gte=month_start,
                            entry__entry_date__lte=month_end
                        ).aggregate(
                            total=Sum('debit_amount') - Sum('credit_amount')
                        )
                        datasets_data[metric].append(float(result['total'] or 0))

                    elif metric == 'profit':
                        # Revenue - Expenses
                        revenue = JournalEntryLine.objects.filter(
                            account__code__startswith='7',
                            entry__is_validated=True,
                            entry__entry_date__gte=month_start,
                            entry__entry_date__lte=month_end
                        ).aggregate(
                            total=Sum('credit_amount') - Sum('debit_amount')
                        )['total'] or Decimal('0')

                        expenses = JournalEntryLine.objects.filter(
                            account__code__startswith='6',
                            entry__is_validated=True,
                            entry__entry_date__gte=month_start,
                            entry__entry_date__lte=month_end
                        ).aggregate(
                            total=Sum('debit_amount') - Sum('credit_amount')
                        )['total'] or Decimal('0')

                        datasets_data[metric].append(float(revenue - expenses))

            # Construire les datasets
            colors = {
                'revenue': '#10B981',
                'expenses': '#EF4444',
                'profit': '#3B82F6',
            }

            datasets = []
            for metric in metrics:
                datasets.append({
                    'label': metric.capitalize(),
                    'data': datasets_data[metric],
                    'color': colors.get(metric, '#6B7280')
                })

            return labels, datasets

        except Exception as e:
            logger.warning(f"Error generating chart data: {e}")
            # Fallback vers données simulées
            return WidgetCalculator._generate_simulated_chart_data(period, metrics)

    @staticmethod
    def _generate_simulated_chart_data(period: str, metrics: List[str]) -> tuple:
        """Génère des données simulées en cas d'erreur"""
        import random

        if period == '12_months':
            labels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
                      'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
        elif period == '6_months':
            labels = ['M-5', 'M-4', 'M-3', 'M-2', 'M-1', 'Actuel']
        else:
            labels = ['S1', 'S2', 'S3', 'S4']

        colors = {'revenue': '#10B981', 'expenses': '#EF4444', 'profit': '#3B82F6'}
        base_values = {'revenue': 100000000, 'expenses': 70000000, 'profit': 30000000}

        datasets = []
        for metric in metrics:
            base = base_values.get(metric, 50000000)
            data = [round(base * (1 + random.uniform(-0.2, 0.2)), 2) for _ in range(len(labels))]
            datasets.append({
                'label': metric.capitalize(),
                'data': data,
                'color': colors.get(metric, '#6B7280')
            })

        return labels, datasets

    @staticmethod
    def _fetch_recent_items(source: str, limit: int, sort: str) -> List[Dict[str, Any]]:
        """Récupère les derniers éléments d'une source"""
        try:
            items = []

            if source == 'accounting.entries':
                from apps.accounting.models import JournalEntry

                # Déterminer l'ordre de tri
                order_by = sort if sort else '-entry_date'

                entries = JournalEntry.objects.filter(
                    is_validated=True
                ).order_by(order_by)[:limit]

                for entry in entries:
                    items.append({
                        'id': str(entry.id),
                        'title': entry.description or f'Écriture #{entry.entry_number}',
                        'date': entry.entry_date.isoformat() if entry.entry_date else None,
                        'status': 'validated' if entry.is_validated else 'pending',
                        'type': 'journal_entry'
                    })

            elif source == 'treasury.movements':
                from apps.treasury.models import CashMovement

                movements = CashMovement.objects.all().order_by(sort or '-date_mouvement')[:limit]

                for mvt in movements:
                    items.append({
                        'id': str(mvt.id),
                        'title': mvt.libelle or 'Mouvement de trésorerie',
                        'date': mvt.date_mouvement.isoformat() if mvt.date_mouvement else None,
                        'status': mvt.statut,
                        'amount': float(mvt.montant) if mvt.montant else 0,
                        'type': mvt.type_mouvement
                    })

            else:
                # Source non reconnue - retourner liste vide
                logger.warning(f"Unknown source for recent items: {source}")

            return items

        except Exception as e:
            logger.warning(f"Error fetching recent items from {source}: {e}")
            return []

    @staticmethod
    def _fetch_notifications(priority: str, types: List[str]) -> List[Dict[str, Any]]:
        """Récupère les notifications"""
        try:
            from apps.dashboard.models import Notification

            # Construire le queryset
            queryset = Notification.objects.all()

            if priority and priority != 'all':
                queryset = queryset.filter(severity=priority)

            if types:
                queryset = queryset.filter(category__in=types)

            notifications = []
            for notif in queryset.order_by('-created_at')[:20]:
                notifications.append({
                    'id': str(notif.id),
                    'type': notif.category,
                    'title': notif.title,
                    'message': notif.message,
                    'priority': notif.severity,
                    'read': notif.is_read,
                    'created_at': notif.created_at.isoformat() if notif.created_at else None
                })

            return notifications

        except Exception as e:
            logger.warning(f"Error fetching notifications: {e}")
            # Retourner des notifications générées dynamiquement basées sur l'état du système
            return WidgetCalculator._generate_system_notifications(priority, types)

    @staticmethod
    def _generate_system_notifications(priority: str, types: List[str]) -> List[Dict[str, Any]]:
        """Génère des notifications basées sur l'état du système"""
        try:
            from apps.accounting.models import JournalEntry

            notifications = []

            # Vérifier les écritures en attente de validation
            pending_entries = JournalEntry.objects.filter(is_validated=False).count()
            if pending_entries > 0:
                notifications.append({
                    'id': 'sys-pending-entries',
                    'type': 'validation',
                    'title': f'{pending_entries} écriture(s) en attente de validation',
                    'message': 'Des écritures nécessitent votre validation',
                    'priority': 'high' if pending_entries > 10 else 'medium',
                    'read': False,
                    'created_at': timezone.now().isoformat()
                })

            # Filtrer par priorité et types
            if priority and priority != 'all':
                notifications = [n for n in notifications if n['priority'] == priority]
            if types:
                notifications = [n for n in notifications if n['type'] in types]

            return notifications

        except Exception as e:
            logger.warning(f"Error generating system notifications: {e}")
            return []


# Instance singleton
widget_calculator = WidgetCalculator()
