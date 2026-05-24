# Audit UX / UI — Atlas Finance & Accounting (WiseBook ERP v3.0)

> Audit indépendant pré-production, sans complaisance. Réalisé le 2026-05-21.
> Cible : comptables / experts-comptables OHADA (SYSCOHADA), productivité clavier critique, consultation mobile occasionnelle.

---

## 1. Résumé exécutif

**Verdict : PAS PRÊT pour l'adoption en production.** Niveau de confiance : **ÉLEVÉ** — l'application a pu être lancée (Vite dev sur `:5199`), les parcours observés en direct, le DOM/CSS inspecté, et l'analyse statique du code croisée avec l'observation runtime.

Le produit a une **fondation design soignée** (système de tokens « Petrol Cream » cohérent, contrastes de texte principal excellents, composants premium, formulaire de saisie d'écriture riche avec wizard + contrôle D=C temps réel + respect de l'intangibilité SYSCOHADA). Mais il est **bloqué par plusieurs défauts de qualité graves qui le rendent inutilisable ou non professionnel en l'état** :

- **P0 — Crash systématique de toute l'application authentifiée** au premier chargement (violation des Rules of Hooks dans `RBACGuard`). VÉRIFIÉ en direct : `/dashboard` et `/accounting/entries` tombent dans l'Error Boundary après ~1,5 s.
- **P0/P1 — Bandeau « DEBUG INPUT » jaune visible sur TOUTES les pages** authentifiées (laissé dans le layout de production).
- **P1 — Classe Tailwind corrompue `tranprimary` (= `translate` cassé) répétée 158 fois dans 100 fichiers** : positionnement d'icônes/éléments centrés cassé dans toute l'app (issu d'un rechercher-remplacer global raté).
- **P1 — `@ts-nocheck` dans 304 fichiers** : vérification TypeScript désactivée partout → c'est la cause-racine qui laisse passer ces régressions.
- **P1 — Sous-système d'accessibilité entièrement débranché** (`AccessibilityProvider` jamais monté) + **token `--color-text-tertiary` échoue le contraste WCAG AA**.
- **P1 — Données mockées / parcours non câblés** sur des écrans clés (liste des écritures vide+badge « 8 » en dur, bouton « Contrepassation » sans effet).

L'ossature est récupérable, mais aucune mise en production n'est envisageable tant que les P0 ne sont pas corrigés.

---

## 2. Méthode

| Élément | Détail |
|---|---|
| App lancée ? | **OUI** — `npm run dev` (Vite v6.4.1), port 5199, via `.claude/launch.json`. Compilation OK, pas d'erreur de build. |
| Mode | `import.meta.env.DEV` → RBAC laissé passant ; pas de Supabase (mode local Dexie). |
| Écrans observés en direct | Landing page (`/`), Tableau de bord comptabilité (`/dashboard` — screenshot), écran Écritures (`/accounting/entries`), états d'erreur (Error Boundary). |
| Captures | Dashboard comptable capturé (voir §3). Les captures supplémentaires ont été **empêchées par des animations perpétuelles** (framer-motion / spinners) qui bloquent la stabilisation du screenshot — contournées par inspection DOM via `preview_eval`. |
| Inspections | DOM (`preview_eval`), CSS/tokens (`globals.css`, `tailwind.config.js`), logs console (`preview_console_logs`). |
| Analyse statique | App.tsx, RBACGuard, AuthContext, ErrorBoundary, ModernDoubleSidebarLayout, JournalEntryModal (2183 l.), EntriesPage, MoneyValue, DataTable, useAccessibility, ThemeContext, theme.ts, globals.css. |
| Limite | Une bonne partie de l'instrumentation visuelle a été gênée par les animations en boucle ; les findings visuels précis reposent donc sur l'inspection CSS/DOM (marqués VÉRIFIÉ) et non sur des screenshots pixel-perfect.

> Note importante (P0) : le crash décrit en §3.1 m'a obligé à **injecter manuellement un utilisateur dev persisté** (`localStorage.atlas-dev-user`) pour pouvoir auditer les écrans internes — ce qui confirme que le crash frappe précisément l'utilisateur qui arrive sans session persistée (cas réel d'un premier accès).

---

## 3. Findings par thème

### 3.0 BLOQUANT — Crash global de l'app authentifiée (Rules of Hooks)

**[UX-01] P0 — `RBACGuard` viole les Rules of Hooks → Error Boundary sur tous les modules.** VÉRIFIÉ (runtime + code).

- Reproduction directe : chargement propre de `/dashboard` → la sidebar s'affiche, puis ~1,5 s plus tard (transition `loading: true → false` de l'AuthContext) toute la zone passe en « Oups ! Une erreur est survenue ». Idem `/accounting/entries`.
- Console : `Warning: React has detected a change in the order of Hooks called by RBACGuard … Previous: useContext, useState ; Next: useContext, useState, useEffect` puis `Error: Rendered more hooks than during the previous render.`
- Cause-racine — `src/components/auth/RBACGuard.tsx:68-74` : un `if (loading) return <spinner/>` **précède** le `useEffect` de `src/components/auth/RBACGuard.tsx:95`. Au 1er render `loading=true` → 2 hooks ; au render suivant `loading=false` → 3 hooks. Déclencheur : `AuthContext` initialise `loading = !initialDevUser` (`src/contexts/AuthContext.tsx:97`) puis le passe à `false` dans un effet (`src/contexts/AuthContext.tsx:169-176`).
- Impact adoption : **tout nouvel utilisateur / nouvelle session / onglet privé** arrive sur un écran d'erreur. C'est l'échec du « happy path » n°1.
- Correctif : déplacer **tous** les hooks (`useState`, `useEffect`) AVANT tout `return` conditionnel dans `RBACGuard`.

> Effet de bord positif observé : l'Error Boundary lui-même fonctionne bien (message FR clair, pas de stack en prod — voir [UX-15]).

### 3.1 Parcours critiques (saisie, rapprochement, clôture, états, navigation)

**[UX-02] P1 — Écran « Écritures » non câblé aux données + libellés mensongers.** VÉRIFIÉ (code `src/pages/accounting/EntriesPage.tsx`).
- `EntriesPage.tsx:43-44` : `// TODO: wire to Dexie journalEntries query` ; `ecrituresData = []` en dur → la liste est toujours vide.
- En parallèle, badge d'onglet « 8 » en dur (`EntriesPage.tsx:195`) et pastille « 8 en attente » (`EntriesPage.tsx:277`) : l'UI annonce 8 écritures alors que la table est vide. Incohérence trompeuse pour un comptable.
- Modal « Détails » affiche des lignes **codées en dur** 411000 / 707000 = 150 000 quel que soit l'élément sélectionné (`EntriesPage.tsx:545-556`).
- `handleValidateEntry` ne fait qu'un `toast.success` (`EntriesPage.tsx:218-221`, commentaire « Ici on ajouterait l'appel API ») → la validation depuis la liste est factice.

