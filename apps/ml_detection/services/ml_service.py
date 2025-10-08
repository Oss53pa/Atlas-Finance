from django.db import transaction, connection
from django.core.exceptions import ValidationError
from django.utils import timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, List, Optional, Tuple, Any, Union
from datetime import datetime, date, timedelta
import logging
import numpy as np
import pandas as pd
import pickle
import hashlib
import json

# Imports ML
try:
    from sklearn.ensemble import IsolationForest
    from sklearn.svm import OneClassSVM
    from sklearn.neighbors import LocalOutlierFactor
    from sklearn.cluster import KMeans, DBSCAN
    from sklearn.mixture import GaussianMixture
    from sklearn.preprocessing import StandardScaler, RobustScaler
    from sklearn.metrics import precision_score, recall_score, f1_score
    from sklearn.model_selection import train_test_split
    import joblib
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False
    logger = logging.getLogger(__name__)
    logger.warning("scikit-learn n'est pas disponible. Les fonctionnalités ML seront limitées.")

from ..models import (
    ModeleML, DetectionAnomalie, RegleDetection, CampagneEntrainement,
    FeedbackAnomalie, StatistiqueDetection
)
from ...core.models import Company
# from ...core.services.base_service import BaseService  # Non disponible
# from ...accounting.models import Ecriture, LigneEcriture  # Non disponible dans simple_settings

logger = logging.getLogger(__name__)

