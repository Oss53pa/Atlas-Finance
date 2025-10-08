# WiseBook V3.0 - Guide de Déploiement et Production

## Vue d'ensemble

Ce guide détaille les étapes pour déployer WiseBook V3.0 en production, de l'infrastructure aux optimisations de performance.

## Prérequis Infrastructure

### Serveur Principal
- **OS** : Ubuntu 22.04 LTS ou CentOS 8+ 
- **CPU** : Minimum 4 vCPU (8+ recommandé)
- **RAM** : Minimum 8GB (16GB+ recommandé)
- **Stockage** : SSD 100GB+ (500GB+ recommandé)
- **Réseau** : Bande passante 100Mbps+

### Base de Données
- **PostgreSQL 15+** avec extensions requises
- **Stockage** : SSD dédié pour performances optimales
- **Sauvegarde** : Réplication master/slave recommandée

### Cache et Messages
- **Redis 7+** pour cache et sessions
- **Celery** avec Redis comme broker
- **Flower** pour monitoring des tâches

## Installation Infrastructure

### 1. Serveur Web et Base de Données

```bash
# Mise à jour système
sudo apt update && sudo apt upgrade -y

# Installation PostgreSQL 15
sudo apt install postgresql-15 postgresql-contrib-15 -y

# Configuration PostgreSQL
sudo -u postgres createdb wisebook_prod
sudo -u postgres createuser wisebook_user
sudo -u postgres psql -c "ALTER USER wisebook_user WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE wisebook_prod TO wisebook_user;"

# Installation Redis
sudo apt install redis-server -y
sudo systemctl enable redis-server
sudo systemctl start redis-server
```

### 2. Python et Dépendances

```bash
# Installation Python 3.11+
sudo apt install python3.11 python3.11-venv python3.11-dev -y

# Création environnement virtuel
python3.11 -m venv /opt/wisebook/venv
source /opt/wisebook/venv/bin/activate

# Installation dépendances
pip install -r requirements.txt
pip install gunicorn gevent psycopg2-binary
```

### 3. Serveur Web (Nginx)

```bash
# Installation Nginx
sudo apt install nginx -y

# Configuration SSL avec Let's Encrypt
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com
```

## Configuration Production

### 1. Variables d'Environnement

Créer `/opt/wisebook/.env` :

```bash
# Django Settings
DEBUG=False
SECRET_KEY=your-very-secure-secret-key
ALLOWED_HOSTS=yourdomain.com,www.yourdomain.com

# Database
DATABASE_URL=postgresql://wisebook_user:password@localhost:5432/wisebook_prod

# Cache
REDIS_URL=redis://localhost:6379/0
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2

# Email Configuration
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@domain.com
EMAIL_HOST_PASSWORD=your-app-password

# APIs Externes
INSEE_API_KEY=your-insee-api-key
EXCHANGE_RATE_API_KEY=your-exchange-api-key

# APIs Bancaires
PSD2_CLIENT_ID=your-psd2-client-id
PSD2_CLIENT_SECRET=your-psd2-client-secret

# APIs Fiscales OHADA
CI_FISCAL_API_KEY=your-ci-api-key
SN_FISCAL_API_KEY=your-sn-api-key
ML_FISCAL_API_KEY=your-ml-api-key

# Sécurité
WEBHOOK_SECRET=your-webhook-secret
JWT_SECRET_KEY=your-jwt-secret

# Logging
LOG_LEVEL=INFO
SENTRY_DSN=your-sentry-dsn

# File Storage
AWS_ACCESS_KEY_ID=your-aws-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
AWS_STORAGE_BUCKET_NAME=wisebook-prod-media
```

### 2. Configuration Nginx

Créer `/etc/nginx/sites-available/wisebook` :

```nginx
upstream wisebook_app {
    server 127.0.0.1:8000;
    server 127.0.0.1:8001;  # Pour load balancing
}

server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL Configuration optimisée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Referrer-Policy strict-origin-when-cross-origin;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1000;
    gzip_types text/plain application/javascript text/css application/json;

    # Static files
    location /static/ {
        alias /opt/wisebook/staticfiles/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /opt/wisebook/media/;
        expires 1M;
    }

    # API endpoints avec rate limiting
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://wisebook_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Application principale
    location / {
        proxy_pass http://wisebook_app;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}

# Rate limiting zones
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
}
```

### 3. Services Systemd

Créer `/etc/systemd/system/wisebook.service` :

```ini
[Unit]
Description=WiseBook Django Application
After=network.target postgresql.service redis.service
Wants=postgresql.service redis.service

[Service]
Type=exec
User=wisebook
Group=wisebook
WorkingDirectory=/opt/wisebook
Environment=PATH=/opt/wisebook/venv/bin
EnvironmentFile=/opt/wisebook/.env
ExecStart=/opt/wisebook/venv/bin/gunicorn --bind 0.0.0.0:8000 --workers 4 --worker-class gevent --worker-connections 1000 --max-requests 1000 --max-requests-jitter 50 wisebook.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Créer `/etc/systemd/system/wisebook-celery.service` :

```ini
[Unit]
Description=WiseBook Celery Worker
After=network.target redis.service
Wants=redis.service

