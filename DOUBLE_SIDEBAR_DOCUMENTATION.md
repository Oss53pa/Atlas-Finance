# Documentation - Double Sidebar WiseBook ERP

## Vue d'ensemble
WiseBook ERP utilise maintenant un système de **double sidebar** pour une navigation intuitive et organisée :
- **Sidebar principale** (gauche) : Modules principaux
- **Sidebar secondaire** (extension) : Sous-modules du module sélectionné

## Structure de navigation

### 📊 Dashboard
- Vue d'ensemble
- Executive Dashboard
- Analyse Financière

### 💰 Comptabilité
- Tableau de bord
- Journaux
- Écritures
- Balance
- Grand Livre

### 👥 Tiers
- Tableau de bord
- Clients (avec badge notifications)
- Fournisseurs
- Contacts

### 💵 Trésorerie
- Tableau de bord
- Comptes bancaires
- Mouvements
- Rapprochement
- Cash Flow
- Appels de fonds

### 🏢 Immobilisations
- Tableau de bord
- Actifs immobilisés
- Amortissements

### 📈 Analytique
- Tableau de bord
- Axes analytiques
- Centres de coûts

### 🎯 Budget
- Tableau de bord
- Budgets
- Contrôle budgétaire

### 📋 Fiscalité
- Tableau de bord
- Déclarations
- Échéances

### 📊 Reporting
- Tableau de bord
- Rapports
- Dashboards

### 🛡️ Sécurité
- Tableau de bord
- Utilisateurs
- Rôles
- Permissions

### ⚙️ Paramètres
- Configuration générale

## Fonctionnalités de la double sidebar

### Navigation intelligente
- **Auto-expansion** : La sidebar secondaire s'ouvre automatiquement lors de la sélection d'un module avec sous-modules
- **Indicateurs visuels** : Le module actif est mis en évidence avec un gradient de couleur
- **Badges** : Notifications en temps réel sur les sous-modules (ex: 3 nouveaux clients)

### Design responsive
- **Mode compact** : La sidebar principale peut être réduite pour gagner de l'espace
- **Fermeture indépendante** : Chaque sidebar peut être fermée séparément
- **Adaptation mobile** : Overlay automatique sur les petits écrans

### Personnalisation
- **Couleurs par module** : Chaque module a sa propre identité visuelle
- **Icons distinctives** : Icons Lucide pour une reconnaissance rapide
- **Transitions fluides** : Animations CSS pour une expérience utilisateur agréable

## Architecture technique

### Composants principaux
1. **`DoubleSidebar.tsx`** : Composant de navigation avec modules et sous-modules
2. **`DoubleSidebarLayout.tsx`** : Layout wrapper avec header et gestion des marges
3. **`App.tsx`** : Configuration des routes avec le nouveau layout

### Gestion d'état
- État local pour l'ouverture/fermeture des sidebars
- React Router pour la navigation et la détection du module actif
- Props pour la communication entre composants

### Styles
- **Tailwind CSS** : Classes utilitaires pour le styling
- **Gradients** : Couleurs distinctives par module
- **Shadows** : Profondeur visuelle pour la hiérarchie

## Avantages de la double sidebar

### Pour l'utilisateur
✅ **Navigation claire** : Séparation logique modules/sous-modules
✅ **Accès rapide** : Tous les sous-modules visibles en un clic
✅ **Contexte préservé** : Toujours savoir où on se trouve
✅ **Espace optimisé** : Plus de place pour le contenu principal

### Pour le développement
✅ **Scalabilité** : Facile d'ajouter de nouveaux modules
✅ **Maintenance** : Structure claire et modulaire
✅ **Réutilisabilité** : Composants indépendants
✅ **Performance** : Lazy loading des pages

## Routes disponibles

| Module | Route principale | Sous-routes |
|--------|-----------------|-------------|
| Dashboard | `/dashboard` | `/executive`, `/financial-analysis-advanced` |
| Comptabilité | `/accounting` | `/accounting/journals`, `/accounting/entries`, etc. |
| Tiers | `/third-party` | `/customers-advanced`, `/suppliers-advanced`, `/third-party/contacts` |
| Trésorerie | `/treasury-advanced` | `/treasury/bank-accounts`, `/treasury/reconciliation`, etc. |
| Immobilisations | `/assets` | `/assets/fixed-assets`, `/assets/depreciation` |
| Analytique | `/analytics` | `/analytics/axes`, `/analytics/cost-centers` |
| Budget | `/budgeting` | `/budgeting/budgets`, `/budgeting/control` |
| Fiscalité | `/taxation` | `/taxation/declarations`, `/taxation/deadlines` |
| Reporting | `/reporting` | `/reporting/reports`, `/reporting/dashboards` |
| Sécurité | `/security` | `/security/users`, `/security/roles`, `/security/permissions` |

## Démarrage
L'application démarre automatiquement sur `/dashboard` avec la double sidebar activée.

Port de développement : http://localhost:5177