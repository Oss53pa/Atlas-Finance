# GUIDE DÉPLOIEMENT SERVEUR COMPLET - WISEBOOK ERP

**Version**: 3.0
**Date**: 27 Septembre 2025
**Durée estimée**: 2-3 jours
**Niveau**: Intermédiaire/Avancé

---

## OVERVIEW

Guide pas-à-pas pour déployer WiseBook ERP v3.0 en production sur un serveur Ubuntu.

**Stack finale**:
- Ubuntu 22.04 LTS
- PostgreSQL 15
- Redis 7
- Python 3.11 + Django 4.2.17
- Nginx + Gunicorn
- SSL/TLS (Let's Encrypt)

---

## ÉTAPE 1: PROVISIONNER SERVEUR UBUNTU

### 1.1 Choix Hébergeur

**Options recommandées**:

| Hébergeur | Prix/mois | RAM | CPU | Disque | Bande passante |
|-----------|-----------|-----|-----|--------|----------------|
| **DigitalOcean** (Droplet) | $40 | 8 GB | 4 vCPU | 160 GB SSD | 5 TB | ⭐ Recommandé
| **OVH** (VPS) | 35€ | 8 GB | 4 vCore | 160 GB NVMe | Illimité | ⭐ Europe
| **Hetzner** (Cloud Server) | 25€ | 8 GB | 4 vCPU | 160 GB SSD | 20 TB | 💰 Meilleur prix
| **AWS** (EC2 t3.large) | $70 | 8 GB | 2 vCPU | 100 GB EBS | Variable | Enterprise
| **Azure** (B2ms) | $65 | 8 GB | 2 vCPU | 100 GB | Variable | Enterprise

**Recommandation**: Hetzner (meilleur rapport qualité/prix) ou DigitalOcean (simplicité).

### 1.2 Créer Serveur

#### DigitalOcean (Exemple)

1. Créer compte: https://www.digitalocean.com/
2. Create → Droplets
3. **Image**: Ubuntu 22.04 LTS x64
4. **Plan**: Basic → Regular (8GB RAM / 4 vCPU - $40/mo)
5. **Datacenter**: Choisir région proche utilisateurs (ex: Frankfurt, Paris)
6. **Authentication**: SSH Key (recommandé) ou Password
7. **Hostname**: wisebook-prod
8. Create Droplet

#### Hetzner (Alternative)

1. Créer compte: https://www.hetzner.com/
2. Cloud → Servers → Add Server
3. **Location**: Falkenstein (Allemagne) ou Helsinki
4. **Image**: Ubuntu 22.04
5. **Type**: CPX31 (8GB RAM / 4 vCPU - 25€/mo)
6. **SSH Keys**: Ajouter clé SSH
7. Create & Buy

### 1.3 Connexion SSH Initiale

```bash
# Récupérer IP serveur (ex: 95.217.123.45)
ssh root@95.217.123.45

# Si utilisation clé SSH
ssh -i ~/.ssh/wisebook_key root@95.217.123.45
```

**Première connexion réussie** ✅

### 1.4 Configuration Initiale Sécurité

```bash
# Mise à jour système
apt update && apt upgrade -y

# Configuration firewall
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status

# Créer utilisateur non-root
adduser wisebook
# Suivre prompts (mot de passe, etc.)

# Ajouter aux sudoers
usermod -aG sudo wisebook

# Configurer SSH pour wisebook
mkdir -p /home/wisebook/.ssh
cp ~/.ssh/authorized_keys /home/wisebook/.ssh/
chown -R wisebook:wisebook /home/wisebook/.ssh
chmod 700 /home/wisebook/.ssh
chmod 600 /home/wisebook/.ssh/authorized_keys

# Test connexion utilisateur wisebook
# (depuis votre machine)
ssh wisebook@95.217.123.45
```

**Sécurité de base** ✅

---

## ÉTAPE 2: INSTALLER POSTGRESQL 15+

### 2.1 Installation

```bash
# Se connecter en tant que wisebook
ssh wisebook@95.217.123.45

# Ajouter repository PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo tee /etc/apt/trusted.gpg.d/pgdg.asc &>/dev/null

# Installer PostgreSQL 15
sudo apt update
sudo apt install postgresql-15 postgresql-contrib-15 -y

# Vérifier installation
sudo systemctl status postgresql
psql --version
# Devrait afficher: psql (PostgreSQL) 15.x
```

### 2.2 Configuration PostgreSQL

```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Dans le shell PostgreSQL:
```

```sql
-- Créer base de données
CREATE DATABASE wisebook_production;

-- Créer utilisateur
CREATE USER wisebook_user WITH PASSWORD 'VOTRE_MOT_DE_PASSE_FORT_ICI';

-- Configuration utilisateur
ALTER ROLE wisebook_user SET client_encoding TO 'utf8';
ALTER ROLE wisebook_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE wisebook_user SET timezone TO 'Africa/Douala';

-- Accorder privilèges
GRANT ALL PRIVILEGES ON DATABASE wisebook_production TO wisebook_user;

-- PostgreSQL 15: Accorder privilèges sur schéma public
\c wisebook_production
GRANT ALL ON SCHEMA public TO wisebook_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wisebook_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO wisebook_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO wisebook_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO wisebook_user;

-- Vérifier
\l
\du

-- Quitter
\q
```

### 2.3 Test Connexion

```bash
# Depuis utilisateur wisebook
psql -U wisebook_user -d wisebook_production -h localhost -W
# Entrer mot de passe

# Si connexion OK:
\dt
\q
```

**PostgreSQL 15 configuré** ✅

### 2.4 Configuration Performance (Optionnel)

```bash
# Éditer configuration PostgreSQL
sudo nano /etc/postgresql/15/main/postgresql.conf

# Ajuster selon RAM serveur (8GB):
# Décommenter et modifier:
shared_buffers = 2GB                # 25% de RAM
effective_cache_size = 6GB          # 75% de RAM
maintenance_work_mem = 512MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 10MB
min_wal_size = 1GB
max_wal_size = 4GB
max_worker_processes = 4
max_parallel_workers_per_gather = 2
max_parallel_workers = 4

# Sauvegarder et redémarrer
sudo systemctl restart postgresql
```

---

## ÉTAPE 3: INSTALLER REDIS 7+

### 3.1 Installation

```bash
# Ajouter repository Redis
curl -fsSL https://packages.redis.io/gpg | sudo gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/redis.list

# Installer Redis 7
sudo apt update
sudo apt install redis -y

# Vérifier installation
redis-server --version
# Devrait afficher: Redis server v=7.x.x
```

### 3.2 Configuration Redis

```bash
# Éditer configuration
sudo nano /etc/redis/redis.conf

# Modifications recommandées:
# Ligne ~69: Supervision systemd
supervised systemd

# Ligne ~88: Bind localhost seulement (sécurité)
bind 127.0.0.1 ::1

# Ligne ~250: Limiter mémoire (2GB sur serveur 8GB)
maxmemory 2gb

# Ligne ~267: Politique éviction
maxmemory-policy allkeys-lru

# Ligne ~503: Activer persistence RDB (backups)
save 900 1
save 300 10
save 60 10000

# Ligne ~700: Activer AOF (durabilité)
appendonly yes
appendfsync everysec

# Sauvegarder et quitter
```

### 3.3 Démarrage Redis

```bash
# Redémarrer avec nouvelle config
sudo systemctl restart redis-server
sudo systemctl enable redis-server

# Vérifier status
sudo systemctl status redis-server

# Test connexion
redis-cli ping
# Devrait retourner: PONG
```

**Redis 7 configuré** ✅

---

## ÉTAPE 4: CONFIGURER NGINX

### 4.1 Installation Nginx

```bash
# Installer Nginx
sudo apt install nginx -y

# Démarrer et activer
sudo systemctl start nginx
sudo systemctl enable nginx

# Vérifier
sudo systemctl status nginx
curl http://localhost
# Devrait afficher page Nginx par défaut
```

### 4.2 Configuration Firewall

```bash
# Autoriser Nginx
sudo ufw allow 'Nginx Full'
sudo ufw status

# Devrait montrer:
# 80/tcp     ALLOW       Nginx Full
# 443/tcp    ALLOW       Nginx Full
```

### 4.3 Test Accès Externe

Depuis votre navigateur:
```
http://VOTRE_IP_SERVEUR
```

Devrait afficher page "Welcome to nginx!"

**Nginx installé** ✅

---

## ÉTAPE 5: DÉPLOYER APPLICATION WISEBOOK

### 5.1 Installer Dépendances Système

```bash
# Python et outils
sudo apt install python3.11 python3.11-venv python3-pip python3.11-dev -y
sudo apt install build-essential libpq-dev git -y

# Vérifier Python
python3.11 --version
# Devrait afficher: Python 3.11.x
```

### 5.2 Cloner Repository

```bash
# Se placer dans home
cd /home/wisebook

# Cloner (remplacer URL par votre repo)
git clone https://github.com/VOTRE_USERNAME/wisebook.git
cd wisebook

# Vérifier
ls -la
```

### 5.3 Créer Virtualenv

```bash
# Créer virtualenv Python 3.11
python3.11 -m venv venv

# Activer
source venv/bin/activate

# Vérifier
which python
# Devrait afficher: /home/wisebook/wisebook/venv/bin/python

python --version
# Devrait afficher: Python 3.11.x
```

### 5.4 Installer Dépendances Python

```bash
# Mettre à jour pip
pip install --upgrade pip

# Installer requirements
pip install -r requirements.txt

# Installer Gunicorn et psycopg2
pip install gunicorn psycopg2-binary

# Vérifier installations critiques
pip list | grep -E "Django|gunicorn|psycopg2|redis"
```

### 5.5 Configurer .env Production

```bash
# Copier template
cp .env.example .env

# Éditer avec vraies valeurs
nano .env
```

**Contenu .env** (adapter):

```env
# Security
DEBUG=False
SECRET_KEY=GENERER_NOUVELLE_CLE_SECRETE_50_CARACTERES

# Allowed hosts (IMPORTANT!)
ALLOWED_HOSTS=wisebook.votre-domaine.com,www.wisebook.votre-domaine.com,VOTRE_IP_SERVEUR

# Database PostgreSQL
DB_NAME=wisebook_production
DB_USER=wisebook_user
DB_PASSWORD=LE_MOT_DE_PASSE_POSTGRESQL_DEFINI_PLUS_HAUT
DB_HOST=localhost
DB_PORT=5432

# Redis Cache
REDIS_URL=redis://localhost:6379/0

# CORS (adapter avec votre domaine)
CORS_ALLOWED_ORIGINS=https://wisebook.votre-domaine.com,https://www.wisebook.votre-domaine.com

# Security Headers
SECURE_SSL_REDIRECT=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SECURE_HSTS_SECONDS=31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS=True
SECURE_HSTS_PRELOAD=True

# Email (optionnel, configurer plus tard)
EMAIL_HOST=smtp.votre-domaine.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=noreply@votre-domaine.com
EMAIL_HOST_PASSWORD=MOT_DE_PASSE_EMAIL
```

**Générer SECRET_KEY**:

```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
# Copier résultat dans SECRET_KEY
```

### 5.6 Migrations et Static Files

```bash
# Activer virtualenv si pas déjà fait
source /home/wisebook/wisebook/venv/bin/activate

# Migrations
python manage.py migrate --settings=wisebook.simple_settings

# Créer superutilisateur
python manage.py createsuperuser --settings=wisebook.simple_settings
# Username: admin
# Email: admin@votre-domaine.com
# Password: MotDePasseFort123!

# Collecter static files
python manage.py collectstatic --noinput --settings=wisebook.simple_settings

# Vérifier
python manage.py check --settings=wisebook.simple_settings
# Devrait afficher: System check identified no issues
```

### 5.7 Test Django Fonctionne

```bash
# Test serveur dev (temporaire)
python manage.py runserver 0.0.0.0:8000 --settings=wisebook.simple_settings

# Depuis votre navigateur:
# http://VOTRE_IP_SERVEUR:8000/admin/
# Devrait afficher interface admin Django

# Ctrl+C pour arrêter
```

**Application déployée** ✅

---

## ÉTAPE 6: CONFIGURER GUNICORN

### 6.1 Test Gunicorn

```bash
# Activer virtualenv
source /home/wisebook/wisebook/venv/bin/activate

# Test Gunicorn
gunicorn --bind 0.0.0.0:8000 --workers 4 wisebook.wsgi:application

# Depuis navigateur: http://VOTRE_IP_SERVEUR:8000
# Devrait afficher application

# Ctrl+C pour arrêter
```

### 6.2 Créer Service Systemd

```bash
# Créer fichier service
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
    --env DJANGO_SETTINGS_MODULE=wisebook.simple_settings \
    wisebook.wsgi:application

Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 6.3 Créer Répertoire Logs

```bash
# Créer dossier logs
sudo mkdir -p /var/log/wisebook
sudo chown wisebook:www-data /var/log/wisebook
sudo chmod 755 /var/log/wisebook
```

### 6.4 Démarrer Gunicorn Service

```bash
# Recharger systemd
sudo systemctl daemon-reload

# Démarrer Gunicorn
sudo systemctl start gunicorn

# Activer démarrage automatique
sudo systemctl enable gunicorn

# Vérifier status
sudo systemctl status gunicorn

# Devrait afficher: active (running)

# Vérifier socket créé
ls -la /home/wisebook/wisebook/gunicorn.sock
# Devrait exister

# Vérifier logs
tail -20 /var/log/wisebook/gunicorn-error.log
# Ne devrait pas avoir d'erreurs
```

**Gunicorn configuré** ✅

---

## ÉTAPE 7: CONFIGURER NGINX REVERSE PROXY

### 7.1 Créer Configuration Site

```bash
# Créer fichier config
sudo nano /etc/nginx/sites-available/wisebook
```

**Contenu wisebook** (adapter domaine):

```nginx
upstream wisebook_server {
    server unix:/home/wisebook/wisebook/gunicorn.sock fail_timeout=0;
}

server {
    listen 80;
    server_name wisebook.votre-domaine.com www.wisebook.votre-domaine.com;

    client_max_body_size 100M;
    client_body_timeout 120s;

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
        add_header Cache-Control "public, no-transform";
    }

    # Frontend (si build dans frontend/dist)
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
        proxy_read_timeout 120s;
    }

    # Admin Django
    location /admin/ {
        proxy_pass http://wisebook_server;
        proxy_set_header Host $http_host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_redirect off;
    }
}
```

### 7.2 Activer Site

```bash
# Créer symlink
sudo ln -s /etc/nginx/sites-available/wisebook /etc/nginx/sites-enabled/

