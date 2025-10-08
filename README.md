# WISEBOOK ERP - Système Comptable et Financier SYSCOHADA

![WiseBook Logo](docs/images/wisebook-logo.png)

**Développé par Praedium Tech**

WiseBook est une solution ERP comptable et financière cloud-native de nouvelle génération, conçue pour répondre aux besoins complexes des entreprises opérant dans l'espace OHADA tout en garantissant une conformité IFRS complète.

## 🚀 Vue d'Ensemble

### Vision Produit
WiseBook offre une architecture modulaire, une automatisation intelligente et une expérience utilisateur exceptionnelle avec des dashboards modernes type Clarity Dashboard UI, spécialement adaptés aux normes SYSCOHADA révisées 2017.

### Objectifs Stratégiques
- ✅ **Conformité Multi-Normes**: Support natif SYSCOHADA avec passerelles IFRS automatisées
- ✅ **Automatisation Maximale**: Réduction de 80% du temps de saisie et de clôture
- ✅ **Intelligence Augmentée**: IA/ML pour détection d'anomalies et prévisions
- ✅ **Interopérabilité Totale**: Connexions bancaires directes et intégrations écosystème
- ✅ **Scalabilité Enterprise**: Architecture supportant 10M+ écritures/an

## 📋 Fonctionnalités Principales

### 💼 Modules Métier Complets
- **Comptabilité Générale SYSCOHADA** - Plan à 9 positions, journaux, lettrage intelligent
- **Gestion des Tiers** - Clients, fournisseurs, scoring crédit, recouvrement automatisé
- **Trésorerie Multi-Banques** - Connexions EBICS/PSD2, rapprochement IA, prévisions ML
- **Immobilisations** - Cycle complet, amortissements multi-méthodes, inventaires
- **Budget & Contrôle** - Rolling forecast, analyse d'écarts, tableaux de bord
- **Fiscalité OHADA** - Déclarations automatiques, télétransmissions, conformité DGI
- **Clôtures Automatisées** - Checklist dynamique, provisions calculées, états financiers
- **Reporting & BI** - Dashboards Clarity UI, rapports SYSCOHADA, analytics avancés

### 🔥 Nouveautés Exclusives
- **Module Appels de Fonds** - Gestion des cotisations, contributions projets, suivi encaissements
- **Analyse Financière Avancée** - TAFIRE, Bilan Fonctionnel, SIG, 30+ ratios SYSCOHADA
- **Cash Flow Prévisionnel** - Méthodes directe/indirecte, scénarios multiples, Monte Carlo
- **Paramétrage Multi-Pays** - TVA CEMAC/UEMOA, taxes sectorielles, calendriers fiscaux

## 🏗️ Architecture Technique

```
📁 WiseBook/
├── 📁 Backend/
│   ├── 📁 Core/                 # Moteur comptable central
│   ├── 📁 Modules/              # Modules métier (8 modules)
│   ├── 📁 Services/             # Services transversaux
│   ├── 📁 API/                  # APIs REST/GraphQL
│   └── 📁 Database/             # PostgreSQL + migrations
├── 📁 Frontend/
│   ├── 📁 src/
│   │   ├── 📁 components/       # Composants réutilisables
│   │   ├── 📁 pages/            # Pages/modules principaux
│   │   ├── 📁 store/            # État global (Redux)
│   │   ├── 📁 services/         # Services API
│   │   └── 📁 utils/            # Utilitaires
│   ├── 📁 public/               # Assets statiques
│   └── 📁 themes/               # Thèmes Clarity UI
└── 📁 docs/                     # Documentation complète
```

### Technologies Utilisées
- **Frontend**: React 18 + TypeScript + Vite
- **UI Framework**: Clarity Design System + Tailwind CSS
- **État**: Redux Toolkit + RTK Query
- **Routing**: React Router v6
- **Charts**: Chart.js + D3.js
- **Icons**: Lucide React
- **Police**: Quicksand (exclusive)

## 🎨 Design System Clarity

### Thèmes Personnalisables
WiseBook inclut 10+ thèmes professionnels avec mode clair/sombre :
- 🌊 Ocean Blue (par défaut)
- 🌲 Forest Green
- 🌅 Sunset Orange
- 🌙 Midnight Dark
- ⚡ Electric Purple
- 🍯 Amber Gold
- 🌸 Rose Quartz
- 🌿 Mint Fresh
- 🔥 Crimson Red
- ❄️ Arctic White

### Police Quicksand
Typography moderne et lisible spécialement optimisée pour les interfaces financières.

