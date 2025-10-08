# SPÉCIFICATION DES EXIGENCES LOGICIELLES
# WiseBook - Capacités Fonctionnelles Détaillées

**Document:** SRS-FUNCTIONAL-2025  
**Version:** 1.0  
**Date:** Janvier 2025  
**Classification:** Confidentiel - Praedium Tech

## MATRICE DE COMPATIBILITÉ IMPORT

### Formats et Logiciels Supportés

| Source | Format Import | Éléments Migrés | Temps Estimé | Taux Succès |
|--------|--------------|-----------------|--------------|-------------|
| Excel/CSV | .xlsx, .xls, .csv | Plan comptable, Balance, Écritures, Tiers | 30 min | 99% |
| SAGE Compta | .PNM, .TXT, Backup | Tout + lettrage + analytique | 2-4h | 95% |
| QuickBooks | .QBB, .IIF | Tout sauf documents | 2-3h | 90% |
| SAP | BAPI, CSV exports | Tout + multi-sociétés | 4-8h | 85% |
| Oracle NetSuite | API, CSV | Tout + dimensions | 4-6h | 85% |
| Microsoft Dynamics | DMF, CSV | Tout + workflows | 3-5h | 90% |
| CIEL Compta | .sgbdr, TXT | Plan, écritures, tiers | 2-3h | 95% |
| EBP Compta | Backup, TXT | Tout sauf GED | 2-3h | 95% |
| FEC France | .txt (norme) | Écritures complètes | 1-2h | 100% |
| Autres via Excel | Templates fournis | Selon template | 1-4h | Variable |

### Volumes Maximaux Supportés

| Type de Données | Volume Max | Performance |
|-----------------|------------|-------------|
| Comptes comptables | 100,000 | < 1 minute |
| Écritures par import | 1,000,000 | < 30 minutes |
| Tiers (clients + fournisseurs) | 100,000 | < 5 minutes |
| Immobilisations | 50,000 | < 10 minutes |
| Documents attachés | 100,000 | < 2 heures |
| Taille fichier import | 2 GB | Variable |

### Outils de Migration Fournis

#### Templates Excel Standards

Le système FOURNIT :

✅ **Template Plan Comptable SYSCOHADA.xlsx**
- Colonnes : Code (9 pos) | Libellé | Nature | Sens | Compte Parent
- Validation intégrée
- 1000 comptes pré-remplis
- Instructions détaillées

✅ **Template Balance Ouverture.xlsx**
- Colonnes : Compte | Libellé | Débit | Crédit | Devise
- Contrôle équilibre automatique
- Formules de vérification
- Multi-devises supporté

✅ **Template Écritures.xlsx**
- Colonnes : Date | Journal | Compte | Tiers | Libellé | Débit | Crédit | Analytique
- 10,000 lignes maximum par fichier
- Validation des dates
- Codes journaux standard

✅ **Template Tiers.xlsx**
- Colonnes : Code | Type | Nom | NIF | RCCM | Adresse | Contact | Email | Conditions
- Détection doublons
- Génération codes auto
- Validation emails

✅ **Template Immobilisations.xlsx**
- Colonnes : Code | Libellé | Date Acq | Valeur | Durée | Méthode | Cumul Amort
- Calcul automatique VNC
- Plan amortissement inclus

#### Utilitaires de Conversion

Le système INCLUT :

✅ **Convertisseur SAGE → SYSCOHADA**
- Application standalone
- Lit directement fichiers SAGE
- Mapping automatique 90%
- Interface de correction
- Génère fichiers WiseBook

✅ **Analyseur FEC**
- Valide format FEC
- Détecte anomalies
- Propose corrections
- Convertit vers SYSCOHADA
- Rapport de conformité

✅ **Outil de Mapping Universel**
- Interface graphique
- Glisser-déposer colonnes
- Prévisualisation temps réel
- Sauvegarde mappings
- Réutilisable

### Processus de Migration Type

#### Phase 1 : Préparation (J-30)
✅ Audit système source  
✅ Extraction données test  
✅ Mapping comptes/tiers  
✅ Formation équipe  
✅ Validation approche  

#### Phase 2 : Migration Test (J-15)
✅ Import en environnement test  
✅ Validation balances  
✅ Tests utilisateurs  
✅ Corrections identifiées  
✅ Go/No-Go decision  

#### Phase 3 : Migration Finale (Jour J)
✅ Arrêt système source (vendredi soir)  
✅ Export données finales  
✅ Import dans WiseBook (nuit)  
✅ Validations automatiques  
✅ Contrôles manuels (samedi)  
✅ Go-Live (lundi matin)  

#### Phase 4 : Post-Migration (J+1 à J+30)
✅ Support intensif J+1 à J+5  
✅ Corrections mineures  
✅ Formation complémentaire  
✅ Optimisations  
✅ Clôture projet migration  

### Services de Migration