# Désactiver site par défaut
sudo rm /etc/nginx/sites-enabled/default

# Tester configuration
sudo nginx -t
# Devrait afficher: syntax is ok

# Redémarrer Nginx
sudo systemctl restart nginx

# Vérifier status
sudo systemctl status nginx
```

### 7.3 Configuration DNS

**Sur votre registrar de domaine** (Namecheap, OVH, Gandi, etc.):

Créer enregistrements DNS A:

```
Type    Nom                         Valeur (IP serveur)    TTL
A       wisebook.votre-domaine.com  95.217.123.45         3600
A       www.wisebook               95.217.123.45         3600
```

**Attendre propagation DNS** (5-60 minutes):

```bash
# Vérifier depuis votre machine
nslookup wisebook.votre-domaine.com
# Devrait retourner IP serveur

# Ou
dig wisebook.votre-domaine.com +short
```

### 7.4 Test Accès HTTP

Depuis navigateur:
```
http://wisebook.votre-domaine.com
```

Devrait afficher application WiseBook!

**Nginx reverse proxy configuré** ✅

---

## ÉTAPE 8: OBTENIR CERTIFICAT SSL (LET'S ENCRYPT)

### 8.1 Installer Certbot

```bash
# Installer Certbot
sudo apt install certbot python3-certbot-nginx -y