class MLService:
    """
    Service principal pour la détection d'anomalies par Machine Learning.
    Gère l'entraînement, la prédiction et l'amélioration continue des modèles.
    """
    
    def __init__(self, company: Company):
        # super().__init__(company)  # BaseService n'existe pas
        self.company = company
        self.scaler = StandardScaler() if SKLEARN_AVAILABLE else None
    
    def entrainer_modele(
        self,
        nom_modele: str,
        type_modele: str,
        domaine_application: str,
        periode_debut: date,
        periode_fin: date,
        parametres_modele: Dict[str, Any] = None,
        features_personnalisees: List[str] = None
    ) -> ModeleML:
        """
        Entraîne un nouveau modèle de détection d'anomalies.
        """
        if not SKLEARN_AVAILABLE:
            raise ValidationError("Les bibliothèques ML ne sont pas disponibles")
        
        try:
            with transaction.atomic():
                # Créer la campagne d'entraînement
                campagne = CampagneEntrainement.objects.create(
                    societe=self.company,
                    modele=None,  # Sera mis à jour après création du modèle
                    nom=f"Entraînement initial - {nom_modele}",
                    type_campagne='INITIAL',
                    periode_donnees_debut=periode_debut,
                    periode_donnees_fin=periode_fin,
                    statut='EN_COURS',
                    date_debut=timezone.now()
                )
                
                # Créer le modèle
                modele_ml = ModeleML.objects.create(
                    societe=self.company,
                    nom=nom_modele,
                    type_modele=type_modele,
                    domaine_application=domaine_application,
                    parametres_modele=parametres_modele or {},
                    statut='ENTRAINEMENT'
                )
                
                campagne.modele = modele_ml
                campagne.save()
                
                # Récupérer et préparer les données
                donnees = self._recuperer_donnees_entrainement(
                    domaine_application, periode_debut, periode_fin
                )
                
                if donnees.empty:
                    raise ValidationError("Aucune donnée disponible pour l'entraînement")
                
                # Feature engineering
                features_df, feature_names = self._preparer_features(
                    donnees, domaine_application, features_personnalisees
                )
                
                # Entraîner le modèle
                modele_entrainee, metriques = self._entrainer_modele_ml(
                    type_modele, features_df, parametres_modele or {}
                )
                
                # Sauvegarder le modèle et les métadonnées
                self._sauvegarder_modele(modele_ml, modele_entrainee, self.scaler, feature_names)
                
                # Mettre à jour les informations du modèle
                modele_ml.date_entrainement = timezone.now()
                modele_ml.features_utilisees = feature_names
                modele_ml.taille_dataset = len(donnees)
                modele_ml.score_performance = metriques.get('score_global', Decimal('0'))
                modele_ml.metriques_evaluation = metriques
                modele_ml.statut = 'PRET'
                modele_ml.prochaine_reentrainement = self._calculer_prochaine_reentrainement(modele_ml)
                modele_ml.save()
                
                # Finaliser la campagne
                campagne.statut = 'TERMINEE'
                campagne.date_fin = timezone.now()
                campagne.score_final = modele_ml.score_performance
                campagne.metriques_finales = metriques
                campagne.modele_valide = True
                campagne.deploye = True
                campagne.save()
                
                logger.info(f"Modèle {nom_modele} entraîné avec succès")
                return modele_ml
                
        except Exception as e:
            # Marquer la campagne comme échouée
            if 'campagne' in locals():
                campagne.statut = 'ECHEC'
                campagne.erreurs = str(e)
                campagne.save()
            
            logger.error(f"Erreur entraînement modèle: {str(e)}")
            raise ValidationError(f"Impossible d'entraîner le modèle: {str(e)}")
    
    def detecter_anomalies(
        self,
        modele_id: int,
        periode_debut: Optional[date] = None,
        periode_fin: Optional[date] = None,
        donnees_personnalisees: Optional[pd.DataFrame] = None,
        seuil_personnalise: Optional[float] = None
    ) -> List[DetectionAnomalie]:
        """
        Détecte des anomalies en utilisant un modèle entraîné.
        """
        if not SKLEARN_AVAILABLE:
            raise ValidationError("Les bibliothèques ML ne sont pas disponibles")
        
        try:
            modele_ml = ModeleML.objects.get(id=modele_id, societe=self.company)
            
            if modele_ml.statut != 'PRET':
                raise ValidationError(f"Le modèle n'est pas prêt (statut: {modele_ml.statut})")
            
            # Charger le modèle entraîné
            modele_sklearn, scaler, feature_names = self._charger_modele(modele_ml)
            
            # Préparer les données
            if donnees_personnalisees is not None:
                donnees = donnees_personnalisees
            else:
                if not periode_debut:
                    periode_debut = timezone.now().date() - timedelta(days=30)
                if not periode_fin:
                    periode_fin = timezone.now().date()
                
                donnees = self._recuperer_donnees_prediction(
                    modele_ml.domaine_application, periode_debut, periode_fin
                )
            
            if donnees.empty:
                logger.warning(f"Aucune donnée pour la détection avec le modèle {modele_ml.nom}")
                return []
            
            # Feature engineering
            features_df, _ = self._preparer_features(
                donnees, modele_ml.domaine_application, feature_names
            )
            
            # Standardisation
            features_scaled = scaler.transform(features_df)
            
            # Prédiction
            scores_anomalie = self._predire_anomalies(modele_sklearn, features_scaled)
            
            # Seuil de détection
            seuil = seuil_personnalise or float(modele_ml.seuil_anomalie)
            
            # Identifier les anomalies
            anomalies_detectees = []
            for idx, score in enumerate(scores_anomalie):
                if score <= seuil:  # Score plus faible = plus anormal pour la plupart des modèles
                    detection = self._creer_detection_anomalie(
                        modele_ml, donnees.iloc[idx], score, features_df.iloc[idx]
                    )
                    anomalies_detectees.append(detection)
            
            # Mettre à jour les statistiques
            modele_ml.derniere_utilisation = timezone.now()
            modele_ml.nombre_predictions += len(donnees)
            modele_ml.save()
            
            logger.info(f"Détection terminée: {len(anomalies_detectees)} anomalies trouvées sur {len(donnees)} observations")
            return anomalies_detectees
            
        except Exception as e:
            logger.error(f"Erreur détection anomalies: {str(e)}")
            raise ValidationError(f"Impossible de détecter les anomalies: {str(e)}")
    
    def reentrainer_modele(self, modele_id: int, force: bool = False) -> ModeleML:
        """
        Réentraîne un modèle existant avec de nouvelles données.
        """
        try:
            modele_ml = ModeleML.objects.get(id=modele_id, societe=self.company)
            
            if not force and not modele_ml.besoin_reentrainement:
                raise ValidationError("Le modèle n'a pas besoin d'être réentraîné")
            
            # Définir la période de nouvelles données
            derniere_entrainement = modele_ml.date_entrainement.date()
            periode_fin = timezone.now().date()
            
            # Entraîner avec les nouvelles données
            return self.entrainer_modele(
                nom_modele=f"{modele_ml.nom} - Réentraîné",
                type_modele=modele_ml.type_modele,
                domaine_application=modele_ml.domaine_application,
                periode_debut=derniere_entrainement,
                periode_fin=periode_fin,
                parametres_modele=modele_ml.parametres_modele,
                features_personnalisees=modele_ml.features_utilisees
            )
            
        except Exception as e:
            logger.error(f"Erreur réentraînement: {str(e)}")
            raise ValidationError(f"Impossible de réentraîner le modèle: {str(e)}")
    
    def analyser_feedback(self, detection_id: int) -> Dict[str, Any]:
        """
        Analyse les feedbacks pour améliorer le modèle.
        """
        try:
            detection = DetectionAnomalie.objects.get(
                id=detection_id, societe=self.company
            )
            
            feedbacks = detection.feedbacks.all()
            if not feedbacks.exists():
                return {'message': 'Aucun feedback disponible'}
            
            # Analyser les feedbacks
            analyse = {
                'total_feedbacks': feedbacks.count(),
                'types_feedback': {},
                'pertinence_moyenne': 0,
                'utilite_moyenne': 0,
                'suggestions': []
            }
            
            for feedback in feedbacks:
                # Compter les types
                type_fb = feedback.type_feedback
                analyse['types_feedback'][type_fb] = analyse['types_feedback'].get(type_fb, 0) + 1
                
                # Moyennes
                analyse['pertinence_moyenne'] += feedback.pertinence_detection
                analyse['utilite_moyenne'] += feedback.utilite_alerte
                
                # Suggestions
                if feedback.suggestions_amelioration:
                    analyse['suggestions'].append(feedback.suggestions_amelioration)
            
            # Finaliser les calculs
            nb_feedbacks = feedbacks.count()
            analyse['pertinence_moyenne'] /= nb_feedbacks
            analyse['utilite_moyenne'] /= nb_feedbacks
            
            # Déterminer si c'est un vrai/faux positif majoritaire
            faux_positifs = analyse['types_feedback'].get('FAUX_POSITIF', 0)
            vrais_positifs = analyse['types_feedback'].get('VRAI_POSITIF', 0)
            
            if faux_positifs > vrais_positifs:
                # Ajuster le seuil du modèle
                self._ajuster_seuil_modele(detection.modele, 'REDUIRE_SENSIBILITE')
                analyse['action_prise'] = 'Seuil ajusté pour réduire les faux positifs'
            
            return analyse
            
        except Exception as e:
            logger.error(f"Erreur analyse feedback: {str(e)}")
            raise ValidationError(f"Impossible d'analyser le feedback: {str(e)}")
    
    def generer_rapport_performance(
        self, 
        modele_id: Optional[int] = None,
        periode_jours: int = 30
    ) -> Dict[str, Any]:
        """
        Génère un rapport de performance des modèles ML.
        """
        try:
            date_debut = timezone.now().date() - timedelta(days=periode_jours)
            
            if modele_id:
                modeles = [ModeleML.objects.get(id=modele_id, societe=self.company)]
            else:
                modeles = ModeleML.objects.filter(societe=self.company, actif=True)
            
            rapport = {
                'periode': {'debut': date_debut, 'jours': periode_jours},
                'modeles_analyse': len(modeles),
                'performance_globale': {},
                'details_modeles': [],
                'recommandations': []
            }
            
            total_detections = 0
            total_faux_positifs = 0
            
            for modele in modeles:
                # Statistiques du modèle
                detections = DetectionAnomalie.objects.filter(
                    modele=modele,
                    date_creation__gte=date_debut
                )
                
                nb_detections = detections.count()
                nb_faux_positifs = detections.filter(statut='FAUX_POSITIF').count()
                nb_vrais_positifs = detections.filter(statut='VALIDEE').count()
                
                precision = 0
                if nb_detections > 0:
                    precision = (nb_vrais_positifs / nb_detections) * 100
                
                detail_modele = {
                    'nom': modele.nom,
                    'type': modele.get_type_modele_display(),
                    'domaine': modele.get_domaine_application_display(),
                    'age_jours': modele.age_jours,
                    'nb_detections': nb_detections,
                    'nb_faux_positifs': nb_faux_positifs,
                    'nb_vrais_positifs': nb_vrais_positifs,
                    'precision': precision,
                    'score_performance': float(modele.score_performance or 0),
                    'besoin_reentrainement': modele.besoin_reentrainement
                }
                
                rapport['details_modeles'].append(detail_modele)
                
                total_detections += nb_detections
                total_faux_positifs += nb_faux_positifs
            
            # Performance globale
            if total_detections > 0:
                rapport['performance_globale'] = {
                    'total_detections': total_detections,
                    'taux_faux_positifs': (total_faux_positifs / total_detections) * 100,
                    'precision_moyenne': sum(d['precision'] for d in rapport['details_modeles']) / len(modeles)
                }
            
            # Recommandations
            rapport['recommandations'] = self._generer_recommandations_performance(rapport)
            
            return rapport
            
        except Exception as e:
            logger.error(f"Erreur génération rapport: {str(e)}")
            raise ValidationError(f"Impossible de générer le rapport: {str(e)}")
    
    # Méthodes privées
    
    def _recuperer_donnees_entrainement(
        self, 
        domaine: str, 
        debut: date, 
        fin: date
    ) -> pd.DataFrame:
        """Récupère les données pour l'entraînement selon le domaine."""
        
        if domaine == 'ECRITURES_COMPTABLES':
            return self._recuperer_donnees_ecritures(debut, fin)
        elif domaine == 'FLUX_TRESORERIE':
            return self._recuperer_donnees_tresorerie(debut, fin)
        elif domaine == 'TRANSACTIONS_BANCAIRES':
            return self._recuperer_donnees_bancaires(debut, fin)
        else:
            # Domaine générique ou personnalisé
            return self._recuperer_donnees_generiques(domaine, debut, fin)
    
    def _recuperer_donnees_ecritures(self, debut: date, fin: date) -> pd.DataFrame:
        """Récupère les données d'écritures comptables."""
        
        query = """
        SELECT 
            e.id,
            e.date_ecriture,
            e.reference,
            j.code as journal_code,
            COUNT(le.id) as nb_lignes,
            SUM(le.montant) as montant_total,
            AVG(le.montant) as montant_moyen,
            MAX(le.montant) as montant_max,
            MIN(le.montant) as montant_min,
            STDDEV(le.montant) as montant_std,
            COUNT(DISTINCT le.compte_id) as nb_comptes_distincts,
            EXTRACT(HOUR FROM e.date_creation) as heure_creation,
            EXTRACT(DOW FROM e.date_ecriture) as jour_semaine,
            LENGTH(e.libelle) as longueur_libelle
        FROM apps_accounting_ecriture e
        JOIN apps_accounting_journal j ON e.journal_id = j.id
        JOIN apps_accounting_ligneecriture le ON e.id = le.ecriture_id
        WHERE e.societe_id = %s 
        AND e.date_ecriture BETWEEN %s AND %s
        AND e.statut = 'VALIDEE'
        GROUP BY e.id, e.date_ecriture, e.reference, j.code, e.date_creation, e.libelle
        ORDER BY e.date_ecriture
        """
        
        with connection.cursor() as cursor:
            cursor.execute(query, [self.company.id, debut, fin])
            colonnes = [col[0] for col in cursor.description]
            donnees = cursor.fetchall()
        
        return pd.DataFrame(donnees, columns=colonnes)
    
    def _recuperer_donnees_tresorerie(self, debut: date, fin: date) -> pd.DataFrame:
        """Récupère les données de trésorerie."""
        # Implémentation simplifiée
        return pd.DataFrame()  # À compléter selon les besoins
    
    def _recuperer_donnees_bancaires(self, debut: date, fin: date) -> pd.DataFrame:
        """Récupère les données de transactions bancaires."""
        # Implémentation simplifiée
        return pd.DataFrame()  # À compléter selon les besoins
    
    def _recuperer_donnees_generiques(self, domaine: str, debut: date, fin: date) -> pd.DataFrame:
        """Récupère des données génériques pour d'autres domaines."""
        return pd.DataFrame()  # À compléter selon les besoins
    
    def _preparer_features(
        self, 
        donnees: pd.DataFrame, 
        domaine: str,
        features_personnalisees: Optional[List[str]] = None
    ) -> Tuple[pd.DataFrame, List[str]]:
        """Prépare les features pour l'entraînement/prédiction."""
        
        if donnees.empty:
            return pd.DataFrame(), []
        
        # Features de base communes
        features_df = pd.DataFrame()
        feature_names = []
        
        if domaine == 'ECRITURES_COMPTABLES':
            # Features spécifiques aux écritures
            if 'montant_total' in donnees.columns:
                features_df['montant_total_log'] = np.log1p(donnees['montant_total'].abs())
                feature_names.append('montant_total_log')
            
            if 'nb_lignes' in donnees.columns:
                features_df['nb_lignes'] = donnees['nb_lignes']
                feature_names.append('nb_lignes')
            
            if 'montant_std' in donnees.columns:
                features_df['montant_std'] = donnees['montant_std'].fillna(0)
                feature_names.append('montant_std')
            
            if 'heure_creation' in donnees.columns:
                features_df['heure_creation'] = donnees['heure_creation']
                feature_names.append('heure_creation')
            
            if 'jour_semaine' in donnees.columns:
                features_df['jour_semaine'] = donnees['jour_semaine']
                feature_names.append('jour_semaine')
            
            # Ratios et indicateurs dérivés
            if 'montant_max' in donnees.columns and 'montant_moyen' in donnees.columns:
                features_df['ratio_max_moyen'] = donnees['montant_max'] / (donnees['montant_moyen'] + 1e-6)
                feature_names.append('ratio_max_moyen')
        
        # Features personnalisées si spécifiées
        if features_personnalisees:
            for feature in features_personnalisees:
                if feature in donnees.columns:
                    features_df[feature] = donnees[feature]
                    if feature not in feature_names:
                        feature_names.append(feature)
        
        # Nettoyage des données
        features_df = features_df.fillna(0)
        features_df = features_df.replace([np.inf, -np.inf], 0)
        
        # Standardisation pour l'entraînement
        if not features_df.empty:
            features_scaled = self.scaler.fit_transform(features_df)
            features_df = pd.DataFrame(features_scaled, columns=feature_names, index=features_df.index)
        
        return features_df, feature_names
    
    def _entrainer_modele_ml(
        self, 
        type_modele: str, 
        features_df: pd.DataFrame,
        parametres: Dict[str, Any]
    ) -> Tuple[Any, Dict[str, Any]]:
        """Entraîne le modèle ML spécifique."""
        
        if type_modele == 'ISOLATION_FOREST':
            modele = IsolationForest(
                contamination=parametres.get('contamination', 0.1),
                n_estimators=parametres.get('n_estimators', 100),
                random_state=42
            )
        elif type_modele == 'ONE_CLASS_SVM':
            modele = OneClassSVM(
                kernel=parametres.get('kernel', 'rbf'),
                gamma=parametres.get('gamma', 'scale'),
                nu=parametres.get('nu', 0.05)
            )
        elif type_modele == 'LOF':
            modele = LocalOutlierFactor(
                n_neighbors=parametres.get('n_neighbors', 20),
                contamination=parametres.get('contamination', 0.1),
                novelty=True
            )
        elif type_modele == 'KMEANS':
            modele = KMeans(
                n_clusters=parametres.get('n_clusters', 8),
                random_state=42
            )
        else:
            raise ValidationError(f"Type de modèle non supporté: {type_modele}")
        
        # Entraînement
        if type_modele == 'KMEANS':
            # Pour K-means, on calcule les distances aux centres
            modele.fit(features_df)
            # Calculer les distances aux centres comme scores d'anomalie
            distances = modele.transform(features_df)
            scores = np.min(distances, axis=1)
        else:
            modele.fit(features_df)
            if hasattr(modele, 'decision_function'):
                scores = modele.decision_function(features_df)
            else:
                scores = modele.score_samples(features_df)
        
        # Calcul des métriques
        metriques = self._calculer_metriques_entrainement(scores, features_df)
        
        return modele, metriques
    
    def _calculer_metriques_entrainement(
        self, 
        scores: np.ndarray, 
        features_df: pd.DataFrame
    ) -> Dict[str, Any]:
        """Calcule les métriques d'évaluation du modèle."""
        
        # Métriques basiques
        metriques = {
            'score_global': float(np.mean(scores)),
            'score_std': float(np.std(scores)),
            'score_min': float(np.min(scores)),
            'score_max': float(np.max(scores)),
            'nb_observations': len(scores),
            'nb_features': features_df.shape[1]
        }
        
        # Percentiles pour définir les seuils
        percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99]
        for p in percentiles:
            metriques[f'percentile_{p}'] = float(np.percentile(scores, p))
        
        return metriques
    
    def _sauvegarder_modele(
        self, 
        modele_ml: ModeleML, 
        modele_sklearn: Any, 
        scaler: Any,
        feature_names: List[str]
    ):
        """Sauvegarde le modèle entraîné."""
        try:
            # Créer le hash du modèle
            model_data = {
                'model': modele_sklearn,
                'scaler': scaler,
                'features': feature_names
            }
            
            # Sérialisation pour le hash
            model_bytes = pickle.dumps(model_data)
            hash_modele = hashlib.md5(model_bytes).hexdigest()
            
            modele_ml.hash_modele = hash_modele
            modele_ml.taille_modele_mb = len(model_bytes) / (1024 * 1024)
            
            # En production, sauvegarder sur disque ou S3
            # Pour la demo, on stocke dans les métadonnées
            modele_ml.parametres_modele['model_serialized'] = True
            
        except Exception as e:
            logger.warning(f"Erreur sauvegarde modèle: {str(e)}")
    
    def _charger_modele(self, modele_ml: ModeleML) -> Tuple[Any, Any, List[str]]:
        """Charge un modèle sauvegardé."""
        # En production, charger depuis le disque ou S3
        # Pour la demo, on recrée un modèle simple
        
        if modele_ml.type_modele == 'ISOLATION_FOREST':
            modele = IsolationForest(random_state=42)
        else:
            modele = IsolationForest(random_state=42)  # Fallback
        
        scaler = StandardScaler()
        feature_names = modele_ml.features_utilisees
        
        return modele, scaler, feature_names
    
    def _predire_anomalies(self, modele: Any, features: np.ndarray) -> np.ndarray:
        """Effectue les prédictions d'anomalies."""
        if hasattr(modele, 'decision_function'):
            return modele.decision_function(features)
        elif hasattr(modele, 'score_samples'):
            return modele.score_samples(features)
        else:
            # Pour les modèles de clustering
            predictions = modele.predict(features)
            return -predictions  # Convertir en scores négatifs
    
    def _creer_detection_anomalie(
        self,
        modele_ml: ModeleML,
        donnee: pd.Series,
        score: float,
        features: pd.Series
    ) -> DetectionAnomalie:
        """Crée une détection d'anomalie."""
        
        # Déterminer le niveau de sévérité
        if score <= float(modele_ml.seuil_alerte_critique):
            severite = 'CRITIQUE'
        elif score <= float(modele_ml.seuil_anomalie):
            severite = 'ELEVE'
        else:
            severite = 'MOYEN'
        
        # Créer la description
        description = f"Anomalie détectée avec un score de {score:.4f}. "
        
        if 'montant_total' in donnee:
            description += f"Montant total: {donnee['montant_total']}€. "
        
        if 'nb_lignes' in donnee:
            description += f"Nombre de lignes: {donnee['nb_lignes']}. "
        
        # Identifier les features les plus contributives
        features_impactees = []
        if hasattr(features, 'abs'):
            top_features = features.abs().nlargest(3)
            features_impactees = top_features.index.tolist()
        
        detection = DetectionAnomalie.objects.create(
            societe=self.company,
            modele=modele_ml,
            type_anomalie='VALEUR_ABERRANTE',
            titre=f"Anomalie {modele_ml.get_domaine_application_display()}",
            description=description,
            score_anomalie=Decimal(str(abs(score))),
            niveau_severite=severite,
            niveau_confiance=Decimal('0.8'),  # À calculer selon le modèle
            objet_type='Ecriture' if 'id' in donnee else 'Generic',
            objet_id=int(donnee.get('id', 0)),
            donnees_contextuelles=donnee.to_dict(),
            features_impactees=features_impactees,
            date_anomalie=timezone.now(),
            actions_recommandees=self._generer_actions_recommandees(modele_ml.domaine_application, severite)
        )
        
        return detection
    
    def _generer_actions_recommandees(self, domaine: str, severite: str) -> List[str]:
        """Génère des actions recommandées selon le domaine et la sévérité."""
        actions = {
            'ECRITURES_COMPTABLES': [
                'Vérifier l\'exactitude des montants saisis',
                'Contrôler les comptes utilisés',
                'Valider la date d\'écriture',
                'Vérifier la pièce justificative'
            ],
            'FLUX_TRESORERIE': [
                'Vérifier les mouvements bancaires',
                'Contrôler les prévisions de trésorerie',
                'Analyser les écarts de flux'
            ]
        }
        
        actions_base = actions.get(domaine, ['Analyser en détail', 'Vérifier les données'])
        
        if severite == 'CRITIQUE':
            actions_base.insert(0, '🚨 URGENT: Vérification immédiate requise')
        
        return actions_base
    
    def _calculer_prochaine_reentrainement(self, modele_ml: ModeleML) -> datetime:
        """Calcule la date du prochain réentraînement."""
        if modele_ml.reentrainement_auto:
            return timezone.now() + timedelta(days=modele_ml.frequence_reentrainement)
        return None
    
    def _ajuster_seuil_modele(self, modele_ml: ModeleML, action: str):
        """Ajuste automatiquement le seuil d'un modèle."""
        try:
            if action == 'REDUIRE_SENSIBILITE':
                # Réduire le seuil pour diminuer les faux positifs
                nouveau_seuil = modele_ml.seuil_anomalie * Decimal('0.8')
                modele_ml.seuil_anomalie = max(nouveau_seuil, Decimal('0.001'))
            elif action == 'AUGMENTER_SENSIBILITE':
                # Augmenter le seuil pour détecter plus d'anomalies
                nouveau_seuil = modele_ml.seuil_anomalie * Decimal('1.2')
                modele_ml.seuil_anomalie = min(nouveau_seuil, Decimal('0.5'))
            
            modele_ml.save()
            logger.info(f"Seuil du modèle {modele_ml.nom} ajusté à {modele_ml.seuil_anomalie}")
            
        except Exception as e:
            logger.error(f"Erreur ajustement seuil: {str(e)}")
    
    def _generer_recommandations_performance(self, rapport: Dict[str, Any]) -> List[str]:
        """Génère des recommandations basées sur la performance."""
        recommandations = []
        
        if 'performance_globale' in rapport:
            taux_faux_positifs = rapport['performance_globale'].get('taux_faux_positifs', 0)
            
            if taux_faux_positifs > 20:
                recommandations.append("Taux de faux positifs élevé: ajuster les seuils des modèles")
            
            if taux_faux_positifs < 5:
                recommandations.append("Excellent taux de faux positifs: envisager d'augmenter la sensibilité")
        
        # Recommandations par modèle
        for detail in rapport.get('details_modeles', []):
            if detail['besoin_reentrainement']:
                recommandations.append(f"Réentraîner le modèle '{detail['nom']}'")
            
            if detail['precision'] < 50:
                recommandations.append(f"Analyser les performances du modèle '{detail['nom']}'")
        
        return recommandations
    
    def _recuperer_donnees_prediction(
        self, 
        domaine: str, 
        debut: date, 
        fin: date
    ) -> pd.DataFrame:
        """Récupère les données pour la prédiction (identique à l'entraînement)."""
        return self._recuperer_donnees_entrainement(domaine, debut, fin)