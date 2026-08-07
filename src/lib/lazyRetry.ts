import React from 'react';
import { reloadForStaleChunk } from './chunkReload';

/** Promesse qui ne se résout jamais : suspend le rendu le temps du reload. */
function suspendForever<T>(): Promise<T> {
  return new Promise<T>(() => {});
}

/**
 * Retrouve le module visé dans la source de la fonction d'import.
 * En build, `() => import('./pages/LandingPage')` devient
 * `() => __vitePreload(() => import("./LandingPage-BX2f.js"), ...)` : le nom du
 * chunk reste lisible et donne un contexte exploitable dans Sentry.
 */
function describeImport(importFn: () => unknown): string {
  const match = /import\(\s*["']([^"']+)["']/.exec(String(importFn));
  return match ? match[1] : 'module inconnu';
}

/**
 * `React.lazy` durci pour les déploiements continus.
 *
 * Trois modes d'échec sont couverts :
 *
 * 1. L'import rejette (chunk supprimé par un déploiement) → rechargement dur,
 *    au plus une fois par fenêtre de 30 s, sinon l'erreur remonte à
 *    l'ErrorBoundary.
 * 2. L'import *réussit* mais livre `undefined`. React fait alors
 *    `module.default` sur `undefined` et plante avec un « Cannot read
 *    properties of undefined (reading 'default') » sans pile applicative
 *    exploitable (le composant fautif n'apparaît que comme `Lazy`). Cela arrive
 *    quand l'erreur du helper de préchargement Vite est annulée
 *    (`vite:preloadError` + `preventDefault()`, y compris par une extension de
 *    navigateur), quand un service worker obsolète sert une réponse vide, ou
 *    quand la réécriture SPA renvoie l'index.html à la place du chunk. On
 *    traite ce cas comme un chunk obsolète.
 * 3. Le module est bien chargé mais n'expose pas d'export `default` : erreur
 *    déterministe, recharger n'y changerait rien — on remonte un message qui
 *    nomme le module.
 *
 * ⚠️ Ne jamais ajouter d'écouteur `vite:preloadError` qui appelle
 * `preventDefault()` : le helper Vite résoudrait alors la promesse avec
 * `undefined`, ce qui est précisément le mode d'échec n°2.
 */
// Le paramètre de type doit rester `ComponentType<any>` et non `any` :
// `ComponentPropsWithRef<any>` se réduit à `{}` et les pages recevant des props
// (`<AtlasStudioRedirect destination="…" />`) ne compileraient plus.
export function lazyRetry(
  importFn: () => Promise<any>,
): React.LazyExoticComponent<React.ComponentType<any>> {
  return React.lazy<React.ComponentType<any>>(async () => {
    let loaded: unknown;

    try {
      loaded = await importFn();
    } catch (err) {
      if (reloadForStaleChunk()) return suspendForever();
      // Rechargé récemment et toujours en échec → à l'ErrorBoundary de jouer.
      throw err;
    }

    if (loaded === null || typeof loaded !== 'object') {
      if (reloadForStaleChunk()) return suspendForever();
      throw new Error(
        `Chunk vide ou invalide pour ${describeImport(importFn)} ` +
          `(module résolu : ${String(loaded)})`,
      );
    }

    if ((loaded as { default?: unknown }).default == null) {
      throw new Error(`Export "default" manquant pour ${describeImport(importFn)}`);
    }

    return loaded as { default: React.ComponentType<any> };
  });
}

export default lazyRetry;