## 📊 Modules Détaillés

### 1. Comptabilité Générale SYSCOHADA
- **Plan Comptable**: Structure à 9 positions conforme SYSCOHADA révisé 2017
- **Journaux**: Paramétrables avec workflow de validation
- **Saisie Intelligente**: OCR+, suggestions IA, contrôles temps réel
- **Multi-Devises**: XOF/XAF/EUR/USD avec réévaluation automatique

### 2. Gestion des Tiers
- **Base KYC Complète**: RCCM, NIF, scoring crédit dynamique
- **Cycle Commercial**: Devis → Commande → Livraison → Facture → Encaissement
- **Recouvrement IA**: Relances automatisées, prévisions d'encaissement

### 3. Trésorerie Avancée
- **Connexions Bancaires**: EBICS, SWIFT MT940, PSD2 Open Banking
- **Rapprochement IA**: Machine Learning avec 95%+ de matching automatique
- **Cash Forecasting**: Prévisions multi-horizons avec scénarios Monte Carlo

### 4. Module Appels de Fonds ⭐
Fonctionnalités du module intégré dans Trésorerie :
- ✅ Gestion complète des campagnes d'appels
- ✅ Calcul automatique des quotes-parts
- ✅ Suivi temps réel des encaissements
- ✅ Relances automatisées multi-canal
- ✅ Tableaux de bord par projet
- ✅ États de contribution par membre

### 5. Analyse Financière Avancée ⭐

#### TAFIRE (Tableau Financier SYSCOHADA)
Calcul automatique des flux selon SYSCOHADA :
- **FLUX D'EXPLOITATION** : CAF, variation BFR, ETE
- **FLUX D'INVESTISSEMENT** : Acquisitions, cessions, subventions
- **FLUX DE FINANCEMENT** : Capital, emprunts, dividendes
- **VARIATION DE TRÉSORERIE** : Synthèse des trois flux

#### Bilan Fonctionnel
- **FRNG**: Fonds de Roulement Net Global
- **BFR**: Besoin en Fonds de Roulement (Exploitation + Hors Exploitation)
- **TN**: Trésorerie Nette (FRNG - BFR)

#### Soldes Intermédiaires de Gestion (SIG)
Les 9 soldes SYSCOHADA calculés automatiquement :
1. Marge Commerciale
2. Production de l'Exercice
3. Valeur Ajoutée
4. Excédent Brut d'Exploitation (EBE)
5. Résultat d'Exploitation
6. Résultat Financier
7. Résultat Courant Avant Impôts
8. Résultat Exceptionnel
9. Résultat Net

#### Ratios Financiers (30+)
Bibliothèque complète incluant :
- **Structure** : Autonomie, indépendance financière
- **Liquidité** : Ratios généraux, réduits, immédiats  
- **Activité** : DSO, DPO, rotation stocks, cycle trésorerie
- **Rentabilité** : Marges, ROE, ROA, ROCE

### 6. Fiscalité OHADA ⭐

#### Configuration Multi-Pays
- **CEMAC** : TVA 19.25% (18% + CSS 1.25%), IS 30%
- **UEMOA** : TVA 18%, taux sectoriels variables
- **Retenues à la source** : Services (5%), revenus (15%)
- **Calendrier fiscal** : Échéances automatiques par pays

#### Déclarations Automatiques
- **TVA Mensuelle** : Calcul et génération automatique
- **Impôt sur les Sociétés** : Acomptes et régularisation
- **Retenues à la Source** : Calculs et déclarations
- **Liasse Fiscale** : États financiers + 35 notes annexes

## 🚀 Installation et Démarrage

### Prérequis
- Node.js 18+ et npm/yarn
- PostgreSQL 15+ (optionnel pour développement)
- Git

### Installation

```bash
# Cloner le repository
git clone https://github.com/praedium-tech/wisebook.git
cd wisebook

# Installation des dépendances frontend
cd frontend
npm install

# Copier le fichier de configuration
cp .env.example .env.local

# Lancer le serveur de développement
npm run dev
```

### Configuration Initiale

1. **Paramétrage Entreprise**
   - Informations légales (RCCM, NIF)
   - Secteur d'activité SYSCOHADA
   - Logo et coordonnées

2. **Configuration Comptable**
   - Choix du référentiel (Normal/Allégé/Minimal)
   - Plan comptable sectoriel
   - Exercice comptable
   - Axes analytiques

3. **Import Données**
   - Balance d'ouverture
   - Fichier tiers existant
   - Immobilisations
   - Budgets

