# CHECKLIST DE DEPLOIEMENT PRODUCTION - WISEBOOK ERP

**Version**: 3.0
**Date**: 27 Septembre 2025
**Statut**: Ready for Production Deployment

---

## PRE-REQUIS SERVEUR

### Infrastructure Minimale

- [ ] **Serveur**: Ubuntu 20.04/22.04 LTS ou Debian 11/12
- [ ] **CPU**: 4 cores minimum (8 cores recommandé)
- [ ] **RAM**: 8 GB minimum (16 GB recommandé)
- [ ] **Disque**: 100 GB SSD minimum
- [ ] **Réseau**: Bande passante 100 Mbps minimum

### Logiciels Requis

- [ ] Python 3.11+
- [ ] PostgreSQL 15+
- [ ] Redis 7+
- [ ] Nginx 1.24+
- [ ] Supervisor
- [ ] Git
- [ ] Node.js 18+ (pour build frontend si nécessaire)

---

## PHASE 1: PREPARATION ENVIRONNEMENT (Jour 1)

### 1.1 Installation Base de Données PostgreSQL

```bash
# Installation PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Configuration utilisateur et base
sudo -u postgres psql
CREATE DATABASE wisebook_production;
CREATE USER wisebook_user WITH PASSWORD 'VOTRE_MOT_DE_PASSE_FORT';
ALTER ROLE wisebook_user SET client_encoding TO 'utf8';
ALTER ROLE wisebook_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE wisebook_user SET timezone TO 'Africa/Douala';
GRANT ALL PRIVILEGES ON DATABASE wisebook_production TO wisebook_user;
\q

# Test connexion
psql -U wisebook_user -d wisebook_production -h localhost
```

**Vérifications**:
- [ ] Base de données créée
- [ ] Utilisateur créé avec permissions
- [ ] Connexion testée avec succès

### 1.2 Installation Redis

```bash
# Installation Redis
sudo apt install redis-server

# Configuration Redis
sudo nano /etc/redis/redis.conf
# Modifier: supervised systemd
# Modifier: bind 127.0.0.1 ::1
# Modifier: maxmemory 2gb
# Modifier: maxmemory-policy allkeys-lru

# Redémarrage
sudo systemctl restart redis
sudo systemctl enable redis

# Test
redis-cli ping
# Doit retourner: PONG
```

**Vérifications**:
- [ ] Redis installé
- [ ] Redis configuré
- [ ] Redis démarré et actif
- [ ] Test ping OK

### 1.3 Installation Nginx

```bash
# Installation
sudo apt install nginx

# Configuration firewall
sudo ufw allow 'Nginx Full'
sudo ufw allow ssh
sudo ufw enable

# Test
sudo systemctl status nginx
curl http://localhost
```

**Vérifications**:
- [ ] Nginx installé
- [ ] Firewall configuré
- [ ] Nginx actif

---

## PHASE 2: CONFIGURATION APPLICATION (Jour 1-2)

### 2.1 Clone et Setup Repository

```bash
# Création utilisateur dédié
sudo adduser wisebook
sudo usermod -aG sudo wisebook
su - wisebook

# Clone repository
cd /home/wisebook
git clone VOTRE_REPOSITORY_URL wisebook
cd wisebook

# Installation Python virtualenv
sudo apt install python3-pip python3-venv
python3 -m venv venv
source venv/bin/activate

# Installation dépendances
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn psycopg2-binary redis
```

**Vérifications**:
- [ ] Repository cloné
- [ ] Virtualenv créé
- [ ] Dépendances installées
- [ ] Gunicorn installé

### 2.2 Configuration .env Production

```bash
# Copier template
cp .env.example .env

# Éditer avec valeurs production
nano .env
```

**Contenu .env** (à adapter):

