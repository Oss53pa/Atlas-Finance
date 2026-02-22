/**
 * Global Accessibility Setup
 * Initializes global accessibility features (keyboard detection, focus styles, etc.)
 */

export function setupGlobalAccessibility(): void {
  // Add keyboard-user detection class to document
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Tab') {
      document.documentElement.classList.add('keyboard-user');
    }
  };

  const handleMouseDown = () => {
    document.documentElement.classList.remove('keyboard-user');
  };

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('mousedown', handleMouseDown);
}
