// @ts-nocheck
import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Calculator, Eye, EyeOff, Building, User, Mail, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [form, setForm] = useState({ fullName: '', email: '', password: '', orgName: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.fullName || !form.email || !form.password) {
      setError('Tous les champs sont obligatoires'); return;
    }
    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères'); return;
    }
    if (!inviteToken && !form.orgName) {
      setError('Le nom de la société est obligatoire'); return;
    }

    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            first_name: form.fullName.split(' ')[0],
            last_name: form.fullName.split(' ').slice(1).join(' '),
            organization_name: form.orgName || undefined,
            invite_token: inviteToken || undefined,
          },
        },
      });

      if (signUpError) throw new Error(signUpError.message);
      navigate('/verify-email', { state: { email: form.email } });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl border p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-[#171717] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Calculator className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#171717]">Créer un compte</h1>
            <p className="text-sm text-gray-500 mt-1">
              {inviteToken ? 'Rejoignez votre équipe sur Atlas Studio' : 'Démarrez avec Atlas Studio'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text" value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  placeholder="Amadou Diallo"
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email professionnel</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="amadou@entreprise.com"
                  className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="8 caractères minimum"
                  className="w-full pl-10 pr-10 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!inviteToken && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de votre société</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text" value={form.orgName}
                    onChange={e => setForm(f => ({ ...f, orgName: e.target.value }))}
                    placeholder="Ma Société SARL"
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-[#171717] focus:border-transparent"
                  />
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-[#171717] text-white rounded-lg font-semibold text-sm hover:bg-[#333] transition-colors disabled:opacity-50">
              {loading ? 'Création en cours...' : 'Créer mon compte'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Déjà un compte ? <Link to="/login" className="text-[#171717] font-semibold hover:underline">Se connecter</Link>
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Atlas Studio &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
