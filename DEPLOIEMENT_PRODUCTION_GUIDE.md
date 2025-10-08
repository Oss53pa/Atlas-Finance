# GUIDE DE DEPLOIEMENT PRODUCTION - WISEBOOK ERP

Version: 1.0
Date: 27 Septembre 2025

## PREREQUIS

### Configuration Serveur
- CPU: 8+ vCPUs
- RAM: 16+ GB
- Stockage: 250 GB SSD
- OS: Ubuntu 22.04 LTS

### Logiciels
- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Nginx
- Node.js 18+

## INSTALLATION

### 1. PostgreSQL
```bash
sudo apt install postgresql
sudo -u postgres createdb wisebook_production
sudo -u postgres createuser wisebook_user
```

### 2. Application
```bash
cd /opt
git clone URL wisebook
cd wisebook
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 3. Configuration
- Copier .env.production vers .env
- Modifier SECRET_KEY, DB_PASSWORD
- DEBUG=False

### 4. Migrations
```bash
python manage.py migrate
python manage.py collectstatic
```

### 5. Frontend
```bash
cd frontend
npm install --production
npm run build
```

## NGINX

Configuration fichier /etc/nginx/sites-available/wisebook

## GUNICORN

Configuration Supervisor dans /etc/supervisor/conf.d/wisebook.conf

## SSL

```bash
sudo certbot --nginx -d votre-domaine.com
```

## VERIFICATIONS

```bash
curl https://votre-domaine.com/api/
sudo supervisorctl status wisebook
```

---
Guide cree le 27 Septembre 2025