**[UX-03] P1 — Bouton « Contrepassation » sans effet (UI de reversal incomplète).** VÉRIFIÉ (code).
- `JournalEntryModal.tsx:858-864` : le bouton « Contrepassation » fait `setShowReversalDialog(true)`, et `reversalReason` est déclaré (`JournalEntryModal.tsx:79-80`). **Mais aucun JSX ne lit `showReversalDialog`** et `reversalReason` n'est jamais réutilisé (grep : 0 occurrence de rendu). Clic = aucun retour visuel.
- C'est précisément le parcours métier « interdire la suppression d'écriture validée → proposer extourne/contre-passation » que l'audit demandait de vérifier : le **verrou** est bon (voir [UX-04]) mais la **voie légitime de contre-passation est cassée** côté UI.

**[UX-04] POSITIF — Intangibilité SYSCOHADA correctement gérée (verrou).** VÉRIFIÉ (code `JournalEntryModal.tsx`).
- `isLocked` sur statut validé/comptabilisé (`:73-74`), bandeau « Comptabilisée — Immutable (SYSCOHADA Art. 19) » (`:828`), bouton final remplacé par « Écriture verrouillée » (`:2066-2070`). Pas de bouton « Supprimer » sur écriture validée. Conforme attente métier — seul le rendu du dialogue de contre-passation manque ([UX-03]).