#### Migration Assistée (Recommandé)
Praedium Tech PROPOSE :
- Consultant expert dédié
- Audit et analyse préalable
- Plan de migration détaillé
- Exécution migration test
- Support jour de bascule
- Validation avec auditeur
- Formation post-migration
- Garantie résultat 100%

#### Migration Autonome
Documentation FOURNIE :
- Guide pas-à-pas illustré
- Vidéos tutoriels (5h)
- Templates et outils
- Checklist validation
- FAQ 100+ questions
- Forum communautaire
- Support email 48h
- Succès moyen 85%

### Points de Contrôle Migration

**Avant Migration**
- [ ] Backup complet système source
- [ ] Exercice en cours clôturé
- [ ] Lettrage à jour
- [ ] Balance équilibrée
- [ ] Documents essentiels identifiés

**Pendant Migration**
- [ ] Import plan comptable OK
- [ ] Import balance OK
- [ ] Import tiers OK
- [ ] Import historique OK
- [ ] Équilibres vérifiés

**Après Migration**
- [ ] Balance identique source
- [ ] Lettrage préservé
- [ ] Documents accessibles
- [ ] Utilisateurs connectés
- [ ] Première clôture réussie

### Garanties de Migration

WiseBook GARANTIT :

✅ **Intégrité des données**
- Aucune perte de données
- Balances identiques
- Historique complet préservé

✅ **Conformité maintenue**
- Respect SYSCOHADA
- Piste audit conservée
- Documents légaux transférés

✅ **Performance post-migration**
- Temps réponse < 2s
- Rapports < 10s
- Clôture < 2h

✅ **Support étendu**
- Hotline prioritaire 3 mois
- Corrections bugs gratuits
- Optimisations incluses

---

## 1. MODULE COMPTABILITÉ GÉNÉRALE

### 1.1 CE QUE LE MODULE DOIT FAIRE

#### 1.1.1 Gestion du Plan Comptable SYSCOHADA

Le système DOIT être capable de :

✅ **Créer un compte comptable**
- Accepter un code à 9 chiffres maximum
- Vérifier que le code respecte la nomenclature SYSCOHADA
- Contrôler que la classe (1er chiffre) est entre 1 et 9
- Imposer un libellé obligatoire en français
- Définir la nature du compte (Débiteur/Créditeur/Mixte)
- Rattacher automatiquement au compte parent selon la hiérarchie
- Interdire la création si le compte parent n'existe pas
- Générer une alerte si compte non conforme au plan standard

✅ **Modifier un compte existant**
- Permettre la modification du libellé uniquement
- Interdire la modification du code si des écritures existent
- Autoriser le changement de nature avec validation DAF
- Tracer toutes les modifications dans l'audit trail
- Notifier les utilisateurs impactés par le changement

✅ **Désactiver/Réactiver un compte**
- Bloquer la saisie sur comptes inactifs
- Conserver l'historique des mouvements
- Permettre la consultation des comptes inactifs
- Réactiver uniquement avec droits administrateur

✅ **Importer un plan comptable**
- Accepter les formats Excel (.xlsx) et CSV
- Valider chaque ligne selon les règles SYSCOHADA
- Rejeter l'import complet si une erreur critique
- Générer un rapport d'import avec succès/échecs
- Permettre l'import partiel avec confirmation

✅ **Rechercher et filtrer les comptes**
- Recherche par code (exact ou partiel)
- Recherche par libellé (contient)
- Filtrage par classe, nature, statut
- Affichage hiérarchique ou liste plate
- Export des résultats en Excel

#### 1.1.2 Saisie d'Écritures Comptables

Le système DOIT être capable de :

✅ **Créer une nouvelle écriture**
- Générer automatiquement un numéro unique séquentiel
- Format: [JOURNAL]-[ANNÉE]-[NUMÉRO sur 5 chiffres]
- Proposer la date du jour par défaut (modifiable)
- Interdire les dates hors exercice ouvert
- Exiger au minimum 2 lignes d'écriture
- Vérifier l'équilibre débit = crédit en temps réel
- Bloquer la validation si déséquilibré
- Afficher l'écart en rouge si déséquilibre

✅ **Saisir les lignes d'écriture**
- Proposer les comptes par auto-complétion (dès 2 caractères)
- Afficher le libellé du compte sélectionné
- Suggérer les derniers comptes utilisés
- Calculer automatiquement la TVA si compte de TVA
- Proposer le montant d'équilibrage sur la dernière ligne
- Permettre la copie de lignes existantes
- Limiter à 999 lignes maximum par écriture

✅ **Attacher des pièces justificatives**
- Accepter PDF, JPG, PNG (max 50 MB par fichier)
- Scanner et OCR automatique des factures
- Extraire montant, date, fournisseur par OCR
- Lier obligatoirement pour certains journaux
- Stocker dans GED avec nommage automatique
- Permettre la visualisation sans téléchargement

