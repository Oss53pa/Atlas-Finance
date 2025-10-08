# Backend WiseBook - Django REST API

## 🚀 Démarrage Rapide (3 minutes)

```bash
# 1. Activer l'environnement
venv\Scripts\activate

# 2. Simplifier les apps (DÉJÀ FAIT)
# Phase 1: core, authentication, accounting, third_party, api, workspaces

# 3. Créer les migrations
python manage.py makemigrations
python manage.py migrate

# 4. Charger données de base
python scripts\setup_phase1.py

# 5. Créer admin
python manage.py createsuperuser

# 6. Lancer le serveur
python manage.py runserver
```

## 📖 Documentation Complète

- **BACKEND_READY_TO_START.md** - Guide complet de démarrage
- **GUIDE_DEMARRAGE_BACKEND.md** - Instructions détaillées
- **BACKEND_STATUS_REPORT.md** - Rapport d'état technique

## 🌐 URLs Importantes

- Admin: http://localhost:8000/admin/
- API: http://localhost:8000/api/v1/
- Docs: http://localhost:8000/api/docs/

## ✅ Travaux Réalisés

1. ✅ Modèles nettoyés et standardisés
2. ✅ Imports circulaires corrigés
3. ✅ Apps simplifiées (Phase 1 seulement)
4. ✅ Script setup créé
5. ✅ Documentation complète

## ⚠️ Important

**NE PAS activer les apps Phase 2** avant que Phase 1 fonctionne à 100%!

Apps Phase 2 (désactivées):
- treasury, assets, budget, taxation, reporting, etc.

## 🎯 Objectifs Phase 1

- [ ] Migrations créées
- [ ] DB initialisée
- [ ] API fonctionne
- [ ] CRUD complet testé

## 🆘 Problème ?

Si `python manage.py check` échoue:
1. Vérifier que les apps Phase 2 sont commentées dans `wisebook/settings/base.py`
2. Vérifier les imports dans `apps/api/serializers.py`
3. Consulter GUIDE_DEMARRAGE_BACKEND.md

---

**Status:** ✅ Prêt pour migrations
**Date:** 2025-10-08