**[UX-05] P2 — Navigation : remount complet à chaque changement de page.** VÉRIFIÉ (code `ModernDoubleSidebarLayout.tsx:960`).
- `<Outlet key={location.pathname} />` force un démontage/remontage total à chaque navigation (vraisemblablement le correctif « page blanche »). Effet : perte d'état + refetch systématique + flash → performance perçue dégradée sur navigation inter-modules. À surveiller (compromis acceptable si le P0 est réglé, mais à reconsidérer).

### 3.2 Cohérence visuelle (design system, typo, icônes)

**[UX-06] P1 — Classe Tailwind corrompue `tranprimary` (transform cassé) — 158 occurrences / 100 fichiers.** VÉRIFIÉ (grep + code).
- Ex. `src/components/accounting/AdvancedBalance.tsx:339` : `transform -tranprimary-y-1/2` (devait être `-translate-y-1/2`) sur l'icône de recherche → icône non centrée verticalement. Idem `JournalEntryModal.tsx:1023` (icône calendrier), `EntriesPage.tsx:424` (FAB « + »).
- Origine : un rechercher-remplacer global (`translate` → `…primary`, ou `purple`→`primary`) ayant corrompu `tran**slate**` en `tran**primary**`. Tailwind ignore silencieusement la classe inconnue → des dizaines d'icônes/éléments centrés sont mal positionnés dans toute l'app.
- Note : à l'inverse, `bg-primary-50` / `text-primary-700` (vus dans le modal) **sont valides** (échelle `primary` définie `tailwind.config.js:49-63`) et restent dans la palette pétrole.

