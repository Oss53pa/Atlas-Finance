/**
 * WiseBook ERP - Helpers de Test pour Éléments Cliquables
 *
 * Helpers réutilisables pour tester les interactions et vérifier
 * que les actions attendues (modal, toast, navigation, etc.) s'exécutent correctement.
 *
 * @see AUDIT_CLICKABLES_RAPPORT_FINAL.md pour le contexte complet
 */

import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ============================================================================
// Types et Interfaces
// ============================================================================

export type ExpectedActionType = 'modal' | 'toast' | 'navigation' | 'state' | 'api' | 'download' | 'none';

export interface ModalAssertOptions {
  /** Titre attendu de la modale (vérifié via heading ou texte) */
  title?: string | RegExp;
  /** Contenu attendu dans le corps de la modale */
  content?: string | RegExp;
  /** Aria-label attendu de la modale */
  ariaLabel?: string;
  /** ID de l'élément qui labélise la modale */
  ariaLabelledBy?: string;
  /** Timeout en ms (défaut: 3000) */
  timeout?: number;
  /** Si true, échoue si un toast apparaît en même temps */
  failOnToast?: boolean;
}

export interface ToastAssertOptions {
  /** Message attendu du toast */
  message: string | RegExp;
  /** Titre attendu du toast */
  title?: string | RegExp;
  /** Variante attendue */
  variant?: 'success' | 'error' | 'warning' | 'info';
  /** Timeout en ms (défaut: 3000) */
  timeout?: number;
  /** Si true, échoue si une modale apparaît en même temps */
  failOnModal?: boolean;
}

export interface NavigationAssertOptions {
  /** URL ou pathname attendu */
  expectedUrl: string | RegExp;
  /** Timeout en ms (défaut: 3000) */
  timeout?: number;
  /** Si true, vérifie que le titre de page change */
  checkPageTitle?: boolean;
}

export interface ClickableActionOptions {
  /** Type d'action attendue */
  expected: ExpectedActionType;
  /** Options spécifiques selon le type */
  modalOptions?: ModalAssertOptions;
  toastOptions?: ToastAssertOptions;
  navigationOptions?: NavigationAssertOptions;
  /** Callback custom pour vérification d'état */
  stateValidator?: () => void | Promise<void>;
}

// ============================================================================
// Helpers de Sélection Accessible
// ============================================================================

/**
 * Trouve un bouton par son label accessible (texte ou aria-label)
 * Priorité : getByRole > data-testid
 */
export const findButtonByLabel = (label: string | RegExp) => {
  return screen.getByRole('button', { name: label });
};

/**
 * Trouve un lien par son label accessible
 */
export const findLinkByLabel = (label: string | RegExp) => {
  return screen.getByRole('link', { name: label });
};

/**
 * Trouve un élément cliquable générique (bouton ou lien)
 */
export const findClickableByLabel = (label: string | RegExp) => {
  try {
    return findButtonByLabel(label);
  } catch {
    return findLinkByLabel(label);
  }
};

/**
 * Trouve un élément par data-testid (fallback si getByRole échoue)
 */
export const findByTestId = (testId: string) => {
  return screen.getByTestId(testId);
};

// ============================================================================
// Assertions - Modales
// ============================================================================

/**
 * Vérifie qu'une modale est visible et conforme aux attentes
 *
 * @example
 * await assertModalVisible({
 *   title: 'Créer un client',
 *   failOnToast: true
 * });
 */