```env
# Security
DEBUG=False
SECRET_KEY=VOTRE_SECRET_KEY_GENERE

# Allowed hosts
ALLOWED_HOSTS=votre-domaine.com,www.votre-domaine.com

# Database PostgreSQL
DB_NAME=wisebook_production
DB_USER=wisebook_user
DB_PASSWORD=VOTRE_MOT_DE_PASSE_POSTGRESQL
DB_HOST=localhost
DB_PORT=5432

# Redis Cache
REDIS_URL=redis://localhost:6379/0

# CORS
CORS_ALLOWED_ORIGINS=https://votre-domaine.com,https://www.votre-domaine.com

# Security Headers
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True
```

**Vérifications**:
- [ ] .env créé
- [ ] DEBUG=False
- [ ] SECRET_KEY unique et fort
- [ ] ALLOWED_HOSTS configuré
- [ ] Credentials PostgreSQL corrects
- [ ] Redis URL correct
- [ ] Security headers activés

### 2.3 Migrations et Static Files

```bash
# Activer virtualenv si pas déjà fait
source /home/wisebook/wisebook/venv/bin/activate

# Migrations
cd /home/wisebook/wisebook
python manage.py migrate --settings=wisebook.simple_settings

# Créer superutilisateur
python manage.py createsuperuser --settings=wisebook.simple_settings

# Collecter fichiers statiques
python manage.py collectstatic --noinput --settings=wisebook.simple_settings

# Vérifications
python manage.py check --settings=wisebook.simple_settings
```

**Vérifications**:
- [ ] Migrations appliquées sans erreur
- [ ] Superutilisateur créé
- [ ] Fichiers statiques collectés dans staticfiles/
- [ ] Django check passe sans erreurs

---

## PHASE 3: CONFIGURATION SERVEUR WEB (Jour 2)

### 3.1 Configuration Gunicorn

```bash
# Créer fichier de configuration
sudo nano /etc/systemd/system/gunicorn.service
```

**Contenu gunicorn.service**:

```ini
[Unit]
Description=Gunicorn daemon for WiseBook ERP
After=network.target

[Service]
User=wisebook
Group=www-data
WorkingDirectory=/home/wisebook/wisebook
Environment="PATH=/home/wisebook/wisebook/venv/bin"
EnvironmentFile=/home/wisebook/wisebook/.env
ExecStart=/home/wisebook/wisebook/venv/bin/gunicorn \
    --workers 4 \
    --bind unix:/home/wisebook/wisebook/gunicorn.sock \
    --timeout 120 \
    --access-logfile /var/log/wisebook/gunicorn-access.log \
    --error-logfile /var/log/wisebook/gunicorn-error.log \
    --log-level info \
    wisebook.wsgi:application

[Install]
WantedBy=multi-user.target
```

```bash
# Créer répertoire logs
sudo mkdir -p /var/log/wisebook
sudo chown wisebook:www-data /var/log/wisebook

# Démarrer Gunicorn
sudo systemctl start gunicorn
sudo systemctl enable gunicorn
sudo systemctl status gunicorn
```

**Vérifications**:
- [ ] gunicorn.service créé
- [ ] Logs directory créé
- [ ] Gunicorn démarre sans erreur
- [ ] Socket file créé: gunicorn.sock

### 3.2 Configuration Nginx

```bash
# Créer configuration site
sudo nano /etc/nginx/sites-available/wisebook
```

**Contenu wisebook**:

```nginx
upstream wisebook_server {
    server unix:/home/wisebook/wisebook/gunicorn.sock fail_timeout=0;
}

server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;

    client_max_body_size 100M;

    # Logs
    access_log /var/log/nginx/wisebook-access.log;
    error_log /var/log/nginx/wisebook-error.log;

    # Static files
    location /static/ {
        alias /home/wisebook/wisebook/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Media files
    location /media/ {
        alias /home/wisebook/wisebook/media/;
        expires 30d;
    }

    # Frontend (si servi par Nginx)
    location / {
        root /home/wisebook/wisebook/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://wisebook_server;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }

    # Admin
    location /admin/ {
        proxy_pass http://wisebook_server;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Activer site
sudo ln -s /etc/nginx/sites-available/wisebook /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default

# Tester configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

**Vérifications**:
- [ ] Configuration Nginx créée
- [ ] Symlink créé dans sites-enabled
- [ ] nginx -t passe sans erreur
- [ ] Nginx redémarré avec succès
- [ ] Site accessible sur http://votre-domaine.com

---

## PHASE 4: SSL/TLS AVEC CERTBOT (Jour 2)

### 4.1 Installation Certbot

```bash
# Installation
sudo apt install certbot python3-certbot-nginx

