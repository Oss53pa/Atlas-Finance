
import React, { useState } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard, Users, CreditCard, ToggleLeft, Activity, Headphones,
  LogOut, Settings, Search, Sparkles, ChevronRight, DollarSign, FileText
} from 'lucide-react';

const NAV = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/admin-console' },
  { label: 'Tenants', icon: Users, path: '/admin-console/tenants' },
  { label: 'Billing', icon: CreditCard, path: '/admin-console/billing' },
  { label: 'Tarifs', icon: DollarSign, path: '/admin-console/pricing' },
  { label: 'Facture manuelle', icon: FileText, path: '/admin-console/invoices/new' },
  { label: 'Feature Flags', icon: ToggleLeft, path: '/admin-console/features' },
  { label: 'Monitoring', icon: Activity, path: '/admin-console/monitoring' },
  { label: 'Support', icon: Headphones, path: '/admin-console/support' },
];

const AdminConsoleLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [search, setSearch] = useState('');

  return (
    <div className="min-h-screen flex bg-gray-100">
      {/* Sidebar sombre (différent du client) */}
      <aside className="w-60 bg-[#0f172a] text-white flex flex-col shrink-0">
        <div className="px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <span className="atlas-brand text-lg">Atlas Studio</span>
              <div className="text-[10px] text-red-400 font-semibold uppercase tracking-wider">Console Admin</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => {
            const isActive = location.pathname === item.path || (item.path !== '/admin-console' && location.pathname.startsWith(item.path));
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? 'bg-white/10 text-white' : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}>
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center text-[10px] font-bold">{(user?.name || 'A')[0]}</div>
              <div className="text-xs text-white/60 truncate">{user?.email || user?.name}</div>
            </div>
            <button onClick={() => { logout(); navigate('/'); }} className="p-1 hover:bg-white/10 rounded text-white/40">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="bg-white border-b px-6 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher un tenant, email, facture..."
                className="pl-10 pr-4 py-2 border rounded-lg text-sm w-80" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded-full font-semibold">PRODUCTION</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <Outlet context={{ search }} />
        </main>
      </div>
    </div>
  );
};

export default AdminConsoleLayout;
