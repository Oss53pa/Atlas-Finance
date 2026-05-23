module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    // Accessibilité (WCAG) — rendue mesurable. Non bloquant en CI tant que la
    // dette n'est pas résorbée (lint déjà en continue-on-error).
    'plugin:jsx-a11y/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['jsx-a11y'],
  rules: {
    // Prevent console.log in production (allow warn/error)
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    // Discourage any type (warn, not error — too many to fix at once)
    '@typescript-eslint/no-explicit-any': 'warn',
    // Enforce unused variables cleanup
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // React hooks rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
