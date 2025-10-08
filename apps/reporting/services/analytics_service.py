from decimal import Decimal
from datetime import date, datetime, timedelta
from django.db import transaction, connection
from django.db.models import Sum, Count, Q, F, Avg, StdDev
from django.utils import timezone
from typing import List, Dict, Any, Optional, Tuple
import json
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import pandas as pd
import joblib
import warnings
warnings.filterwarnings('ignore')

from ..models import ModeleRapport, Rapport
from apps.accounting.models import EcritureComptable, CompteComptable, ExerciceComptable
from apps.company.models import Company
from apps.third_party.models import Tiers
from apps.treasury.models import PrevisionTresorerie


class AnalyticsService:
    """
    Service d'analytics avancés et intelligence artificielle
    Implémentation EXF-BI-003: Intelligence Artificielle
    """
    
    def __init__(self):
        self.models_cache = {}
        self.scaler_cache = {}
        
    def detecter_anomalies_ecritures(self, company_id: int, 
                                   date_debut: date = None, 
                                   date_fin: date = None,
                                   seuil_contamination: float = 0.1) -> Dict[str, Any]:
        """
        Détecte les anomalies dans les écritures comptables
        Utilise Isolation Forest pour identifier les patterns inhabituels
        """
        if not date_debut:
            date_debut = date.today() - timedelta(days=90)
        if not date_fin:
            date_fin = date.today()
        
        # Récupérer les écritures sur la période
        ecritures = EcritureComptable.objects.filter(
            company_id=company_id,
            date_ecriture__gte=date_debut,
            date_ecriture__lte=date_fin,
            statut='VALIDE'
        ).select_related('compte')
        
        if not ecritures.exists():
            return {
                'anomalies': [],
                'score_global': 100,
                'message': 'Aucune écriture trouvée sur la période'
            }
        
        # Préparer les features pour l'algorithme
        features_data = []
        ecritures_data = []
        
        for ecriture in ecritures:
            features = self._extraire_features_ecriture(ecriture)
            if features:
                features_data.append(features)
                ecritures_data.append(ecriture)
        
        if len(features_data) < 10:
            return {
                'anomalies': [],
                'score_global': 100,
                'message': 'Pas assez de données pour l\'analyse (minimum 10 écritures)'
            }
        
        # Convertir en DataFrame pour l'analyse
        df = pd.DataFrame(features_data)
        
        # Normaliser les données
        scaler = StandardScaler()
        features_scaled = scaler.fit_transform(df)
        
        # Appliquer Isolation Forest
        iso_forest = IsolationForest(
            contamination=seuil_contamination,
            random_state=42,
            n_estimators=100
        )
        
        predictions = iso_forest.fit_predict(features_scaled)
        scores = iso_forest.score_samples(features_scaled)
        
        # Identifier les anomalies
        anomalies = []
        for i, (prediction, score) in enumerate(zip(predictions, scores)):
            if prediction == -1:  # Anomalie détectée
                ecriture = ecritures_data[i]
                anomalie = self._analyser_anomalie(ecriture, score, features_data[i])
                anomalies.append(anomalie)
        
        # Calculer le score global
        score_global = int((1 - len(anomalies) / len(ecritures_data)) * 100)
        
        return {
            'anomalies': sorted(anomalies, key=lambda x: x['score_risque'], reverse=True),
            'score_global': score_global,
            'periode': {
                'debut': date_debut.isoformat(),
                'fin': date_fin.isoformat()
            },
            'total_ecritures': len(ecritures_data),
            'nombre_anomalies': len(anomalies),
            'taux_anomalies': round(len(anomalies) / len(ecritures_data) * 100, 2)
        }
    
    def _extraire_features_ecriture(self, ecriture: EcritureComptable) -> Optional[List[float]]:
        """
        Extrait les caractéristiques d'une écriture pour l'analyse ML
        """
        try:
            features = [
                float(ecriture.montant_debit or 0),
                float(ecriture.montant_credit or 0),
                float(max(ecriture.montant_debit or 0, ecriture.montant_credit or 0)),  # Montant max
                ecriture.date_ecriture.weekday(),  # Jour de la semaine
                ecriture.date_ecriture.hour if hasattr(ecriture.date_ecriture, 'hour') else 12,  # Heure
                int(ecriture.compte.numero[:2]),  # Classe de compte
                len(ecriture.libelle or ''),  # Longueur du libellé
                1 if ecriture.numero_piece else 0,  # A une pièce justificative
                hash(ecriture.libelle or '') % 1000,  # Hash du libellé (pattern textuel)
            ]
            return features
        except Exception:
            return None
    
    def _analyser_anomalie(self, ecriture: EcritureComptable, score: float, features: List[float]) -> Dict[str, Any]:
        """
        Analyse une anomalie détectée et détermine ses caractéristiques
        """
        # Calculer le score de risque (plus négatif = plus anormal)
        score_risque = int(abs(score) * 100)
        
        # Identifier les types d'anomalies possibles
        types_anomalies = []
        
        # Montant inhabituel
        montant = max(ecriture.montant_debit or 0, ecriture.montant_credit or 0)
        if montant > 1000000:  # Seuil configurable
            types_anomalies.append('MONTANT_ELEVE')
        
        # Heure de saisie inhabituelle
        if hasattr(ecriture, 'date_creation'):
            heure = ecriture.date_creation.hour
            if heure < 7 or heure > 20:
                types_anomalies.append('HEURE_INHABITUELLE')
        
        # Jour de saisie inhabituel (weekend)
        if ecriture.date_ecriture.weekday() >= 5:
            types_anomalies.append('WEEKEND')
        
        # Libellé suspicieux (trop court/long)
        if len(ecriture.libelle or '') < 3:
            types_anomalies.append('LIBELLE_COURT')
        elif len(ecriture.libelle or '') > 200:
            types_anomalies.append('LIBELLE_LONG')
        
        # Compte inhabituel
        if ecriture.compte.numero.startswith('89'):
            types_anomalies.append('COMPTE_SUSPICIEUX')
        
        if not types_anomalies:
            types_anomalies.append('PATTERN_INHABITUEL')
        
        return {
            'ecriture_id': ecriture.id,
            'numero_piece': ecriture.numero_piece,
            'date_ecriture': ecriture.date_ecriture.isoformat(),
            'compte': {
                'numero': ecriture.compte.numero,
                'nom': ecriture.compte.nom
            },
            'montant_debit': float(ecriture.montant_debit or 0),
            'montant_credit': float(ecriture.montant_credit or 0),
            'libelle': ecriture.libelle,
            'score_risque': score_risque,
            'types_anomalies': types_anomalies,
            'recommandation': self._generer_recommandation_anomalie(types_anomalies, score_risque)
        }
    
    def _generer_recommandation_anomalie(self, types_anomalies: List[str], score_risque: int) -> str:
        """
        Génère une recommandation basée sur les types d'anomalies détectées
        """
        if score_risque > 80:
            urgence = "🔴 CRITIQUE"
        elif score_risque > 60:
            urgence = "🟡 ATTENTION"
        else:
            urgence = "🔵 INFO"
        
        recommandations = {
            'MONTANT_ELEVE': 'Vérifier l\'autorisation et la justification du montant élevé',
            'HEURE_INHABITUELLE': 'Contrôler la saisie effectuée en dehors des heures normales',
            'WEEKEND': 'Vérifier la légitimité de la saisie en weekend',
            'LIBELLE_COURT': 'Compléter le libellé pour plus de clarté',
            'LIBELLE_LONG': 'Simplifier le libellé si possible',
            'COMPTE_SUSPICIEUX': 'Vérifier l\'utilisation du compte',
            'PATTERN_INHABITUEL': 'Analyser le pattern inhabituel de cette écriture'
        }
        
        reco_principale = recommandations.get(types_anomalies[0], 'Analyser cette écriture')
        return f"{urgence} {reco_principale}"
    
    def detecter_fraudes_potentielles(self, company_id: int, 
                                    date_debut: date = None,
                                    date_fin: date = None) -> Dict[str, Any]:
        """
        Détecte les fraudes potentielles selon des règles métier
        """
        if not date_debut:
            date_debut = date.today() - timedelta(days=30)
        if not date_fin:
            date_fin = date.today()
        
        alertes_fraude = []
        
        # 1. Doublons suspects
        doublons = self._detecter_doublons_suspects(company_id, date_debut, date_fin)
        alertes_fraude.extend(doublons)
        
        # 2. Modifications après validation
        modifications = self._detecter_modifications_suspectes(company_id, date_debut, date_fin)
        alertes_fraude.extend(modifications)
        
        # 3. Séquences de numéros manquantes
        sequences = self._detecter_sequences_manquantes(company_id, date_debut, date_fin)
        alertes_fraude.extend(sequences)
        
        # 4. Ratios anormaux
        ratios = self._detecter_ratios_anormaux(company_id, date_debut, date_fin)
        alertes_fraude.extend(ratios)
        
        # Classer par niveau de risque
        alertes_fraude.sort(key=lambda x: x['niveau_risque'], reverse=True)
        
        return {
            'alertes': alertes_fraude,
            'nombre_alertes': len(alertes_fraude),
            'periode': {
                'debut': date_debut.isoformat(),
                'fin': date_fin.isoformat()
            },
            'score_risque_global': self._calculer_score_risque_global(alertes_fraude)
        }
    
    def _detecter_doublons_suspects(self, company_id: int, date_debut: date, date_fin: date) -> List[Dict]:
        """
        Détecte les écritures potentiellement dupliquées
        """
        alertes = []
        
        # Rechercher les écritures avec mêmes caractéristiques
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    compte_id, 
                    DATE(date_ecriture), 
                    montant_debit, 
                    montant_credit, 
                    libelle,
                    COUNT(*) as nb_occurrences,
                    STRING_AGG(id::text, ',') as ecriture_ids
                FROM accounting_ecriturecomptable 
                WHERE company_id = %s 
                    AND date_ecriture >= %s 
                    AND date_ecriture <= %s
                    AND statut = 'VALIDE'
                GROUP BY compte_id, DATE(date_ecriture), montant_debit, montant_credit, libelle
                HAVING COUNT(*) > 1
                ORDER BY COUNT(*) DESC
            """, [company_id, date_debut, date_fin])
            
            for row in cursor.fetchall():
                alertes.append({
                    'type': 'DOUBLONS_SUSPECTS',
                    'niveau_risque': 70,
                    'description': f'Écritures identiques détectées ({row[5]} occurrences)',
                    'details': {
                        'compte_id': row[0],
                        'date': row[1].isoformat(),
                        'montant_debit': float(row[2] or 0),
                        'montant_credit': float(row[3] or 0),
                        'libelle': row[4],
                        'nb_occurrences': row[5],
                        'ecriture_ids': row[6].split(',')
                    },
                    'recommandation': 'Vérifier la légitimité de ces écritures identiques'
                })
        
        return alertes
    
    def _detecter_modifications_suspectes(self, company_id: int, date_debut: date, date_fin: date) -> List[Dict]:
        """
        Détecte les modifications après validation (nécessite un historique)
        """
        # Cette fonction nécessiterait un système d'historique des modifications
        # Pour l'instant, on retourne une liste vide
        return []
    
    def _detecter_sequences_manquantes(self, company_id: int, date_debut: date, date_fin: date) -> List[Dict]:
        """
        Détecte les séquences de numéros de pièces manquantes
        """
        alertes = []
        
        # Analyser les séquences par journal
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT DISTINCT journal_id
                FROM accounting_ecriturecomptable
                WHERE company_id = %s AND date_ecriture >= %s AND date_ecriture <= %s
            """, [company_id, date_debut, date_fin])
            
            for (journal_id,) in cursor.fetchall():
                # Récupérer les numéros de pièces pour ce journal
                cursor.execute("""
                    SELECT numero_piece
                    FROM accounting_ecriturecomptable
                    WHERE company_id = %s 
                        AND journal_id = %s
                        AND date_ecriture >= %s 
                        AND date_ecriture <= %s
                        AND numero_piece ~ '^[0-9]+$'
                    ORDER BY CAST(numero_piece AS INTEGER)
                """, [company_id, journal_id, date_debut, date_fin])
                
                numeros = [int(row[0]) for row in cursor.fetchall()]
                
                if len(numeros) > 2:
                    # Chercher les trous dans la séquence
                    for i in range(len(numeros) - 1):
                        if numeros[i + 1] - numeros[i] > 1:
                            manquants = list(range(numeros[i] + 1, numeros[i + 1]))
                            if len(manquants) <= 5:  # Seulement les petits trous
                                alertes.append({
                                    'type': 'SEQUENCE_MANQUANTE',
                                    'niveau_risque': 50,
                                    'description': f'Numéros de pièces manquants: {manquants}',
                                    'details': {
                                        'journal_id': journal_id,
                                        'numeros_manquants': manquants,
                                        'avant': numeros[i],
                                        'après': numeros[i + 1]
                                    },
                                    'recommandation': 'Vérifier la cohérence de la numérotation'
                                })
        
        return alertes[:10]  # Limiter à 10 alertes
    
    def _detecter_ratios_anormaux(self, company_id: int, date_debut: date, date_fin: date) -> List[Dict]:
        """
        Détecte les ratios financiers anormaux
        """
        alertes = []
        
        # Calculer des ratios et détecter les anomalies
        # Ratio crédit/débit inhabituel par compte
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    cc.numero,
                    cc.nom,
                    SUM(ec.montant_debit) as total_debit,
                    SUM(ec.montant_credit) as total_credit,
                    CASE 
                        WHEN SUM(ec.montant_debit) > 0 THEN SUM(ec.montant_credit) / SUM(ec.montant_debit)
                        ELSE NULL
                    END as ratio_credit_debit
                FROM accounting_ecriturecomptable ec
                JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
                WHERE ec.company_id = %s 
                    AND ec.date_ecriture >= %s 
                    AND ec.date_ecriture <= %s
                    AND ec.statut = 'VALIDE'
                GROUP BY cc.id, cc.numero, cc.nom
                HAVING SUM(ec.montant_debit) > 1000 OR SUM(ec.montant_credit) > 1000
            """, [company_id, date_debut, date_fin])
            
            for row in cursor.fetchall():
                numero, nom, total_debit, total_credit, ratio = row
                
                # Analyser selon le type de compte
                if numero.startswith('6') and ratio and ratio > 0.1:  # Compte de charges avec trop de crédit
                    alertes.append({
                        'type': 'RATIO_ANORMAL',
                        'niveau_risque': 60,
                        'description': f'Compte de charges {numero} avec ratio crédit/débit élevé: {ratio:.2f}',
                        'details': {
                            'compte': {'numero': numero, 'nom': nom},
                            'total_debit': float(total_debit or 0),
                            'total_credit': float(total_credit or 0),
                            'ratio': float(ratio)
                        },
                        'recommandation': 'Vérifier les écritures de crédit sur ce compte de charges'
                    })
                elif numero.startswith('7') and ratio and ratio < 10:  # Compte de produits avec trop de débit
                    alertes.append({
                        'type': 'RATIO_ANORMAL',
                        'niveau_risque': 60,
                        'description': f'Compte de produits {numero} avec ratio crédit/débit faible: {ratio:.2f}',
                        'details': {
                            'compte': {'numero': numero, 'nom': nom},
                            'total_debit': float(total_debit or 0),
                            'total_credit': float(total_credit or 0),
                            'ratio': float(ratio)
                        },
                        'recommandation': 'Vérifier les écritures de débit sur ce compte de produits'
                    })
        
        return alertes[:10]  # Limiter à 10 alertes
    
    def _calculer_score_risque_global(self, alertes: List[Dict]) -> int:
        """
        Calcule un score de risque global basé sur les alertes
        """
        if not alertes:
            return 0
        
        score_total = sum(alerte['niveau_risque'] for alerte in alertes)
        score_moyen = score_total / len(alertes)
        
        # Ajuster selon le nombre d'alertes
        facteur_volume = min(len(alertes) / 10, 2)  # Max 2x
        
        return min(int(score_moyen * facteur_volume), 100)
    
    def predire_tresorerie(self, company_id: int, horizon_jours: int = 90) -> Dict[str, Any]:
        """
        Prédiction de la trésorerie future basée sur l'historique
        """
        date_fin = date.today()
        date_debut = date_fin - timedelta(days=365)  # Historique d'1 an
        
        # Récupérer l'historique des mouvements de trésorerie
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    DATE(ec.date_ecriture) as date_mvt,
                    SUM(ec.montant_debit - ec.montant_credit) as flux_net
                FROM accounting_ecriturecomptable ec
                JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
                WHERE ec.company_id = %s 
                    AND cc.numero LIKE '5%'  -- Comptes de trésorerie
                    AND ec.date_ecriture >= %s
                    AND ec.date_ecriture <= %s
                    AND ec.statut = 'VALIDE'
                GROUP BY DATE(ec.date_ecriture)
                ORDER BY date_mvt
            """, [company_id, date_debut, date_fin])
            
            historique = [{'date': row[0], 'flux': float(row[1] or 0)} for row in cursor.fetchall()]
        
        if len(historique) < 30:
            return {
                'predictions': [],
                'tendance': 'INSUFFISANT_DONNEES',
                'message': 'Pas assez d\'historique pour une prédiction fiable'
            }
        
        # Préparer les données pour la prédiction
        df = pd.DataFrame(historique)
        df['date'] = pd.to_datetime(df['date'])
        df = df.set_index('date')
        
        # Calcul de statistiques de base
        flux_moyen = df['flux'].mean()
        volatilite = df['flux'].std()
        
        # Prédiction simple basée sur la moyenne mobile et la saisonnalité
        predictions = []
        date_pred = date_fin
        tresorerie_courante = self._get_tresorerie_actuelle(company_id)
        
        for i in range(horizon_jours):
            date_pred += timedelta(days=1)
            
            # Prédiction basée sur:
            # 1. Moyenne mobile des flux
            # 2. Saisonnalité (jour de la semaine/mois)
            # 3. Tendance
            
            jour_semaine = date_pred.weekday()
            jour_mois = date_pred.day
            
            # Facteur saisonnalité jour de semaine (weekend = moins d'activité)
            facteur_semaine = 0.3 if jour_semaine >= 5 else 1.0
            
            # Facteur début/fin de mois
            facteur_mois = 1.2 if jour_mois <= 5 or jour_mois >= 25 else 1.0
            
            # Prédiction du flux
            flux_predit = flux_moyen * facteur_semaine * facteur_mois
            
            # Mise à jour de la trésorerie
            tresorerie_courante += flux_predit
            
            predictions.append({
                'date': date_pred.isoformat(),
                'flux_predit': round(flux_predit, 2),
                'tresorerie_predit': round(tresorerie_courante, 2),
                'confiance': max(0.9 - (i / horizon_jours * 0.4), 0.5)  # Confiance décroissante
            })
        
        # Analyser la tendance
        tendance = self._analyser_tendance_tresorerie(predictions)
        
        # Points d'attention
        alertes_tresorerie = []
        for pred in predictions[:30]:  # Premier mois
            if pred['tresorerie_predit'] < 0:
                alertes_tresorerie.append({
                    'date': pred['date'],
                    'type': 'TRESORERIE_NEGATIVE',
                    'montant': pred['tresorerie_predit'],
                    'message': 'Risque de trésorerie négative'
                })
        
        return {
            'predictions': predictions,
            'tendance': tendance,
            'statistiques': {
                'flux_moyen_quotidien': round(flux_moyen, 2),
                'volatilite': round(volatilite, 2),
                'tresorerie_actuelle': round(tresorerie_courante - sum(p['flux_predit'] for p in predictions), 2)
            },
            'alertes': alertes_tresorerie,
            'periode_analyse': {
                'debut': date_debut.isoformat(),
                'fin': date_fin.isoformat()
            },
            'horizon_prediction': horizon_jours
        }
    
    def _get_tresorerie_actuelle(self, company_id: int) -> float:
        """
        Calcule la trésorerie actuelle
        """
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COALESCE(SUM(ec.montant_debit - ec.montant_credit), 0)
                FROM accounting_ecriturecomptable ec
                JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
                WHERE ec.company_id = %s 
                    AND cc.numero LIKE '5%'
                    AND ec.statut = 'VALIDE'
            """, [company_id])
            
            return float(cursor.fetchone()[0] or 0)
    
    def _analyser_tendance_tresorerie(self, predictions: List[Dict]) -> str:
        """
        Analyse la tendance de l'évolution de la trésorerie
        """
        if len(predictions) < 10:
            return 'INSUFFICIENT_DATA'
        
        # Comparer début et fin de période
        debut = predictions[:10]
        fin = predictions[-10:]
        
        moy_debut = sum(p['tresorerie_predit'] for p in debut) / len(debut)
        moy_fin = sum(p['tresorerie_predit'] for p in fin) / len(fin)
        
        variation_pct = ((moy_fin - moy_debut) / abs(moy_debut)) * 100 if moy_debut != 0 else 0
        
        if variation_pct > 10:
            return 'AMELIORATION'
        elif variation_pct < -10:
            return 'DETERIORATION'
        else:
            return 'STABLE'
    
    def analyser_risques_clients(self, company_id: int) -> Dict[str, Any]:
        """
        Analyse des risques clients basée sur l'historique de paiements
        """
        # Analyser les retards de paiement par client
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    t.id,
                    t.nom,
                    COUNT(ec.id) as nb_factures,
                    AVG(CASE 
                        WHEN cc.numero LIKE '411%' THEN ec.montant_debit - ec.montant_credit
                        ELSE 0
                    END) as montant_moyen,
                    SUM(CASE 
                        WHEN cc.numero LIKE '411%' AND ec.date_ecriture < CURRENT_DATE - INTERVAL '30 days'
                        THEN ec.montant_debit - ec.montant_credit
                        ELSE 0
                    END) as creances_anciennes
                FROM third_party_tiers t
                JOIN accounting_ecriturecomptable ec ON ec.tiers_id = t.id
                JOIN accounting_comptecomptable cc ON ec.compte_id = cc.id
                WHERE t.company_id = %s 
                    AND t.type_tiers = 'CLIENT'
                    AND cc.numero LIKE '411%'
                    AND ec.statut = 'VALIDE'
                    AND ec.date_ecriture >= CURRENT_DATE - INTERVAL '12 months'
                GROUP BY t.id, t.nom
                HAVING COUNT(ec.id) >= 3
                ORDER BY creances_anciennes DESC
            """, [company_id])
            
            clients_analyse = []
            for row in cursor.fetchall():
                client_id, nom, nb_factures, montant_moyen, creances_anciennes = row
                
                # Calculer le score de risque
                score_risque = self._calculer_score_risque_client(
                    nb_factures, 
                    float(montant_moyen or 0), 
                    float(creances_anciennes or 0)
                )
                
                clients_analyse.append({
                    'client_id': client_id,
                    'nom': nom,
                    'nb_factures': nb_factures,
                    'montant_moyen': round(float(montant_moyen or 0), 2),
                    'creances_anciennes': round(float(creances_anciennes or 0), 2),
                    'score_risque': score_risque,
                    'niveau_risque': self._categoriser_risque(score_risque),
                    'recommandation': self._recommandation_client(score_risque, float(creances_anciennes or 0))
                })
        
        return {
            'clients_analyses': sorted(clients_analyse, key=lambda x: x['score_risque'], reverse=True),
            'nombre_clients_risque': len([c for c in clients_analyse if c['score_risque'] > 60]),
            'total_creances_anciennes': sum(c['creances_anciennes'] for c in clients_analyse)
        }
    
    def _calculer_score_risque_client(self, nb_factures: int, montant_moyen: float, creances_anciennes: float) -> int:
        """
        Calcule un score de risque client (0-100)
        """
        score = 0
        
        # Score basé sur les créances anciennes
        if creances_anciennes > 0:
            score += min((creances_anciennes / 10000) * 40, 60)  # Max 60 points
        
        # Score basé sur le nombre de factures (fidélité inverse)
        if nb_factures < 5:
            score += 20
        elif nb_factures < 10:
            score += 10
        
        # Score basé sur le montant moyen
        if montant_moyen > 50000:
            score += 20  # Gros montants = plus de risque
        
        return min(int(score), 100)
    
    def _categoriser_risque(self, score: int) -> str:
        """
        Catégorise le niveau de risque selon le score
        """
        if score >= 80:
            return 'TRES_ELEVE'
        elif score >= 60:
            return 'ELEVE'
        elif score >= 40:
            return 'MOYEN'
        else:
            return 'FAIBLE'
    
    def _recommandation_client(self, score: int, creances_anciennes: float) -> str:
        """
        Génère une recommandation pour un client selon son risque
        """
        if score >= 80:
            return f"🔴 URGENT: Recouvrer {creances_anciennes:,.0f} FCFA, suspendre les livraisons"
        elif score >= 60:
            return f"🟡 Relancer pour {creances_anciennes:,.0f} FCFA, surveiller de près"
        elif score >= 40:
            return "🟢 Surveiller l'évolution, rappeler les échéances"
        else:
            return "✅ Client fiable, continuer le suivi normal"