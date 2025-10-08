# 🚀 WiseBook ERP - Guide de Lancement Local

## Démarrage Rapide

### Option 1: Script Automatisé (Recommandé)
```bash
# Double-cliquer sur le fichier ou exécuter en ligne de commande
start_wisebook_local.bat
```

### Option 2: Commandes Manuelles
```bash
# 1. Aller dans le répertoire du projet
cd C:\devs\WiseBook

# 2. Vérifier la configuration
python manage.py check --settings=wisebook.simple_settings

# 3. Appliquer les migrations (si première fois)
python manage.py migrate --settings=wisebook.simple_settings

# 4. Démarrer le serveur
python manage.py runserver --settings=wisebook.simple_settings
```

## 🌐 Accès à l'Application

Une fois le serveur démarré, accédez à :

- **🏠 Page d'accueil**: http://127.0.0.1:8000/
- **🔧 Administration**: http://127.0.0.1:8000/admin/
- **🔌 API REST**: http://127.0.0.1:8000/api/

## 👤 Création d'un Utilisateur Admin

```bash
# Créer un superutilisateur (dans un autre terminal)
python manage.py createsuperuser --settings=wisebook.simple_settings
```

## 📁 Structure du Projet

```
WiseBook/
├── 📄 start_wisebook_local.bat    # Script de démarrage
├── 📄 manage.py                   # Gestionnaire Django
├── 🗂️ wisebook/                   # Configuration principale
│   ├── settings/                  # Settings par environnement
│   ├── simple_settings.py         # Settings simplifiés pour dev
│   └── urls_simple.py             # URLs simplifiées
├── 🗂️ apps/                       # Applications métier
│   ├── core/                      # Modèles de base
│   ├── accounting/                # Comptabilité
│   ├── navigation/                # Navigation et vues
│   └── ...
├── 🗂️ static/                     # Fichiers CSS/JS
│   ├── css/responsive.css         # Design responsive
│   └── css/accessibility.css      # Accessibilité WCAG 2.1
└── 🗂️ templates/                  # Templates HTML
```

## 🔧 Fonctionnalités Disponibles

### ✅ Implémentées
- ✅ **Navigation hiérarchique** complète (Dashboard → Modules)
- ✅ **Modèles de données** SYSCOHADA (Plan comptable, Écritures, Tiers, etc.)
- ✅ **Workflows métier** (Facturation-Encaissement, Clôture mensuelle)
- ✅ **Responsive Design** (Mobile: 320px+, Tablet: 769px+, Desktop: 1025px+)
- ✅ **Accessibilité WCAG 2.1 AA** (Contraste 4.5:1, Navigation clavier, Screen readers)
- ✅ **Sécurité avancée** (MFA, Audit trails, Permissions granulaires, RGPD)
- ✅ **Reporting & BI** (Dashboards interactifs, Analytics ML, Détection d'anomalies)
- ✅ **Assistant de configuration** (Setup wizard SYSCOHADA complet)

### 🚧 À Développer
- 🚧 Interface utilisateur complète (React frontend)
- 🚧 Intégration des workflows dans l'UI
- 🚧 Tests automatisés complets
- 🚧 Documentation utilisateur

## 📊 Modules Principaux

### 1. **Comptabilité SYSCOHADA**
- Plan comptable conforme OHADA
- Écritures comptables avec contrôles
- Balance et Grand Livre
- États financiers automatisés

### 2. **Gestion des Tiers**
- Clients et Fournisseurs
- Suivi des encours
- Conditions de paiement
- Scoring client

### 3. **Trésorerie**
- Position de trésorerie temps réel
- Rapprochements bancaires
- Prévisions de flux
- Gestion multi-devises

### 4. **Immobilisations**
- Catalogue des actifs
- Amortissements automatiques
- Suivi des cessions
- Inventaire physique

### 5. **Reporting & BI**
- Tableaux de bord interactifs
- Analytics avec Machine Learning
- Détection d'anomalies (Isolation Forest)
- Exports multi-formats

## 🔒 Sécurité

- **Authentification multi-facteurs** (TOTP, SMS, Codes de récupération)
- **Permissions granulaires** par module/action/données
- **Audit trails** complets avec traçabilité
- **Conformité RGPD** (Consentements, Droit à l'oubli)
- **Chiffrement** des données sensibles
- **Restrictions IP et horaires**

## 🛠️ Développement

### Environnement
- **Python**: 3.13.5
- **Django**: 5.0.4
- **Base de données**: SQLite (développement)
- **Frontend**: React + TypeScript (en cours)

### Configuration
- Settings modulaires par environnement
- Variables d'environnement (.env)
- Logging centralisé
- Cache Redis (production)

## 📞 Support

- **Email**: support@wisebook.cm
- **Documentation**: http://127.0.0.1:8000/api/docs/
- **Issues GitHub**: https://github.com/wisebook/wisebook-erp

---

**WiseBook ERP v3.0.0** - Système de gestion intégrée pour l'Afrique  
🌍 Conforme SYSCOHADA | 🔒 Sécurisé | ⚡ Performant | 📱 Responsive