import React, { useState, useEffect } from 'react'
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom'
import { Card, CardContent } from '../components/ui'

export default function Dashboard() {
  const { t } = useLanguage();
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
    { icon: '📊', title: t('accounting.title'), count: '125 écritures', color: 'bg-[var(--color-primary)]' },
    { icon: '💰', title: t('navigation.treasury'), count: '3 comptes', color: 'bg-[var(--color-success)]' },
    { icon: '👥', title: 'Tiers', count: '45 clients', color: 'bg-[var(--color-info)]' },
    { icon: '🏗️', title: t('navigation.assets'), count: '12 actifs', color: 'bg-[var(--color-warning)]' },
    { icon: '📈', title: 'Reporting', count: '5 rapports', color: 'bg-pink-500' },
    { icon: '⚙️', title: t('navigation.settings'), count: 'Configuration', color: 'bg-gray-500' },
  ]

  const recentActivities = [
    { type: 'Facture', description: 'Facture #2024-001 créée', time: 'Il y a 2 heures' },
    { type: 'Paiement', description: 'Paiement reçu de Client ABC', time: 'Il y a 3 heures' },
    { type: 'Écriture', description: 'Écriture comptable validée', time: 'Il y a 5 heures' },
    { type: 'Rapport', description: 'Balance générale générée', time: t('time.yesterday') },
  ]

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">
              🏢 WiseBook ERP
            </h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-[var(--color-text-primary)]">
                {user.email || 'Utilisateur'}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-[var(--color-error)] hover:text-[var(--color-error-dark)]"
              >
                {t('navigation.logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-info)] rounded-xl p-6 text-white mb-8">
          <h2 className="text-3xl font-bold mb-2">
            {t('common.welcome')} WiseBook ERP
          </h2>
          <p className="opacity-90">
            {t('navigation.dashboard')} - Vue d'ensemble de votre activité
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">€125,430</div>
              <div className="text-sm text-[var(--color-text-primary)] mt-1">{t('dashboard.revenue')}</div>
              <div className="text-xs text-[var(--color-success)] mt-2">+12% ce mois</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">45</div>
              <div className="text-sm text-[var(--color-text-primary)] mt-1">{t('dashboard.activeClients')}</div>
              <div className="text-xs text-[var(--color-primary)] mt-2">+3 nouveaux</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">€75,200</div>
              <div className="text-sm text-[var(--color-text-primary)] mt-1">{t('navigation.treasury')}</div>
              <div className="text-xs text-[var(--color-success)] mt-2">Solde positif</div>
            </CardContent>
          </Card>
          <Card className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="text-2xl font-bold text-[var(--color-text-primary)]">12</div>
              <div className="text-sm text-[var(--color-text-primary)] mt-1">{t('dashboard.pendingInvoices')}</div>
              <div className="text-xs text-[var(--color-warning)] mt-2">À traiter</div>
            </CardContent>
          </Card>
        </div>

        {/* Modules Grid */}
        <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Modules</h3>
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
                    <h4 className="font-semibold text-[var(--color-text-primary)]">{module.title}</h4>
                    <p className="text-sm text-[var(--color-text-primary)] mt-1">{module.count}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${module.color}`}></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Activity */}
        <h3 className="text-xl font-bold text-[var(--color-text-primary)] mb-4">Activité récente</h3>
        <div className="bg-white rounded-lg shadow">
          <div className="divide-y divide-gray-200">
            {recentActivities.map((activity, index) => (
              <div key={index} className="p-4 hover:bg-[var(--color-background-secondary)]">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="inline-block px-2 py-1 text-xs font-semibold bg-[var(--color-primary-lighter)] text-[var(--color-primary-darker)] rounded">
                      {activity.type}
                    </span>
                    <p className="mt-2 text-sm text-[var(--color-text-primary)]">{activity.description}</p>
                  </div>
                  <span className="text-xs text-[var(--color-text-secondary)]">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex space-x-4">
          <button className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg font-semibold hover:bg-[var(--color-primary-dark)]">
            + Nouvelle facture
          </button>
          <button className="px-6 py-3 bg-[var(--color-success)] text-white rounded-lg font-semibold hover:bg-[var(--color-success-dark)]">
            + Nouvelle écriture
          </button>
          <button className="px-6 py-3 bg-[var(--color-info)] text-white rounded-lg font-semibold hover:bg-purple-700">
            + Nouveau client
          </button>
        </div>
      </div>
    </div>
  )
}