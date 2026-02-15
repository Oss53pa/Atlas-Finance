/**
 * Atlas Finance - Mock Service Worker Server
 *
 * Serveur de mocks pour les appels API dans les tests
 */

import { setupServer } from 'msw/node';
import { rest } from 'msw';

// ============================================================================
// Handlers API par défaut
// ============================================================================

export const handlers = [
  // Auth
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        user: { id: '1', email: 'test@atlasfinance.com', name: 'Test User' },
        token: 'mock-jwt-token',
      })
    );
  }),

  rest.post('/api/auth/logout', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  // Clients
  rest.get('/api/customers', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          { id: '1', name: 'Client Test 1', email: 'client1@test.com' },
          { id: '2', name: 'Client Test 2', email: 'client2@test.com' },
        ],
        total: 2,
      })
    );
  }),

  rest.post('/api/customers', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: '3',
        name: 'Nouveau Client',
        email: 'nouveau@test.com',
      })
    );
  }),

  rest.delete('/api/customers/:id', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }));
  }),

  // Fournisseurs
  rest.get('/api/suppliers', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          { id: '1', name: 'Fournisseur Test 1', email: 'fournisseur1@test.com' },
        ],
        total: 1,
      })
    );
  }),

  // Écritures comptables
  rest.get('/api/accounting/entries', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        data: [
          {
            id: '1',
            date: '2025-01-15',
            journal: 'VE',
            description: 'Vente test',
            debit: 1000,
            credit: 1000,
          },
        ],
        total: 1,
      })
    );
  }),

  rest.post('/api/accounting/entries', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        id: '2',
        date: '2025-01-16',
        journal: 'AC',
        description: 'Nouvelle écriture',
      })
    );
  }),

  // Trésorerie
  rest.get('/api/treasury/position', (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        totalBalance: 150000,
        accounts: [
          { id: '1', name: 'Compte Principal', balance: 100000 },
          { id: '2', name: 'Compte Secondaire', balance: 50000 },
        ],
      })
    );
  }),

  // Fallback pour routes non mockées
  rest.get('*', (req, res, ctx) => {
    console.warn(`⚠️ Mock non défini pour: ${req.url.pathname}`);
    return res(ctx.status(404), ctx.json({ error: 'Not found' }));
  }),
];

// ============================================================================
// Création du serveur
// ============================================================================

export const server = setupServer(...handlers);
