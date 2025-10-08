# 🧪 Guide de Configuration des Tests - WiseBook ERP

Ce guide explique comment configurer et exécuter tous les tests créés suite à l'audit des éléments cliquables.

---

## 📋 Table des Matières

1. [Installation des Dépendances](#installation)
2. [Configuration Jest + React Testing Library](#jest-config)
3. [Configuration Playwright](#playwright-config)
4. [Structure des Tests](#structure)
5. [Commandes de Test](#commandes)
6. [Helpers et Assertions Réutilisables](#helpers)
7. [CI/CD Integration](#cicd)
8. [Troubleshooting](#troubleshooting)

---

## 🚀 Installation des Dépendances {#installation}

### Étape 1: Tests Unitaires (Jest + RTL)

```bash
cd frontend

# Dépendances principales
npm install --save-dev jest @testing-library/react @testing-library/jest-dom @testing-library/user-event

# TypeScript support
npm install --save-dev ts-jest @types/jest

# Mock Service Worker (API mocking)
npm install --save-dev msw

# Utilitaires
npm install --save-dev @testing-library/react-hooks jest-environment-jsdom
```

### Étape 2: Tests E2E (Playwright)

```bash
# Installation Playwright
npm install --save-dev @playwright/test

# Installation des navigateurs
npx playwright install

# Installation des dépendances système (Linux uniquement)
npx playwright install-deps
```

### Étape 3: Vérifier les Installations

```bash
# Vérifier Jest
npx jest --version

# Vérifier Playwright
npx playwright --version
```

---

## ⚙️ Configuration Jest + React Testing Library {#jest-config}

### Fichier `jest.config.js`

Créer `frontend/jest.config.js` :

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/test/setup/test-setup.ts'],

  // Module paths
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(gif|ttf|eot|svg|png|jpg|jpeg)$': '<rootDir>/src/test/__mocks__/fileMock.js',
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Transform files
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
      },
    }],
  },

  // Coverage
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.tsx',
    '!src/test/**/*',
  ],

  coverageThresholds: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },

  // Test match patterns
  testMatch: [
    '**/__tests__/**/*.(test|spec).{ts,tsx}',
    '**/?(*.)+(spec|test).{ts,tsx}',
  ],

  // Ignore patterns
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],

  // Globals
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },

  // Timeouts
  testTimeout: 10000,
};
```

### Fichier `src/test/__mocks__/fileMock.js`

```javascript
module.exports = 'test-file-stub';
```

### Mise à jour `package.json`

Ajouter les scripts :

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:ui": "jest --watch --verbose",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:all": "npm run test && npm run test:e2e"
  }
}
```

---

## 🎭 Configuration Playwright {#playwright-config}

### Fichier `playwright.config.ts`

Créer `frontend/playwright.config.ts` :

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './tests/e2e',

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: [
    ['html'],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL
    baseURL: 'http://localhost:5174',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    // Mobile
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },

    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
```

---

## 📁 Structure des Tests {#structure}

```
frontend/
├── src/
│   ├── components/
│   │   └── layout/
│   │       ├── DoubleSidebar.tsx
│   │       └── __tests__/
│   │           └── DoubleSidebar.test.tsx
│   │
│   └── test/
│       ├── helpers/
│       │   └── clickable-assertions.ts     # ✅ Créé
│       │
│       ├── setup/
│       │   └── test-setup.ts               # ✅ Créé
│       │
│       └── mocks/
│           └── server.ts                   # ✅ Créé
│
├── tests/
│   └── e2e/
│       ├── navigation.spec.ts              # ✅ Créé
│       └── modals.spec.ts                  # ✅ Créé
│
├── jest.config.js
├── playwright.config.ts
└── package.json
```

---

## 🎯 Commandes de Test {#commandes}

### Tests Unitaires (Jest)

```bash
# Lancer tous les tests
npm test

# Mode watch (relance auto sur changement)
npm run test:watch

# Avec couverture
npm run test:coverage

# Lancer un fichier spécifique
npm test -- DoubleSidebar.test.tsx

# Lancer tests d'un dossier
npm test -- components/layout

# Mode debug
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Tests E2E (Playwright)

```bash
# Lancer tous les tests E2E
npm run test:e2e

# Mode UI (interactif)
npm run test:e2e:ui

# Mode headed (voir le navigateur)
npm run test:e2e:headed

# Lancer un fichier spécifique
npx playwright test navigation.spec.ts

# Lancer sur un seul navigateur
npx playwright test --project=chromium

# Mode debug
npx playwright test --debug

# Générer un rapport
npx playwright show-report
```

### Tous les Tests

```bash
# Lancer unitaires + E2E
npm run test:all
```

---

## 🛠️ Helpers et Assertions Réutilisables {#helpers}

### Utilisation des Helpers

Le fichier `src/test/helpers/clickable-assertions.ts` fournit des helpers réutilisables :

#### 1. `useClickableAction` - Helper Principal