# Vérifier
certbot --version
```

### 8.2 Obtenir Certificat SSL

```bash
# Obtenir certificat (interactif)
sudo certbot --nginx -d wisebook.votre-domaine.com -d www.wisebook.votre-domaine.com

# Répondre aux prompts:
# Email: votre-email@exemple.com
# Terms: A (Agree)
# Newsletter: N (No)
# Redirect HTTP to HTTPS: 2 (Yes, redirect)

# Certbot va:
# 1. Vérifier domaine
# 2. Obtenir certificat
# 3. Configurer Nginx automatiquement
# 4. Activer HTTPS

# Si succès:
# Successfully deployed certificate!
```

### 8.3 Vérifier HTTPS

Depuis navigateur:
```
https://wisebook.votre-domaine.com
```

Devrait afficher:
- 🔒 Cadenas vert
- Connexion sécurisée
- Application WiseBook fonctionne

### 8.4 Configurer Renouvellement Automatique

```bash
# Test renouvellement (dry-run)
sudo certbot renew --dry-run

# Si succès, renouvellement auto configuré dans cron

# Vérifier cron job
sudo systemctl status certbot.timer
# Devrait être actif

# Certificat sera renouvelé automatiquement tous les 60 jours
```

**SSL/TLS activé** ✅

### 8.5 Tester SSL Grade

Aller sur: https://www.ssllabs.com/ssltest/

Entrer: `wisebook.votre-domaine.com`

**Cible**: Note A ou A+

---

## ÉTAPE 9: CONFIGURER BACKUPS AUTOMATIQUES

### 9.1 Créer Script Backup PostgreSQL

```bash
# Créer dossier scripts
mkdir -p /home/wisebook/scripts

