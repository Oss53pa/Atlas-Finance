"""
Services métier pour Module CRM Clients WiseBook
Intelligence Artificielle et automatisation
"""
import pandas as pd
import numpy as np
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from decimal import Decimal
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
import requests

from .models import (
    Client, Contact, ClientAddress, ClientFinancialInfo,
    ClientHistorique, ClientScoring
)


class ClientService:
    """
    Service principal pour gestion clients
    Logique métier et traitements automatisés
    """

    def __init__(self, client: Client):
        self.client = client

    @staticmethod
    def initialiser_client_complet(client: Client, user) -> None:
        """
        Initialisation automatique d'un client complet
        Conforme section 4.1.1 - Création complète
        """
        # Création des informations financières
        ClientFinancialInfo.objects.get_or_create(
            client=client,
            defaults={
                'delai_paiement': 30,
                'type_echeance': 'DATE_FACTURE',
                'plafond_encours': Decimal('50000.00'),
                'modes_reglement': {
                    'VIREMENT': {'priorite': 1, 'actif': True},
                    'CHEQUE': {'priorite': 2, 'actif': True}
                }
            }
        )

        # Initialisation scoring
        ClientScoring.objects.get_or_create(
            client=client,
            defaults={
                'score_global': 50,
                'score_paiement': 50,
                'score_rentabilite': 50,
                'version_algorithme': '2.0'
            }
        )

    def valider_siret_api_externe(self) -> Dict[str, Any]:
        """
        Validation SIRET via API gouvernementale
        """
        if not self.client.numero_siret:
            return {'valide': False, 'erreur': 'SIRET manquant'}

        try:
            # API Sirene INSEE
            url = f"https://api.insee.fr/entreprises/sirene/V3/siret/{self.client.numero_siret}"
            headers = {'Authorization': 'Bearer TOKEN_INSEE'}  # Token à configurer

            response = requests.get(url, headers=headers, timeout=5)

            if response.status_code == 200:
                data = response.json()
                etablissement = data['etablissement']

                # Mise à jour automatique
                self.client.raison_sociale = etablissement['uniteLegale']['denominationUniteLegale']
                self.client.code_naf = etablissement['activitePrincipaleEtablissement']
                self.client.save()

                return {
                    'valide': True,
                    'donnees': data,
                    'mise_a_jour': True
                }
            else:
                return {'valide': False, 'erreur': 'SIRET non trouvé'}

        except Exception as e:
            return {'valide': False, 'erreur': str(e)}

    def geocoder_adresse(self, adresse: ClientAddress) -> Optional[Dict[str, float]]:
        """
        Géocodage d'adresse avec API
        """
        adresse_complete = f"{adresse.ligne_1}, {adresse.code_postal} {adresse.ville}, {adresse.pays}"

        try:
            # API Géocodage (exemple avec OpenStreetMap Nominatim)
            url = "https://nominatim.openstreetmap.org/search"
            params = {
                'q': adresse_complete,
                'format': 'json',
                'limit': 1
            }

            response = requests.get(url, params=params, timeout=5)
            if response.status_code == 200:
                results = response.json()
                if results:
                    result = results[0]
                    return {
                        'lat': float(result['lat']),
                        'lng': float(result['lon'])
                    }

        except Exception as e:
            print(f"Erreur géocodage: {e}")

        return None

    def generer_timeline_complete(self) -> List[Dict[str, Any]]:
        """
        Génération de timeline enrichie avec événements système
        """
        timeline = []

        # Événements explicites
        for event in self.client.historique.all()[:50]:
            timeline.append({
                'type': 'explicit',
                'categorie': event.type_evenement,
                'titre': event.titre,
                'description': event.description,
                'date': event.date_evenement,
                'utilisateur': event.utilisateur.get_full_name() if event.utilisateur else None,
                'importance': event.niveau_importance,
                'donnees': event.donnees_json
            })

        # Événements calculés/inférés
        # Dernière facture, dernier paiement, etc.

        # Tri par date décroissante
        timeline.sort(key=lambda x: x['date'], reverse=True)

        return timeline

    def calculer_score_engagement_contact(self, contact: Contact) -> int:
        """
        Calcul du score d'engagement d'un contact
        """
        score = 50  # Base

        # Facteurs positifs
        if contact.email_principal and '@' in contact.email_principal:
            score += 10

        if contact.linkedin_url:
            score += 5

        if contact.consentement_rgpd:
            score += 10

        # Interactions récentes (si module interactions existe)
        interactions_30j = self.client.historique.filter(
            type_evenement='CONTACT',
            date_evenement__gte=timezone.now() - timedelta(days=30)
        ).count()

        score += min(interactions_30j * 5, 25)  # Max +25

        # Facteurs négatifs
        if contact.ne_pas_contacter_jusqu and contact.ne_pas_contacter_jusqu > timezone.now():
            score -= 20

        return max(0, min(100, score))