✅ **Valider et comptabiliser**
- Contrôler l'équilibre obligatoire
- Vérifier l'existence des comptes utilisés
- Valider les dates dans l'exercice
- Générer les écritures de TVA automatiques
- Mettre à jour les soldes en temps réel
- Rendre l'écriture non modifiable après validation
- Envoyer notification si workflow de validation

✅ **Dupliquer une écriture**
- Copier toutes les lignes sauf le numéro
- Proposer la date du jour
- Permettre la modification avant validation
- Conserver le lien avec l'écriture source

#### 1.1.3 Gestion des Journaux

Le système DOIT être capable de :

✅ **Gérer les journaux standards SYSCOHADA**
- Créer automatiquement les 6 journaux obligatoires :
  - AC (Achats)
  - VE (Ventes)
  - BQ (Banque) - multiple possible
  - CA (Caisse)
  - OD (Opérations Diverses)
  - AN (À-Nouveaux)
- Paramétrer le compte de contrepartie par défaut
- Définir la numérotation (continue ou mensuelle)
- Bloquer la suppression des journaux avec écritures

✅ **Centraliser les journaux**
- Générer automatiquement les écritures de centralisation
- Centraliser mensuellement par défaut
- Permettre centralisation manuelle
- Créer une écriture par journal auxiliaire
- Reporter dans le journal général

✅ **Éditer les journaux**
- Afficher le journal détaillé (toutes écritures)
- Afficher le journal centralisé (totaux mensuels)
- Filtrer par période, compte, montant
- Exporter en PDF avec mise en page légale
- Imprimer avec foliotage automatique

#### 1.1.4 Grand Livre et Balance

Le système DOIT être capable de :

✅ **Générer le Grand Livre**
- Afficher tous les mouvements par compte
- Trier par date ou numéro de pièce
- Calculer le solde progressif
- Inclure les écritures lettrées/non lettrées
- Filtrer par période, journal, statut
- Exporter en Excel avec formules
- Imprimer par compte ou global

✅ **Produire la Balance Générale**
- Calculer pour chaque compte :
  - Solde début de période
  - Total débit période
  - Total crédit période
  - Solde fin de période
- Vérifier l'équilibre total débit = crédit
- Afficher par niveau (1 à 9 positions)
- Comparer N vs N-1
- Exporter format SYSCOHADA

✅ **Balance Âgée (Clients/Fournisseurs)**
- Ventiler les soldes par ancienneté :
  - 0-30 jours
  - 31-60 jours
  - 61-90 jours
  - Plus de 90 jours
- Calculer les provisions automatiquement
- Identifier les comptes à risque
- Générer les lettres de relance

#### 1.1.5 Lettrage et Rapprochement

Le système DOIT être capable de :

✅ **Lettrer automatiquement**
- Détecter les montants identiques
- Proposer les combinaisons possibles
- Lettrer par référence facture
- Utiliser le Machine Learning pour améliorer
- Atteindre 95% de lettrage automatique
- Générer un code lettrage unique (A-ZZZ)

✅ **Lettrer manuellement**
- Sélectionner plusieurs lignes débit/crédit
- Vérifier l'équilibre avant lettrage
- Permettre le lettrage partiel
- Calculer et proposer l'écart acceptable
- Générer l'écriture d'écart si nécessaire

✅ **Délettrer**
- Annuler un lettrage existant
- Remettre les lignes en non lettré
- Tracer l'opération dans l'audit
- Notifier si impact sur provisions

---

## 2. MODULE COMPTABILITÉ CLIENTS

### 2.1 CE QUE LE MODULE DOIT FAIRE

#### 2.1.1 Gestion de la Base Clients

Le système DOIT être capable de :

✅ **Créer une fiche client complète**
- Générer un code client unique automatique
- Format: C[PAYS][NUMÉRO] ex: CCM00001
- Exiger les informations légales :
  - Raison sociale
  - Forme juridique
  - Capital social
  - RCCM (Registre Commerce)
  - NIF (Numéro Identification Fiscale)
  - Adresse complète du siège
- Définir les paramètres commerciaux :
  - Conditions de paiement (0 à 90 jours)
  - Mode de règlement préféré
  - Limite de crédit autorisée
  - Taux d'escompte accordé
  - Devise de facturation
- Associer automatiquement le compte comptable 411xxx
- Permettre plusieurs adresses (livraison, facturation)
- Gérer plusieurs contacts avec rôles

✅ **Calculer le scoring crédit**
- Analyser l'historique de paiement
- Calculer le retard moyen
- Évaluer le respect des échéances
- Noter de A (excellent) à E (risqué)
- Mettre à jour mensuellement
- Alerter si dégradation du score

✅ **Bloquer/Débloquer un client**
- Bloquer si dépassement limite crédit
- Bloquer si impayés > 90 jours
- Interdire nouvelles commandes si bloqué
- Permettre déblocage avec validation DAF
- Notifier le commercial responsable

