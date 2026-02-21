/**
 * Atlas Finance - Configuration Globale des Tests
 *
 * Setup pour Jest + React Testing Library
 * Configure les matchers, mocks globaux, et helpers
 */

import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from '../mocks/server';

// ============================================================================
// Configuration React Testing Library
// ============================================================================

configure({
  // Timeout par défaut pour les queries asynchrones
  asyncUtilTimeout: 3000,

  // Stratégie de sélection recommandée (accessible d'abord)
  testIdAttribute: 'data-testid',

  // Afficher des suggestions si getByRole échoue
  computedStyleSupportsPseudoElements: true,
});

// ============================================================================
// Setup MSW (Mock Service Worker) pour les appels API
// ============================================================================

// Démarrer le serveur de mocks avant tous les tests
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));

// Réinitialiser les handlers après chaque test
afterEach(() => server.resetHandlers());

// Fermer le serveur après tous les tests
afterAll(() => server.close());

// ============================================================================
// Mocks Globaux
// ============================================================================

// Mock de react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    pathname: '/',
    search: '',
    hash: '',
    state: null,
  }),
}));

// Mock de framer-motion pour éviter les erreurs d'animation dans les tests
jest.mock('framer-motion', () => ({
  ...jest.requireActual('framer-motion'),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement> & { children?: React.ReactNode }) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: React.HTMLAttributes<HTMLSpanElement> & { children?: React.ReactNode }) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => <button {...props}>{children}</button>,
  },
}));

// Mock de window.matchMedia pour les tests responsive
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock de IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
} as unknown as typeof IntersectionObserver;

// Mock de ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
} as unknown as typeof ResizeObserver;

// ============================================================================
// Helpers Globaux
// ============================================================================

// Helper pour nettoyer les timers après chaque test
afterEach(() => {
  jest.clearAllTimers();
  jest.clearAllMocks();
  mockNavigate.mockClear();
});

// Helper pour attendre les animations (debounce, throttle, etc.)
export const waitForAnimations = () => new Promise((resolve) => setTimeout(resolve, 100));

// Helper pour simuler un délai réseau
export const simulateNetworkDelay = (ms: number = 100) =>
  new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// Console Warnings/Errors
// ============================================================================

// Supprimer certains warnings connus et non critiques
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
        args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('componentWillReceiveProps has been renamed')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// ============================================================================
// Matchers Personnalisés
// ============================================================================

expect.extend({
  /**
   * Matcher personnalisé pour vérifier qu'un élément est accessible au clavier
   */
  toBeKeyboardAccessible(received: HTMLElement) {
    const hasTabIndex = received.hasAttribute('tabindex');
    const tabIndexValue = received.getAttribute('tabindex');
    const isButton = received.tagName === 'BUTTON';
    const isLink = received.tagName === 'A' && received.hasAttribute('href');
    const hasRole = received.hasAttribute('role');

    const isAccessible =
      isButton || isLink || (hasTabIndex && tabIndexValue !== '-1') || hasRole;

    return {
      pass: isAccessible,
      message: () =>
        isAccessible
          ? `L'élément est accessible au clavier`
          : `L'élément n'est pas accessible au clavier. Ajouter tabindex="0" ou role="button".`,
    };
  },

  /**
   * Matcher personnalisé pour vérifier qu'un élément a un label accessible
   */
  toHaveAccessibleLabel(received: HTMLElement) {
    const hasAriaLabel = received.hasAttribute('aria-label');
    const hasAriaLabelledBy = received.hasAttribute('aria-labelledby');
    const hasTextContent = !!received.textContent?.trim();
    const hasTitle = received.hasAttribute('title');

    const hasLabel = hasAriaLabel || hasAriaLabelledBy || hasTextContent || hasTitle;

    return {
      pass: hasLabel,
      message: () =>
        hasLabel
          ? `L'élément a un label accessible`
          : `L'élément n'a pas de label accessible. Ajouter aria-label, aria-labelledby, ou du contenu textuel.`,
    };
  },
});

// Augmenter les types pour TypeScript
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeKeyboardAccessible(): R;
      toHaveAccessibleLabel(): R;
    }
  }
}
