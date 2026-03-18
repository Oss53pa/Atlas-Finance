// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield } from 'lucide-react';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-[#1e293b] rounded-2xl border border-white/10 p-8 shadow-2xl">
          <div className="mb-6">
            <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="atlas-brand text-2xl text-white">Atlas Studio</h1>
            <p className="text-xs text-red-400 font-semibold uppercase tracking-widest mt-1">Console Administration</p>
          </div>

          <p className="text-sm text-white/40 mb-6">Accès réservé aux administrateurs de la plateforme.</p>

          <button
            onClick={() => navigate('/admin-console')}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors"
          >
            Accéder à la console
          </button>
        </div>

        <p className="text-[10px] text-white/15 mt-8">Atlas Studio &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
