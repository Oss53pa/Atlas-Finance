import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
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
