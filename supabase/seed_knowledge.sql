-- ============================================================================
-- seed_knowledge.sql — Données initiales pour la base de connaissances RAG
-- SYSCOHADA Révisé 2017 + Fiscalité + Audit + Droit OHADA
-- ============================================================================

-- ============================================================================
-- 1. SYSCOHADA — Plan comptable et principes
-- ============================================================================

INSERT INTO knowledge_base (domain, subdomain, title, content, country_codes, tags, source) VALUES

-- Classes du plan comptable
('syscohada', 'plan_comptable', 'Classe 1 — Comptes de ressources durables',
'La classe 1 du plan SYSCOHADA révisé regroupe les comptes de ressources durables :
- 10 : Capital (101 capital social, 105 primes liées au capital)
- 11 : Réserves (111 réserve légale, 112 réserves statutaires)
- 12 : Report à nouveau (121 RAN créditeur, 129 RAN débiteur)
- 13 : Résultat net de l''exercice
- 14 : Subventions d''investissement
- 15 : Provisions réglementées et fonds assimilés
- 16 : Emprunts et dettes assimilées (161 emprunts obligataires, 162 emprunts bancaires)
- 17 : Dettes de crédit-bail et contrats assimilés
- 18 : Dettes liées à des participations
- 19 : Provisions pour risques et charges
Nature : comptes de PASSIF (créditeurs), sauf 129 (débiteur).', '{}', ARRAY['classe1', 'bilan', 'passif', 'capitaux'], 'AUDCIF Art. 17-19'),

('syscohada', 'plan_comptable', 'Classe 2 — Comptes d''actif immobilisé',
'La classe 2 regroupe les immobilisations :
- 20 : Charges immobilisées (frais d''établissement, charges à répartir)
- 21 : Immobilisations incorporelles (211 frais de R&D, 212 brevets, 213 logiciels, 215 fonds commercial)
- 22 : Terrains
- 23 : Bâtiments et agencements
- 24 : Matériel (241 ITMO, 244 matériel de transport, 245 matériel de bureau)
- 25 : Avances et acomptes sur immobilisations
- 26 : Titres de participation
- 27 : Autres immobilisations financières
- 28 : Amortissements (281, 282, 283, 284...)
- 29 : Provisions pour dépréciation
Les amortissements (28x) sont des comptes soustractifs d''actif (créditeurs).', '{}', ARRAY['classe2', 'bilan', 'actif', 'immobilisations'], 'AUDCIF Art. 28-41'),

('syscohada', 'plan_comptable', 'Classe 3 — Comptes de stocks',
'La classe 3 regroupe les stocks et en-cours :
- 31 : Marchandises
- 32 : Matières premières et fournitures liées
- 33 : Autres approvisionnements
- 34 : Produits en cours
- 35 : Services en cours
- 36 : Produits finis
- 37 : Produits intermédiaires et résiduels
- 38 : Stocks en cours de route, en consignation
- 39 : Dépréciations des stocks
Méthodes d''évaluation autorisées : CUMP (Coût Unitaire Moyen Pondéré), FIFO (Premier Entré Premier Sorti). Le LIFO est INTERDIT par SYSCOHADA.', '{}', ARRAY['classe3', 'bilan', 'actif', 'stocks'], 'AUDCIF Art. 42-44'),

('syscohada', 'plan_comptable', 'Classe 4 — Comptes de tiers',
'La classe 4 regroupe les créances et dettes d''exploitation :
- 40 : Fournisseurs et comptes rattachés (401 fournisseurs, 402 fournisseurs EAP)
- 41 : Clients et comptes rattachés (411 clients, 412 clients EAR)
- 42 : Personnel (421 rémunérations dues, 422 avances au personnel)
- 43 : Organismes sociaux (431 sécurité sociale, 433 mutuelle)
- 44 : État et collectivités (441 IS, 443 TVA collectée, 445 TVA récupérable, 447 retenues à la source)
- 45 : Organismes internationaux
- 46 : Associés et groupe
- 47 : Débiteurs et créditeurs divers
- 48 : Charges/Produits constatés d''avance (481 CCA, 482 PCA)
- 49 : Dépréciations des comptes de tiers', '{}', ARRAY['classe4', 'bilan', 'tiers', 'creances', 'dettes'], 'AUDCIF Art. 45-52'),

('syscohada', 'plan_comptable', 'Classe 5 — Comptes de trésorerie',
'La classe 5 regroupe les comptes financiers :
- 51 : Valeurs à encaisser (511 effets à encaisser, 512 chèques à encaisser)
- 52 : Banques (521 banques locales, 522 banques autres pays OHADA, 524 banques hors OHADA)
- 53 : Établissements financiers
- 54 : Instruments de trésorerie
- 56 : Banques — crédits de trésorerie
- 57 : Caisse (571 caisse en monnaie nationale, 572 caisse en devises)
- 58 : Régies d''avance et accréditifs
- 59 : Dépréciations de trésorerie
Important : les découverts bancaires (compte 56) sont au PASSIF du bilan.', '{}', ARRAY['classe5', 'bilan', 'tresorerie', 'banque', 'caisse'], 'AUDCIF Art. 53-55'),

('syscohada', 'plan_comptable', 'Classes 6 et 7 — Comptes de gestion',
'Les classes 6 (charges) et 7 (produits) constituent le compte de résultat :
CHARGES (classe 6) :
- 60 : Achats (601 marchandises, 602 matières, 604 services extérieurs)
- 61 : Transports
- 62 : Services extérieurs (621 sous-traitance, 622 locations, 624 entretien)
- 63 : Impôts et taxes (631 impôts fonciers, 632 patente)
- 64 : Charges de personnel (661 rémunérations, 664 charges sociales)
- 65 : Autres charges
- 66 : Charges financières (671 intérêts emprunts)
- 67 : Charges financières
- 68 : Dotations aux amortissements et provisions
- 69 : Impôts sur le résultat (891 IS)

PRODUITS (classe 7) :
- 70 : Ventes (701 marchandises, 702 produits finis, 706 services)
- 71 : Production stockée
- 72 : Production immobilisée
- 75 : Autres produits
- 77 : Revenus financiers
- 78 : Reprises d''amortissements et provisions
- 79 : Reprises de provisions financières', '{}', ARRAY['classe6', 'classe7', 'gestion', 'charges', 'produits'], 'AUDCIF Art. 56-67'),

-- Principes comptables
('syscohada', 'principes', 'Les 13 principes comptables SYSCOHADA',
'Le SYSCOHADA Révisé 2017 repose sur 13 principes fondamentaux :
1. Prudence — ne comptabiliser que les profits réalisés, provisionner les pertes probables
2. Permanence des méthodes — continuité des méthodes d''un exercice à l''autre
3. Correspondance bilan ouverture/clôture — le bilan d''ouverture = bilan de clôture N-1
4. Spécialisation des exercices (cut-off) — rattacher les charges et produits à l''exercice concerné
5. Coût historique — évaluation au coût d''acquisition ou de production
6. Continuité d''exploitation — l''entité est présumée poursuivre son activité
7. Transparence — information complète et de bonne foi
8. Importance significative — ne pas omettre les informations significatives
9. Prééminence de la réalité sur l''apparence (substance over form)
10. Intangibilité du bilan d''ouverture
11. Non-compensation — pas de compensation entre actif/passif ou charges/produits
12. Image fidèle — les états financiers donnent une image fidèle
13. Prééminence du droit sur la comptabilité (IFRS : droit comptable)
Note : Le principe 9 est une NOUVEAUTÉ du SYSCOHADA Révisé 2017 (alignement IFRS).', '{}', ARRAY['principes', 'IFRS', 'regle'], 'AUDCIF Art. 6-16, Art. 35'),

-- États financiers
('syscohada', 'etats_financiers', 'Les 4+1 états financiers SYSCOHADA',
'Le système comptable OHADA exige 4+1 états financiers annuels :
1. **Bilan** — situation patrimoniale à la date de clôture (actif = passif)
2. **Compte de résultat** — synthèse des charges et produits (classes 6 et 7)
3. **TAFIRE** — Tableau Financier des Ressources et Emplois (tableau de flux propre à SYSCOHADA)
4. **Annexe** — notes explicatives (36 notes obligatoires minimum)
+1. **État annexé** — tableau d''amortissements, provisions, créances et dettes par échéance

Deux systèmes de présentation :
- **Système normal** : entreprises dont CA > seuil OHADA (varie par pays)
- **Système minimal de trésorerie (SMT)** : très petites entités

Délai de production : 4 mois après la clôture de l''exercice.
Durée de l''exercice : 12 mois (sauf premier et dernier exercice).', '{}', ARRAY['bilan', 'compte_resultat', 'TAFIRE', 'annexe', 'etats_financiers'], 'AUDCIF Art. 8, Art. 25-34'),

-- SIG
('syscohada', 'analyse', 'Soldes Intermédiaires de Gestion (SIG) SYSCOHADA',
'Les SIG SYSCOHADA décomposent le résultat en soldes successifs :
1. **Marge commerciale** = Ventes marchandises - Coût d''achat des marchandises vendues
   (CAMV = achats + variation de stock)
2. **Production de l''exercice** = Production vendue + stockée + immobilisée
3. **Valeur ajoutée** = MC + PE - Consommations intermédiaires
4. **Excédent Brut d''Exploitation (EBE)** = VA - Impôts & taxes - Charges de personnel
   L''EBE est le solde le plus important : il mesure la performance opérationnelle pure.
5. **Résultat d''exploitation** = EBE + Reprises - Dotations amortissements/provisions
6. **Résultat financier** = Produits financiers - Charges financières
7. **Résultat des Activités Ordinaires (RAO)** = RE + RF
8. **Résultat HAO** = Produits HAO - Charges HAO (Hors Activités Ordinaires)
9. **Résultat net** = RAO + RHAO - Impôts sur le résultat

Le HAO est une spécificité SYSCOHADA : il isole les éléments exceptionnels.', '{}', ARRAY['SIG', 'analyse', 'EBE', 'valeur_ajoutee', 'resultat'], 'AUDCIF Art. 56-67'),

-- Amortissements
('syscohada', 'amortissements', 'Amortissements — Règles SYSCOHADA',
'Le SYSCOHADA Révisé 2017 distingue :

**Amortissement comptable** (obligatoire) :
- Répartition systématique du coût amortissable sur la durée d''utilité
- Modes autorisés : linéaire, dégressif, unités d''œuvre
- Durées courantes : bâtiments 20-40 ans, matériel 5-10 ans, véhicules 4-5 ans, mobilier 5-10 ans, logiciels 3-5 ans

**Amortissement fiscal** (durées fiscales par pays) :
- Les durées fiscales peuvent différer des durées comptables
- L''écart crée un amortissement dérogatoire (compte 151)

**Composants** (nouveauté 2017) :
- Obligation de décomposer les immobilisations en composants significatifs
- Chaque composant a sa propre durée et mode d''amortissement
- Exemple : un bâtiment = structure (40 ans) + toiture (20 ans) + installations techniques (15 ans)

Écriture : Débit 681x (dotation) / Crédit 28x (amortissement cumulé)', '{}', ARRAY['amortissement', 'immobilisation', 'dotation', 'composant'], 'AUDCIF Art. 39-41'),

-- Provisions
('syscohada', 'provisions', 'Provisions — Règles SYSCOHADA Révisé',
'Le SYSCOHADA distingue 3 types de provisions :

1. **Provisions pour risques et charges** (compte 19x) :
   - Passif dont l''échéance ou le montant est incertain
   - Conditions : obligation actuelle, sortie probable de ressources, estimation fiable
   - Exemples : provisions pour litiges (191), garanties (192), restructuration (193)

2. **Provisions pour dépréciation** (comptes 29, 39, 49, 59) :
   - Constatation d''une perte de valeur probable mais non définitive
   - Test de dépréciation annuel obligatoire pour les immobilisations incorporelles à durée indéfinie

3. **Provisions réglementées** (compte 15) :
   - Avantages fiscaux (amortissements dérogatoires, provisions pour investissement)
   - Traitées en capitaux propres dans les comptes consolidés

Écriture de dotation : Débit 681/687/691 / Crédit 19x/29x/39x/49x
Écriture de reprise : Débit 19x/29x / Crédit 791/797/799', '{}', ARRAY['provision', 'depreciation', 'risque', 'IAS37'], 'AUDCIF Art. 46-48'),

-- Consolidation
('syscohada', 'consolidation', 'Consolidation des comptes — SYSCOHADA',
'Le SYSCOHADA Révisé 2017 impose la consolidation pour les groupes :

**Méthodes de consolidation** :
- Intégration globale (IG) : contrôle exclusif (>50% des droits de vote)
- Intégration proportionnelle (IP) : contrôle conjoint
- Mise en équivalence (MEE) : influence notable (20-50%)

**Étapes de consolidation** :
1. Détermination du périmètre
2. Retraitements d''homogénéité (uniformiser les méthodes)
3. Conversion des comptes en devises (méthode du cours de clôture)
4. Cumul des comptes
5. Élimination des opérations intra-groupe
6. Élimination des titres contre capitaux propres
7. Calcul des intérêts minoritaires
8. Calcul du goodwill (écart d''acquisition)

**Goodwill** : affectation aux UGT, test de dépréciation annuel.
**Seuil d''exemption** : varie par pays (généralement CA consolidé > 500M FCFA).', '{}', ARRAY['consolidation', 'groupe', 'goodwill', 'integration', 'filiale'], 'AUDCIF Art. 74-101');

-- ============================================================================
-- 2. FISCALITÉ — IS par pays
-- ============================================================================

INSERT INTO knowledge_base (domain, subdomain, title, content, country_codes, tags, source) VALUES

('fiscal', 'is', 'Impôt sur les Sociétés — Côte d''Ivoire',
'**IS en Côte d''Ivoire (CGI-CI)** :
- Taux normal : **25%** du résultat fiscal
- Minimum de perception (IMF) : **1% du CA** (minimum 3 000 000 FCFA)
- L''IS dû = max(IS brut, IMF)

**Résultat fiscal** = Résultat comptable + Réintégrations - Déductions
Réintégrations courantes :
- Amendes et pénalités
- Charges somptuaires (>50% pour véhicules de tourisme)
- Dépenses non justifiées
- Amortissements excédentaires

**Acomptes** : 4 versements trimestriels (15 mars, 15 juin, 15 sept, 15 déc)
Chaque acompte = IS N-1 / 4

**Déclaration** : avant le 30 avril N+1
Écriture : Débit 891 / Crédit 441', ARRAY['CI'], ARRAY['IS', 'impot', 'fiscal', 'cgi'], 'CGI-CI Art. 1-35'),

('fiscal', 'is', 'Impôt sur les Sociétés — Sénégal',
'**IS au Sénégal (CGI-SN)** :
- Taux normal : **30%** du résultat fiscal
- Minimum fiscal (IMF) : **0.5% du CA** (minimum 500 000 FCFA, maximum 5 000 000 FCFA)

**Réintégrations spécifiques Sénégal** :
- Rémunérations des dirigeants non salariés (non déductibles au-delà d''un plafond)
- Provisions non admises fiscalement
- Intérêts sur comptes courants d''associés (au-delà du taux de la BCEAO + 3 points)

**Acomptes** : 3 versements (15 février, 30 avril, 15 août)
Chaque acompte = IS N-1 / 3

**Déclaration** : avant le 30 avril N+1
**Report de déficit** : 3 ans (amortissements réputés différés : illimité)', ARRAY['SN'], ARRAY['IS', 'impot', 'fiscal', 'cgi'], 'CGI-SN Art. 4-47'),

('fiscal', 'is', 'Impôt sur les Sociétés — Cameroun',
'**IS au Cameroun (CGI-CM)** :
- Taux normal : **33%** du résultat fiscal (30% IS + 10% CAC sur IS)
- Minimum de perception : **2.2% du CA** (1% IS minimum + 10% CAC)

**Spécificités Cameroun** :
- Centimes Additionnels Communaux (CAC) = 10% de l''IS
- Précompte sur achats : 5% sur achats > 100 000 FCFA
- Acomptes mensuels obligatoires

**Zones économiques** :
- Zone franche industrielle : taux réduit pendant 10 ans
- Zones d''éducation prioritaire : avantages fiscaux spécifiques

**Déclaration** : avant le 15 mars N+1
**Report de déficit** : 4 ans', ARRAY['CM'], ARRAY['IS', 'impot', 'fiscal', 'cgi', 'CAC'], 'CGI-CM Art. 1-17');

-- ============================================================================
-- 3. FISCALITÉ — TVA par pays
-- ============================================================================

INSERT INTO knowledge_base (domain, subdomain, title, content, country_codes, tags, source) VALUES

('fiscal', 'tva', 'TVA — Côte d''Ivoire',
'**TVA en Côte d''Ivoire** :
- Taux normal : **18%**
- Taux réduit : **9%** (produits de première nécessité, fournitures scolaires)
- Exonérations : produits alimentaires de base (riz, mil, sorgho), médicaments, matériel agricole

**Mécanisme** : TVA collectée - TVA déductible = TVA due
- TVA collectée : compte 4431 (crédit)
- TVA déductible sur achats : compte 4452 (débit)
- TVA déductible sur immobilisations : compte 4451 (débit)

**Déclaration** : mensuelle avant le 15 du mois suivant (régime réel)
- Régime simplifié : trimestrielle
- Seuil d''assujettissement : CA > 50 000 000 FCFA

**Crédit de TVA** : reportable sans limitation de durée, remboursable sous conditions', ARRAY['CI'], ARRAY['TVA', 'taxe', 'fiscal'], 'CGI-CI Art. 340-383'),

('fiscal', 'tva', 'TVA — Cameroun (avec CAC)',
'**TVA au Cameroun** — système particulier avec CAC :
- Taux TVA de base : **17.5%**
- CAC (Centimes Additionnels Communaux) : **10% de la TVA**
- Taux effectif total : **19.25%** (17.5% + 1.75% CAC)

**Calcul** :
1. TVA = Montant HT × 17.5% → arrondi
2. CAC = TVA × 10% → arrondi
3. Total taxe = TVA + CAC
4. TTC = HT + TVA + CAC

**Exemple** : HT = 1 000 000 FCFA
- TVA = 175 000 FCFA
- CAC = 17 500 FCFA
- TTC = 1 192 500 FCFA

**Particularités** :
- Précompte TVA de 1/3 sur achats auprès de non-immatriculés
- Déclaration mensuelle avant le 15 du mois suivant', ARRAY['CM'], ARRAY['TVA', 'CAC', 'fiscal', 'cameroun'], 'CGI-CM Art. 120-149'),

('fiscal', 'tva', 'Taux de TVA — Tous pays OHADA',
'**Récapitulatif des taux de TVA dans la zone OHADA** :

| Pays | Taux normal | Taux réduit | Observations |
|------|------------|-------------|--------------|
| Côte d''Ivoire | 18% | 9% | |
| Sénégal | 18% | 10% | |
| Cameroun | 19.25% | — | 17.5% + CAC 10% |
| Gabon | 18% | 10%, 5% | Taux super-réduit 5% |
| Burkina Faso | 18% | — | |
| Mali | 18% | 5% | |
| Niger | 19% | 5% | |
| Togo | 18% | 10% | |
| Bénin | 18% | — | |
| Guinée | 18% | — | |
| Tchad | 18% | 9% | |
| Centrafrique | 19% | 5% | |
| Congo | 18.9% | 5% | Taux atypique 18.9% |
| RD Congo | 16% | 8% | |
| Guinée Équat. | 15% | 6% | |
| Comores | 10% | 5% | Taux le plus bas |
| Guinée-Bissau | 15% | — | |

Les taux UEMOA (8 pays) sont harmonisés autour de 18%.
Les taux CEMAC (6 pays) varient davantage.', '{}', ARRAY['TVA', 'taux', 'comparatif', 'UEMOA', 'CEMAC'], 'Directives UEMOA/CEMAC TVA');

-- ============================================================================
-- 4. AUDIT — Normes ISA et méthodologie
-- ============================================================================

INSERT INTO knowledge_base (domain, subdomain, title, content, country_codes, tags, source) VALUES

('audit', 'normes_isa', 'Normes ISA — Vue d''ensemble',
'Les Normes Internationales d''Audit (ISA) sont le cadre de référence :

**ISA 200** : Objectifs généraux de l''auditeur — opinion sur les états financiers
**ISA 240** : Responsabilités de l''auditeur concernant les fraudes
**ISA 300** : Planification d''un audit d''états financiers
**ISA 315** : Identification et évaluation des risques d''anomalies significatives
**ISA 320** : Caractère significatif (seuil de matérialité)
**ISA 330** : Réponses de l''auditeur aux risques évalués
**ISA 500** : Éléments probants
**ISA 520** : Procédures analytiques
**ISA 530** : Sondages en audit
**ISA 540** : Audit des estimations comptables
**ISA 570** : Continuité d''exploitation
**ISA 700** : Rapport de l''auditeur (opinion)

**Types d''opinion** :
1. Sans réserve (unqualified)
2. Avec réserve (qualified)
3. Défavorable (adverse)
4. Impossibilité d''exprimer (disclaimer)

**Seuil de matérialité** : généralement 1-2% du CA, 5-10% du résultat, ou 0.5-1% du total bilan.', '{}', ARRAY['ISA', 'audit', 'normes', 'opinion', 'materialite'], 'ISA 200-700'),

('audit', 'controle_interne', 'COSO 2013 — Cadre de contrôle interne',
'Le référentiel COSO 2013 (Committee of Sponsoring Organizations) définit 5 composantes du contrôle interne :

1. **Environnement de contrôle** :
   - Intégrité et éthique
   - Compétence du personnel
   - Conseil d''administration et comité d''audit
   - Style de management

2. **Évaluation des risques** :
   - Identification des risques
   - Analyse des risques (probabilité × impact)
   - Gestion du changement

3. **Activités de contrôle** :
   - Séparation des fonctions
   - Autorisations appropriées
   - Vérifications et rapprochements
   - Contrôles physiques
   - Contrôles informatiques

4. **Information et communication** :
   - Système d''information fiable
   - Communication interne et externe

5. **Pilotage** :
   - Évaluations continues
   - Évaluations ponctuelles
   - Suivi des déficiences

**17 principes** associés aux 5 composantes.
Application OHADA : les grandes entreprises doivent avoir un dispositif de contrôle interne.', '{}', ARRAY['COSO', 'controle_interne', 'audit', 'risque'], 'COSO 2013 Framework'),

('audit', 'benford', 'Loi de Benford — Détection de fraudes',
'La **loi de Benford** (loi du premier chiffre significatif) est un outil d''audit puissant :

**Principe** : dans les données naturelles, le premier chiffre n''est pas uniformément distribué.
P(d) = log₁₀(1 + 1/d) pour d = 1, 2, ..., 9

**Distribution théorique** :
| Chiffre | Fréquence |
|---------|-----------|
| 1 | 30.1% |
| 2 | 17.6% |
| 3 | 12.5% |
| 4 | 9.7% |
| 5 | 7.9% |
| 6 | 6.7% |
| 7 | 5.8% |
| 8 | 5.1% |
| 9 | 4.6% |

**Application en audit** :
1. Extraire tous les montants d''un journal comptable
2. Calculer la distribution des premiers chiffres
3. Comparer avec la distribution de Benford (test du Chi²)
4. Z-score > 1.96 → anomalie significative (p < 0.05)

**Signaux d''alerte** :
- Sur-représentation du chiffre 5 → montants arrondis artificiels
- Sous-représentation du 1 → données manipulées
- Chi² > 15.507 (df=8) → non-conformité globale

Conditions : minimum 500 montants, pas de données bornées (type pourcentages).', '{}', ARRAY['benford', 'fraude', 'audit', 'statistique', 'chi2'], 'ISA 520, ISA 240');

-- ============================================================================
-- 5. DROIT OHADA — Textes fondamentaux
-- ============================================================================

INSERT INTO knowledge_base (domain, subdomain, title, content, country_codes, tags, source) VALUES

('droit_ohada', 'audcif', 'AUDCIF — Acte Uniforme relatif au Droit Comptable',
'L''**AUDCIF** (Acte Uniforme relatif au Droit Comptable et à l''Information Financière) est le texte fondateur du SYSCOHADA Révisé, adopté le 26 janvier 2017 :

**Champ d''application** (Art. 2) :
- Toutes les entités soumises aux dispositions du droit comptable OHADA
- Personnes physiques (commerçants) et morales

**Obligations** (Art. 8-10) :
- Tenue d''une comptabilité selon le SYSCOHADA
- Enregistrement chronologique des opérations
- Inventaire annuel des éléments d''actif et de passif
- Établissement des états financiers annuels

**Livres obligatoires** (Art. 19-24) :
1. Livre-journal (ou journal centralisateur + journaux auxiliaires)
2. Grand livre
3. Balance générale
4. Livre d''inventaire

**Conservation** : 10 ans à compter de la clôture de l''exercice
**Langue** : français (ou langue officielle de l''État)
**Monnaie** : monnaie ayant cours légal dans l''État', '{}', ARRAY['AUDCIF', 'loi', 'obligation', 'comptabilite'], 'AUDCIF 2017'),

('droit_ohada', 'auscgie', 'AUSCGIE — Sociétés commerciales et GIE',
'L''**AUSCGIE** (Acte Uniforme sur les Sociétés Commerciales et le GIE) régit les sociétés dans l''espace OHADA :

**Formes de sociétés** :
- **SNC** : Société en Nom Collectif (responsabilité illimitée et solidaire)
- **SCS** : Société en Commandite Simple
- **SARL** : Société à Responsabilité Limitée (capital min 100 000 FCFA en UEMOA, 1 000 000 FCFA en CEMAC)
- **SA** : Société Anonyme (capital min 10 000 000 FCFA, CA ou AG)
- **SAS** : Société par Actions Simplifiée (nouveauté 2014, capital libre)

**Obligations comptables des dirigeants** :
- Établir les comptes annuels dans les 6 mois suivant la clôture
- Présenter les comptes à l''AGO pour approbation
- Nommer un commissaire aux comptes (obligatoire pour SA, optionnel SARL selon seuils)

**Réserve légale** : 10% du bénéfice jusqu''à 20% du capital social
**Distribution de dividendes** : uniquement sur bénéfices distribuables après dotation réserve légale', '{}', ARRAY['AUSCGIE', 'societe', 'SARL', 'SA', 'SAS'], 'AUSCGIE Révisé 2014'),

('droit_ohada', 'procedures_collectives', 'Procédures collectives — Droit OHADA',
'L''Acte Uniforme portant organisation des procédures collectives d''apurement du passif :

**3 procédures** :
1. **Règlement préventif** : entreprise en difficulté mais pas en cessation de paiement
   - Concordat préventif homologué par le juge
   - Suspension des poursuites pendant la négociation

2. **Redressement judiciaire** : cessation de paiement mais possibilité de redressement
   - Concordat de redressement
   - Plan de continuation ou de cession
   - Syndic nommé par le tribunal

3. **Liquidation des biens** : situation irrémédiablement compromise
   - Dessaisissement du débiteur
   - Réalisation de l''actif et distribution aux créanciers
   - Ordre de priorité : superprivilèges salariés > privilèges spéciaux > hypothèques > privilèges généraux > chirographaires

**Cessation de paiement** : impossibilité de faire face au passif exigible avec l''actif disponible
**Délai de déclaration** : 30 jours suivant la cessation de paiement', '{}', ARRAY['procedures_collectives', 'redressement', 'liquidation', 'faillite'], 'AUPC Révisé 2015');

-- ============================================================================
-- 6. SOCIAL — Cotisations par pays
-- ============================================================================

INSERT INTO knowledge_base (domain, subdomain, title, content, country_codes, tags, source) VALUES

('social', 'cotisations', 'Cotisations sociales — Côte d''Ivoire (CNPS)',
'**Cotisations sociales en Côte d''Ivoire — CNPS** :

| Branche | Employeur | Salarié | Plafond |
|---------|-----------|---------|---------|
| Prestations familiales | 5.75% | 0% | 70 000/mois |
| Accidents du travail | 2-5% | 0% | 70 000/mois |
| Retraite (ROP) | 7.7% | 6.3% | 45×70 000 |
| FDFP Apprentissage | 0.4% | 0% | Salaire brut |
| FDFP Formation | 1.2% | 0% | Salaire brut |

**Total charges patronales** : ~17.05% à 20.05%
**Total charges salariales** : 6.3%

**ITS** (Impôt sur Traitements et Salaires) : barème progressif
**CN** (Contribution Nationale) : 1.5%
**IGR** : barème progressif avec quotient familial

**Bulletin de paie** :
Salaire brut - Cotisations salariales - ITS - CN = Salaire net
+ Indemnités non imposables (transport, panier) = Net à payer

**Déclarations** : DISA (Déclaration Individuelle des Salaires Annuels) avant le 31 janvier', ARRAY['CI'], ARRAY['social', 'CNPS', 'paie', 'cotisation', 'FDFP'], 'Code du travail CI, Convention collective'),

('social', 'cotisations', 'Cotisations sociales — Sénégal (CSS/IPRES)',
'**Cotisations sociales au Sénégal** :

**CSS (Caisse de Sécurité Sociale)** :
| Branche | Employeur | Salarié | Plafond |
|---------|-----------|---------|---------|
| Prestations familiales | 7% | 0% | 63 000/mois |
| Accidents du travail | 1-5% | 0% | 63 000/mois |

**IPRES (Retraite)** :
| Régime | Employeur | Salarié | Plafond |
|--------|-----------|---------|---------|
| Régime général | 8.4% | 5.6% | 360 000/mois |
| Régime cadres | 3.6% | 2.4% | 1 080 000/mois |

**IPM** : 3% employeur + 3% salarié (Prévoyance maladie)
**CFCE** : 3% employeur (Contribution Forfaitaire)

**Impôts sur salaires** :
- IR (barème progressif)
- Trimf (forfaitaire selon catégorie)
- CFCE : 3% de la masse salariale
- VF (Versement Forfaitaire) : 3% de la masse salariale

**Régime des cadres** : cotisation IPRES supplémentaire entre plafond RG et plafond RC', ARRAY['SN'], ARRAY['social', 'CSS', 'IPRES', 'IPM', 'paie'], 'Code du travail SN'),

('social', 'cotisations', 'Cotisations sociales — Cameroun (CNPS)',
'**Cotisations sociales au Cameroun — CNPS** :

| Branche | Employeur | Salarié | Plafond |
|---------|-----------|---------|---------|
| Prestations familiales | 7% | 0% | 750 000/mois |
| Accidents du travail | 1.75-5% | 0% | 750 000/mois |
| Pension vieillesse | 4.2% | 2.8% | 750 000/mois |

**Autres charges** :
- FNE (Fonds National de l''Emploi) : 1% employeur
- CFC (Crédit Foncier) : 1% employeur + 1% salarié (plafond 750 000)
- RAV (Redevance Audiovisuelle) : 13 000 FCFA forfait/salarié

**Impôts sur salaires** :
- IRPP : barème progressif (10%, 15%, 25%, 35%)
- CAC : 10% de l''IRPP
- TCS : 2% masse salariale (taxe communale)

**Précompte sur salaires** : retenue à la source par l''employeur
Le Cameroun a le système le plus complexe de la zone OHADA en matière de paie.', ARRAY['CM'], ARRAY['social', 'CNPS', 'FNE', 'CFC', 'paie', 'cameroun'], 'Code du travail CM');

-- ============================================================================
-- 7. Plan comptable SYSCOHADA — comptes clés
-- ============================================================================

INSERT INTO plan_comptable_syscohada (account_number, label, class, category, nature, is_title_account) VALUES
-- Classe 1
('10', 'Capital', 1, 'bilan', 'credit', true),
('101', 'Capital social', 1, 'bilan', 'credit', false),
('105', 'Primes liées au capital social', 1, 'bilan', 'credit', false),
('11', 'Réserves', 1, 'bilan', 'credit', true),
('111', 'Réserve légale', 1, 'bilan', 'credit', false),
('12', 'Report à nouveau', 1, 'bilan', 'mixte', true),
('121', 'Report à nouveau créditeur', 1, 'bilan', 'credit', false),
('129', 'Report à nouveau débiteur', 1, 'bilan', 'debit', false),
('13', 'Résultat net de l''exercice', 1, 'bilan', 'mixte', true),
('131', 'Résultat net : bénéfice', 1, 'bilan', 'credit', false),
('139', 'Résultat net : perte', 1, 'bilan', 'debit', false),
('16', 'Emprunts et dettes assimilées', 1, 'bilan', 'credit', true),
('162', 'Emprunts auprès des établissements de crédit', 1, 'bilan', 'credit', false),
('19', 'Provisions pour risques et charges', 1, 'bilan', 'credit', true),
-- Classe 2
('21', 'Immobilisations incorporelles', 2, 'bilan', 'debit', true),
('213', 'Logiciels et sites internet', 2, 'bilan', 'debit', false),
('215', 'Fonds commercial', 2, 'bilan', 'debit', false),
('22', 'Terrains', 2, 'bilan', 'debit', true),
('23', 'Bâtiments, installations techniques et agencements', 2, 'bilan', 'debit', true),
('24', 'Matériel', 2, 'bilan', 'debit', true),
('241', 'Matériel et outillage industriel et commercial', 2, 'bilan', 'debit', false),
('244', 'Matériel de transport', 2, 'bilan', 'debit', false),
('245', 'Matériel de bureau et informatique', 2, 'bilan', 'debit', false),
('28', 'Amortissements', 2, 'bilan', 'credit', true),
-- Classe 4
('401', 'Fournisseurs, dettes en compte', 4, 'bilan', 'credit', false),
('411', 'Clients', 4, 'bilan', 'debit', false),
('421', 'Personnel, rémunérations dues', 4, 'bilan', 'credit', false),
('431', 'Sécurité sociale', 4, 'bilan', 'credit', false),
('441', 'État, impôt sur les bénéfices', 4, 'bilan', 'credit', false),
('4431', 'TVA facturée sur ventes', 4, 'bilan', 'credit', false),
('4452', 'TVA récupérable sur achats', 4, 'bilan', 'debit', false),
-- Classe 5
('521', 'Banques locales', 5, 'bilan', 'debit', false),
('571', 'Caisse siège social', 5, 'bilan', 'debit', false),
-- Classe 6
('601', 'Achats de marchandises', 6, 'gestion', 'debit', false),
('604', 'Achats stockés de matières et fournitures consommables', 6, 'gestion', 'debit', false),
('605', 'Autres achats', 6, 'gestion', 'debit', false),
('661', 'Rémunérations directes versées au personnel national', 6, 'gestion', 'debit', false),
('664', 'Charges sociales', 6, 'gestion', 'debit', false),
('681', 'Dotations aux amortissements d''exploitation', 6, 'gestion', 'debit', false),
('891', 'Impôts sur les bénéfices de l''exercice', 6, 'gestion', 'debit', false),
-- Classe 7
('701', 'Ventes de marchandises', 7, 'gestion', 'credit', false),
('706', 'Services vendus', 7, 'gestion', 'credit', false),
('791', 'Reprises de provisions d''exploitation', 7, 'gestion', 'credit', false);

-- ============================================================================
-- 8. Taux d'imposition de référence
-- ============================================================================

INSERT INTO tax_rates (country_code, tax_type, rate, effective_date, description, legal_reference) VALUES
-- IS
('CI', 'IS', 25, '2024-01-01', 'Taux normal IS', 'CGI-CI Art. 1'),
('SN', 'IS', 30, '2024-01-01', 'Taux normal IS', 'CGI-SN Art. 4'),
('CM', 'IS', 33, '2024-01-01', 'IS 30% + CAC 10%', 'CGI-CM Art. 1'),
('GA', 'IS', 30, '2024-01-01', 'Taux normal IS', 'CGI-GA'),
('BF', 'IS', 27.5, '2024-01-01', 'Taux normal IS', 'CGI-BF'),
('ML', 'IS', 30, '2024-01-01', 'Taux normal IS', 'CGI-ML'),
('TG', 'IS', 27, '2024-01-01', 'Taux normal IS', 'CGI-TG'),
('BJ', 'IS', 30, '2024-01-01', 'Taux normal IS', 'CGI-BJ'),
('NE', 'IS', 30, '2024-01-01', 'Taux normal IS', 'CGI-NE'),
('GN', 'IS', 25, '2024-01-01', 'Taux normal IS', 'CGI-GN'),
('TD', 'IS', 35, '2024-01-01', 'Taux normal IS', 'CGI-TD'),
('CF', 'IS', 30, '2024-01-01', 'Taux normal IS', 'CGI-CF'),
('CG', 'IS', 30, '2024-01-01', 'Taux normal IS', 'CGI-CG'),
('CD', 'IS', 30, '2024-01-01', 'Taux normal IS', 'CGI-CD'),
('GQ', 'IS', 35, '2024-01-01', 'Taux normal IS', 'CGI-GQ'),
('KM', 'IS', 50, '2024-01-01', 'Taux normal IS', 'CGI-KM'),
('GW', 'IS', 25, '2024-01-01', 'Taux normal IS', 'CGI-GW'),
-- TVA
('CI', 'TVA', 18, '2024-01-01', 'Taux normal TVA', 'CGI-CI Art. 340'),
('SN', 'TVA', 18, '2024-01-01', 'Taux normal TVA', 'CGI-SN'),
('CM', 'TVA', 19.25, '2024-01-01', 'TVA 17.5% + CAC', 'CGI-CM Art. 120'),
('GA', 'TVA', 18, '2024-01-01', 'Taux normal TVA', 'CGI-GA'),
('BF', 'TVA', 18, '2024-01-01', 'Taux normal TVA', 'CGI-BF'),
('CD', 'TVA', 16, '2024-01-01', 'Taux normal TVA', 'CGI-CD'),
-- IMF
('CI', 'IMF', 1, '2024-01-01', 'Minimum de perception 1% du CA', 'CGI-CI'),
('CM', 'IMF', 2.2, '2024-01-01', 'Minimum 2.2% du CA (IS+CAC)', 'CGI-CM'),
('SN', 'IMF', 0.5, '2024-01-01', 'Minimum 0.5% du CA', 'CGI-SN');
