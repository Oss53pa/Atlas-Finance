import React, { Component, ReactNode, Suspense } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { lazyRetry } from '../lazyRetry';
import { isStaleChunkError, reloadForStaleChunk } from '../chunkReload';

const reload = vi.fn();

beforeEach(() => {
  reload.mockClear();
  sessionStorage.clear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });
});

class Catcher extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) return <p>boom: {this.state.error.message}</p>;
    return this.props.children;
  }
}

function renderLazy(importFn: () => Promise<any>) {
  const Lazy = lazyRetry(importFn);
  return render(
    <Catcher>
      <Suspense fallback={<p>loading</p>}>
        <Lazy />
      </Suspense>
    </Catcher>,
  );
}

describe('lazyRetry', () => {
  it('rend le composant quand le module expose un export default', async () => {
    renderLazy(async () => ({ default: () => <p>chargé</p> }));
    expect(await screen.findByText('chargé')).toBeTruthy();
  });

  it('recharge au lieu de planter quand le module se résout sur undefined', async () => {
    // Reproduit le crash Sentry « Cannot read properties of undefined
    // (reading 'default') » : le helper de préchargement Vite peut résoudre
    // avec undefined au lieu de rejeter.
    renderLazy(async () => undefined);

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    // Suspendu pendant le rechargement : ni composant, ni ErrorBoundary.
    expect(screen.getByText('loading')).toBeTruthy();
  });

  it('remonte une erreur nommant le chunk si un rechargement vient d’avoir lieu', async () => {
    sessionStorage.setItem('chunk-reload-ts', String(Date.now()));

    const importFn = async () => undefined;
    // Ce que donne `String(importFn)` sur un build Vite minifié.
    importFn.toString = () => '()=>ye(()=>import("./LandingPage-BX2f.js"),[])';

    renderLazy(importFn);

    expect(await screen.findByText(/Chunk vide ou invalide pour \.\/LandingPage-BX2f\.js/)).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it('recharge une seule fois quand l’import rejette', async () => {
    renderLazy(async () => {
      throw new Error('Failed to fetch dynamically imported module: /assets/x.js');
    });

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
  });

  it('propage l’erreur d’import si un rechargement vient d’avoir lieu', async () => {
    sessionStorage.setItem('chunk-reload-ts', String(Date.now()));

    renderLazy(async () => {
      throw new Error('Failed to fetch dynamically imported module: /assets/x.js');
    });

    expect(await screen.findByText(/Failed to fetch dynamically imported module/)).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });

  it('signale un export default manquant sans recharger', async () => {
    renderLazy(async () => ({ Named: () => <p>x</p> }));

    expect(await screen.findByText(/Export "default" manquant/)).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
  });
});

describe('reloadForStaleChunk', () => {
  it('ne recharge pas deux fois dans la même fenêtre de 30 s', () => {
    const now = 1_000_000;
    expect(reloadForStaleChunk(now)).toBe(true);
    expect(reloadForStaleChunk(now + 10_000)).toBe(false);
    expect(reloadForStaleChunk(now + 31_000)).toBe(true);
    expect(reload).toHaveBeenCalledTimes(2);
  });

  it('refuse de recharger quand sessionStorage est indisponible', () => {
    const setItem = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });

    // Sans mémoire du dernier essai, recharger boucherait indéfiniment.
    expect(reloadForStaleChunk()).toBe(false);
    expect(reload).not.toHaveBeenCalled();

    setItem.mockRestore();
    getItem.mockRestore();
  });
});

describe('isStaleChunkError', () => {
  it('reconnaît les messages de chunk introuvable', () => {
    expect(
      isStaleChunkError(new Error('Failed to fetch dynamically imported module: /a.js')),
    ).toBe(true);
    expect(isStaleChunkError('Importing a module script failed')).toBe(true);
    expect(isStaleChunkError(new Error('Unable to preload CSS for /a.css'))).toBe(true);
    expect(isStaleChunkError(new Error('Cannot read properties of null'))).toBe(false);
    expect(isStaleChunkError(null)).toBe(false);
  });
});