class ClientAnalyticsService:
    """
    Service d'analyses avancées et IA
    Conforme section 4.5 - Business Intelligence
    """

    def __init__(self, client: Optional[Client] = None, company=None):
        self.client = client
        self.company = company

    @classmethod
    def for_company(cls, company):
        return cls(company=company)

    def calculer_scoring_complet(self) -> Dict[str, int]:
        """
        Calcul complet du scoring avec algorithmes ML
        """
        if not self.client:
            raise ValueError("Client requis pour calcul scoring")

        # Collecte des données
        features = self._extraire_features_client()

        # Calculs de scores
        scores = {
            'score_global': self._calculer_score_global(features),
            'score_paiement': self._calculer_score_paiement(features),
            'score_rentabilite': self._calculer_score_rentabilite(features),
            'score_potentiel': self._calculer_score_potentiel(features),
            'score_risque': self._calculer_score_risque(features)
        }

        # Prédictions IA
        scores.update({
            'probabilite_churn': self._predire_churn_client(features),
            'customer_lifetime_value': self._calculer_clv(features)
        })

        return scores

    def _extraire_features_client(self) -> Dict[str, Any]:
        """Extraction des features pour ML"""
        if not self.client:
            return {}

        # Features de base
        features = {
            'anciennete_jours': (timezone.now().date() - self.client.created_at.date()).days if self.client.created_at else 0,
            'nombre_contacts': self.client.contacts.filter(is_active=True).count(),
            'nombre_adresses': self.client.addresses.filter(is_active=True).count(),
            'a_siret': bool(self.client.numero_siret),
            'forme_juridique_score': self._score_forme_juridique(),
            'effectif_score': self._score_effectif(),
            'ca_score': self._score_ca_annuel(),
        }

        # Features financières
        if hasattr(self.client, 'financial_info'):
            fi = self.client.financial_info
            features.update({
                'delai_paiement': fi.delai_paiement,
                'plafond_encours': float(fi.plafond_encours),
                'encours_actuel': float(fi.encours_actuel),
                'taux_utilisation_encours': float(fi.encours_actuel / fi.plafond_encours) if fi.plafond_encours > 0 else 0,
                'nombre_incidents_6m': fi.nombre_incidents_6m,
                'nombre_incidents_12m': fi.nombre_incidents_12m,
            })

        # Features d'activité
        features.update({
            'nombre_evenements_30j': self.client.historique.filter(
                date_evenement__gte=timezone.now() - timedelta(days=30)
            ).count(),
            'derniere_activite_jours': self._jours_depuis_derniere_activite(),
        })

        return features

    def _score_forme_juridique(self) -> int:
        """Score basé sur la forme juridique"""
        scores_formes = {
            'SA': 90, 'SAS': 85, 'SARL': 80,
            'EURL': 70, 'SASU': 75,
            'EI': 60, 'MICRO': 50,
            'ASSOCIATION': 40
        }
        return scores_formes.get(self.client.forme_juridique, 50)

    def _score_effectif(self) -> int:
        """Score basé sur l'effectif"""
        scores_effectif = {
            '0': 30, '1-2': 40, '3-5': 50, '6-9': 60,
            '10-19': 70, '20-49': 80, '50-99': 85,
            '100-199': 90, '200-499': 95, '500+': 100
        }
        return scores_effectif.get(self.client.effectif, 50)

    def _score_ca_annuel(self) -> int:
        """Score basé sur le CA"""
        scores_ca = {
            '<100K': 30, '100K-500K': 50, '500K-2M': 70,
            '2M-10M': 80, '10M-50M': 90, '50M+': 100
        }
        return scores_ca.get(self.client.ca_annuel, 50)

    def _jours_depuis_derniere_activite(self) -> int:
        """Jours depuis la dernière activité"""
        derniere_activite = self.client.historique.first()
        if derniere_activite:
            return (timezone.now().date() - derniere_activite.date_evenement.date()).days
        return 365  # Valeur par défaut si pas d'activité

    def _calculer_score_global(self, features: Dict[str, Any]) -> int:
        """Calcul du score global"""
        # Algorithme de calcul pondéré
        score = 50  # Base

        # Pondération des différents facteurs
        score += (features.get('forme_juridique_score', 50) - 50) * 0.2
        score += (features.get('effectif_score', 50) - 50) * 0.15
        score += (features.get('ca_score', 50) - 50) * 0.25

        # Facteurs d'activité
        if features.get('nombre_evenements_30j', 0) > 0:
            score += 10
        if features.get('derniere_activite_jours', 365) < 30:
            score += 10

        # Facteurs négatifs
        if features.get('nombre_incidents_12m', 0) > 0:
            score -= features['nombre_incidents_12m'] * 10

        return max(0, min(100, int(score)))

    def _calculer_score_paiement(self, features: Dict[str, Any]) -> int:
        """Score spécifique aux paiements"""
        score = 80  # Base optimiste

        # Incidents de paiement
        incidents_6m = features.get('nombre_incidents_6m', 0)
        incidents_12m = features.get('nombre_incidents_12m', 0)

        score -= incidents_6m * 15  # Pénalité forte récente
        score -= max(0, incidents_12m - incidents_6m) * 8  # Pénalité modérée ancienne

        # Délai de paiement
        delai = features.get('delai_paiement', 30)
        if delai <= 15:
            score += 10
        elif delai >= 60:
            score -= 15

        # Utilisation encours
        taux_encours = features.get('taux_utilisation_encours', 0)
        if taux_encours > 0.8:
            score -= 20
        elif taux_encours < 0.3:
            score += 5

        return max(0, min(100, score))

    def _calculer_score_rentabilite(self, features: Dict[str, Any]) -> int:
        """Score de rentabilité client"""
        # Placeholder - nécessiterait des données de facturation
        score = 50

        # CA estimé
        ca_score = features.get('ca_score', 50)
        score += (ca_score - 50) * 0.5

        # Ancienneté positive
        anciennete = features.get('anciennete_jours', 0)
        if anciennete > 365:
            score += min(20, anciennete // 365 * 5)

        return max(0, min(100, int(score)))

    def _calculer_score_potentiel(self, features: Dict[str, Any]) -> int:
        """Score de potentiel de développement"""
        score = 50

        # Taille entreprise
        effectif_score = features.get('effectif_score', 50)
        score += (effectif_score - 50) * 0.3

        # Activité récente
        if features.get('nombre_evenements_30j', 0) > 5:
            score += 15

        # Contact qualifié
        if features.get('nombre_contacts', 0) > 2:
            score += 10

        return max(0, min(100, int(score)))

    def _calculer_score_risque(self, features: Dict[str, Any]) -> int:
        """Score de risque (inverse du score paiement)"""
        score_paiement = self._calculer_score_paiement(features)
        return 100 - score_paiement

    def _predire_churn_client(self, features: Dict[str, Any]) -> Decimal:
        """Prédiction probabilité de churn"""
        # Algorithme simple basé sur l'activité et les incidents
        prob_churn = Decimal('0.20')  # Base 20%

        # Facteurs d'augmentation
        if features.get('derniere_activite_jours', 0) > 90:
            prob_churn += Decimal('0.30')

        if features.get('nombre_incidents_6m', 0) > 2:
            prob_churn += Decimal('0.25')

        # Facteurs de réduction
        if features.get('nombre_evenements_30j', 0) > 3:
            prob_churn -= Decimal('0.15')

        return max(Decimal('0.01'), min(Decimal('0.99'), prob_churn))

    def _calculer_clv(self, features: Dict[str, Any]) -> Decimal:
        """Customer Lifetime Value estimé"""
        # Calcul simplifié - nécessiterait des données de CA réel
        ca_score = features.get('ca_score', 50)
        anciennete = features.get('anciennete_jours', 365) / 365

        # CLV = CA estimé * coefficient fidélité * durée estimée
        ca_estime_annuel = {
            30: 50000, 50: 250000, 70: 1000000,
            80: 5000000, 90: 25000000, 100: 50000000
        }.get(ca_score, 250000)

        coefficient_fidelite = 1 + (anciennete * 0.1)  # +10% par année
        duree_estimee_annees = 3 + anciennete  # Base 3 ans + historique

        clv = ca_estime_annuel * coefficient_fidelite * duree_estimee_annees * 0.1  # 10% de marge

        return Decimal(str(int(clv)))

    def generer_segmentation_ia(self) -> Dict[str, Any]:
        """
        Segmentation automatique avec clustering K-means
        """
        if not self.company:
            raise ValueError("Company requis pour segmentation")

        # Récupération des clients
        clients = Client.objects.filter(company=self.company, is_active=True)

        if clients.count() < 10:  # Minimum pour clustering
            return {'erreur': 'Pas assez de clients pour segmentation'}

        # Préparation des données
        data = []
        client_ids = []

        for client in clients:
            service = ClientAnalyticsService(client)
            features = service._extraire_features_client()

            # Features numériques pour clustering
            row = [
                features.get('anciennete_jours', 0),
                features.get('ca_score', 50),
                features.get('effectif_score', 50),
                features.get('nombre_evenements_30j', 0),
                features.get('nombre_incidents_12m', 0),
                features.get('delai_paiement', 30),
            ]

            data.append(row)
            client_ids.append(str(client.id))

        # Clustering K-means
        df = pd.DataFrame(data, columns=[
            'anciennete', 'ca_score', 'effectif_score',
            'activite', 'incidents', 'delai_paiement'
        ])

        # Normalisation
        scaler = StandardScaler()
        data_scaled = scaler.fit_transform(df)

        # K-means avec 5 segments
        kmeans = KMeans(n_clusters=5, random_state=42)
        clusters = kmeans.fit_predict(data_scaled)

        # Analyse des segments
        segments = {}
        for i in range(5):
            mask = clusters == i
            segment_data = df[mask]

            segments[f'segment_{i}'] = {
                'nom': self._nommer_segment(segment_data),
                'taille': int(mask.sum()),
                'clients': [client_ids[j] for j, belongs in enumerate(mask) if belongs],
                'caracteristiques': {
                    'ca_moyen': float(segment_data['ca_score'].mean()),
                    'anciennete_moyenne': float(segment_data['anciennete'].mean()),
                    'activite_moyenne': float(segment_data['activite'].mean()),
                }
            }

        return {
            'segments': segments,
            'algorithme': 'K-means',
            'total_clients': len(client_ids)
        }

    def _nommer_segment(self, segment_data: pd.DataFrame) -> str:
        """Attribution automatique de nom de segment"""
        ca_moyen = segment_data['ca_score'].mean()
        activite_moyenne = segment_data['activite'].mean()
        incidents_moyen = segment_data['incidents'].mean()

        if ca_moyen > 80 and incidents_moyen < 1:
            return "Grands Comptes Premium"
        elif ca_moyen > 60 and activite_moyenne > 3:
            return "Clients Actifs Croissance"
        elif activite_moyenne < 1 and incidents_moyen > 2:
            return "Clients à Risque"
        elif ca_moyen < 40:
            return "Petits Comptes"
        else:
            return "Clients Standards"


class ClientImportService:
    """
    Service d'import en masse
    Conforme section 4.1.2 - Import/Export Avancé
    """

    def __init__(self, company, user):
        self.company = company
        self.user = user

    def importer_fichier(self, fichier, format_fichier: str, mapping_colonnes: Dict = None,
                        ignorer_erreurs: bool = False, mise_a_jour_existants: bool = False) -> Dict[str, int]:
        """
        Import principal avec gestion des erreurs
        """
        stats = {
            'total_lignes': 0,
            'succes': 0,
            'erreurs': 0,
            'mises_a_jour': 0,
            'details_erreurs': []
        }

        try:
            # Lecture du fichier selon le format
            if format_fichier == 'CSV':
                df = pd.read_csv(fichier)
            elif format_fichier == 'EXCEL':
                df = pd.read_excel(fichier)
            elif format_fichier == 'JSON':
                df = pd.read_json(fichier)
            else:
                raise ValueError(f"Format non supporté: {format_fichier}")

            stats['total_lignes'] = len(df)

            # Mapping des colonnes si fourni
            if mapping_colonnes:
                df = df.rename(columns=mapping_colonnes)

            # Traitement ligne par ligne
            for index, row in df.iterrows():
                try:
                    result = self._traiter_ligne_import(row, mise_a_jour_existants)
                    if result['action'] == 'created':
                        stats['succes'] += 1
                    elif result['action'] == 'updated':
                        stats['mises_a_jour'] += 1

                except Exception as e:
                    stats['erreurs'] += 1
                    stats['details_erreurs'].append({
                        'ligne': index + 2,  # +2 pour header et index 0
                        'erreur': str(e),
                        'donnees': dict(row)
                    })

                    if not ignorer_erreurs:
                        break

        except Exception as e:
            stats['details_erreurs'].append({
                'erreur_globale': str(e)
            })

        return stats

    def _traiter_ligne_import(self, row: pd.Series, mise_a_jour: bool = False) -> Dict[str, str]:
        """Traitement d'une ligne d'import"""

        # Données obligatoires
        raison_sociale = row.get('raison_sociale') or row.get('Raison Sociale')
        if not raison_sociale:
            raise ValueError("Raison sociale obligatoire")

        # Recherche client existant
        client_existant = None
        if siret := row.get('numero_siret'):
            client_existant = Client.objects.filter(
                company=self.company,
                numero_siret=siret
            ).first()

        if client_existant and not mise_a_jour:
            raise ValueError(f"Client existe déjà: {client_existant.code_client}")

        if client_existant and mise_a_jour:
            # Mise à jour
            self._mettre_a_jour_client(client_existant, row)
            return {'action': 'updated', 'client_id': str(client_existant.id)}
        else:
            # Création
            client = self._creer_client_depuis_ligne(row)
            return {'action': 'created', 'client_id': str(client.id)}

    def _creer_client_depuis_ligne(self, row: pd.Series) -> Client:
        """Création d'un client depuis une ligne de données"""

        # Génération du code client
        last_client = Client.objects.filter(company=self.company).order_by('-code_client').first()
        if last_client and last_client.code_client.startswith('CLI'):
            try:
                last_number = int(last_client.code_client[3:])
                code_client = f'CLI{last_number + 1:06d}'
            except:
                code_client = 'CLI000001'
        else:
            code_client = 'CLI000001'

        # Création du client
        client = Client.objects.create(
            company=self.company,
            code_client=code_client,
            raison_sociale=row.get('raison_sociale'),
            nom_commercial=row.get('nom_commercial', ''),
            forme_juridique=row.get('forme_juridique', 'SARL'),
            numero_siret=row.get('numero_siret', ''),
            numero_tva=row.get('numero_tva', ''),
            code_naf=row.get('code_naf', ''),
            effectif=row.get('effectif', ''),
            ca_annuel=row.get('ca_annuel', ''),
            created_by=self.user
        )

        # Initialisation complète
        ClientService.initialiser_client_complet(client, self.user)

        return client

    def _mettre_a_jour_client(self, client: Client, row: pd.Series) -> None:
        """Mise à jour d'un client existant"""

        # Champs modifiables
        if nom_commercial := row.get('nom_commercial'):
            client.nom_commercial = nom_commercial

        if effectif := row.get('effectif'):
            if effectif in dict(Client.EFFECTIF_CHOICES):
                client.effectif = effectif

        if ca_annuel := row.get('ca_annuel'):
            if ca_annuel in dict(Client.CA_CHOICES):
                client.ca_annuel = ca_annuel

        client.save()

        # Log de mise à jour
        ClientHistorique.objects.create(
            client=client,
            type_evenement='MODIFICATION',
            titre='Mise à jour par import',
            description='Client mis à jour via import en masse',
            utilisateur=self.user
        )