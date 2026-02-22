/**
 * SaaS entry point — forces data mode to 'saas' (Supabase).
 * Re-exports the main App from the shared source with the same
 * providers and setup as the root main.tsx.
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';

// CSS — loaded synchronously before anything else
import '../../../src/styles/base.css';
import '../../../src/index.css';

// App component from shared source
import App from '../../../src/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <App />
      <Toaster position="top-right" />
    </BrowserRouter>
  </HelmetProvider>,
);
