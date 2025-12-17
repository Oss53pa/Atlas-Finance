import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { HelmetProvider } from 'react-helmet-async'
// ✅ CHARGEMENT SYNCHRONE DES CSS - AVANT tout le reste
import './styles/base.css'
import './index.css'

// DEBUG - Test des providers un par un
// import App from './App.debug1'  // Test 1 : LanguageProvider seul ✅ OK
// import App from './App.debug2'  // Test 2 : + ThemeProvider ✅ OK
// import App from './App.debug3'  // Test 3 : + QueryClient ✅ OK
// import App from './App.debug4'  // Test 4 : + AuthProvider SANS useEffect
// import App from './App.debug6'  // Test 6 : + AuthProvider SANS TAILWIND (styles inline)
// import App from './App.debug8'  // Test 8 : Loader caché depuis React
// import App from './App.stable'  // VERSION STABLE : Ne rendre que quand tout est prêt
import App from './App'  // LOADER REACT : Tout géré par React

// Fonction pour cacher le loader
const hideLoader = () => {
  const loader = document.getElementById('app-loader')
  if (loader) {
    loader.classList.add('hidden')
    setTimeout(() => loader.remove(), 300)
  }
}

// Rendu de l'application - les CSS sont DÉJÀ chargés de manière synchrone
ReactDOM.createRoot(document.getElementById('root')!).render(
  <HelmetProvider>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
      <Toaster position="top-right" />
    </BrowserRouter>
  </HelmetProvider>,
)

// ✅ Le loader sera caché depuis le composant App après le premier rendu complet
// (Pas de hideLoader ici pour Test 8)