export const assertModalVisible = async (options: ModalAssertOptions = {}) => {
  const { title, content, ariaLabel, ariaLabelledBy, timeout = 3000, failOnToast = false } = options;

  // Vérifier qu'aucun toast n'apparaît si demandé
  if (failOnToast) {
    await assertNoToast({ timeout: 500 });
  }

  // Trouver la modale par role="dialog"
  const modal = await waitFor(
    () => {
      const dialogs = screen.queryAllByRole('dialog');
      if (dialogs.length === 0) {
        throw new Error('Aucune modale trouvée (role="dialog")');
      }
      return dialogs[0];
    },
    { timeout }
  );

  // Vérifier aria-modal
  expect(modal).toHaveAttribute('aria-modal', 'true');

  // Vérifier aria-label ou aria-labelledby
  if (ariaLabel) {
    expect(modal).toHaveAttribute('aria-label', ariaLabel);
  }
  if (ariaLabelledBy) {
    expect(modal).toHaveAttribute('aria-labelledby', ariaLabelledBy);
  }

  // Vérifier le titre si fourni
  if (title) {
    const modalContent = within(modal);
    await waitFor(() => {
      const heading = modalContent.queryByRole('heading', { name: title });
      const text = modalContent.queryByText(title);
      if (!heading && !text) {
        throw new Error(`Titre de modale non trouvé: ${title}`);
      }
    }, { timeout: 1000 });
  }

  // Vérifier le contenu si fourni
  if (content) {
    const modalContent = within(modal);
    await waitFor(() => {
      expect(modalContent.getByText(content)).toBeInTheDocument();
    }, { timeout: 1000 });
  }

  // Vérifier le focus trap
  const focusableElements = modal.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );
  expect(focusableElements.length).toBeGreaterThan(0);

  return modal;
};

/**
 * Vérifie qu'aucune modale n'est visible
 */
export const assertNoModal = async (options: { timeout?: number } = {}) => {
  const { timeout = 1000 } = options;

  await waitFor(
    () => {
      const dialogs = screen.queryAllByRole('dialog');
      expect(dialogs).toHaveLength(0);
    },
    { timeout }
  );
};

/**
 * Vérifie qu'une modale a été fermée
 */
export const assertModalClosed = async (options: { timeout?: number } = {}) => {
  await assertNoModal(options);
};

/**
 * RED FLAG: Vérifie qu'aucun toast n'apparaît quand une modale est attendue
 * Détecte l'anti-pattern "toast au lieu de modale"
 */
export const assertNoToastWhenModalExpected = async (options: { timeout?: number } = {}) => {
  const { timeout = 2000 } = options;

  await waitFor(
    () => {
      // Chercher des éléments toast typiques
      const toastContainers = document.querySelectorAll('[data-toast], [role="alert"], .toast, .notification');
      if (toastContainers.length > 0) {
        throw new Error(
          `❌ MISMATCH UI: Un toast est apparu alors qu'une modale était attendue. ` +
          `Ceci est un anti-pattern critique identifié dans l'audit.`
        );
      }
    },
    { timeout }
  );
};

// ============================================================================
// Assertions - Toasts
// ============================================================================

/**
 * Vérifie qu'un toast est visible avec le bon contenu
 *
 * @example
 * await assertToastVisible({
 *   message: 'Client créé avec succès',
 *   variant: 'success',
 *   failOnModal: true
 * });
 */
export const assertToastVisible = async (options: ToastAssertOptions) => {
  const { message, title, variant, timeout = 3000, failOnModal = false } = options;

  // Vérifier qu'aucune modale n'apparaît si demandé
  if (failOnModal) {
    await assertNoModal({ timeout: 500 });
  }

  // Chercher le toast (plusieurs stratégies)
  const toast = await waitFor(
    () => {
      // Stratégie 1: role="alert"
      let alerts = screen.queryAllByRole('alert');

      // Stratégie 2: data-toast attribute
      if (alerts.length === 0) {
        alerts = Array.from(document.querySelectorAll('[data-toast]')) as HTMLElement[];
      }

      // Stratégie 3: classes communes
      if (alerts.length === 0) {
        alerts = Array.from(document.querySelectorAll('.toast, .notification')) as HTMLElement[];
      }

      if (alerts.length === 0) {
        throw new Error('Aucun toast trouvé');
      }

      return alerts[0];
    },
    { timeout }
  );

  // Vérifier le message
  const toastContent = within(toast as HTMLElement);
  expect(toastContent.getByText(message)).toBeInTheDocument();

  // Vérifier le titre si fourni
  if (title) {
    expect(toastContent.getByText(title)).toBeInTheDocument();
  }

  // Vérifier la variante si fournie (via classes CSS)
  if (variant) {
    const variantClasses = {
      success: ['success', 'green'],
      error: ['error', 'red', 'danger'],
      warning: ['warning', 'yellow', 'orange'],
      info: ['info', 'blue']
    };

    const classList = (toast as HTMLElement).className;
    const hasVariantClass = variantClasses[variant].some(cls =>
      classList.toLowerCase().includes(cls.toLowerCase())
    );

    expect(hasVariantClass).toBe(true);
  }

  return toast;
};