## 🏢 Conformité et Certifications

### Standards Comptables
- ✅ **SYSCOHADA Révisé 2017** - Conformité 100%
- ✅ **IFRS/IAS** - Correspondances automatiques
- ✅ **OHADA** - États financiers normalisés
- ✅ **DGI** - Formats de télédéclaration

### Sécurité et Audit
- 🔐 **Chiffrement AES-256** - Données at-rest et in-transit
- 📋 **Piste d'Audit** - Traçabilité complète des opérations
- 🛡️ **RGPD Ready** - Protection des données personnelles
- 🔒 **Authentification MFA** - Sécurité renforcée

## 📈 Performances et Scalabilité

### Métriques de Performance
| Métrique | Cible | Minimum Acceptable |
|----------|-------|-------------------|
| Temps de réponse consultation | < 1s | < 2s |
| Temps de réponse saisie | < 2s | < 3s |
| Génération rapport | < 5s | < 10s |
| Import batch (10k lignes) | < 30s | < 60s |
| Clôture mensuelle | < 2h | < 4h |
| Disponibilité | 99.9% | 99.5% |

### Capacités
- **Écritures**: 10M+ par exercice
- **Utilisateurs**: 100+ simultanés
- **Documents**: 1TB+ de stockage GED
- **Historique**: 10 ans d'archives
- **Multi-sociétés**: Illimité

## 🛣️ Roadmap

### Version 2.1 (Q2 2025)
- [ ] Module Paie intégré SYSCOHADA
- [ ] Consolidation multi-sociétés avancée
- [ ] API publique complète
- [ ] Application mobile (iOS/Android)

### Version 2.2 (Q3 2025)
- [ ] Intelligence artificielle comptable
- [ ] Blockchain pour audit trail
- [ ] Intégration e-commerce avancée
- [ ] Modules sectoriels (Banque, Assurance)

### Version 3.0 (Q4 2025)
- [ ] Plateforme SaaS multi-tenant
- [ ] Conformité internationale (US GAAP)
- [ ] Modules RH/CRM intégrés
- [ ] Tableau de bord prédictif IA

## 🏆 Équipe et Crédits

### Développé par Praedium Tech
**Praedium Tech** est une société de conseil et développement spécialisée dans les solutions financières et comptables pour l'Afrique. Notre expertise SYSCOHADA et notre connaissance approfondie de l'écosystème OHADA nous permettent de créer des solutions vraiment adaptées aux besoins locaux.

### Experts Comptables Partenaires
- **Cabinet KPMG Cameroun** - Validation conformité SYSCOHADA
- **Deloitte Côte d'Ivoire** - Expertise fiscale OHADA
- **EY Sénégal** - Standards IFRS et consolidation

## 📄 Licences et Copyright

### License Commerciale
WiseBook est un logiciel propriétaire développé par **Praedium Tech**. 

#### Types de Licences Disponibles
- **Starter** - 5 utilisateurs - €299/mois
- **Professional** - 25 utilisateurs - €999/mois  
- **Enterprise** - Utilisateurs illimités - Prix sur devis
- **OEM** - Intégration tierce - Licence spéciale

### Composants Open Source
WiseBook utilise plusieurs composants open source sous leurs licences respectives :
- React (MIT)
- TypeScript (Apache 2.0)
- PostgreSQL (PostgreSQL License)
- Chart.js (MIT)
- Lucide Icons (ISC)

## 📞 Support et Contact

### Support Technique
- 📧 **Email**: support@praedium.tech
- 📱 **Hotline**: +225 6XX XXX XXX (24/7 pour incidents critiques)
- 💬 **Chat**: Support intégré dans l'application
- 🎫 **Portal**: [support.praedium.tech](https://support-wisebook
.tech)

### Commercial
- 📧 **Ventes**: sales@praedium.tech
- 📧 **Partenariats**: partners@praedium.tech
- 🌐 **Site Web**: [www.wisebook.tech](https://www.wisebook.tech)

### Réseaux Sociaux
- 🐦 **Twitter**: [@WiseBookERP](https://twitter.com/WiseBookERP)
- 💼 **LinkedIn**: [WiseBook ERP](https://linkedin.com/company/wisebook-erp)
- 📺 **YouTube**: [WiseBook Channel](https://youtube.com/@wisebook)

---

<div align="center">

**WiseBook ERP - La Solution Comptable SYSCOHADA Nouvelle Génération**

Développé avec ❤️ par [Praedium Tech](https://praedium.tech)

*© 2025 Praedium Tech. Tous droits réservés.*

</div>