```typescript
import { useClickableAction } from '@/test/helpers/clickable-assertions';

// Test d'un bouton qui ouvre une modale
await useClickableAction({
  selector: { type: 'role', value: 'button', name: 'Créer client' },
  expected: 'modal',
  modalOptions: {
    title: 'Nouveau client',
    failOnToast: true  // ❌ Échoue si un toast apparaît
  }
});

// Test d'un bouton qui affiche un toast
await useClickableAction({
  selector: { type: 'testId', value: 'delete-btn' },
  expected: 'toast',
  toastOptions: {
    message: 'Client supprimé',
    variant: 'success',
    failOnModal: true  // ❌ Échoue si une modale apparaît
  }
});

// Test d'une navigation
await useClickableAction({
  selector: { type: 'role', value: 'link', name: 'Dashboard' },
  expected: 'navigation',
  navigationOptions: {
    expectedUrl: '/dashboard'
  }
});
```

#### 2. Assertions Modales

```typescript
import {
  assertModalVisible,
  assertNoModal,
  assertNoToastWhenModalExpected,
} from '@/test/helpers/clickable-assertions';

// Vérifier qu'une modale est visible
await assertModalVisible({
  title: 'Créer un client',
  content: 'Remplissez le formulaire',
  failOnToast: true
});

// Vérifier qu'aucune modale n'est visible
await assertNoModal();

// RED FLAG: Détecter toast au lieu de modale
await assertNoToastWhenModalExpected();
```

#### 3. Assertions Toasts

```typescript
import {
  assertToastVisible,
  assertNoToast,
  assertNoModalWhenToastExpected,
} from '@/test/helpers/clickable-assertions';

// Vérifier qu'un toast est visible
await assertToastVisible({
  message: 'Client créé avec succès',
  variant: 'success',
  failOnModal: true
});

// Vérifier qu'aucun toast n'est visible
await assertNoToast();

// RED FLAG: Détecter modale au lieu de toast
await assertNoModalWhenToastExpected();
```

#### 4. Tests Accessibilité Clavier

```typescript
import {
  testKeyboardNavigation,
  testModalFocusTrap,
} from '@/test/helpers/clickable-assertions';

// Tester navigation clavier (Tab, Enter, Space)
await testKeyboardNavigation(buttonElement);

// Tester le focus trap d'une modale
await testModalFocusTrap(modalElement);
```

#### 5. Matchers Personnalisés

```typescript
// Vérifier qu'un élément est accessible au clavier
expect(button).toBeKeyboardAccessible();

// Vérifier qu'un élément a un label accessible
expect(button).toHaveAccessibleLabel();
```

---

## 🔄 CI/CD Integration {#cicd}

### GitHub Actions Workflow

Créer `.github/workflows/tests.yml` :

```yaml
name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  unit-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 🐛 Troubleshooting {#troubleshooting}

### Problème 1: `Cannot find module '@testing-library/react'`

**Solution:**
```bash
npm install --save-dev @testing-library/react @testing-library/jest-dom
```

### Problème 2: `SyntaxError: Unexpected token 'export'`

**Cause:** Jest ne peut pas parser les modules ES6

**Solution:** Ajouter dans `jest.config.js` :
```javascript
transformIgnorePatterns: [
  'node_modules/(?!(module-à-transformer)/)',
],
```

### Problème 3: Tests Playwright échouent - "Page did not load"

**Solution:**
```bash
# S'assurer que le serveur dev tourne
npm run dev

# Ou laisser Playwright le gérer (webServer dans config)
```

### Problème 4: `ReferenceError: document is not defined`

**Cause:** Environment Node au lieu de jsdom

**Solution:** Dans `jest.config.js` :
```javascript
testEnvironment: 'jsdom',
```

### Problème 5: Tests flaky (passent/échouent aléatoirement)

**Solution:** Utiliser `waitFor` et augmenter les timeouts :
```typescript
await waitFor(() => {
  expect(element).toBeInTheDocument();
}, { timeout: 5000 });
```

### Problème 6: Mock MSW ne fonctionne pas

**Solution:** Vérifier que le serveur est démarré dans `test-setup.ts` :
```typescript
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 📚 Ressources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MSW Documentation](https://mswjs.io/docs/)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

## ✅ Checklist de Démarrage

- [ ] Installer les dépendances Jest + RTL
- [ ] Installer Playwright
- [ ] Créer `jest.config.js`
- [ ] Créer `playwright.config.ts`
- [ ] Vérifier que les helpers dans `src/test/helpers/` fonctionnent
- [ ] Lancer `npm test` → tous les tests passent
- [ ] Lancer `npm run test:e2e` → tous les tests passent
- [ ] Configurer CI/CD (GitHub Actions)
- [ ] Former l'équipe sur les helpers réutilisables

---

**Audit réalisé le:** 2025-10-05
**Créé par:** Claude Code - WiseBook ERP Team
