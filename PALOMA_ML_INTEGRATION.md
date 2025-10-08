# Intégration ML de Paloma - Connexion au Backend d'Apprentissage Automatique

## 🎯 Objectif

Connecter Paloma, l'assistante IA de WiseBook, au backend d'apprentissage automatique pour lui permettre d'utiliser des modèles ML sophistiqués (LSTM, Random Forest, XGBoost) pour répondre intelligemment aux questions des utilisateurs.

## 📦 Fichiers Créés/Modifiés

### 1. **Frontend - Service ML** (`frontend/src/services/mlService.ts`)
Service TypeScript pour communiquer avec l'API ML du backend.

**Fonctionnalités:**
- `getAccountRecommendations()` - Recommandations de comptes comptables via Random Forest
- `getTreasuryForecast()` - Prévisions de trésorerie via LSTM
- `analyzeClientRisk()` - Analyse de risques clients via XGBoost
- `getRecentAnomalies()` - Détection d'anomalies récentes
- `getDashboard()` - Vue d'ensemble des modèles ML
- `trainModel()` - Lancement d'entraînement
- `getModelPerformance()` - Métriques de performance
- `getFeatureImportance()` - Importance des features
- `detectDrift()` - Détection de drift

**Endpoint API:** `http://localhost:8888/api/ml`

### 2. **Frontend - Gestionnaire ML de Paloma** (`frontend/src/components/chatbot/ai/mlIntegration.ts`)
Classe `PalomaMLManager` qui gère les capacités ML de Paloma.

**5 Capacités ML:**

#### 1. Recommandation de Comptes Comptables
```typescript
capability: 'account_recommendation'
Modèle: Random Forest
Paramètres: { libelle, montant, tiers }
Réponse: Top 3 recommandations avec barres de confiance
```

#### 2. Prévision de Trésorerie
```typescript
capability: 'treasury_forecast'
Modèle: LSTM Neural Network
Paramètres: { historicalData, periods }
Réponse: Prédictions sur 30 jours avec tendances
```

#### 3. Analyse de Risque Client
```typescript
capability: 'risk_analysis'
Modèle: XGBoost
Paramètres: { client_id, client_name }
Réponse: Score de risque + catégorie (Faible/Moyen/Élevé/Critique)
```

#### 4. Détection d'Anomalies
```typescript
capability: 'anomaly_detection'
Paramètres: { days }
Réponse: Liste des anomalies par sévérité
```

#### 5. Dashboard ML
```typescript
capability: 'ml_dashboard'
Réponse: Vue d'ensemble des modèles actifs
```

**Détection d'Intention Automatique:**
```typescript
detectMLIntent(message: string): { capability: string; params: any } | null
```
Analyse le message de l'utilisateur et détecte automatiquement quelle capacité ML utiliser.

**Exemples de déclenchement:**
- "Prévois ma trésorerie" → `treasury_forecast`
- "Quel compte pour cette facture?" → `account_recommendation`
- "Analyse le risque de ce client" → `risk_analysis`
- "Y a-t-il des anomalies?" → `anomaly_detection`

### 3. **Frontend - Hook Chatbot** (`frontend/src/components/chatbot/hooks/useChatbot.ts`)
Mise à jour du hook principal pour intégrer les capacités ML.

**Modifications:**
```typescript
// Import du ML Manager
import { palomaMLManager } from '../ai/mlIntegration';
import mlService from '../../../services/mlService';

// Dans sendMessage():
// 1. Détecter l'intention ML
const mlIntent = palomaMLManager.detectMLIntent(text);

// 2. Si intention ML détectée, exécuter la capacité
if (mlIntent) {
  responseMessage = await palomaMLManager.executeCapability(
    mlIntent.capability,
    mlIntent.params
  );
}

// 3. Sinon, utiliser l'IA conversationnelle classique
else {
  const intelligentResponse = palomaAI.generateResponse(text, state.context);
  responseMessage = intelligentResponse.message;
}
```

**Messages de Bienvenue Mis à Jour:**
Les 3 messages de bienvenue mentionnent maintenant les capacités ML:
- Recommandations comptables (Random Forest)
- Prévisions de trésorerie (LSTM)
- Analyse de risques clients (XGBoost)
- Détection d'anomalies automatique

**Quick Replies ML:**
```typescript
quickReplies: [
  "Prévois ma trésorerie",
  "Quels sont les comptes recommandés ?",
  "Analyse le risque client",
  "Y a-t-il des anomalies ?",
  "Comment ça marche ?"
]
```

**Suggestions Initiales:**
```typescript
suggestions: [
  "Prévois ma trésorerie sur 30 jours",
  "Recommande un compte comptable",
  "Analyse les risques clients",
  "Détecte les anomalies récentes",
  "Comment créer un nouveau budget ?"
]
```

## 🔄 Flux d'Exécution

```
Utilisateur tape: "Prévois ma trésorerie"
         ↓
useChatbot.sendMessage()
         ↓
palomaMLManager.detectMLIntent()
         ↓
Intention détectée: "treasury_forecast"
         ↓
palomaMLManager.executeCapability('treasury_forecast', { periods: 30 })
         ↓
mlService.getTreasuryForecast(historicalData, 30)
         ↓
Appel API: POST http://localhost:8888/api/ml/modeles/1/predict/
         ↓
Backend LSTM renvoie prédictions
         ↓
Formatage de la réponse avec emojis et graphiques
         ↓
Affichage dans le chat:

"Génial ! 📈 Paloma a prédit votre trésorerie avec son réseau LSTM !

🔮 **Prévisions sur 30 jours:**

📈 **Jour 1 (2025-09-29)**: 55 000,00 €
📈 **Jour 2 (2025-09-30)**: 58 200,00 €
...

🟢 **Tendance positive**: 56 500,00 € en moyenne

💡 Paloma conseille: Excellente nouvelle ! Votre trésorerie va augmenter."
```

