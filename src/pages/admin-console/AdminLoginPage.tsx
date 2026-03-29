// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Si déjà connecté en tant que superadmin → rediriger
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'super_admin' || user.role === 'admin') {
        navigate('/admin-console', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Email et mot de passe requis');
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // Le useEffect ci-dessus gère la redirection une fois le profil chargé
    } catch (err: any) {
      const msg = err.message || 'Erreur de connexion';
      if (msg.includes('Invalid login') || msg.includes('Identifiants')) {
        setError('Email ou mot de passe incorrect');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="bg-[#1e293b] rounded-2xl border border-white/10 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-red-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <h1 className="atlas-brand text-2xl text-white">Atlas Studio</h1>
            <p className="text-xs text-red-400 font-semibold uppercase tracking-widest mt-1">Console Administration</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="mb-4">
            <label className="block text-xs font-medium text-white/50 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@atlasstudio.com"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-colors"
              autoComplete="email"
              autoFocus
            />
          </div>

          {/* Password */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-white/50 mb-1.5">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/20 focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none transition-colors pr-11"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Connexion...</>
            ) : (
              'Se connecter'
            )}
          </button>

          <p className="text-xs text-white/20 mt-4 text-center">Accès réservé aux administrateurs de la plateforme.</p>
        </form>

        <p className="text-[10px] text-white/15 mt-8 text-center">
          <span className="atlas-brand text-xs">Atlas Studio</span> &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default AdminLoginPage;
