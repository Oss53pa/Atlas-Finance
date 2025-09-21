import React from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'

function HomePage() {
  const navigate = useNavigate()
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">
                🏢 WiseBook ERP
              </h1>
            </div>
            <nav className="flex space-x-4">
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Dashboard
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                Comptabilité
              </button>
              <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">
                Trésorerie
              </button>
              <button 
                onClick={() => navigate('/login')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Se connecter
              </button>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">
              Système de Gestion d'Entreprise Conforme SYSCOHADA
            </h2>
            <p className="text-xl opacity-90 mb-8">
              La solution ERP complète pour l'Afrique
            </p>
            <div className="flex justify-center space-x-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-6 py-3 bg-white text-blue-600 rounded-lg font-semibold hover:bg-gray-100"
              >
                Démarrer l'essai gratuit
              </button>
              <button 
                onClick={() => navigate('/dashboard')}
                className="px-6 py-3 bg-blue-700 text-white rounded-lg font-semibold hover:bg-blue-800"
              >
                Voir la démo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h3 className="text-3xl font-bold text-center mb-12 text-gray-900">
          Fonctionnalités Principales
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              icon: "📊",
              title: "Comptabilité SYSCOHADA",
              description: "Gestion complète conforme aux normes OHADA avec plan comptable intégré"
            },
            {
              icon: "💰",
              title: "Trésorerie",
              description: "Suivi en temps réel des flux, rapprochements bancaires automatiques"
            },
            {
              icon: "🏗️",
              title: "Immobilisations",
              description: "Gestion du patrimoine avec calculs d'amortissements automatiques"
            },
            {
              icon: "📈",
              title: "Reporting & BI",
              description: "Tableaux de bord interactifs avec analytics avancés"
            },
            {
              icon: "🔒",
              title: "Sécurité Avancée",
              description: "MFA, audit trails complets et conformité RGPD"
            },
            {
              icon: "⚙️",
              title: "Workflows Automatisés",
              description: "Automatisation complète du cycle comptable"
            }
          ].map((feature, index) => (
            <div key={index} className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow">
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h4 className="text-xl font-semibold mb-2 text-gray-900">{feature.title}</h4>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-600">500+</div>
              <div className="text-gray-600 mt-2">Entreprises clientes</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">15</div>
              <div className="text-gray-600 mt-2">Pays africains</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">99.9%</div>
              <div className="text-gray-600 mt-2">Disponibilité</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600">24/7</div>
              <div className="text-gray-600 mt-2">Support client</div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="mb-2">© 2025 WiseBook ERP v3.0.0</p>
          <p className="text-gray-400">Système de Gestion Intégrée pour l'Afrique</p>
        </div>
      </footer>
    </div>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
    </Routes>
  )
}

export default App