**[UX-07] P2 — Mélange tokens thème vs palette Tailwind brute dans la saisie d'écriture.** VÉRIFIÉ (code).
- `JournalEntryModal.tsx` utilise massivement `bg-blue-50/600`, `green-50/600`, `gray-*`, `amber-*` (couleurs Tailwind par défaut) au lieu des `var(--color-*)` « Petrol Cream » employés ailleurs (dashboard, balance). Conséquence : la fenêtre de saisie (écran le plus utilisé d'un comptable) **ne suit pas le thème** et jure visuellement avec le reste (bleu générique vs pétrole). Idem `MoneyValue.tsx:32-34` : couleurs succès/danger en dur (`#15803D`, `#C0322B`).

**[UX-08] P2/P3 — Iconographie mixte lucide + heroicons.** SUPPOSÉ (deps `package.json` : `lucide-react` + `@heroicons/react`). Risque de styles de trait/épaisseur incohérents selon les écrans. À standardiser sur lucide (dominant).

**[UX-09] POSITIF — Système de tokens cohérent et soigné.** VÉRIFIÉ (`globals.css`, `tailwind.config.js`).
- Tokens complets (couleurs, ombres multi-couches, motion easings, radius, letter-spacing), palette Petrol Cream documentée, plusieurs thèmes nommés (`theme.ts` : Petrol Cream, Atlas F&A, Ocean Blue, Midnight, Sahel Gold…). Branding « Atlas F&A » en Grand Hotel observé en direct.

### 3.3 Accessibilité WCAG 2.1 AA

**[UX-10] P1 — Sous-système d'accessibilité débranché (dead code).** VÉRIFIÉ (grep + App.tsx).
- `useAccessibility` / `AccessibilityProvider` (`src/accessibility/`) ne sont importés que dans `src/accessibility/` lui-même. `App.tsx` ne monte PAS `AccessibilityProvider` (arbre : Query→Data→Theme→Language→Auth→Workspace→Toast→Navigation). Donc : reduce-motion, high-contrast, mise à l'échelle de police, annonces `aria-live` → **inopérants** malgré un hook complet et bien écrit.

**[UX-11] P1 — Contraste : `--color-text-tertiary` échoue WCAG AA.** VÉRIFIÉ (tokens `globals.css:48-51`, ratios calculés).
- `--color-text-tertiary: #8A8170` sur `--color-background #F7F5EF` ≈ **3,4:1** → ÉCHEC AA texte normal (seuil 4,5:1) ; sur blanc `#FFFFFF` ≈ **3,9:1** → ÉCHEC. Or ce token sert aux sous-titres, légendes, placeholders (très répandu).
- `--color-text-quaternary: #B0A893` ≈ **2,2:1** → échec massif (à réserver au décoratif).
- `--color-warning / amber #E89A2E` en **texte sur blanc** ≈ **2,5:1** → ÉCHEC ; ne doit jamais servir de texte (OK comme fond avec texte foncé).
- À l'inverse (POSITIF) : `--color-text-primary #261E15` sur crème ≈ **15,9:1** et sur blanc ≈ **17,6:1** (AAA) ; `--color-primary #235A6E` sur blanc ≈ **6,4:1** (AA). `text-secondary #5C5347` ≈ **6,0:1** (AA OK).

**[UX-12] P2 — Pas de vrai mode sombre OS ; utilitaires `dark:` morts.** VÉRIFIÉ (grep + ThemeContext + tailwind.config).
- `tailwind.config.js:3` : `darkMode: ["class"]` (nécessite une classe `.dark`). Or `ThemeContext` n'applique que des **CSS vars**, n'ajoute jamais `.dark` (grep `classList…'dark'` = 0). Donc tous les utilitaires `dark:` (ex. 50 dans `PaymentOrdersPage.tsx`, présents aussi dans l'Error Boundary) sont **inactifs**. Le sombre n'existe que via le thème nommé « Midnight ». Incohérence trompeuse pour les devs et pour `prefers-color-scheme`.

**[UX-13] POSITIF / mitigé — ARIA & skip-link présents.** VÉRIFIÉ.
- Skip link « Aller au contenu principal » observé en direct ; `<main role="main" id="main-content">` (`ModernDoubleSidebarLayout.tsx:943-946`). 438 `aria-label` dans 156 fichiers. Couverture ARIA correcte au niveau composant — mais non systématique et non testée lecteur d'écran (voir Angles morts).

**[UX-14] P2 — Cibles tactiles à vérifier.** SUPPOSÉ. Boutons d'action de tableau en `p-1` (~24-28 px, ex. `EntriesPage.tsx:386-408`) < 44 px recommandés. Plusieurs icônes-boutons `p-1`/`p-2`. À mesurer/agrandir pour l'usage tablette.

### 3.4 Responsive (desktop / tablette / mobile)

**[UX-15] P2 — Responsive non vérifié en direct (bloqué par P0/animations) ; signaux mitigés en code.** SUPPOSÉ / analyse statique.
- Présence d'un `MobileConsultationBanner`, menu mobile (`mobileMenuOpen`, Alt+M), classes `lg:` → intention responsive réelle. Mais `EntriesPage.tsx:250` fixe `h-screen … overflow-hidden` + FAB en `fixed top-1/2 right-8` (avec le `translate` cassé [UX-06]) : risque de contenu coupé / FAB mal placé sur petits écrans. À tester réellement après correction du P0.

### 3.5 Feedback utilisateur (chargements, erreurs, confirmations destructives)

**[UX-16] POSITIF — Error Boundary de qualité, sans fuite de stack en prod.** VÉRIFIÉ (`ErrorBoundary.tsx`).
- Stack/détails affichés **uniquement** si `NODE_ENV === 'development'` (`:135`) ; en prod, message FR rassurant + 3 actions (Réessayer / Recharger / Retour). Log serveur `/api/errors/log`. Reset auto sur changement de route (`resetKey`).
- Nits : « Retour à l'accueil » renvoie vers `/` (landing marketing) plutôt que `/dashboard` ; classes `dark:` mortes ([UX-12]).

**[UX-17] P2 — Suppression destructive : verrou écriture OK, mais confirmation génériques à auditer.** Partiel. Le verrou SYSCOHADA empêche la suppression d'écriture validée ([UX-04]) — excellent. Existence d'un `ConfirmDialog` générique (présent dans le code) mais usage non systématiquement vérifié sur les autres suppressions (tiers, modèles, etc.).

**[UX-18] P2 — Spinners vs skeletons.** VÉRIFIÉ (partiel). Le fallback global est un **spinner** plein écran (`App.tsx:261` `LoadingFallback`), pas de skeleton screens. Les spinners en boucle ont d'ailleurs empêché l'instrumentation. Pas d'optimistic UI observé.

### 3.6 Formulaires (validation, autosave, raccourcis)

**[UX-19] POSITIF — Saisie d'écriture : wizard riche + clavier + validation temps réel.** VÉRIFIÉ (`JournalEntryModal.tsx`).
- Wizard 5 onglets avec indicateurs de complétion, contrôle d'équilibre D=C live (`:257`), validation TVA, liste d'erreurs actionnables (`:1864-1881`), persistance réelle via `validateJournalEntry`/`getNextPieceNumber`/`safeAddEntry` (`:570-597`). Raccourcis : Ctrl+Tab / Ctrl+Shift+Tab, PageUp/Down, Ctrl+Entrée pour valider (`:614-651`), aides clavier affichées (`:2034-2049`). `react-hotkeys-hook` présent.

**[UX-20] P1 — Formulaire de saisie pré-rempli de données fictives à chaque « Nouvelle écriture ».** VÉRIFIÉ.
- `JournalEntryModal.tsx:192-196` : lignes par défaut 607000=100000 / 445200=19250 / 401001=119250 ; `factureInfo.numeroFacture='FA-2025-001'`, montants règlement = 119250 en dur. Un comptable ouvrant une saisie vierge voit une fausse écriture pré-remplie → risque d'erreur de saisie réelle et confusion.

**[UX-21] P1 — Plan comptable de la saisie limité à 20 comptes en dur.** VÉRIFIÉ (`JournalEntryModal.tsx:110-130`).
- Le sélecteur de compte propose une liste figée de ~20 comptes, pas le plan SYSCOHADA réel chargé en base. Inutilisable pour une vraie comptabilité (rédhibitoire métier).

**[UX-22] P2 — Pas d'autosave / pas de garde « modifications non enregistrées ».** SUPPOSÉ. Sur saisie longue, fermeture/`Annuler` réinitialise sans avertir (`resetForm`). Aucun brouillon auto. Le bouton « Brouillon » du footer (`:2014-2016`) n'a aucun handler → inopérant.

### 3.7 Tableaux & données (tri, filtres, export, formats)

**[UX-23] POSITIF — DataTable complet.** VÉRIFIÉ (`DataTable.tsx`). Tri, filtres (text/select/date/number/boolean), recherche, export, print, pagination, alignement par colonne (`align:'right'` sur Débit/Crédit), `emptyMessage`. `xlsx` + `jspdf` en deps pour export. Virtualisation dispo (`@tanstack/react-virtual`).

**[UX-24] POSITIF — Formats monétaires localisés fr-FR.** VÉRIFIÉ. `MoneyValue` et `formatMontant` utilisent `toLocaleString/Intl('fr-FR')` → séparateur de milliers = espace, décimale = virgule. Montants Débit/Crédit alignés à droite et colorés (`EntriesPage.tsx:129-148`).

**[UX-25] P2 — Incohérence de devise FCFA vs XAF.** VÉRIFIÉ. Le toggle de format affiche « FCFA » (observé en direct), mais `JournalEntryModal.tsx:1940/1944/1994` codent « XAF » en dur. Choisir un libellé unique et le piloter par les paramètres société (XOF/XAF/EUR).

### 3.8 Onboarding

**[UX-26] P2 — Onboarding non vérifiable en direct (P0) ; structure présente.** Analyse statique. Pages `src/pages/onboarding/` (Register, VerifyEmail, AcceptInvite, SolutionCatalog) + assistants `SetupWizardPage`, `AssistantDemarragePage`, `CompanySetupWizard`. La landing promet « Opérationnel en 10 minutes / l'assistant charge le plan SYSCOHADA » — non validable tant que le P0 bloque l'entrée dans l'app. À tester de bout en bout après [UX-01].

### 3.9 Microcopy

**[UX-27] POSITIF — Vocabulaire métier correct.** VÉRIFIÉ. « Débit »/« Crédit » (et non Entrée/Sortie), « Journal », « Ventilation », « Lettrage », « Report à nouveau », « Contrepassation », « Exercice », « Liasse DSF », codes journaux AC/VE/BQ/CA/OD. Tooltip explicatif sur le code journal (`JournalEntryModal.tsx:1031`). Messages d'erreur de validation actionnables et en français.

**[UX-28] P0/P1 — Microcopy de débogage en production.** VÉRIFIÉ (runtime + code). Voir [UX-30] : « DEBUG INPUT: Tape ici pour tester… / Si tu perds le focus ici aussi, le bug est dans le layout » visible à l'écran.

### 3.10 Performance perçue & qualité de code

**[UX-29] P1 — `@ts-nocheck` dans 304 fichiers.** VÉRIFIÉ (grep). Vérification TypeScript désactivée sur l'essentiel du code (dont `JournalEntryModal`, `DataTable`, le layout). C'est la **cause-racine systémique** : les régressions [UX-01] (hooks), [UX-06] (`tranprimary`), [UX-03] (état mort) auraient été détectées au build par TS/ESLint. Compromet la confiance pré-prod.

**[UX-30] P0/P1 — Bandeau « DEBUG INPUT » + `console.log` debug dans le layout de production.** VÉRIFIÉ (runtime + `ModernDoubleSidebarLayout.tsx`).
- `:948-958` : bloc jaune `bg-yellow-100` avec input « Tape ici pour tester… » rendu **au-dessus du contenu de chaque page** authentifiée (observé sur dashboard ET écritures).
- `:54-61` : compteur global `__layoutMountCount` + `console.log("[DEBUG] ModernDoubleSidebarLayout MOUNTED…")`. À supprimer impérativement. (Gravité P0 sur le plan « image produit » : aucun comptable ne fera confiance à un logiciel comptable affichant un champ DEBUG jaune.)

**[UX-31] P2 — Animations en boucle perpétuelles.** VÉRIFIÉ (indirect). Snapshots/screenshots impossibles à stabiliser (landing + spinners + halos animés `gold-shimmer 6s infinite`, `subtle-pulse infinite`). Au-delà du désagrément de test, cela indique des animations infinies qui peuvent gêner les utilisateurs sensibles au mouvement — d'autant que `reduce-motion` est débranché ([UX-10]).

---

## 4. Liste priorisée des frictions / points bloquants pour l'adoption

**Bloquants absolus (à corriger avant toute mise en prod) :**
1. **[UX-01] P0** — Crash hooks `RBACGuard` → toute l'app authentifiée tombe en erreur au 1er chargement.
2. **[UX-30] P0/P1** — Bandeau « DEBUG INPUT » jaune + logs debug sur toutes les pages.
3. **[UX-21] P1** — Saisie d'écriture limitée à 20 comptes en dur (inutilisable en compta réelle).
4. **[UX-02] P1** — Liste des écritures non câblée + compteurs « 8 » mensongers + validation factice.
5. **[UX-20] P1** — Saisie pré-remplie de fausses lignes/montants à chaque nouvelle écriture.
6. **[UX-03] P1** — Contre-passation sans effet (voie légitime du « no-delete » cassée).

**Majeurs (qualité / accessibilité / cohérence) :**
7. **[UX-06] P1** — 158 classes `tranprimary` cassées (icônes mal positionnées partout).
8. **[UX-29] P1** — `@ts-nocheck` sur 304 fichiers (cause-racine).
9. **[UX-10] P1** — Accessibilité débranchée (provider non monté).
10. **[UX-11] P1** — `text-tertiary`/quaternary/amber échouent le contraste AA.
11. **[UX-07] P2** — Modal de saisie hors-thème (bleu générique vs pétrole).

**Mineurs / à surveiller :** [UX-05], [UX-12], [UX-14], [UX-15], [UX-18], [UX-22], [UX-25], [UX-31].

---

## 5. Angles morts (non couverts par cet audit)

- **Tests lecteurs d'écran réels** (NVDA/JAWS/VoiceOver) : non réalisés. Le hook a11y étant débranché, l'expérience SR réelle est inconnue (ordre de focus, annonces de validation D=C, libellés de tableaux).
- **Tests utilisateurs comptables réels** : aucune mesure de temps de saisie, taux d'erreur, nombre de clics réels — recommandé sur 3-5 experts-comptables OHADA.
- **Responsive réel tablette/mobile** : bloqué par le P0 et les animations ; à reprendre après correctifs (parcours saisie sur tablette en particulier).
- **Parcours complets bout-en-bout** : rapprochement bancaire, clôture, génération d'états, onboarding/setup wizard, multi-sociétés, multi-devises — non exécutés en direct (P0). Analyse limitée au code.
- **Mode sombre** : non testé visuellement (thème « Midnight »).
- **Performance réelle gros volumes** : virtualisation présente mais non éprouvée sur 10k+ écritures (données vides en dev).
- **Métriques d'adoption / analytics** : aucune instrumentation produit observée pour mesurer l'usage post-lancement.
- **i18n** : seul `fr` réellement vérifié ; couverture des clés `t()` non auditée.

---

## 6. Tableau récapitulatif

| ID | Sévérité | Thème | Description | Fichier:ligne / Preuve | Effort |
|----|----------|-------|-------------|------------------------|--------|
| UX-01 | **P0** | Parcours/Tech | `RBACGuard` viole Rules of Hooks → Error Boundary sur tous les modules au 1er load | `src/components/auth/RBACGuard.tsx:68-95` ; `AuthContext.tsx:97,169` ; runtime VÉRIFIÉ | S (déplacer hooks avant return) |
| UX-30 | **P0/P1** | Microcopy/Qualité | Bandeau « DEBUG INPUT » jaune + `console.log` debug sur chaque page | `src/components/layout/ModernDoubleSidebarLayout.tsx:54-61,948-958` ; runtime VÉRIFIÉ | XS |
| UX-21 | **P1** | Formulaires | Saisie d'écriture limitée à 20 comptes en dur (pas le plan réel) | `src/components/accounting/JournalEntryModal.tsx:110-130` | M (câbler au plan DB) |
| UX-02 | **P1** | Parcours/Données | Liste écritures non câblée (`[]`) + badge « 8 » en dur + validation factice + détails mockés | `src/pages/accounting/EntriesPage.tsx:43-44,195,277,545-556,218-221` | M |
| UX-20 | **P1** | Formulaires | Nouvelle écriture pré-remplie de fausses lignes/montants | `JournalEntryModal.tsx:192-196,209,219` | XS |
| UX-03 | **P1** | Parcours métier | Bouton « Contrepassation » sans dialogue rendu (reversal UI morte) | `JournalEntryModal.tsx:79-80,858-864` (0 rendu) | S |
| UX-06 | **P1** | Cohérence visuelle | Classe `tranprimary` cassée (=`translate`) × 158 dans 100 fichiers → icônes mal centrées | `AdvancedBalance.tsx:339`, `JournalEntryModal.tsx:1023`, `EntriesPage.tsx:424`, … | M (replace global) |
| UX-29 | **P1** | Qualité code | `@ts-nocheck` dans 304 fichiers (cause-racine des régressions) | grep `@ts-nocheck` = 304 fichiers | L |
| UX-10 | **P1** | Accessibilité | `AccessibilityProvider` jamais monté → reduce-motion/high-contrast/scaling/announce morts | `src/App.tsx` (absent) ; `src/accessibility/*` | S |
| UX-11 | **P1** | Accessibilité | `text-tertiary #8A8170` ≈ 3,4:1, quaternary ≈ 2,2:1, amber texte ≈ 2,5:1 → échec AA | `src/styles/globals.css:48-66` (ratios calculés) | S |
| UX-07 | **P2** | Cohérence visuelle | Modal de saisie en couleurs Tailwind brutes (bleu/gris) hors thème Petrol Cream | `JournalEntryModal.tsx` (bg-blue/gray/green) ; `MoneyValue.tsx:32-34` | M |
| UX-22 | **P2** | Formulaires | Pas d'autosave ni garde « modifs non enregistrées » ; bouton « Brouillon » sans handler | `JournalEntryModal.tsx:2014-2016`, `resetForm` | M |
| UX-25 | **P2** | Tableaux/Formats | Devise incohérente : « FCFA » (UI) vs « XAF » (modal en dur) | `JournalEntryModal.tsx:1940,1944,1994` | XS |
| UX-12 | **P2** | A11y/Thème | `darkMode:["class"]` sans `.dark` appliquée → utilitaires `dark:` morts | `tailwind.config.js:3` ; `ThemeContext.tsx` ; grep | S |
| UX-05 | **P2** | Navigation/Perf | `<Outlet key={pathname}>` remonte toute la page à chaque nav | `ModernDoubleSidebarLayout.tsx:960` | S |
| UX-14 | **P2** | A11y | Boutons d'action `p-1` < 44 px (tablette) | `EntriesPage.tsx:386-408` (SUPPOSÉ) | S |
| UX-18 | **P2** | Feedback | Spinners pleine page, pas de skeleton ni optimistic UI | `App.tsx:261` | M |
| UX-31 | **P2** | Perf perçue/A11y | Animations infinies (`gold-shimmer`, `subtle-pulse`) sans reduce-motion actif | `tailwind.config.js:224-241` ; runtime | S |
| UX-08 | **P3** | Cohérence | Mélange icônes lucide + heroicons | `package.json` (SUPPOSÉ) | S |
| UX-16 | POSITIF | Feedback | Error Boundary FR, pas de stack en prod, 3 actions de récup | `ErrorBoundary.tsx:135` | — |
| UX-04 | POSITIF | Métier | Verrou intangibilité SYSCOHADA (no-delete écriture validée) | `JournalEntryModal.tsx:73-74,828,2066` | — |
| UX-19 | POSITIF | Formulaires | Wizard saisie + D=C live + raccourcis clavier + persistance réelle | `JournalEntryModal.tsx:257,570-597,614-651` | — |
| UX-23 | POSITIF | Tableaux | DataTable complet (tri/filtre/export/print/align/empty) | `DataTable.tsx` | — |
| UX-24 | POSITIF | Formats | Montants fr-FR (espace milliers, virgule décimale, alignés droite) | `MoneyValue.tsx:95`, `EntriesPage.tsx:129-148` | — |
| UX-27 | POSITIF | Microcopy | Vocabulaire SYSCOHADA correct (Débit/Crédit, Lettrage, Report à nouveau…) | `JournalEntryModal.tsx:1031`, EntriesPage | — |
| UX-09 | POSITIF | Design system | Tokens cohérents, multi-thèmes, branding Grand Hotel | `globals.css`, `theme.ts`, `tailwind.config.js` | — |

> Effort : XS < 1 h · S ≈ ½ j · M ≈ 1-3 j · L ≈ > 3 j.

---

*Findings VÉRIFIÉS = app lancée / écran observé / DOM-CSS inspecté / code lu. Findings SUPPOSÉS = analyse statique sans confirmation runtime (responsive, cibles tactiles, onboarding bout-en-bout — bloqués par le P0 et les animations).*