[Service]
Type=exec
User=wisebook
Group=wisebook
WorkingDirectory=/opt/wisebook
Environment=PATH=/opt/wisebook/venv/bin
EnvironmentFile=/opt/wisebook/.env
ExecStart=/opt/wisebook/venv/bin/celery -A wisebook worker --loglevel=info --concurrency=4
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Créer `/etc/systemd/system/wisebook-celery-beat.service` :

```ini
[Unit]
Description=WiseBook Celery Beat Scheduler
After=network.target redis.service
Wants=redis.service

[Service]
Type=exec
User=wisebook
Group=wisebook
WorkingDirectory=/opt/wisebook
Environment=PATH=/opt/wisebook/venv/bin
EnvironmentFile=/opt/wisebook/.env
ExecStart=/opt/wisebook/venv/bin/celery -A wisebook beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
ExecReload=/bin/kill -s HUP $MAINPID
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

## Déploiement Application

### 1. Préparation Code

```bash
# Clone du repository
cd /opt
sudo git clone https://github.com/your-org/wisebook.git
sudo chown -R wisebook:wisebook /opt/wisebook

# Activation environnement
cd /opt/wisebook
source venv/bin/activate

# Installation dépendances
pip install -r requirements.txt

# Configuration Django
export DJANGO_SETTINGS_MODULE=wisebook.settings.production
```

### 2. Base de Données

```bash
# Migrations
python manage.py migrate

# Configuration système par défaut
python manage.py setup_default_config

# Collecte des fichiers statiques
python manage.py collectstatic --noinput

# Création superutilisateur
python manage.py createsuperuser
```

### 3. Démarrage Services

```bash
# Activation des services
sudo systemctl daemon-reload
sudo systemctl enable nginx wisebook wisebook-celery wisebook-celery-beat
sudo systemctl start nginx wisebook wisebook-celery wisebook-celery-beat

# Vérification statut
sudo systemctl status wisebook
sudo systemctl status wisebook-celery
sudo systemctl status wisebook-celery-beat
```

## Monitoring et Observabilité

### 1. Logs Centralisés

Configuration dans `/opt/wisebook/logging.conf` :

```python
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/wisebook/application.log',
            'maxBytes': 100*1024*1024,  # 100MB
            'backupCount': 10,
            'formatter': 'verbose',
        },
        'celery_file': {
            'level': 'INFO',
            'class': 'logging.handlers.RotatingFileHandler',
            'filename': '/var/log/wisebook/celery.log',
            'maxBytes': 100*1024*1024,
            'backupCount': 5,
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['file'],
        'level': 'INFO',
    },
    'loggers': {
        'celery': {
            'handlers': ['celery_file'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}
```

### 2. Monitoring Système

Installation de monitoring tools :

```bash
# Installation Prometheus + Grafana
sudo apt install prometheus grafana -y

# Installation Node Exporter
sudo apt install prometheus-node-exporter -y

# Configuration Grafana
sudo systemctl enable grafana-server
sudo systemctl start grafana-server
```

### 3. Alertes Automatiques

Configuration des alertes critiques :

- **Santé application** : Status 5xx > 1%
- **Performance** : Temps réponse > 2s
- **Base de données** : Connexions > 80%
- **Stockage** : Espace disque > 85%
- **Celery** : Queue > 100 tâches
- **APIs externes** : Taux échec > 5%

## Sauvegardes et Récupération

### 1. Sauvegarde Base de Données

Script automatique `/opt/wisebook/scripts/backup.sh` :

```bash
#!/bin/bash
BACKUP_DIR="/opt/backups"
DB_NAME="wisebook_prod"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Création sauvegarde
pg_dump -h localhost -U wisebook_user $DB_NAME | gzip > $BACKUP_DIR/wisebook_$TIMESTAMP.sql.gz

# Nettoyage anciennes sauvegardes (garder 30 jours)
find $BACKUP_DIR -name "wisebook_*.sql.gz" -mtime +30 -delete

# Upload vers S3
aws s3 cp $BACKUP_DIR/wisebook_$TIMESTAMP.sql.gz s3://wisebook-backups/
```

### 2. Automatisation via Cron

```bash
# Sauvegarde quotidienne à 2h
0 2 * * * /opt/wisebook/scripts/backup.sh

# Vérification santé système
*/5 * * * * /opt/wisebook/venv/bin/python /opt/wisebook/manage.py system_health_check

# Nettoyage logs
0 3 * * 0 /opt/wisebook/scripts/cleanup_logs.sh
```

## Optimisations Performance

### 1. Base de Données

Optimisations PostgreSQL dans `/etc/postgresql/15/main/postgresql.conf` :

```sql
# Memory
shared_buffers = 2GB
effective_cache_size = 6GB
work_mem = 64MB
maintenance_work_mem = 512MB

# Checkpoints
checkpoint_segments = 32
checkpoint_completion_target = 0.9

# WAL
wal_buffers = 16MB
wal_level = replica

# Query planner
random_page_cost = 1.1
effective_io_concurrency = 200
```

### 2. Cache Strategy

Configuration Redis optimisée :

```redis
# Memory policy
maxmemory 2gb
maxmemory-policy allkeys-lru

# Persistence
save 900 1
save 300 10
save 60 10000

# Network
tcp-keepalive 300
timeout 0
```

### 3. Application Django

Optimisations dans `settings/production.py` :

```python
# Cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/0',
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
            'CONNECTION_POOL_KWARGS': {
                'max_connections': 50,
                'retry_on_timeout': True,
            }
        },
        'KEY_PREFIX': 'wisebook',
        'TIMEOUT': 300,
    }
}

