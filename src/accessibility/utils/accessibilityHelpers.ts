/**
 * Accessibility Helper Utilities
 * Common utility functions for WCAG compliance
 */

/**
 * Returns a properly formatted aria-label string.
 */
export function getAriaLabel(label: string): string {
  return label.trim();
}

/**
 * Generates a unique ID for associating labels with form controls.
 */
export function generateA11yId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Checks whether an element is focusable.
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableSelectors =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return element.matches(focusableSelectors);
}
