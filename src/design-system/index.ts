/**
 * Atlas Finance Design System - Main Export File
 * Complete design system with theme and components
 */

// Export theme
export {
  theme,
  getColor,
  getSpacing,
  getBorderRadius,
  getShadow,
  generateCSSVariables,
  type Theme,
  type ColorScheme,
  type ColorValue,
} from './theme';

// Export all components
export * from './components';

// Export components as default
export { default as Components } from './components';

// Design system version
export const DESIGN_SYSTEM_VERSION = '1.0.0';

// Re-export everything as a single design system object
import { theme } from './theme';
import Components from './components';

export const AtlasFinanceDesignSystem = {
  version: DESIGN_SYSTEM_VERSION,
  theme,
  components: Components,
};

export default AtlasFinanceDesignSystem;