# Sessions
SESSION_ENGINE = 'django.contrib.sessions.backends.cache'
SESSION_CACHE_ALIAS = 'default'
SESSION_COOKIE_AGE = 3600  # 1 heure

# Database connection pooling
DATABASES['default']['CONN_MAX_AGE'] = 300
DATABASES['default']['OPTIONS'] = {
    'MAX_CONNS': 20,
    'MIN_CONNS': 5,
}
```

## Sécurité Production

### 1. Firewall et Accès

```bash
# Configuration UFW
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow from 10.0.0.0/8 to any port 5432  # PostgreSQL internal only
```

### 2. SSL/TLS

Renouvellement automatique Let's Encrypt :

```bash
# Cron job renouvellement
0 3 */15 * * certbot renew --quiet && systemctl reload nginx
```

### 3. Audit Sécurité

Configuration auditd pour traçabilité :

```bash
# Installation auditd
sudo apt install auditd -y

# Règles audit spécifiques WiseBook
echo "-w /opt/wisebook -p wa -k wisebook_changes" >> /etc/audit/rules.d/wisebook.rules
```

## Procédures de Déploiement

### 1. Déploiement Continu

Script de déploiement `/opt/wisebook/scripts/deploy.sh` :

```bash
#!/bin/bash
set -e

echo "🚀 Déploiement WiseBook V3.0"

# Pull dernière version
git pull origin main

# Activation environnement
source venv/bin/activate

# Installation/mise à jour dépendances
pip install -r requirements.txt

# Migrations base de données
python manage.py migrate --noinput

# Collecte fichiers statiques
python manage.py collectstatic --noinput --clear

# Vérification santé avant redémarrage
python manage.py check --deploy

# Redémarrage services
sudo systemctl reload wisebook
sudo systemctl restart wisebook-celery

# Test post-déploiement
sleep 10
curl -f https://yourdomain.com/health/ || (echo "❌ Health check failed" && exit 1)

echo "✅ Déploiement réussi"
```

### 2. Rollback

Script de rollback `/opt/wisebook/scripts/rollback.sh` :

```bash
#!/bin/bash
PREVIOUS_COMMIT=$1

if [ -z "$PREVIOUS_COMMIT" ]; then
    echo "Usage: ./rollback.sh <commit-hash>"
    exit 1
fi

echo "🔄 Rollback vers $PREVIOUS_COMMIT"

# Rollback code
git checkout $PREVIOUS_COMMIT

# Rollback migrations si nécessaire
# python manage.py migrate app_name previous_migration

# Redémarrage
sudo systemctl restart wisebook wisebook-celery

echo "✅ Rollback terminé"
```

## Tests Production

### 1. Smoke Tests

```bash
# Tests de base post-déploiement
curl -f https://yourdomain.com/health/
curl -f https://yourdomain.com/api/v1/auth/login/
curl -f https://yourdomain.com/admin/login/
```

### 2. Tests de Charge

Utilisation de Locust pour tests de charge :

```python
from locust import HttpUser, task, between

class WiseBookUser(HttpUser):
    wait_time = between(1, 3)
    
    def on_start(self):
        # Login
        self.client.post("/api/v1/auth/login/", json={
            "email": "test@example.com",
            "password": "password"
        })
    
    @task(3)
    def view_dashboard(self):
        self.client.get("/api/v1/dashboard/")
    
    @task(2)
    def view_accounts(self):
        self.client.get("/api/v1/comptes/")
    
    @task(1)
    def create_entry(self):
        self.client.post("/api/v1/ecritures/", json={
            "journal": "VTE",
            "date_comptable": "2024-01-15",
            "libelle": "Test entry"
        })
```

## Maintenance Production

### 1. Tâches Récurrentes

- **Quotidien** : Sauvegarde, vérification santé système
- **Hebdomadaire** : Nettoyage logs, optimisation base de données
- **Mensuel** : Mise à jour sécurité, analyse performance
- **Trimestriel** : Tests de récupération, audit sécurité

### 2. Surveillance Continue

KPIs à surveiller :
- **Performance** : Temps de réponse < 1s (95ème percentile)
- **Disponibilité** : Uptime > 99.9%
- **Erreurs** : Taux d'erreur < 0.1%
- **Utilisation** : CPU < 70%, RAM < 80%, Disk < 85%

Ce guide assure un déploiement robuste et sécurisé de WiseBook V3.0 en production ! 🚀