/**
 * Vérifie qu'aucun toast n'est visible
 */
export const assertNoToast = async (options: { timeout?: number } = {}) => {
  const { timeout = 1000 } = options;

  await waitFor(
    () => {
      const alerts = screen.queryAllByRole('alert');
      const toasts = document.querySelectorAll('[data-toast], .toast, .notification');
      expect([...alerts, ...Array.from(toasts)]).toHaveLength(0);
    },
    { timeout }
  );
};

/**
 * RED FLAG: Vérifie qu'aucune modale n'apparaît quand un toast est attendu
 */
export const assertNoModalWhenToastExpected = async (options: { timeout?: number } = {}) => {
  const { timeout = 2000 } = options;

  await waitFor(
    () => {
      const dialogs = screen.queryAllByRole('dialog');
      if (dialogs.length > 0) {
        throw new Error(
          `❌ MISMATCH UI: Une modale est apparue alors qu'un toast était attendu. ` +
          `Vérifier la logique du handler.`
        );
      }
    },
    { timeout }
  );
};

// ============================================================================
// Assertions - Navigation
// ============================================================================

/**
 * Vérifie qu'une navigation a eu lieu vers l'URL attendue
 */
export const assertNavigation = async (options: NavigationAssertOptions) => {
  const { expectedUrl, timeout = 3000, checkPageTitle = false } = options;

  await waitFor(
    () => {
      const currentPath = window.location.pathname;

      if (typeof expectedUrl === 'string') {
        expect(currentPath).toBe(expectedUrl);
      } else {
        expect(currentPath).toMatch(expectedUrl);
      }
    },
    { timeout }
  );

  // Optionnel: vérifier que le titre de page a changé
  if (checkPageTitle) {
    await waitFor(() => {
      expect(document.title).not.toBe('');
    }, { timeout: 1000 });
  }
};

// ============================================================================
// Helper Principal - useClickableAction
// ============================================================================

/**
 * Helper principal pour tester un élément cliquable
 * Exécute le clic et vérifie automatiquement l'action attendue
 *
 * @example
 * // Test d'un bouton qui ouvre une modale
 * await useClickableAction({
 *   selector: { type: 'role', value: 'button', name: 'Créer client' },
 *   expected: 'modal',
 *   modalOptions: { title: 'Nouveau client', failOnToast: true }
 * });
 *
 * @example
 * // Test d'un bouton qui affiche un toast
 * await useClickableAction({
 *   selector: { type: 'testId', value: 'delete-btn' },
 *   expected: 'toast',
 *   toastOptions: { message: 'Client supprimé', variant: 'success' }
 * });
 *
 * @example
 * // Test d'un lien de navigation
 * await useClickableAction({
 *   selector: { type: 'role', value: 'link', name: 'Dashboard' },
 *   expected: 'navigation',
 *   navigationOptions: { expectedUrl: '/dashboard' }
 * });
 */
