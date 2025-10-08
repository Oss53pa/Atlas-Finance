# 🚀 WiseBook V3.0 - Démarrage en Local

## ✅ Installation Réussie !

WiseBook V3.0 est maintenant configuré et fonctionne en mode développement local.

## 🌐 Accès à l'Application

### 🔗 URLs Principales
- **Application principale** : http://localhost:8000
- **Interface Admin Django** : http://localhost:8000/admin
- **API Info** : http://localhost:8000/api

### 👤 Identifiants Admin
- **Utilisateur** : `admin`
- **Mot de passe** : `password123`
- **Email** : `admin@wisebook.local`

## 🛠️ Commandes de Gestion

### Démarrage du Serveur
```bash
# Méthode 1: Script Python
python start_simple.py runserver

# Méthode 2: Script Batch (Windows)
start_wisebook.bat

# Méthode 3: Django classique (après activation venv)
venv\Scripts\activate
python manage.py runserver
```

### Gestion de la Base de Données
```bash
# Appliquer les migrations
python start_simple.py migrate

# Créer un nouveau superutilisateur
python create_admin.py

# Ouvrir le shell Django
python start_simple.py shell
```

### Environnement Virtuel
```bash
# Activer l'environnement (Windows)
venv\Scripts\activate.bat

# Désactiver l'environnement
deactivate
```

## 📁 Structure du Projet

```
WiseBook/
├── venv/                    # Environnement virtuel Python
├── apps/                    # Applications Django WiseBook
│   ├── core/               # Modèles de base (Société, Exercice)
│   ├── accounting/         # Comptabilité SYSCOHADA
│   ├── third_party/        # Tiers (Clients/Fournisseurs)
│   ├── treasury/           # Trésorerie et banques
│   ├── assets/             # Immobilisations
│   ├── analytics/          # Analytique multi-axes
│   ├── security/           # Sécurité et utilisateurs
│   └── ...                 # Autres modules
├── wisebook/               # Configuration Django
├── frontend/               # Interface React (à développer)
├── tests/                  # Suite de tests complète
├── db_minimal.sqlite3      # Base de données de développement
├── .env                    # Configuration locale
├── start_simple.py         # Script de démarrage simple
└── requirements-minimal.txt # Dépendances minimales
```

## 🎯 Fonctionnalités Disponibles

### ✅ Actuellement Fonctionnelles
- ✅ Interface Django Admin
- ✅ Authentification utilisateurs
- ✅ API REST Framework
- ✅ Base de données SQLite
- ✅ Configuration CORS
- ✅ Gestion des sessions

### 🔧 En Développement
- 🔧 Modules métier WiseBook (comptabilité, etc.)
- 🔧 Interface React frontend
- 🔧 API JWT complète
- 🔧 Tests automatisés

## 📊 Prochaines Étapes de Développement

1. **Finaliser les Modules Backend**
   ```bash
   # Installer toutes les dépendances
   pip install -r requirements.txt
   
   # Activer tous les modules WiseBook
   # (nécessite les dépendances complètes)
   ```

2. **Développer le Frontend React**
   ```bash
   cd frontend
   npm install
   npm start
   ```

3. **Configurer la Base de Données Production**
   ```bash
   # PostgreSQL recommandé
   pip install psycopg2-binary
   # Modifier .env avec les paramètres PostgreSQL
   ```

## 🆘 Résolution de Problèmes

### Problème : Modules non trouvés
**Solution** : Activer l'environnement virtuel
```bash
venv\Scripts\activate.bat
```

### Problème : Port 8000 occupé
**Solution** : Utiliser un autre port
```bash
python start_simple.py runserver 8080
```

### Problème : Base de données corrompue
**Solution** : Supprimer et recréer
```bash
del db_minimal.sqlite3
python start_simple.py migrate
python create_admin.py
```

### Problème : Erreurs de dépendances
**Solution** : Réinstaller l'environnement
```bash
rmdir /s venv
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements-minimal.txt
```

## 📞 Support

- **Documentation** : README.md
- **Tests** : `python run_tests.py --all`
- **Configuration** : .env
- **Logs** : Console Django

---

## 🎉 Félicitations !

**WiseBook V3.0 fonctionne maintenant en local !**

L'ERP comptable SYSCOHADA pour l'Afrique est opérationnel en mode développement.

**Interface Admin** : http://localhost:8000/admin  
**Identifiants** : admin / password123

---

*WiseBook V3.0 - L'ERP de référence pour l'Afrique francophone*  
*Simplifying financial management with world-class technology*