# Créer script
nano /home/wisebook/scripts/backup_db.sh
```

**Contenu backup_db.sh**:

```bash
#!/bin/bash

# Configuration
BACKUP_DIR="/home/wisebook/backups/db"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="wisebook_production"
DB_USER="wisebook_user"
PGPASSWORD="VOTRE_MOT_DE_PASSE_POSTGRESQL"

# Créer dossier backup si inexistant
mkdir -p $BACKUP_DIR

# Export password pour pg_dump
export PGPASSWORD

# Backup avec compression
pg_dump -U $DB_USER -h localhost $DB_NAME | gzip > $BACKUP_DIR/wisebook_$DATE.sql.gz

# Unset password
unset PGPASSWORD

# Nettoyer vieux backups (garder 30 jours)
find $BACKUP_DIR -name "wisebook_*.sql.gz" -mtime +30 -delete

# Log
echo "$(date): Backup completed - wisebook_$DATE.sql.gz" >> /var/log/wisebook/backup.log

# Vérifier taille backup
BACKUP_SIZE=$(du -h $BACKUP_DIR/wisebook_$DATE.sql.gz | cut -f1)
echo "$(date): Backup size: $BACKUP_SIZE" >> /var/log/wisebook/backup.log
```

### 9.2 Rendre Script Exécutable

```bash
# Permissions
chmod +x /home/wisebook/scripts/backup_db.sh