#### 2.1.2 Cycle de Facturation

Le système DOIT être capable de :

✅ **Créer un devis**
- Générer numéro séquentiel DV-2025-00001
- Définir une durée de validité (30 jours défaut)
- Calculer les prix avec remises en cascade
- Inclure conditions générales de vente
- Convertir en commande sur acceptation
- Archiver les devis expirés

✅ **Gérer les commandes clients**
- Convertir devis en commande
- Vérifier la disponibilité crédit
- Réserver le crédit client
- Générer bon de livraison
- Suivre le statut (en cours/livré/facturé)
- Alerter si retard livraison

✅ **Émettre les factures de vente**
- Générer numéro chronologique FAC-2025-00001
- Créer depuis commande ou directement
- Calculer la TVA par ligne (19.25% CEMAC)
- Appliquer les remises clients
- Calculer les échéances de paiement
- Générer le PDF automatiquement
- Envoyer par email au client
- Comptabiliser automatiquement :
```
Débit:  411xxx Client             2,385,000
Crédit: 701xxx Ventes produits    2,000,000
Crédit: 443100 TVA collectée        385,000
```

✅ **Gérer les avoirs**
- Créer avoir depuis facture originale
- Lier obligatoirement à la facture
- Calculer le montant avec TVA
- Impacter le compte client
- Générer PDF et comptabilisation

✅ **Traiter les factures d'acompte**
- Émettre facture d'acompte
- Déduire sur facture finale
- Gérer la TVA sur acomptes
- Maintenir le suivi des acomptes

#### 2.1.3 Recouvrement et Relances

Le système DOIT être capable de :

✅ **Identifier les impayés**
- Scanner quotidiennement les échéances
- Classer par retard (1-30, 31-60, 61-90, >90)
- Calculer le montant total impayé
- Identifier les clients récurrents
- Générer tableau de bord impayés

✅ **Déclencher les relances automatiques**
- Niveau 1 (J+5) : Email de rappel courtois
- Niveau 2 (J+15) : Email + SMS ferme
- Niveau 3 (J+30) : Lettre recommandée AR
- Niveau 4 (J+45) : Appel téléphonique + mise en demeure
- Niveau 5 (J+60) : Transfert service juridique
- Personnaliser les messages par client
- Exclure clients en négociation

✅ **Gérer les promesses de paiement**
- Enregistrer promesse avec date
- Suspendre les relances
- Relancer si promesse non tenue
- Historiser toutes les promesses
- Calculer taux de respect promesses

✅ **Calculer les pénalités de retard**
- Appliquer taux légal ou contractuel
- Calculer depuis date échéance
- Générer facture de pénalités
- Comptabiliser automatiquement
- Option : renoncer aux pénalités

✅ **Provisionner les créances douteuses**
- Identifier créances > 90 jours
- Proposer taux de provision :
  - 90-180 jours : 25%
  - 180-360 jours : 50%
  - >360 jours : 100%
- Générer écritures de provision
- Ajuster mensuellement

#### 2.1.4 Analyse et Reporting Clients

Le système DOIT être capable de :

✅ **Calculer les KPIs clients**
- DSO (Days Sales Outstanding)
- Taux de retard moyen
- Montant moyen facture
- Panier moyen
- Taux d'impayés
- Top 10 clients (CA et marge)

✅ **Produire les états clients**
- Relevé de compte détaillé
- Balance âgée
- Échéancier prévisionnel
- Historique des transactions
- État des litiges

---

## 3. MODULE COMPTABILITÉ FOURNISSEURS

### 3.1 CE QUE LE MODULE DOIT FAIRE

#### 3.1.1 Gestion de la Base Fournisseurs

Le système DOIT être capable de :

✅ **Créer une fiche fournisseur**
- Générer code unique F[TYPE][NUMÉRO]
- Enregistrer informations légales complètes
- Définir conditions de paiement négociées
- Paramétrer comptes comptables 401xxx
- Gérer coordonnées bancaires (IBAN/BIC)
- Définir plafonds de commande
- Paramétrer workflow validation

✅ **Évaluer les fournisseurs**
- Noter qualité des livraisons
- Mesurer respect des délais
- Évaluer compétitivité prix
- Calculer score global A-E
- Identifier fournisseurs critiques

#### 3.1.2 Intégration avec Wise Procure

Le système DOIT être capable de :

✅ **Recevoir les données de Wise Procure**
- Importer commandes approuvées en temps réel
- Récupérer bons de réception
- Recevoir factures scannées
- Synchroniser référentiel fournisseurs
- Récupérer imputations analytiques

✅ **Rapprocher commande/réception/facture**
- Matching automatique 3-way
- Identifier les écarts prix/quantité
- Bloquer si écart > seuil (5%)
- Alerter acheteur responsable
- Générer rapport écarts