# Obtenir certificat SSL
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Test renouvellement automatique
sudo certbot renew --dry-run
```

**Vérifications**:
- [ ] Certbot installé
- [ ] Certificat SSL obtenu
- [ ] HTTPS actif
- [ ] Renouvellement automatique configuré
- [ ] Site accessible sur https://votre-domaine.com
- [ ] Redirection HTTP → HTTPS active

---

## PHASE 5: MONITORING ET BACKUP (Jour 3)

### 5.1 Configuration Backups PostgreSQL

```bash
# Créer script backup
sudo nano /home/wisebook/scripts/backup_db.sh
```

**Contenu backup_db.sh**:

```bash
#!/bin/bash
BACKUP_DIR="/home/wisebook/backups/db"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="wisebook_production"
DB_USER="wisebook_user"

mkdir -p $BACKUP_DIR

pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/wisebook_$DATE.sql.gz

# Garder seulement les 30 derniers backups
find $BACKUP_DIR -name "wisebook_*.sql.gz" -mtime +30 -delete

echo "Backup completed: wisebook_$DATE.sql.gz"
```

```bash
# Rendre exécutable
chmod +x /home/wisebook/scripts/backup_db.sh

# Tester
/home/wisebook/scripts/backup_db.sh

# Configurer cron (backup journalier à 2h du matin)
crontab -e
# Ajouter:
0 2 * * * /home/wisebook/scripts/backup_db.sh >> /var/log/wisebook/backup.log 2>&1
```

**Vérifications**:
- [ ] Script backup créé
- [ ] Script testé avec succès
- [ ] Cron configuré
- [ ] Backup créé dans /home/wisebook/backups/db/

### 5.2 Monitoring avec Logs

```bash
# Vérifier logs en temps réel
tail -f /var/log/wisebook/gunicorn-error.log
tail -f /var/log/nginx/wisebook-error.log
tail -f /var/log/wisebook/backup.log

# Installer logrotate
sudo nano /etc/logrotate.d/wisebook
```

**Contenu logrotate wisebook**:

```
/var/log/wisebook/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    create 0640 wisebook www-data
}
```

**Vérifications**:
- [ ] Logs accessibles
- [ ] Logrotate configuré
- [ ] Pas d'erreurs critiques dans les logs

---

## PHASE 6: TESTS FINAUX (Jour 3)

### 6.1 Tests Fonctionnels

- [ ] **Frontend**:
  - [ ] Page login accessible
  - [ ] Authentification fonctionne
  - [ ] Dashboard charge correctement
  - [ ] Navigation entre modules OK
  - [ ] Formulaires fonctionnent

- [ ] **Backend API**:
  - [ ] /api/health retourne 200
  - [ ] /admin/ accessible
  - [ ] Authentification API fonctionne
  - [ ] CRUD operations fonctionnent

- [ ] **Base de données**:
  - [ ] Connexion PostgreSQL OK
  - [ ] Migrations appliquées
  - [ ] Données test créées

- [ ] **Performance**:
  - [ ] Temps de réponse < 2 secondes
  - [ ] Cache Redis actif
  - [ ] Compression gzip active
  - [ ] Static files servis correctement

### 6.2 Tests de Sécurité

- [ ] **HTTPS/SSL**:
  - [ ] Certificat SSL valide
  - [ ] HTTPS forcé (HTTP → HTTPS)
  - [ ] HSTS headers présents
  - [ ] Note A+ sur ssllabs.com

- [ ] **Headers de Sécurité**:
  ```bash
  curl -I https://votre-domaine.com
  ```
  - [ ] X-Frame-Options: DENY
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Strict-Transport-Security présent

- [ ] **Configuration**:
  - [ ] DEBUG=False
  - [ ] SECRET_KEY unique
  - [ ] .env non accessible publiquement
  - [ ] Admin URL sécurisé

### 6.3 Tests de Disponibilité

```bash
# Test uptime
curl -I https://votre-domaine.com
curl -I https://votre-domaine.com/api/health