# Créer dossiers
mkdir -p /home/wisebook/backups/db
sudo mkdir -p /var/log/wisebook
sudo chown wisebook:wisebook /var/log/wisebook

# Test manuel
/home/wisebook/scripts/backup_db.sh

# Vérifier backup créé
ls -lh /home/wisebook/backups/db/
# Devrait voir: wisebook_YYYYMMDD_HHMMSS.sql.gz
```

### 9.3 Configurer Cron Automatique

```bash
# Éditer crontab utilisateur wisebook
crontab -e

# Choisir éditeur (nano)

# Ajouter ligne (backup quotidien à 2h du matin):
0 2 * * * /home/wisebook/scripts/backup_db.sh >> /var/log/wisebook/backup-cron.log 2>&1

# Sauvegarder et quitter

# Vérifier cron
crontab -l
```

### 9.4 Test Restore Backup

```bash
# Test restore (sur base test)
gunzip < /home/wisebook/backups/db/wisebook_YYYYMMDD_HHMMSS.sql.gz | psql -U wisebook_user -d wisebook_test -h localhost

# Si succès, backups fonctionnent correctement
```

**Backups automatiques configurés** ✅

---

## ÉTAPE 10: MONITORING ET MAINTENANCE

### 10.1 Configurer Logrotate

```bash
# Créer config logrotate
sudo nano /etc/logrotate.d/wisebook
```

**Contenu**:

```
/var/log/wisebook/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    missingok
    create 0640 wisebook www-data
    sharedscripts
    postrotate
        systemctl reload gunicorn > /dev/null 2>&1 || true
    endscript
}
```

### 10.2 Monitoring Scripts

```bash
# Script status services
nano /home/wisebook/scripts/check_services.sh
```

**Contenu**:

```bash
#!/bin/bash

echo "=========================================="
echo "WISEBOOK SERVICES STATUS"
echo "$(date)"
echo "=========================================="

# PostgreSQL
echo -n "PostgreSQL: "
systemctl is-active postgresql
sudo systemctl status postgresql --no-pager -l | tail -3

# Redis
echo -n "Redis: "
systemctl is-active redis-server
redis-cli ping

# Gunicorn
echo -n "Gunicorn: "
systemctl is-active gunicorn
sudo systemctl status gunicorn --no-pager -l | tail -3

# Nginx
echo -n "Nginx: "
systemctl is-active nginx

# Disk space
echo "=========================================="
echo "DISK SPACE:"
df -h / | tail -1