✅ **Renvoyer les informations à Wise Procure**
- Statut comptabilisation facture
- Date de paiement prévue
- Paiement effectué
- Litiges comptables
- Avoir reçus

#### 3.1.3 Circuit de Validation Factures

Le système DOIT être capable de :

✅ **Router selon matrice de validation**
```
Montant < 100K XAF     : Validation Comptable
100K - 1M XAF          : Comptable + Chef Comptable  
1M - 10M XAF           : Comptable + Chef + DAF
> 10M XAF              : Comptable + Chef + DAF + DG
```

✅ **Gérer le workflow**
- Notifier le prochain validateur
- Permettre commentaires/questions
- Gérer les délégations absence
- Escalader si timeout (48h)
- Permettre rejet avec motif
- Historiser circuit complet

✅ **Contrôler avant validation**
- Vérifier calculs mathématiques
- Contrôler TVA déductible
- Vérifier RIB fournisseur
- Checker doublon facture
- Valider budget disponible

✅ **Comptabiliser après validation**
```
Débit:  601xxx Achats            1,000,000
Débit:  445200 TVA déductible      192,500
Crédit: 401xxx Fournisseur                   1,192,500
```

#### 3.1.4 Gestion des Paiements Fournisseurs

Le système DOIT être capable de :

✅ **Proposer les paiements optimaux**
- Identifier escomptes disponibles
- Calculer ROI des escomptes
- Prioriser fournisseurs critiques
- Grouper par fournisseur
- Optimiser dates exécution
- Respecter trésorerie disponible

✅ **Préparer les ordres de paiement**
- Sélectionner factures à payer
- Générer ordre de virement
- Appliquer signatures électroniques
- Créer fichier EBICS/SWIFT
- Planifier exécution

✅ **Exécuter et suivre les paiements**
- Transmettre à la banque
- Récupérer accusé réception
- Suivre statut exécution
- Gérer les rejets
- Notifier fournisseur
- Lettrer automatiquement

---

## 4. MODULE TRÉSORERIE

### 4.1 CE QUE LE MODULE DOIT FAIRE

#### 4.1.1 Connexions Bancaires

Le système DOIT être capable de :

✅ **Se connecter aux banques**
- Protocole EBICS pour banques européennes/africaines
- SWIFT MT940/942 pour relevés
- API PSD2 pour open banking
- Web scraping sécurisé en fallback
- Gérer multi-banques simultanément
- Actualiser connexions quotidiennement

✅ **Récupérer les relevés bancaires**
- Import automatique chaque matin
- Format CAMT.053 ou MT940
- Historique J-1 minimum
- Intraday si disponible
- Parser et structurer données
- Détecter nouvelles transactions

