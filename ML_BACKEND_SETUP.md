# Guide de Configuration du Backend d'Apprentissage Automatique WiseBook

Ce document explique comment configurer et utiliser le système d'apprentissage automatique de WiseBook.

## 📋 Table des Matières

1. [Architecture](#architecture)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Utilisation](#utilisation)
5. [API REST](#api-rest)
6. [Monitoring](#monitoring)

## 🏗️ Architecture

Le système d'apprentissage automatique de WiseBook comprend:

### Composants Principaux

1. **Modèles Django** (`apps/ml_detection/models.py`)
   - `ModeleML`: Gestion des modèles ML
   - `CampagneEntrainement`: Historique d'entraînement
   - `DetectionAnomalie`: Détections effectuées
   - `StatistiqueDetection`: Métriques agrégées

2. **Services ML** (`apps/ml_detection/services/`)
   - `BaseMLService`: Classe de base abstraite
   - `LSTMService`: Prédiction de séries temporelles
   - `RandomForestService`: Recommandations comptables
   - `XGBoostService`: Optimisation prédictive

3. **Tâches Celery** (`apps/ml_detection/tasks.py`)
   - `train_model_task`: Entraînement de modèles
   - `auto_retrain_models`: Réentraînement automatique
   - `detect_model_drift`: Détection de drift
   - `calculate_model_statistics`: Calcul des statistiques

4. **API REST** (`apps/ml_detection/api_views.py`)
   - Endpoints pour inférence
   - Monitoring des performances
   - Gestion des modèles

### Algorithmes Supportés

| Algorithme | Type | Usage |
|------------|------|-------|
| LSTM Neural Network | Deep Learning | Prédiction de trésorerie |
| Random Forest | Ensemble | Recommandations comptables |
| XGBoost | Gradient Boosting | Analyse de risques clients |
| Gradient Boosting | Ensemble | Scoring prédictif |
| DBSCAN | Clustering | Segmentation comportementale |
| Prophet | Time Series | Prévisions saisonnières |
| Isolation Forest | Anomaly Detection | Détection d'anomalies |
| SVM | Classification | Classification avancée |

## 🚀 Installation

### 1. Dépendances Python

Ajoutez les dépendances suivantes à `requirements.txt`:

```txt
# Machine Learning
scikit-learn==1.3.2
xgboost==2.0.3
tensorflow==2.15.0
prophet==1.1.5
shap==0.43.0

# Traitement de données
pandas==2.1.4
numpy==1.24.3
scipy==1.11.4

# Celery
celery==5.3.4
redis==5.0.1
django-celery-beat==2.5.0
django-celery-results==2.5.1
```

Installez les dépendances:

```bash
pip install -r requirements.txt
```

### 2. Configuration Redis (Broker Celery)

**Windows:**
- Téléchargez Redis depuis: https://github.com/microsoftarchive/redis/releases
- Installez et démarrez le service Redis

**Linux/Mac:**
```bash
sudo apt-get install redis-server  # Ubuntu
brew install redis  # Mac

# Démarrez Redis
redis-server
```

### 3. Migrations de Base de Données

```bash
python manage.py makemigrations ml_detection
python manage.py migrate ml_detection
```

### 4. Créer les Répertoires pour Modèles

```bash
mkdir -p ml_models
```

## ⚙️ Configuration

### 1. Configuration Django (`settings.py`)

Ajoutez à votre `settings.py`:

```python
# Configuration Celery
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'Europe/Paris'

# Import de la configuration Celery Beat
from apps.ml_detection.celery_config import (
    CELERY_BEAT_SCHEDULE,
    CELERY_TASK_ROUTES,
    CELERY_TASK_ANNOTATIONS
)

# Apps installées
INSTALLED_APPS = [
    # ...
    'apps.ml_detection',
    'django_celery_beat',
    'django_celery_results',
]

# Configuration ML
ML_MODELS_DIR = 'ml_models'
```

### 2. Configuration Celery (`wisebook/celery.py`)

Créez ou mettez à jour `wisebook/celery.py`:

```python
from __future__ import absolute_import, unicode_literals
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'wisebook.settings')

app = Celery('wisebook')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
```

### 3. URL Configuration

Ajoutez les routes API dans `urls.py`:

```python
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.ml_detection.api_views import ModeleMLViewSet, DetectionAnomalieViewSet

router = DefaultRouter()
router.register(r'modeles', ModeleMLViewSet, basename='modeleml')
router.register(r'detections', DetectionAnomalieViewSet, basename='detection')

urlpatterns = [
    # ...
    path('api/ml/', include(router.urls)),
]
```

## 🎯 Utilisation

### 1. Démarrer les Workers Celery

**Terminal 1 - Worker principal:**
```bash
celery -A wisebook worker -l info -Q celery,ml_training,ml_scheduler,ml_monitoring,ml_stats
```

**Terminal 2 - Celery Beat (scheduler):**
```bash
celery -A wisebook beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

**Terminal 3 - Django:**
```bash
python manage.py runserver 127.0.0.1:8888
```

### 2. Créer un Modèle ML

```python
from apps.ml_detection.models import ModeleML
from apps.core.models import Societe

societe = Societe.objects.first()

# Créer un modèle LSTM pour prédiction de trésorerie
modele_lstm = ModeleML.objects.create(
    societe=societe,
    nom="Prédiction Trésorerie LSTM",
    description="Modèle LSTM pour prévoir les flux de trésorerie sur 90 jours",
    type_modele='LSTM',
    domaine_application='FLUX_TRESORERIE',
    parametres_modele={
        'sequence_length': 90,
        'hidden_layers': [128, 64, 32],
        'dropout': 0.2,
        'learning_rate': 0.001
    },
    reentrainement_auto=True,
    frequence_reentrainement=7  # Tous les 7 jours
)

# Créer un modèle Random Forest pour recommandations comptables
modele_rf = ModeleML.objects.create(
    societe=societe,
    nom="Recommandations Comptables RF",
    description="Random Forest pour suggérer les comptes comptables",
    type_modele='RANDOM_FOREST',
    domaine_application='ECRITURES_COMPTABLES',
    parametres_modele={
        'n_estimators': 500,
        'max_depth': 15,
        'min_samples_leaf': 10
    },
    reentrainement_auto=True,
    frequence_reentrainement=30  # Tous les 30 jours
)
```

### 3. Lancer un Entraînement

**Via Python:**
```python
from apps.ml_detection.tasks import train_model_task

# Lance l'entraînement en asynchrone
task = train_model_task.delay(modele_id=modele_lstm.id)
print(f"Task ID: {task.id}")
```

**Via API REST:**
```bash
curl -X POST http://localhost:8888/api/ml/modeles/1/train/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### 4. Effectuer des Prédictions

**Via API REST:**
```bash
curl -X POST http://localhost:8888/api/ml/modeles/1/predict/ \
  -H "Authorization: Token YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "data": [
      {"solde": 50000, "entrees": 20000, "sorties": 15000},
      {"solde": 55000, "entrees": 25000, "sorties": 20000}
    ]
  }'
```

**Via Python:**
```python
from apps.ml_detection.services.lstm_service import LSTMService
import pandas as pd

service = LSTMService(modele_lstm)
service.load_model('ml_models/1/1/model_latest.pkl')

X = pd.DataFrame({
    'solde': [50000, 55000],
    'entrees': [20000, 25000],
    'sorties': [15000, 20000]
})

predictions = service.predict(X)
print(predictions)
```

## 🌐 API REST

### Endpoints Disponibles

#### 1. Gestion des Modèles

**Dashboard Général**
```
GET /api/ml/modeles/dashboard/
```

**Entraîner un Modèle**
```
POST /api/ml/modeles/{id}/train/
```

**Prédiction**
```
POST /api/ml/modeles/{id}/predict/
Body: { "data": [...] }
```

**Performances**
```
GET /api/ml/modeles/{id}/performance/
```

**Feature Importance**
```
GET /api/ml/modeles/{id}/feature_importance/
```

**Détection de Drift**
```
POST /api/ml/modeles/detect_drift/
```

#### 2. Détections d'Anomalies

**Détections Récentes**
```
GET /api/ml/detections/recent/?days=7
```

### Exemples de Réponses

**Dashboard:**
```json
{
  "summary": {
    "total_models": 10,
    "active_models": 8,
    "ready_models": 7,
    "training_models": 1,
    "needs_retraining": 2
  },
  "models_by_type": {
    "LSTM": 2,
    "RANDOM_FOREST": 3,
    "XGBOOST": 3
  }
}
```

**Performance:**
```json
{
  "modele": {
    "id": 1,
    "nom": "Prédiction Trésorerie LSTM",
    "type": "LSTM",
    "accuracy": 0.942,
    "age_days": 5
  },
  "metrics": {
    "mse": 0.0234,
    "mae": 0.1123,
    "accuracy": 0.942
  },
  "needs_retraining": false
}
```

## 📊 Monitoring

### 1. Surveiller les Workers Celery

**Flower (Web UI pour Celery):**
```bash
pip install flower
celery -A wisebook flower --port=5555
```

Accédez à: http://localhost:5555

### 2. Logs

Les logs sont disponibles dans:
- Console des workers Celery
- Django logs
- Fichier de logs si configuré

### 3. Métriques Importantes

- **Taux de faux positifs**: `StatistiqueDetection.taux_faux_positifs`
- **Drift détecté**: Vérifier `ModeleML.statut == 'OBSOLETE'`
- **Temps d'entraînement**: `CampagneEntrainement.duree_minutes`
- **Amélioration**: `CampagneEntrainement.amelioration`

## 🔄 Tâches Périodiques Automatiques

Le système exécute automatiquement:

| Tâche | Fréquence | Description |
|-------|-----------|-------------|
| Réentraînement auto | Quotidien 2h | Réentraîne les modèles qui en ont besoin |
| Détection de drift | Quotidien 3h | Détecte les drifts de données |
| Calcul statistiques | Horaire | Calcule les métriques de performance |
| Réentraînement hebdo | Dimanche 1h | Réentraînement de backup |

## 🛠️ Dépannage

### Erreur: ModuleNotFoundError

Assurez-vous que toutes les dépendances sont installées:
```bash
pip install -r requirements.txt
```

### Celery n'exécute pas les tâches

1. Vérifiez que Redis est démarré:
   ```bash
   redis-cli ping
   # Devrait retourner: PONG
   ```

2. Vérifiez les workers Celery:
   ```bash
   celery -A wisebook inspect active
   ```

### Modèle ne se charge pas

Vérifiez que le fichier modèle existe:
```bash
ls -la ml_models/{societe_id}/{modele_id}/model_latest.pkl
```

## 📝 Notes Importantes

1. **Données d'Entraînement**: Les fonctions `collect_training_data()` dans `tasks.py` sont actuellement des simulations. Vous devez les implémenter pour collecter vos vraies données.

2. **Stockage des Modèles**: Les modèles sont sauvegardés dans `ml_models/{societe_id}/{modele_id}/`. Assurez-vous d'avoir suffisamment d'espace disque.

3. **Performance**: L'entraînement de modèles ML peut être intensif en ressources. Utilisez des queues dédiées et limitez les tâches concurrentes.

4. **Sécurité**: L'API nécessite une authentification. Utilisez toujours HTTPS en production.

## 🎉 Félicitations!

Votre backend d'apprentissage automatique est maintenant configuré et prêt à fonctionner!

Pour toute question, consultez la documentation ou contactez l'équipe de développement.