# Memory
echo "=========================================="
echo "MEMORY:"
free -h | grep Mem

# Recent errors
echo "=========================================="
echo "RECENT ERRORS (last 10):"
tail -10 /var/log/wisebook/gunicorn-error.log
```

```bash
chmod +x /home/wisebook/scripts/check_services.sh

# Test
/home/wisebook/scripts/check_services.sh
```

### 10.3 Alertes Email (Optionnel)

```bash
# Installer mailutils
sudo apt install mailutils -y

# Script alerte
nano /home/wisebook/scripts/alert_disk_full.sh
```

**Contenu**:

```bash
#!/bin/bash

DISK_USAGE=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
THRESHOLD=80

if [ $DISK_USAGE -gt $THRESHOLD ]; then
    echo "ALERT: Disk usage is ${DISK_USAGE}%" | mail -s "WiseBook: Disk Alert" admin@votre-domaine.com
fi
```

```bash
chmod +x /home/wisebook/scripts/alert_disk_full.sh

# Ajouter au cron (check quotidien)
crontab -e
# Ajouter:
0 8 * * * /home/wisebook/scripts/alert_disk_full.sh
```

---

## RÉCAPITULATIF FINAL

### Services Actifs

| Service | Port | Status | Auto-start |
|---------|------|--------|-----------|
| PostgreSQL 15 | 5432 | ✅ Running | ✅ Enabled |
| Redis 7 | 6379 | ✅ Running | ✅ Enabled |
| Gunicorn | unix socket | ✅ Running | ✅ Enabled |
| Nginx | 80, 443 | ✅ Running | ✅ Enabled |

### URLs Accessibles

- **Application**: https://wisebook.votre-domaine.com
- **Admin Django**: https://wisebook.votre-domaine.com/admin/
- **API**: https://wisebook.votre-domaine.com/api/

### Commandes Utiles

```bash
# Status tous services
sudo systemctl status postgresql redis-server gunicorn nginx

# Redémarrer application
sudo systemctl restart gunicorn
sudo systemctl reload nginx

# Logs en temps réel
tail -f /var/log/wisebook/gunicorn-error.log
tail -f /var/log/nginx/wisebook-error.log

# Backup manuel
/home/wisebook/scripts/backup_db.sh

# Check services
/home/wisebook/scripts/check_services.sh
```

### Sécurité

- [x] Firewall UFW actif
- [x] SSH clés seulement
- [x] Utilisateur non-root
- [x] PostgreSQL localhost only
- [x] Redis localhost only
- [x] SSL/TLS A+ grade
- [x] Security headers actifs

### Backups

- [x] PostgreSQL backup quotidien (2h)
- [x] Rétention 30 jours
- [x] Logs backups
- [x] Test restore OK

---

## TROUBLESHOOTING

### Gunicorn ne démarre pas

```bash
# Voir erreurs détaillées
sudo journalctl -u gunicorn -n 50

# Vérifier permissions socket
ls -la /home/wisebook/wisebook/gunicorn.sock

# Tester manuellement
source /home/wisebook/wisebook/venv/bin/activate
gunicorn --bind 0.0.0.0:8000 wisebook.wsgi:application
```

### Nginx 502 Bad Gateway

```bash
# Vérifier Gunicorn actif
sudo systemctl status gunicorn

# Vérifier socket existe
ls -la /home/wisebook/wisebook/gunicorn.sock

# Vérifier permissions
sudo chown wisebook:www-data /home/wisebook/wisebook/gunicorn.sock
```

### PostgreSQL connexion refusée

```bash
# Vérifier service actif
sudo systemctl status postgresql

# Vérifier configuration
sudo nano /etc/postgresql/15/main/pg_hba.conf
# Devrait avoir: local   all   all   md5

# Redémarrer
sudo systemctl restart postgresql
```

---

## NEXT STEPS

Après déploiement réussi:

1. **Tests utilisateurs** - Inviter équipe tester
2. **Monitoring avancé** - Installer Sentry, Datadog
3. **CDN** - Cloudflare pour performance
4. **Scaling** - Load balancer si nécessaire
5. **Documentation utilisateur** - Créer guides

---

**DÉPLOIEMENT COMPLET** ✅

Durée totale: 2-3 jours
Budget: 25-40€/mois

**WiseBook ERP est maintenant en production!** 🚀