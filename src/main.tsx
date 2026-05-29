import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { Toaster as SonnerToaster } from 'sonner'
import { HelmetProvider } from 'react-helmet-async'
import * as Sentry from '@sentry/react'

// ── Sentry Error Monitoring ──────────────────────────────────
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN;
if (!SENTRY_DSN && import.meta.env.PROD) {
  // Sans DSN en prod, on est aveugle aux incidents : on le signale fort
  // plutôt que de désactiver silencieusement. Définir VITE_SENTRY_DSN au build.
  console.warn(
    '[Sentry] VITE_SENTRY_DSN absent en production — monitoring d\'erreurs DÉSACTIVÉ.',
  );
}
if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      // Strip financial data from error reports
      if (event.extra) {
        delete event.extra.debit;
        delete event.extra.credit;
        delete event.extra.montant;
        delete event.extra.solde;
      }
      return event;
    },
  });
}
// CHARGEMENT SYNCHRONE DES CSS - AVANT tout le reste
import './styles/base.css'
import './index.css'

// ── Focus Guard ────────────────────────────────────────────────────────────────
// Problème : des inputs perdent le focus à chaque frappe clavier sur TOUTES les
// pages. Cause probable : un composant React est re-monté (key change, inline
// component definition, conditional render) et React déplace le focus vers
// document.body silencieusement.
//
// Ce guard détecte le pattern "focus → body sans interaction pointeur" et :
//   • restaure le focus sur l'élément original (correction visible)
//   • logge l'élément ET la stacktrace en DEV (aide au diagnostic)
//
// Logique :
//   - Si relatedTarget != null → l'utilisateur a cliqué ailleurs → ne rien faire
//   - Si pointerdown récent (<300 ms) → clic intentionnel → ne rien faire
//   - Si l'élément n'est plus dans le DOM → il a été vraiment retiré → ne rien faire
//   - Sinon : focus volé par React → restaurer + loguer
(function installFocusGuard(): void {
  let lastPointerMs = 0;

  document.addEventListener('pointerdown', () => {
    lastPointerMs = Date.now();
  }, { capture: true, passive: true });

  document.addEventListener('focusout', (e: FocusEvent) => {
    const lost = e.target as HTMLElement;
    const tag = lost.tagName;
    // On ne surveille que les éléments de saisie
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return;
    // L'utilisateur a intentionnellement changé le focus vers un autre élément
    if (e.relatedTarget !== null) return;
    // Clic souris/tactile récent → pas une perte accidentelle
    if (Date.now() - lastPointerMs < 300) return;

    // Capturer les identifiants AVANT le rAF (l'élément peut disparaître)
    const lostName        = (lost as HTMLInputElement).name;
    const lostId          = lost.id;
    const lostPlaceholder = (lost as HTMLInputElement).placeholder;

    requestAnimationFrame(() => {
      // Focus est allé ailleurs (Tab, clic, etc.) — rien à faire
      if (document.activeElement !== document.body && document.activeElement != null) return;

      let target: HTMLElement | null = null;

      if (document.body.contains(lost) && !(lost as HTMLInputElement).disabled) {
        // Cas 1 : l'élément est TOUJOURS dans le DOM — focus volé par autre chose
        target = lost;
      } else {
        // Cas 2 : l'élément a été RE-MONTÉ par React (ancien nœud supprimé,
        // nouveau nœud créé). On cherche le nouveau par attributs identifiants.
        const tagLow = tag.toLowerCase();
        const selector = lostName        ? `${tagLow}[name="${lostName}"]`
                       : lostId          ? `#${lostId}`
                       : lostPlaceholder ? `${tagLow}[placeholder="${lostPlaceholder}"]`
                       : null;
        if (selector) {
          target = document.querySelector<HTMLElement>(selector);
          if (target && (target as HTMLInputElement).disabled) target = null;
        }
      }

      if (!target) return;

      if (import.meta.env.DEV) {
        const name = lostName || lostPlaceholder || lostId || tag;
        const remounted = target !== lost;
        console.warn(
          `[FocusGuard] focus volé sur <${tag}> "${name}"` +
          (remounted ? ' [élément RE-MONTÉ]' : '') +
          ' — restauration.',
          new Error('stacktrace').stack,
        );
      }
      target.focus({ preventScroll: true });
    });
  }, true);
})();

// DEBUG - Test des providers un par un
// import App from './App.debug1'  // Test 1 : LanguageProvider seul OK
// import App from './App.debug2'  // Test 2 : + ThemeProvider OK
// import App from './App.debug3'  // Test 3 : + QueryClient OK
// import App from './App.debug4'  // Test 4 : + AuthProvider SANS useEffect
// import App from './App.debug6'  // Test 6 : + AuthProvider SANS TAILWIND (styles inline)
// import App from './App.debug8'  // Test 8 : Loader caché depuis React
// import App from './App.stable'  // VERSION STABLE : Ne rendre que quand tout est prêt
import App from './App'  // LOADER REACT : Tout géré par React

// Fonction pour cacher le loader
const hideLoader = () => {
  const loader = document.getElementById('app-loader')
  if (loader) {
    loader.classList.add('hidden')
    setTimeout(() => loader.remove(), 300)
  }
}

// Rendu de l'application - les CSS sont DÉJÀ chargés de manière synchrone
ReactDOM.createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <App />
      <Toaster position="top-right" />
      {/* Sonner Toaster — utilisé dans AdminCompany, AdminUsers, etc. */}
      <SonnerToaster position="top-right" richColors closeButton />
    </BrowserRouter>
  </HelmetProvider>,
)

// Le loader sera caché depuis le composant App après le premier rendu complet
// (Pas de hideLoader ici pour Test 8)

// ── Service Worker kill switch — ONE-SHOT ──────────────────────────
// Le SW v1 (cache-first) cassait l'app. On le desinstalle UNE SEULE FOIS,
// puis on set un flag localStorage qui empeche tout re-traitement. Sans ce
// flag, chaque chargement de l'app re-executait unregister + caches.delete,
// ce qui obligeait le user a hard-reload (Ctrl+Shift+R) a chaque navigation.
const KILL_FLAG = 'atlas-sw-killed-v1';
function killLegacyServiceWorker() {
  try {
    if (localStorage.getItem(KILL_FLAG) === '1') return; // deja kill -> stop
  } catch (_e) { /* mode prive : on ignore */ }

  if (!('serviceWorker' in navigator)) {
    try { localStorage.setItem(KILL_FLAG, '1'); } catch (_e) {}
    return;
  }

  Promise.all([
    navigator.serviceWorker.getRegistrations()
      .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
      .catch(() => {}),
    'caches' in window
      ? caches.keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {})
      : Promise.resolve(),
  ]).finally(() => {
    try { localStorage.setItem(KILL_FLAG, '1'); } catch (_e) {}
  });
}
killLegacyServiceWorker();

// ── Stale-chunk safety net ───────────────────────────────────
// Catches "Failed to fetch dynamically imported module" errors that escape
// lazyRetry (e.g. direct import() calls or errors before lazyRetry loads).
// Same 30-second window to avoid reload loops.
window.addEventListener('unhandledrejection', (event) => {
  const msg = String(event?.reason?.message ?? event?.reason ?? '');
  if (msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('error loading dynamically imported module')) {
    const TS_KEY = 'chunk-reload-ts';
    const last = Number(sessionStorage.getItem(TS_KEY) ?? 0);
    if (Date.now() - last > 30_000) {
      sessionStorage.setItem(TS_KEY, String(Date.now()));
      window.location.reload();
    }
  }
});