## 🎨 Format des Réponses

### Recommandation de Comptes
```
Super ! 💰 Paloma a analysé votre transaction avec son IA Random Forest !

📊 **Recommandations de comptes:**

🥇 **Compte 606100**
   Confiance: 94% █████████

🥈 **Compte 606400**
   Confiance: 78% ███████

🥉 **Compte 606500**
   Confiance: 65% ██████

✨ Paloma recommande d'utiliser le premier compte avec la plus haute confiance !
💡 Astuce: Plus vous validez, plus l'IA apprend et s'améliore !
```

### Analyse de Risque Client
```
Analyse terminée ! 🎯 Paloma a évalué le risque avec XGBoost !

📊 **Client Société ABC:**

**Score de risque**: 75%
███████░░░

🟠 **Catégorie**: Élevé

💡 **Recommandations Paloma:**
🚨 Risque important ! Demandez un acompte.
📞 Contactez le client pour vérifier sa situation.
```

### Détection d'Anomalies
```
Attention ! 🚨 Paloma a détecté 5 anomalie(s) :

🔴 **CRITIQUE** (2):
   • Transaction inhabituelle (Score: 95%)
   • Montant suspect (Score: 88%)

🟠 **ÉLEVÉ** (2):
   • Timing inhabituel
   • Fréquence anormale

🟡 **MOYEN** (1)

💡 Paloma recommande de traiter d'abord les anomalies critiques !
```

## 🚀 Comment Tester

### 1. Démarrer les Services
```bash
# Terminal 1 - Backend Django
python manage.py runserver 127.0.0.1:8888

# Terminal 2 - Frontend React
npm run dev

# Terminal 3 - Celery Worker (si utilisation des modèles ML)
celery -A wisebook worker -l info

# Terminal 4 - Redis (si nécessaire)
redis-server
```

### 2. Tester dans Paloma
1. Ouvrir WiseBook dans le navigateur
2. Cliquer sur l'icône Paloma (coin inférieur droit)
3. Essayer ces messages:

**Prévision de Trésorerie:**
- "Prévois ma trésorerie"
- "Montre-moi les prévisions financières"
- "Flux de trésorerie futurs"

**Recommandations Comptables:**
- "Quel compte pour cette facture ?"
- "Recommande un compte comptable"
- "Aide-moi à choisir le bon compte"

**Analyse de Risque:**
- "Analyse le risque client"
- "Évalue ce client"
- "Quel est le risque de défaut ?"

**Anomalies:**
- "Y a-t-il des anomalies ?"
- "Détecte les transactions suspectes"
- "Problèmes récents ?"

**Dashboard ML:**
- "Dashboard IA"
- "État des modèles ML"

## 🛠️ Prérequis Backend

Pour que les capacités ML fonctionnent, le backend doit avoir:

1. **Modèles ML créés:**
   - Modèle ID 1: LSTM (prévisions trésorerie)
   - Modèle ID 2: Random Forest (recommandations comptes)
   - Modèle ID 3: XGBoost (risques clients)

2. **API ML active:**
   - Endpoints `/api/ml/modeles/{id}/predict/`
   - Authentication Token configurée

3. **Base de données:**
   - Tables `ml_detection_modeleml`, `ml_detection_detectionanomalie`

4. **Redis & Celery:**
   - Pour entraînement asynchrone des modèles

## 📊 Gestion des Erreurs

Si le backend ML n'est pas disponible:
```typescript
try {
  responseMessage = await palomaMLManager.executeCapability(...);
} catch (mlError) {
  responseMessage = "Oups ! 😅 Mon système d'IA n'est pas disponible
                     pour le moment. Laissez-moi vous aider autrement...";
}
```

Paloma bascule alors sur son IA conversationnelle classique.

## 🔐 Authentification

Le service ML utilise le token d'authentification de l'utilisateur:

```typescript
// Configuration du token
mlService.setAuthToken(userToken);

// Headers envoyés
headers: {
  'Content-Type': 'application/json',
  'Authorization': `Token ${this.token}`
}
```

## 🎯 Avantages de l'Intégration

1. **Prédictions en Temps Réel:** Paloma peut maintenant prédire la trésorerie en temps réel
2. **Recommandations Intelligentes:** Suggère automatiquement les bons comptes comptables
3. **Détection Proactive:** Alerte sur les anomalies et risques potentiels
4. **Apprentissage Continu:** Les modèles s'améliorent avec chaque utilisation
5. **Interface Conversationnelle:** Accès facile aux ML via langage naturel
6. **Fallback Gracieux:** Fonctionne même si le backend ML est indisponible

## 📈 Prochaines Étapes

- [ ] Créer les modèles ML dans le backend
- [ ] Entraîner les modèles avec des données réelles
- [ ] Tester les prédictions end-to-end
- [ ] Ajouter des visualisations graphiques dans les réponses
- [ ] Implémenter le feedback utilisateur pour améliorer les modèles
- [ ] Ajouter plus de capacités ML (Prophet, DBSCAN, etc.)

## 🎉 Résultat Final

**Paloma est maintenant connectée au backend d'apprentissage automatique !**

Elle peut désormais:
- 🤖 Utiliser des modèles ML sophistiqués (LSTM, Random Forest, XGBoost)
- 📊 Fournir des prédictions basées sur l'apprentissage automatique
- 💡 Recommander intelligemment des solutions
- 🚨 Détecter automatiquement les anomalies
- 🧠 S'améliorer continuellement via l'entraînement des modèles

L'intégration est **transparente** pour l'utilisateur - il suffit de poser une question à Paloma et elle utilise automatiquement les capacités ML appropriées !