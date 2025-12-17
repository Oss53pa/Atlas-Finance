import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
// ✅ CHARGEMENT SYNCHRONE DES CSS - AVANT tout le reste
import './styles/base.css'
import './index.css'

import App from './App.debug9'  // Test 9 : SANS BrowserRouter

// Fonction pour cacher le loader
const hideLoader = () => {
  const loader = document.getElementById('app-loader')
  if (loader) {
    loader.classList.add('hidden')
    setTimeout(() => loader.remove(), 300)
  }
}

// Rendu de l'application SANS BrowserRouter
ReactDOM.createRoot(document.getElementById('root')!).render(
  <>
    <App />
    <Toaster position="top-right" />
  </>,
)

// Cacher le loader après le rendu
setTimeout(hideLoader, 100)
