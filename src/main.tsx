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

// ── Focus Guard v2 ────────────────────────────────────────────────────────────
// Problème persistant : chaque frappe clavier fait perdre le focus sur TOUS les
// inputs. Le guard v1 échouait car il vérifiait relatedTarget===null — mais quand
// React re-monte un input ET focus immédiatement le nouveau nœud, relatedTarget
// pointe vers le nouveau nœud (≠ null) → le guard v1 ignorait ce cas.
//
// Guard v2 : APPROCHE KEYDOWN
// Au lieu d'écouter focusout, on écoute keydown AVANT que React puisse re-rendre.
// On mémorise quel input est focalisé + sa valeur + sa position curseur.
// Après le prochain rAF (React a fini de re-rendre), on vérifie :
//   → si l'input original est toujours focalisé : OK rien à faire
//   → si focus parti sur body : React a retiré l'élément → restaurer
//   → si focus parti sur un AUTRE input de même nom/id : React a re-monté
//     l'input → restaurer la valeur tapée + re-focaliser le nouveau nœud
//   → si focus parti sur un élément NON-input différent : action utilisateur
//     intentionnelle (clic bouton, Tab) → ne rien faire
//
// MutationObserver DEV : logge chaque ajout/suppression d'input pour confirmer
// que le problème est bien un re-montage et identifier le composant responsable.
(function installFocusGuardV2(): void {

  // ── MutationObserver (DEV uniquement) ──────────────────────────────────────
  if (import.meta.env.DEV) {
    const obs = new MutationObserver((mutations) => {
      for (const m of mutations) {
        const check = (nodes: NodeList, action: string) => {
          nodes.forEach((n) => {
            if (n.nodeType !== 1) return;
            const el = n as Element;
            const inputs: Element[] = ['INPUT','TEXTAREA','SELECT'].includes(el.tagName)
              ? [el]
              : Array.from(el.querySelectorAll('input,textarea,select'));
            inputs.forEach((inp) => {
              const i = inp as HTMLInputElement;
              if (!i.name && !i.id && !i.placeholder) return; // skip anonymous
              console.warn(
                `[MutObs] INPUT ${action}: <${i.tagName}> name="${i.name}" ` +
                `id="${i.id}" placeholder="${i.placeholder?.slice(0,25)}"`,
              );
            });
          });
        };
        check(m.removedNodes, 'REMOVED');
        check(m.addedNodes,   'ADDED');
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  // ── Focus restoration ──────────────────────────────────────────────────────
  // On ne s'active PAS sur Tab (navigation intentionnelle)
  const SKIP_KEYS = new Set(['Tab','Escape','Enter','F1','F2','F3','F4','F5',
    'F6','F7','F8','F9','F10','F11','F12']);

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    // Touches de navigation ou modificateurs seuls → ignorer
    if (SKIP_KEYS.has(e.key) || e.altKey || e.ctrlKey || e.metaKey) return;

    const active = document.activeElement as HTMLElement | null;
    if (!active) return;
    const tag = active.tagName;
    if (tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') return;
    if ((active as HTMLInputElement).disabled || (active as HTMLInputElement).readOnly) return;

    // Capturer AVANT que React re-rende
    const snapshot = {
      el:          active,
      tag,
      name:        (active as HTMLInputElement).name,
      id:          active.id,
      placeholder: (active as HTMLInputElement).placeholder,
      value:       (active as HTMLInputElement).value,
      selStart:    (active as HTMLInputElement).selectionStart ?? 0,
      selEnd:      (active as HTMLInputElement).selectionEnd   ?? 0,
    };

    // Après que React a fini de re-rendre
    requestAnimationFrame(() => {
      const nowActive = document.activeElement as HTMLElement | null;

      // Toujours focalisé sur le même nœud DOM → rien à faire
      if (nowActive === snapshot.el) return;

      // L'utilisateur a cliqué ou tabé vers un élément non-input → action
      // intentionnelle → ne pas interférer
      if (nowActive && nowActive !== document.body &&
          nowActive.tagName !== 'INPUT' &&
          nowActive.tagName !== 'TEXTAREA' &&
          nowActive.tagName !== 'SELECT') {
        return;
      }

      // --- Trouver le nœud cible à re-focaliser ---
      let target: HTMLElement | null = null;
      let isRemount = false;

      if (document.body.contains(snapshot.el) && !(snapshot.el as HTMLInputElement).disabled) {
        // Nœud original encore présent : focus simplement perdu → le redonner
        target = snapshot.el;
      } else {
        // Nœud original supprimé → React l'a re-monté
        isRemount = true;
        const tagLow = snapshot.tag.toLowerCase();
        const sel = snapshot.name        ? `${tagLow}[name="${snapshot.name}"]`
                  : snapshot.id          ? `#${snapshot.id}`
                  : snapshot.placeholder ? `${tagLow}[placeholder="${snapshot.placeholder}"]`
                  : null;
        if (sel) target = document.querySelector<HTMLElement>(sel);
        if (target && (target as HTMLInputElement).disabled) target = null;
      }

      if (!target) return;

      // Si le nouveau nœud était déjà focalisé par React (remontage avec autoFocus
      // ou appel .focus() interne) → on ne re-focus pas une deuxième fois, mais
      // on restaure quand même la valeur si l'input est non-contrôlé
      const alreadyFocused = (nowActive === target);

      if (isRemount) {
        const t = target as HTMLInputElement;
        // Restaurer la valeur saisie (perdue au remontage pour les inputs non-contrôlés)
        if (t.value !== snapshot.value) {
          t.value = snapshot.value;
        }
        // Restaurer la position curseur
        try { t.setSelectionRange(snapshot.selStart, snapshot.selEnd); } catch { /* select/date ignoré */ }
      }

      if (!alreadyFocused) {
        target.focus({ preventScroll: true });
      }

      if (import.meta.env.DEV) {
        console.warn(
          `[FocusGuardV2] focus perdu après keydown sur <${snapshot.tag}> ` +
          `"${snapshot.name || snapshot.placeholder || snapshot.id}"` +
          (isRemount ? ' [RE-MONTÉ → valeur restaurée]' : ' [focus volé]') +
          (alreadyFocused ? ' [déjà focalisé par React]' : ' [re-focus appliqué]'),
        );
      }
    });
  }, { capture: true, passive: true });

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