export const useClickableAction = async (
  options: {
    selector:
      | { type: 'role'; value: 'button' | 'link'; name: string | RegExp }
      | { type: 'testId'; value: string }
      | { type: 'text'; value: string | RegExp };
    clickMethod?: 'mouse' | 'keyboard-enter' | 'keyboard-space';
  } & ClickableActionOptions
) => {
  const { selector, clickMethod = 'mouse', expected, modalOptions, toastOptions, navigationOptions, stateValidator } = options;

  // 1. Trouver l'élément
  let element: HTMLElement;

  if (selector.type === 'role') {
    if (selector.value === 'button') {
      element = findButtonByLabel(selector.name);
    } else {
      element = findLinkByLabel(selector.name);
    }
  } else if (selector.type === 'testId') {
    element = findByTestId(selector.value);
  } else {
    element = screen.getByText(selector.value);
  }

  expect(element).toBeInTheDocument();

  // 2. Vérifier l'accessibilité de l'élément
  if (clickMethod === 'keyboard-enter' || clickMethod === 'keyboard-space') {
    // Pour clavier, l'élément doit être focusable
    expect(element).toHaveAttribute('tabindex', '0');
  }

  // 3. Exécuter le clic
  const user = userEvent.setup();

  if (clickMethod === 'mouse') {
    await user.click(element);
  } else if (clickMethod === 'keyboard-enter') {
    element.focus();
    await user.keyboard('{Enter}');
  } else if (clickMethod === 'keyboard-space') {
    element.focus();
    await user.keyboard(' ');
  }

  // 4. Attendre un court instant pour les animations
  await waitFor(() => {}, { timeout: 100 });

  // 5. Vérifier l'action attendue
  switch (expected) {
    case 'modal':
      if (!modalOptions) {
        throw new Error('modalOptions requis pour expected: "modal"');
      }
      await assertModalVisible(modalOptions);
      break;

    case 'toast':
      if (!toastOptions) {
        throw new Error('toastOptions requis pour expected: "toast"');
      }
      await assertToastVisible(toastOptions);
      break;

    case 'navigation':
      if (!navigationOptions) {
        throw new Error('navigationOptions requis pour expected: "navigation"');
      }
      await assertNavigation(navigationOptions);
      break;

    case 'state':
      if (!stateValidator) {
        throw new Error('stateValidator requis pour expected: "state"');
      }
      await waitFor(async () => {
        await stateValidator();
      });
      break;

    case 'api':
      // Pour API, on utilise généralement des mocks - pas d'assertion automatique
      console.warn('expected: "api" - Vérifier manuellement les appels API mockés');
      break;

    case 'download':
      // Pour download, on vérifie généralement un blob ou une URL
      console.warn('expected: "download" - Vérifier manuellement le téléchargement');
      break;

    case 'none':
      // Aucune action attendue - juste vérifier que rien ne se passe
      await waitFor(() => {}, { timeout: 500 });
      await assertNoModal({ timeout: 100 });
      await assertNoToast({ timeout: 100 });
      break;
  }
};

// ============================================================================
// Helpers de Test Clavier
// ============================================================================

/**
 * Teste la navigation clavier (Tab, Shift+Tab, Enter, Space)
 */
export const testKeyboardNavigation = async (element: HTMLElement) => {
  const user = userEvent.setup();

  // Vérifier que l'élément peut recevoir le focus
  element.focus();
  expect(document.activeElement).toBe(element);

  // Tester Enter
  await user.keyboard('{Enter}');

  // Tester Space
  element.focus();
  await user.keyboard(' ');

  // Tester Tab (navigation)
  element.focus();
  await user.keyboard('{Tab}');
  expect(document.activeElement).not.toBe(element);
};

/**
 * Teste le focus trap dans une modale
 */
export const testModalFocusTrap = async (modal: HTMLElement) => {
  const user = userEvent.setup();

  const focusableElements = modal.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) {
    throw new Error('Aucun élément focusable dans la modale - violation accessibilité');
  }

  const firstElement = focusableElements[0] as HTMLElement;
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

  // Le focus devrait être sur le premier élément
  await waitFor(() => {
    expect(document.activeElement).toBe(firstElement);
  });

  // Tab jusqu'au dernier élément
  for (let i = 0; i < focusableElements.length - 1; i++) {
    await user.keyboard('{Tab}');
  }
  expect(document.activeElement).toBe(lastElement);

  // Tab depuis le dernier devrait revenir au premier (focus trap)
  await user.keyboard('{Tab}');
  expect(document.activeElement).toBe(firstElement);

  // Shift+Tab depuis le premier devrait aller au dernier
  await user.keyboard('{Shift>}{Tab}{/Shift}');
  expect(document.activeElement).toBe(lastElement);
};

// ============================================================================
// Export par défaut
// ============================================================================

export default {
  // Sélection
  findButtonByLabel,
  findLinkByLabel,
  findClickableByLabel,
  findByTestId,

  // Modales
  assertModalVisible,
  assertNoModal,
  assertModalClosed,
  assertNoToastWhenModalExpected,

  // Toasts
  assertToastVisible,
  assertNoToast,
  assertNoModalWhenToastExpected,

  // Navigation
  assertNavigation,

  // Helper principal
  useClickableAction,

  // Clavier
  testKeyboardNavigation,
  testModalFocusTrap,
};