# Test depuis plusieurs localisations
# Utiliser: https://www.uptrends.com/tools/uptime
```

- [ ] Site accessible depuis l'extérieur
- [ ] API répond correctement
- [ ] Temps de réponse acceptable (< 2s)

---

## PHASE 7: MONITORING CONTINU

### 7.1 Surveillance Quotidienne

**À vérifier chaque jour**:
- [ ] Backups DB créés automatiquement
- [ ] Logs sans erreurs critiques
- [ ] Espace disque > 20% libre
- [ ] Mémoire RAM disponible > 2GB
- [ ] Services actifs (gunicorn, nginx, postgresql, redis)

**Commandes utiles**:

```bash
# Status services
sudo systemctl status gunicorn nginx postgresql redis

# Espace disque
df -h

# Mémoire
free -h

# Derniers logs
tail -100 /var/log/wisebook/gunicorn-error.log

# CPU/RAM par processus
htop

# Derniers backups
ls -lh /home/wisebook/backups/db/ | tail -5
```

### 7.2 Mises à Jour

**Procédure de mise à jour**:

```bash
# 1. Backup complet
/home/wisebook/scripts/backup_db.sh

# 2. Pull code
cd /home/wisebook/wisebook
git pull origin main

# 3. Activer virtualenv
source venv/bin/activate

# 4. Installer nouvelles dépendances
pip install -r requirements.txt

# 5. Migrations
python manage.py migrate --settings=wisebook.simple_settings

# 6. Collecter static
python manage.py collectstatic --noinput --settings=wisebook.simple_settings

# 7. Redémarrer services
sudo systemctl restart gunicorn
sudo systemctl reload nginx

# 8. Vérifier
curl -I https://votre-domaine.com
tail -50 /var/log/wisebook/gunicorn-error.log
```

---

## CONTACTS SUPPORT

**En cas de problème**:
1. Consulter logs: `/var/log/wisebook/`
2. Vérifier status services: `sudo systemctl status SERVICE`
3. Tester configuration: `sudo nginx -t` et `python manage.py check`
4. Restaurer backup si nécessaire

**Ressources**:
- Documentation Django: https://docs.djangoproject.com
- Documentation Nginx: https://nginx.org/en/docs/
- Documentation PostgreSQL: https://www.postgresql.org/docs/

---

## RESUME FINAL

### Statut Déploiement

- [ ] **PHASE 1**: Environnement préparé
- [ ] **PHASE 2**: Application configurée
- [ ] **PHASE 3**: Serveur web configuré
- [ ] **PHASE 4**: SSL/TLS activé
- [ ] **PHASE 5**: Monitoring et backup
- [ ] **PHASE 6**: Tests finaux passés
- [ ] **PHASE 7**: Monitoring continu en place

### Métriques Cibles

| Métrique | Cible | Actuel |
|----------|-------|--------|
| Uptime | > 99.5% | ___ |
| Temps réponse | < 2s | ___ |
| Erreurs 5xx | < 0.1% | ___ |
| Backups quotidiens | 100% | ___ |
| SSL Grade | A+ | ___ |

---

**DEPLOYMENT READY**: Une fois toutes les cases cochées, le déploiement production est complet! 🚀

**Date de déploiement**: _______________
**Déployé par**: _______________
**Version déployée**: 3.0