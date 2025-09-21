import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '../components/ui'

export default function Dashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState<any>({})

  useEffect(() => {
    const storedUser = localStorage.getItem('user')
    if (storedUser) {
      setUser(JSON.parse(storedUser))
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('user')
    navigate('/')
  }

  const modules = [
    { icon: '📊', title: 'Comptabilité', count: '125 écritures', color: 'bg-blue-500' },
    { icon: '💰', title: 'Trésorerie', count: '3 comptes', color: 'bg-green-500' },
    { icon: '👥', title: 'Tiers', count: '45 clients', color: 'bg-purple-500' },
    { icon: '🏗️', title: 'Immobilisations', count: '12 actifs', color: 'bg-orange-500' },
    { icon: '📈', title: 'Reporting', count: '5 rapports', color: 'bg-pink-500' },
    { icon: '⚙️', title: 'Paramètres', count: 'Configuration', color: 'bg-gray-500' },
  ]

  const recentActivities = [
    { type: 'Facture', description: 'Facture #2024-001 créée', time: 'Il y a 2 heures' },
    { type: 'Paiement', description: 'Paiement reçu de Client ABC', time: 'Il y a 3 heures' },
    { type: 'Écriture', description: 'Écriture comptable validée', time: 'Il y a 5 heures' },
    { type: 'Rapport', description: 'Balance générale générée', time: 'Hier' },
  ]

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">
              🏢 WiseBook ERP
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {user.email || 'Utilisateur'}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Bienvenue dans WiseBook ERP
          </h2>
          <p className="opacity-90">
            Tableau de bord - Vue d'ensemble de votre activité
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-900">€125,430</div>
              <div className="text-sm text-gray-600 mt-1">Chiffre d'affaires</div>
              <div className="text-xs text-green-600 mt-2">+12% ce mois</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-900">45</div>
              <div className="text-sm text-gray-600 mt-1">Clients actifs</div>
              <div className="text-xs text-blue-600 mt-2">+3 nouveaux</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-900">€75,200</div>
              <div className="text-sm text-gray-600 mt-1">Trésorerie</div>
              <div className="text-xs text-green-600 mt-2">Solde positif</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-gray-900">12</div>
              <div className="text-sm text-gray-600 mt-1">Factures en attente</div>
              <div className="text-xs text-orange-600 mt-2">À traiter</div>
            </CardContent>
          </Card>
        </div>

        {/* Modules Grid */}
        <h3 className="text-xl font-bold text-gray-900 mb-4">Modules</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {modules.map((module, index) => (
            <Card
              key={index}
              className="hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => alert(`Module ${module.title} - En cours de développement`)}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-3xl mb-3">{module.icon}</div>
                    <h4 className="font-semibold text-gray-900">{module.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{module.count}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${module.color}`}></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <h3 className="text-xl font-bold text-gray-900 mb-4">Activité récente</h3>
        <div className="bg-white rounded-lg shadow">
          <div className="divide-y divide-gray-200">
            {recentActivities.map((activity, index) => (
              <div key={index} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800 rounded">
                      {activity.type}
                    </span>
                    <p className="mt-2 text-sm text-gray-900">{activity.description}</p>
                  </div>
                  <span className="text-xs text-gray-500">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex space-x-4">
          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700">
            + Nouvelle facture
          </button>
          <button className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700">
            + Nouvelle écriture
          </button>
          <button className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700">
            + Nouveau client
          </button>
        </div>
      </div>
    </div>
  )
}