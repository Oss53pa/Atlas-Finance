/**
 * Desktop entry point — forces data mode to 'local' (IndexedDB/Dexie).
 */
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
import '../../../src/styles/base.css';
import '../../../src/index.css';
import App from '../../../src/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <BrowserRouter future={{ v7_relativeSplatPath: true }}>
      <App />
      <Toaster position="top-right" />
    </BrowserRouter>
  </HelmetProvider>,
);