✅ **Initier des paiements**
- Virements SEPA SCT
- Virements internationaux SWIFT
- Virements locaux CEMAC/UEMOA
- Prélèvements SEPA SDD
- Virements de masse (jusqu'à 5000)
- Récupérer statuts d'exécution

#### 4.1.2 Rapprochement Bancaire

Le système DOIT être capable de :

✅ **Rapprocher automatiquement**
- Matcher par montant exact (100% confiance)
- Matcher par référence (95% confiance)
- Combiner plusieurs factures (90% confiance)
- Utiliser IA pour patterns (85% confiance)
- Atteindre 98% taux automatisation
- Proposer suggestions multiples

✅ **Gérer les rapprochements manuels**
- Interface drag & drop
- Sélection multiple
- Calcul écarts automatique
- Création écriture écart
- Validation par responsable

✅ **Traiter les cas particuliers**
- Frais bancaires automatiques
- Intérêts débiteurs/créditeurs
- Écarts de change
- Virements internes
- Erreurs bancaires

#### 4.1.3 Position de Trésorerie

Le système DOIT être capable de :

✅ **Calculer la position en temps réel**
- Soldes bancaires actuels
- Encaissements du jour
- Décaissements du jour
- Mouvements à venir
- Position nette consolidée
- Évolution graphique

✅ **Gérer multi-comptes et devises**
- Consolidation tous comptes
- Conversion devises au cours du jour
- Cash pooling virtuel
- Virements d'équilibrage
- Optimisation des soldes

#### 4.1.4 Prévisions de Trésorerie

Le système DOIT être capable de :

✅ **Prévoir à court terme (30 jours)**
- Échéances clients confirmées
- Échéances fournisseurs
- Salaires et charges
- Échéances emprunts
- Flux récurrents
- Simulation jour par jour

✅ **Prévoir à moyen terme (12 mois)**
- Basé sur budget approuvé
- Saisonnalité historique
- Projets confirmés
- Investissements planifiés
- Scénarios multiples

✅ **Analyser et alerter**
- Identifier pics de besoin
- Alerter si découvert prévu
- Proposer solutions financement
- Optimiser placements excédents
- Calculer BFR prévisionnel

#### 4.1.5 Gestion des Paiements et Encaissements

Le système DOIT être capable de :

✅ **Gérer les encaissements clients**
- Identifier payeur automatiquement
- Lettrer avec factures ouvertes
- Gérer encaissements partiels
- Traiter les trop-perçus
- Calculer escomptes accordés
- Notifier service commercial

✅ **Orchestrer les décaissements**
- Centraliser demandes paiement
- Appliquer circuit validation
- Optimiser dates exécution
- Grouper par bénéficiaire
- Respecter priorités
- Maximiser escomptes

---

## 5. MODULE CLÔTURES

### 5.1 CE QUE LE MODULE DOIT FAIRE

#### 5.1.1 Clôture Mensuelle

Le système DOIT être capable de :

✅ **Orchestrer le processus de clôture**
- Afficher checklist des tâches
- Suivre avancement en temps réel
- Identifier blocages
- Alerter responsables
- Estimer temps restant
- Documenter problèmes

✅ **Effectuer les contrôles préalables**
- Vérifier toutes écritures validées
- Contrôler équilibre journaux
- Vérifier séquences numérotation
- Identifier comptes non lettrés
- Contrôler cohérence TVA
- Valider rapprochements bancaires

✅ **Générer les écritures automatiques**
- Provisions clients (créances douteuses)
- Provisions charges (congés, 13ème mois)
- Charges constatées d'avance
- Produits constatés d'avance
- Factures à établir
- Factures non parvenues
- Écarts de conversion
- Amortissements mensuels

✅ **Produire les états de clôture**
- Balance générale
- Grand livre
- Journaux centralisés
- État de rapprochement
- Tableau de TVA
- Justification des comptes

✅ **Verrouiller la période**
- Interdire modifications
- Archiver états définitifs
- Permettre consultation seule
- Générer backup spécifique

#### 5.1.2 Clôture Annuelle

Le système DOIT être capable de :

✅ **Réaliser l'inventaire comptable**
- Ajuster stocks physiques
- Calculer variations stocks
- Constater dépréciations
- Évaluer provisions risques
- Calculer impôts différés
- Réévaluer créances/dettes devises

✅ **Générer les états financiers SYSCOHADA**
- Bilan Actif/Passif
- Compte de résultat
- TAFIRE (Tableau Financier)
- État annexé (35 notes)
- État supplémentaire statistique

✅ **Effectuer les opérations de fin d'exercice**
- Calculer le résultat net
- Générer OD de résultat
- Préparer affectation résultat
- Calculer participation/intéressement
- Déterminer impôt société

✅ **Ouvrir le nouvel exercice**
- Reporter les à-nouveaux
- Générer écriture AN automatique
- Réinitialiser numérotations
- Copier paramétrages N-1
- Vérifier balance ouverture

---

## 6. MODULE REPORTING ET TABLEAUX DE BORD

### 6.1 CE QUE LE MODULE DOIT FAIRE

#### 6.1.1 Dashboards Temps Réel

Le système DOIT être capable de :

✅ **Afficher les KPIs en temps réel**
- Chiffre d'affaires jour/mois/année
- Marge brute et nette
- Trésorerie disponible
- Encours clients/fournisseurs
- DSO et DPO
- BFR
- Résultat courant
- Actualisation < 5 secondes

✅ **Personnaliser l'affichage**
- Choisir widgets à afficher
- Organiser par drag & drop
- Sélectionner type graphique
- Définir périodes comparaison
- Sauvegarder configurations
- Créer dashboards multiples

✅ **Interagir avec les données**
- Drill-down vers détail
- Filtrer par dimension
- Zoomer périodes
- Exporter graphiques
- Partager dashboards
- Programmer envoi email

#### 6.1.2 États Financiers

Le système DOIT être capable de :

✅ **Générer tous états SYSCOHADA**
- Respecter format officiel
- Inclure comparatif N-1
- Calculer variations %
- Générer notes annexes
- Produire en PDF certifié
- Exporter vers Excel

✅ **Produire états de gestion**
- Compte résultat mensuel
- Tableau de bord direction
- Reporting par centre profit
- Analyse par activité
- Comparaison budget/réel
- Projection fin d'année

#### 6.1.3 Analyses Financières

Le système DOIT être capable de :

✅ **Calculer les SIG (Soldes Intermédiaires de Gestion)**
1. Marge commerciale
2. Production de l'exercice  
3. Valeur ajoutée
4. Excédent brut d'exploitation (EBE)
5. Résultat d'exploitation
6. Résultat financier
7. Résultat courant avant impôts
8. Résultat exceptionnel
9. Résultat net

✅ **Produire le bilan fonctionnel**
- Calculer FRNG (Fonds Roulement Net Global)
- Calculer BFR (Besoin Fonds Roulement)
- Calculer TN (Trésorerie Nette)
- Analyser évolution
- Comparer aux normes secteur

✅ **Calculer les ratios financiers**

**LIQUIDITÉ**
- Ratio liquidité générale = AC/PC > 1.2
- Ratio liquidité réduite = (AC-Stocks)/PC > 0.8  
- Ratio liquidité immédiate = Tréso/PC > 0.3

**RENTABILITÉ**
- ROE = Résultat Net/Capitaux Propres > 10%
- ROA = Résultat Net/Total Actif > 5%
- Marge nette = Résultat Net/CA > 3%

**STRUCTURE**
- Autonomie financière = CP/Total Bilan > 25%
- Endettement = Dettes Fin/CAF < 3 ans

✅ **Générer le tableau de flux (CASHFLOW)**
- Flux d'exploitation (FTE)
- Flux d'investissement (FTI)
- Flux de financement (FTF)
- Variation trésorerie
- Free Cash Flow

---

## 7. MODULE FISCALITÉ ET DÉCLARATIONS

### 7.1 CE QUE LE MODULE DOIT FAIRE

#### 7.1.1 Gestion de la TVA

Le système DOIT être capable de :

✅ **Paramétrer les taux de TVA**
- TVA normale 19.25% (18% + CSS 1.25%)
- TVA réduite 9%
- TVA export 0%
- Exonérations spécifiques
- Dates d'application

✅ **Calculer la TVA automatiquement**
- TVA sur achats (déductible)
- TVA sur ventes (collectée)
- TVA à décaisser/crédit
- Prorata de déduction
- Régularisations annuelles

✅ **Générer la déclaration TVA**
- Extraire données période
- Remplir formulaire officiel
- Contrôler cohérence
- Calculer solde à payer
- Générer fichier télédéclaration
- Archiver déclaration

#### 7.1.2 Autres Déclarations Fiscales

Le système DOIT être capable de :

✅ **Produire la liasse fiscale SYSCOHADA**
- Bilan fiscal
- Compte résultat fiscal
- Tableaux annexes
- Détermination résultat fiscal
- Calcul IS (Impôt Sociétés)

✅ **Gérer les autres taxes**
- Retenues à la source
- Taxes sur salaires
- Patente et licences
- Taxes foncières
- Droits d'enregistrement

---

## 8. MODULE IMMOBILISATIONS

### 8.1 CE QUE LE MODULE DOIT FAIRE

#### 8.1.1 Gestion du Patrimoine

Le système DOIT être capable de :

✅ **Créer une fiche immobilisation**
- Code unique automatique
- Description détaillée
- Date acquisition
- Valeur acquisition HT
- TVA récupérable
- Frais accessoires
- Fournisseur
- Localisation physique
- Responsable
- Photo de l'actif

✅ **Gérer le cycle de vie**
- Mise en service
- Transferts entre sites
- Modifications (amélioration)
- Cession partielle/totale
- Mise au rebut
- Réévaluation légale

#### 8.1.2 Calcul des Amortissements

Le système DOIT être capable de :

✅ **Appliquer les méthodes SYSCOHADA**
- Linéaire (standard)
- Dégressif (si autorisé)
- Progressif
- Unités d'œuvre
- Par composants

✅ **Générer les dotations**
- Calcul mensuel automatique
- Prorata temporis première année
- Comptabilisation automatique
- Simulation changement méthode
- Projection sur durée vie

✅ **Produire les états**
- Tableau des immobilisations
- Tableau des amortissements
- Plus/moins-values cession
- État du patrimoine
- Inventaire physique

---

## 9. MODULE BUDGET ET CONTRÔLE DE GESTION

### 9.1 CE QUE LE MODULE DOIT FAIRE

#### 9.1.1 Élaboration Budgétaire

Le système DOIT être capable de :

✅ **Construire le budget**
- Créer structure budgétaire
- Définir centres de responsabilité
- Saisir par mois/trimestre/an
- Ventiler par compte/analytique
- Importer depuis Excel
- Gérer versions multiples
- Workflow validation

✅ **Consolider et arbitrer**
- Agréger budgets services
- Identifier dépassements
- Proposer ajustements
- Simuler scénarios
- Valider budget final
- Verrouiller après validation

#### 9.1.2 Suivi et Analyse

Le système DOIT être capable de :

✅ **Comparer réel vs budget**
- Calcul écarts valeur et %
- Analyse par période
- Drill-down détaillé
- Commentaires justificatifs
- Alertes dépassement
- Projection année complète

✅ **Faire du rolling forecast**
- Actualiser prévisions mensuellement
- Intégrer réel à date
- Ajuster restant à faire
- Maintenir horizon 18 mois
- Comparer versions

---

## 10. MODULE COMPTABILITÉ ANALYTIQUE

### 10.1 CE QUE LE MODULE DOIT FAIRE

#### 10.1.1 Structure Analytique

Le système DOIT être capable de :

✅ **Définir les axes d'analyse**
- Créer jusqu'à 10 axes
- Hiérarchie multi-niveaux
- Sections principales/détail
- Périodes de validité
- Responsables sections

✅ **Paramétrer les règles**
- Ventilation obligatoire/optionnelle
- Clés de répartition
- Pourcentages ou montants
- Héritage hiérarchique
- Contrôles cohérence

#### 10.1.2 Exploitation Analytique

Le système DOIT être capable de :

✅ **Ventiler les écritures**
- Saisie multi-axes simultanée
- Ventilation automatique règles
- Répartition a posteriori
- Import ventilations Excel
- Contrôle 100% ventilé

✅ **Analyser la rentabilité**
- Compte résultat par section
- Marge par produit/client
- Coût par activité
- ROI par projet
- Benchmarks internes

---

## 11. MODULES TRANSVERSAUX

### 11.1 Import/Export

Le système DOIT être capable de :

✅ **Importer des données**
- Excel (XLSX, XLS)
- CSV (tous séparateurs)
- XML
- JSON via API
- FEC (Fichier Écritures Comptables)
- Formats bancaires

✅ **Exporter des données**
- Tous états en PDF
- Données en Excel avec formules
- Export FEC réglementaire
- API REST pour tiers
- Formats fiscaux

### 11.2 Gestion Documentaire (GED)

Le système DOIT être capable de :

✅ **Stocker les documents**
- Accepter PDF, images
- OCR automatique
- Indexation full-text
- Classement automatique
- Archivage légal 10 ans
- Coffre-fort numérique

✅ **Rechercher et consulter**
- Recherche par mots-clés
- Filtres multiples
- Aperçu sans téléchargement
- Annotations
- Partage sécurisé
- Versioning

### 11.3 Workflow et Validations

Le système DOIT être capable de :

✅ **Gérer les circuits de validation**
- Définir matrices par montant
- Router automatiquement
- Notifier validateurs
- Gérer délégations
- Escalader si timeout
- Tracer historique

✅ **Appliquer les signatures électroniques**
- Signature simple
- Signature avancée
- Multi-signatures
- Certificat horodaté
- Conformité eIDAS

### 11.4 Audit Trail et Sécurité

Le système DOIT être capable de :

✅ **Tracer toutes les actions**
- Qui, Quoi, Quand, Où
- Avant/Après modification
- IP et navigateur
- Tentatives échouées
- Conservation 10 ans
- Export pour audit

✅ **Sécuriser les accès**
- Authentification forte
- MFA obligatoire admins
- Sessions timeout 30min
- Blocage après 5 échecs
- Matrice des droits
- Segregation of duties

---

## 12. INTÉGRATIONS EXTERNES

### 12.1 Intégration Wise Procure

Le système DOIT être capable de :

✅ **Échanger en temps réel**
- Recevoir commandes approuvées
- Récupérer factures scannées
- Synchroniser fournisseurs
- Envoyer statuts paiement
- Notifier litiges

### 12.2 Intégration Bancaire

Le système DOIT être capable de :

✅ **Se connecter aux banques**
- EBICS 3.0
- SWIFT
- PSD2 APIs
- Web scraping sécurisé

✅ **Échanger les flux**
- Relevés quotidiens
- Virements masse
- Statuts exécution
- Soldes temps réel

### 12.3 Intégration Suite Praedium

Le système DOIT être capable de :

✅ **Synchroniser avec:**
- Wise Sales (factures clients)
- Wise HR (écritures paie)
- Wise Stock (valorisation)
- Wise Project (coûts projets)
- Wise Analytics (KPIs)

---

## MATRICE DE CONFORMITÉ

### Conformité SYSCOHADA

| Exigence SYSCOHADA | Module WiseBook | Statut |
|-------------------|-----------------|--------|
| Plan comptable 9 positions | Comptabilité Générale | ✅ Conforme |
| États financiers normalisés | Reporting | ✅ Conforme |
| TAFIRE obligatoire | Analyse Financière | ✅ Conforme |
| Conservation 10 ans | GED | ✅ Conforme |
| Intangibilité écritures | Audit Trail | ✅ Conforme |
| Numérotation séquentielle | Comptabilité Générale | ✅ Conforme |
| Pièces justificatives | GED | ✅ Conforme |

---

## CRITÈRES D'ACCEPTATION

Pour chaque fonctionnalité, le système sera considéré comme conforme si :

1. **Fonctionnalité opérationnelle** : La fonction s'exécute sans erreur
2. **Performance respectée** : Temps de réponse < seuils définis
3. **Données correctes** : Calculs exacts et cohérents
4. **Audit complet** : Toutes actions tracées
5. **Sécurité appliquée** : Contrôles d'accès effectifs
6. **Documentation fournie** : Mode d'emploi disponible
7. **Tests validés** : Scénarios de test passés avec succès