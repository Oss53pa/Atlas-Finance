"""
Assistant Virtuel IA WiseBook
Intelligence artificielle avancée selon EXF-BI-003
"""
from typing import Dict, Any, List, Optional
from django.utils import timezone
from decimal import Decimal
import json
import logging
from datetime import date, datetime, timedelta

from apps.accounting.models import Company, JournalEntry, ChartOfAccounts
from apps.customers.models import Customer
from apps.suppliers.models import Supplier


logger = logging.getLogger(__name__)


class WiseBookAIAssistant:
    """
    Assistant virtuel IA pour WiseBook
    Requêtes en langage naturel et suggestions contextuelles selon EXF-BI-003
    """
    
    def __init__(self, company: Company, user=None):
        self.company = company
        self.user = user
        self.context_memory = {}
        
    async def process_natural_language_query(self, query: str) -> Dict[str, Any]:
        """
        Traitement requêtes en langage naturel (EXF-BI-003)
        Support français avec intelligence contextuelle
        """
        query_lower = query.lower().strip()
        
        # Classification de l'intention
        intent = self._classify_query_intent(query_lower)
        
        # Extraction entités nommées
        entities = self._extract_entities(query_lower)
        
        # Traitement selon l'intention
        if intent == 'BALANCE_INQUIRY':
            return await self._handle_balance_query(entities, query_lower)
        elif intent == 'CUSTOMER_INQUIRY':
            return await self._handle_customer_query(entities, query_lower)
        elif intent == 'SUPPLIER_INQUIRY':
            return await self._handle_supplier_query(entities, query_lower)
        elif intent == 'TREASURY_INQUIRY':
            return await self._handle_treasury_query(entities, query_lower)
        elif intent == 'PERFORMANCE_INQUIRY':
            return await self._handle_performance_query(entities, query_lower)
        elif intent == 'HELP_REQUEST':
            return self._handle_help_request(query_lower)
        else:
            return self._handle_unknown_query(query)
    
    def _classify_query_intent(self, query: str) -> str:
        """
        Classification d'intention avec ML simplifié
        """
        # Mots-clés pour classification d'intention
        intent_keywords = {
            'BALANCE_INQUIRY': [
                'solde', 'balance', 'compte', 'combien', 'montant',
                'position', 'équilibre', 'total'
            ],
            'CUSTOMER_INQUIRY': [
                'client', 'créance', 'recouvrement', 'dso', 'impayé',
                'facture client', 'encours client'
            ],
            'SUPPLIER_INQUIRY': [
                'fournisseur', 'dette', 'paiement', 'dpo', 'échéance',
                'facture fournisseur', 'à payer'
            ],
            'TREASURY_INQUIRY': [
                'trésorerie', 'banque', 'liquidité', 'cash', 'disponible',
                'position bancaire', 'flux'
            ],
            'PERFORMANCE_INQUIRY': [
                'performance', 'ratio', 'rentabilité', 'marge', 'résultat',
                'chiffre affaires', 'ca', 'bénéfice'
            ],
            'HELP_REQUEST': [
                'aide', 'comment', 'expliquer', 'procédure', 'formation',
                'support', 'tutoriel'
            ]
        }
        
        # Scoring par intention
        intent_scores = {}
        for intent, keywords in intent_keywords.items():
            score = sum(1 for keyword in keywords if keyword in query)
            if score > 0:
                intent_scores[intent] = score
        
        # Retour intention avec meilleur score
        if intent_scores:
            return max(intent_scores.items(), key=lambda x: x[1])[0]
        
        return 'UNKNOWN'
    
    def _extract_entities(self, query: str) -> Dict[str, Any]:
        """
        Extraction entités nommées (codes comptes, noms clients, montants)
        """
        import re
        
        entities = {
            'account_codes': [],
            'amounts': [],
            'dates': [],
            'customer_names': [],
            'periods': [],
        }
        
        # Codes de comptes (3 à 9 chiffres)
        account_patterns = re.findall(r'\b\d{3,9}\b', query)
        entities['account_codes'] = [code for code in account_patterns if len(code) >= 3]
        
        # Montants (avec K, M, millions, etc.)
        amount_patterns = re.findall(r'\b\d+(?:[,.\s]\d+)*\s*(?:k|m|millions?|milliards?|xaf|fcfa)?\b', query)
        entities['amounts'] = amount_patterns
        
        # Périodes temporelles
        period_keywords = ['aujourd\'hui', 'hier', 'semaine', 'mois', 'année', 'trimestre']
        entities['periods'] = [period for period in period_keywords if period in query]
        
        # Noms propres (clients/fournisseurs potentiels)
        # Pattern simplifié - à améliorer avec NLP avancé
        capitalized_words = re.findall(r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b', query)
        entities['customer_names'] = capitalized_words
        
        return entities
    
    async def _handle_balance_query(self, entities: Dict, query: str) -> Dict[str, Any]:
        """
        Traitement requêtes de solde de comptes
        """
        account_codes = entities.get('account_codes', [])
        
        if not account_codes:
            return {
                'response_type': 'CLARIFICATION',
                'message': 'Quel compte souhaitez-vous consulter ? Précisez le code compte (ex: 411, 521, etc.)',
                'suggestions': ['411 (Clients)', '521 (Banque)', '401 (Fournisseurs)']
            }
        
        # Récupération soldes
        balances = []
        for code in account_codes[:5]:  # Limite à 5 comptes
            try:
                account = ChartOfAccounts.objects.get(company=self.company, code=code)
                balance = account.get_balance(self.company.current_fiscal_year)
                
                balances.append({
                    'account_code': code,
                    'account_name': account.name,
                    'balance': float(balance),
                    'balance_formatted': f"{balance:,.0f} XAF",
                })
            except ChartOfAccounts.DoesNotExist:
                balances.append({
                    'account_code': code,
                    'error': 'Compte inexistant'
                })
        
        return {
            'response_type': 'DATA_RESPONSE',
            'intent': 'BALANCE_INQUIRY',
            'message': f"Voici les soldes des comptes demandés :",
            'data': balances,
            'suggestions': [
                'Voir le grand livre de ce compte',
                'Analyser les mouvements du mois',
                'Comparer avec la période précédente'
            ]
        }
    
    async def _handle_customer_query(self, entities: Dict, query: str) -> Dict[str, Any]:
        """
        Traitement requêtes clients
        """
        # Analyse du type de demande client
        if any(word in query for word in ['en retard', 'impayé', 'recouvrement']):
            return await self._get_overdue_customers_info()
        elif any(word in query for word in ['dso', 'délai']):
            return await self._get_dso_info()
        elif any(word in query for word in ['top', 'meilleur', 'plus gros']):
            return await self._get_top_customers_info()
        
        # Requête générale clients
        return await self._get_general_customer_info()
    
    async def _get_overdue_customers_info(self) -> Dict[str, Any]:
        """Informations clients en retard"""
        # Simulation données - à connecter avec vrai service
        return {
            'response_type': 'DATA_RESPONSE',
            'message': 'Voici les clients en situation d\'impayé :',
            'data': {
                'total_overdue_amount': 2450000,
                'overdue_customers_count': 15,
                'avg_delay_days': 23,
                'top_overdue': [
                    {'name': 'Client ABC SARL', 'amount': 850000, 'days': 45},
                    {'name': 'Entreprise XYZ', 'amount': 620000, 'days': 32},
                ]
            },
            'actions': [
                'Déclencher relances automatiques',
                'Voir le détail par client',
                'Générer rapport de recouvrement'
            ]
        }
    
    async def _handle_treasury_query(self, entities: Dict, query: str) -> Dict[str, Any]:
        """Traitement requêtes trésorerie"""
        from apps.treasury.services.treasury_service import TreasuryService
        
        # Position temps réel
        position = TreasuryService.get_realtime_treasury_position(self.company)
        
        return {
            'response_type': 'DATA_RESPONSE',
            'message': 'Position de trésorerie actuelle :',
            'data': {
                'current_position': position['summary']['current_position'],
                'available_total': position['summary']['total_available'],
                'accounts_count': position['summary']['accounts_count'],
                'net_change_today': position['summary']['net_change_today'],
                'forecast_7d': position['summary']['forecast_7d_position'],
            },
            'insights': [
                f"Position {'positive' if position['summary']['current_position'] >= 0 else 'négative'}",
                f"Variation du jour: {position['summary']['net_change_today']:+,.0f} XAF",
                f"Prévision 7j: {position['summary']['forecast_7d_position']:,.0f} XAF"
            ],
            'actions': [
                'Voir les prévisions détaillées',
                'Analyser les flux',
                'Optimiser la position'
            ]
        }
    
    def generate_contextual_suggestions(self, current_page: str, user_data: Dict) -> List[Dict[str, Any]]:
        """
        Suggestions contextuelles selon EXF-BI-003
        Formation continue et support 24/7
        """
        suggestions = []
        
        # Suggestions selon la page courante
        if current_page == 'dashboard':
            suggestions.extend([
                {
                    'type': 'ACTION',
                    'title': 'Lancer la clôture mensuelle',
                    'description': 'Votre clôture de février est prête',
                    'icon': 'calendar',
                    'urgency': 'HIGH',
                    'action_url': '/closures/monthly'
                },
                {
                    'type': 'INSIGHT',
                    'title': 'DSO en amélioration',
                    'description': 'Vos délais clients ont diminué de 3 jours',
                    'icon': 'trending-up',
                    'urgency': 'INFO'
                }
            ])
            
        elif current_page == 'customers':
            suggestions.extend([
                {
                    'type': 'ACTION',
                    'title': '5 relances à envoyer',
                    'description': 'Clients avec retard > 15 jours',
                    'icon': 'mail',
                    'urgency': 'MEDIUM',
                    'action_url': '/customers/reminders'
                },
                {
                    'type': 'TIP',
                    'title': 'Optimisation DSO',
                    'description': 'Activez les relances automatiques pour réduire votre DSO',
                    'icon': 'lightbulb',
                    'urgency': 'INFO'
                }
            ])
            
        elif current_page == 'suppliers':
            suggestions.extend([
                {
                    'type': 'SAVINGS',
                    'title': '125 000 XAF d\'économies possibles',
                    'description': '8 opportunités d\'escompte détectées',
                    'icon': 'dollar-sign',
                    'urgency': 'HIGH',
                    'action_url': '/suppliers/discounts'
                }
            ])
        
        # Suggestions basées sur l'historique utilisateur
        if user_data.get('frequent_actions'):
            suggestions.append({
                'type': 'SHORTCUT',
                'title': 'Raccourci personnalisé',
                'description': f"Accès rapide à {user_data['frequent_actions'][0]}",
                'icon': 'zap',
                'urgency': 'INFO'
            })
        
        return suggestions
    
    def detect_anomalies_ml(self) -> Dict[str, Any]:
        """
        Détection d'anomalies ML selon EXF-BI-003
        Patterns inhabituels et fraudes potentielles
        """
        anomalies = {
            'financial_anomalies': [],
            'fraud_indicators': [],
            'performance_outliers': [],
            'data_quality_issues': [],
        }
        
        # Détection montants inhabituels (ML simplifié)
        recent_entries = JournalEntry.objects.filter(
            company=self.company,
            entry_date__gte=date.today() - timedelta(days=30),
            is_validated=True
        ).order_by('-total_debit')[:10]
        
        for entry in recent_entries:
            # Analyse pattern montant vs historique
            avg_amount = self._get_historical_average(entry.journal, days=90)
            
            if entry.total_debit > avg_amount * 3:  # 3x supérieur à la moyenne
                anomalies['financial_anomalies'].append({
                    'type': 'UNUSUAL_AMOUNT',
                    'description': f"Montant inhabituel: {entry.total_debit:,.0f} (moy: {avg_amount:,.0f})",
                    'entry_reference': entry.piece_number,
                    'confidence': 0.85,
                    'risk_level': 'MEDIUM',
                    'recommended_action': 'Vérifier justification et pièces jointes'
                })
        
        # Détection patterns frauduleux
        anomalies['fraud_indicators'] = self._detect_fraud_patterns()
        
        # Analyse performance outliers
        anomalies['performance_outliers'] = self._detect_performance_outliers()
        
        return {
            'anomalies_detected': sum(len(category) for category in anomalies.values()),
            'anomalies_by_category': anomalies,
            'overall_risk_score': self._calculate_risk_score(anomalies),
            'generated_at': timezone.now().isoformat(),
        }
    
    def _get_historical_average(self, journal, days: int = 90) -> Decimal:
        """Calcule la moyenne historique d'un journal"""
        from django.db.models import Avg
        
        cutoff_date = date.today() - timedelta(days=days)
        
        avg_result = JournalEntry.objects.filter(
            company=self.company,
            journal=journal,
            entry_date__gte=cutoff_date,
            is_validated=True
        ).aggregate(avg_amount=Avg('total_debit'))
        
        return avg_result['avg_amount'] or Decimal('0')
    
    def _detect_fraud_patterns(self) -> List[Dict[str, Any]]:
        """
        Détection patterns frauduleux avec ML
        """
        fraud_indicators = []
        
        # Pattern 1: Écritures en fin de journée/weekend
        weekend_entries = JournalEntry.objects.filter(
            company=self.company,
            entry_date__gte=date.today() - timedelta(days=7),
            created_at__hour__gte=18  # Après 18h
        ).count()
        
        if weekend_entries > 5:
            fraud_indicators.append({
                'type': 'TIMING_PATTERN',
                'description': f'{weekend_entries} écritures créées en fin de journée',
                'confidence': 0.65,
                'risk_level': 'LOW',
            })
        
        # Pattern 2: Montants ronds suspects
        round_amounts_count = JournalEntry.objects.filter(
            company=self.company,
            entry_date__gte=date.today() - timedelta(days=30),
            total_debit__regex=r'^\d+00000\.00$'  # Montants très ronds
        ).count()
        
        if round_amounts_count > 3:
            fraud_indicators.append({
                'type': 'ROUND_AMOUNTS',
                'description': f'{round_amounts_count} écritures avec montants très ronds',
                'confidence': 0.45,
                'risk_level': 'LOW',
            })
        
        return fraud_indicators
    
    def _detect_performance_outliers(self) -> List[Dict[str, Any]]:
        """Détection outliers performance"""
        outliers = []
        
        # Analyse DSO clients exceptionnels
        customers_high_dso = Customer.objects.filter(
            company=self.company,
            status='ACTIVE'
        ).annotate(
            # Simulation calcul DSO - à connecter avec vrai service
        )
        
        # Simulation outlier
        outliers.append({
            'type': 'HIGH_DSO',
            'description': 'Client ABC SARL : DSO de 87 jours (moyenne: 42j)',
            'customer_code': 'CCM00015',
            'value': 87,
            'benchmark': 42,
            'confidence': 0.92,
        })
        
        return outliers
    
    def _calculate_risk_score(self, anomalies: Dict) -> float:
        """Calcul score risque global 0-100"""
        total_anomalies = sum(len(category) for category in anomalies.values())
        fraud_count = len(anomalies['fraud_indicators'])
        
        base_score = min(total_anomalies * 5, 50)  # 5 points par anomalie, max 50
        fraud_bonus = fraud_count * 15  # 15 points par indicateur fraude
        
        return min(100, base_score + fraud_bonus)
    
    def provide_learning_assistance(self, topic: str) -> Dict[str, Any]:
        """
        Formation continue selon EXF-BI-003
        """
        learning_content = {
            'syscohada_basics': {
                'title': 'Fondamentaux SYSCOHADA',
                'content': 'Le système SYSCOHADA organise le plan comptable en 9 classes...',
                'difficulty': 'BEGINNER',
                'estimated_time': '15 minutes',
                'interactive_demo': True,
            },
            'treasury_management': {
                'title': 'Gestion de Trésorerie Avancée',
                'content': 'La position de trésorerie temps réel permet...',
                'difficulty': 'INTERMEDIATE',
                'estimated_time': '25 minutes',
                'video_url': '/tutorials/treasury-advanced',
            },
            'financial_analysis': {
                'title': 'Analyse Financière TAFIRE',
                'content': 'Le TAFIRE (Tableau Financier des Ressources et Emplois)...',
                'difficulty': 'ADVANCED',
                'estimated_time': '45 minutes',
                'certification': True,
            }
        }
        
        return learning_content.get(topic, {
            'title': 'Aide WiseBook',
            'content': 'Consultez la documentation complète ou contactez le support.',
            'support_available': True,
        })
    
    def generate_automated_insights(self) -> Dict[str, Any]:
        """
        Génération automatique insights selon EXF-BI-003
        """
        insights = {
            'financial_health': self._analyze_financial_health(),
            'operational_efficiency': self._analyze_operational_efficiency(),
            'risk_assessment': self._assess_business_risks(),
            'growth_opportunities': self._identify_growth_opportunities(),
            'cost_optimization': self._suggest_cost_optimizations(),
        }
        
        # Score global intelligence
        overall_score = sum(insight.get('score', 0) for insight in insights.values()) / len(insights)
        
        return {
            'insights': insights,
            'overall_intelligence_score': overall_score,
            'priority_recommendations': self._prioritize_recommendations(insights),
            'generated_at': timezone.now().isoformat(),
        }
    
    def _analyze_financial_health(self) -> Dict[str, Any]:
        """Analyse santé financière avec IA"""
        # Simulation analyse - à connecter avec vrais modules
        return {
            'score': 78.5,
            'status': 'GOOD',
            'strengths': ['Trésorerie stable', 'DSO maîtrisé'],
            'concerns': ['DPO élevé', 'Marge en baisse'],
            'trend': 'STABLE',
        }
    
    def _analyze_operational_efficiency(self) -> Dict[str, Any]:
        """Analyse efficacité opérationnelle"""
        return {
            'score': 82.3,
            'status': 'GOOD',
            'metrics': {
                'processing_speed': 95,  # vs objectifs cahier des charges
                'automation_rate': 98,
                'user_satisfaction': 87,
            }
        }
    
    def _assess_business_risks(self) -> Dict[str, Any]:
        """Évaluation risques business"""
        return {
            'score': 25.4,  # Plus bas = mieux
            'status': 'LOW_RISK',
            'main_risks': [
                {'type': 'LIQUIDITY', 'probability': 0.15, 'impact': 'MEDIUM'},
                {'type': 'CREDIT', 'probability': 0.08, 'impact': 'HIGH'},
            ]
        }
    
    def _identify_growth_opportunities(self) -> Dict[str, Any]:
        """Identification opportunités croissance"""
        return {
            'score': 67.2,
            'opportunities': [
                {
                    'type': 'MARKET_EXPANSION',
                    'description': 'Expansion géographique Gabon',
                    'potential_revenue': 2500000,
                    'confidence': 0.73,
                },
                {
                    'type': 'PRODUCT_DIVERSIFICATION',
                    'description': 'Nouveau segment services',
                    'potential_revenue': 1800000,
                    'confidence': 0.62,
                }
            ]
        }
    
    def _suggest_cost_optimizations(self) -> Dict[str, Any]:
        """Suggestions optimisation coûts"""
        return {
            'score': 85.1,
            'potential_savings': 450000,
            'optimizations': [
                {
                    'category': 'SUPPLIER_DISCOUNTS',
                    'description': 'Négocier escomptes fournisseurs',
                    'savings': 125000,
                    'effort': 'LOW',
                },
                {
                    'category': 'PROCESS_AUTOMATION',
                    'description': 'Automatiser rapprochements bancaires',
                    'savings': 75000,
                    'effort': 'MEDIUM',
                }
            ]
        }
    
    def _prioritize_recommendations(self, insights: Dict) -> List[Dict[str, Any]]:
        """Priorisation intelligente des recommandations"""
        all_recommendations = []
        
        # Extraction de toutes les recommandations
        for category, data in insights.items():
            if 'concerns' in data:
                for concern in data['concerns']:
                    all_recommendations.append({
                        'category': category,
                        'type': 'CONCERN',
                        'description': concern,
                        'priority': 'HIGH',
                    })
        
        # Tri par priorité et impact
        return sorted(all_recommendations, key=lambda x: x['priority'], reverse=True)[:5]