import 'fake-indexeddb/auto';
import '@testing-library/jest-dom';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  readonly root: Element | null = null;
  readonly rootMargin: string = '';
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
  disconnect() {}
  observe() {}
  takeRecords(): IntersectionObserverEntry[] { return []; }
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(_callback: ResizeObserverCallback) {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock crypto.subtle for Node (SHA-256 tests)
if (!globalThis.crypto?.subtle) {
  const { webcrypto } = await import('node:crypto');
  Object.defineProperty(globalThis, 'crypto', { value: webcrypto });
}
