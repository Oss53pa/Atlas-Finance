import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
// ✅ CHARGEMENT SYNCHRONE DES CSS - AVANT tout le reste
import './styles/base.css'
import './index.css'

// DEBUG - Test des providers un par un
import App from './App.debug4'  // Test 4 : + AuthProvider

// Fonction pour cacher le loader
const hideLoader = () => {
  const loader = document.getElementById('app-loader')
  if (loader) {
    loader.classList.add('hidden')
    setTimeout(() => loader.remove(), 300)
  }
}

// Rendu de l'application - les CSS sont DÉJÀ chargés
ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <App />
    <Toaster position="top-right" />
  </BrowserRouter>,
)

// Cacher le loader après le premier rendu
setTimeout(hideLoader, 100)
