/**
 * PremierConnexionPage — Première authentification après invitation.
 *
 * Flow :
 *  1. Admin invite un collaborateur → edge function generate un lien Supabase
 *  2. Collaborateur clique → Supabase redirige ici avec access_token dans le hash
 *  3. Cette page : email confirmé ✓ → formulaire nouveau mot de passe
 *  4. Succès → redirect /dashboard
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, CheckCircle, Lock, Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Step = 'loading' | 'set-password' | 'success' | 'error';

const PremierConnexionPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('loading');
  const [userEmail, setUserEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Supabase JS client décode automatiquement le hash de l'URL (#access_token=...)
  // et émet SIGNED_IN lors du premier chargement.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserEmail(session.user.email ?? '');
        setStep('set-password');
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        setUserEmail(session.user.email ?? '');
        setStep('set-password');
      }
    });

    // Vérifier si déjà authentifié (rechargement de page)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserEmail(session.user.email ?? '');
        setStep('set-password');
      } else {
        // Pas encore de session — attendre l'event (hash non encore traité)
        setTimeout(() => {
          setStep(s => s === 'loading' ? 'error' : s);
        }, 5000);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    if (password !== confirm) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    setSubmitting(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;

      setStep('success');
      setTimeout(() => navigate('/dashboard', { replace: true }), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la définition du mot de passe');
    } finally {
      setSubmitting(false);
    }
  };

  const strength = (() => {
    if (password.length === 0) return 0;
    let s = 0;
    if (password.length >= 8) s++;
    if (/[A-Z]/.test(password)) s++;
    if (/[0-9]/.test(password)) s++;
    if (/[^A-Za-z0-9]/.test(password)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Faible', 'Moyen', 'Fort', 'Très fort'][strength];
  const strengthColor = ['', 'bg-red-400', 'bg-amber-400', 'bg-emerald-400', 'bg-emerald-600'][strength];

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block bg-[#1a1a1a] text-white px-5 py-3 rounded-2xl text-xl font-semibold tracking-wide mb-3">
            Atlas Finance &amp; Accounting
          </div>
          <p className="text-sm text-gray-500">Première connexion — Configuration de votre compte</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

          {/* ── LOADING ─────────────────────────────────────────────────── */}
          {step === 'loading' && (
            <div className="p-10 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 text-sm">Vérification du lien d'invitation…</p>
            </div>
          )}

          {/* ── ERROR ───────────────────────────────────────────────────── */}
          {step === 'error' && (
            <div className="p-10 text-center">
              <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lock className="w-7 h-7 text-red-400" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Lien invalide ou expiré</h2>
              <p className="text-sm text-gray-500 mb-6">
                Ce lien d'invitation a peut-être expiré (72 h). Contactez votre administrateur
                pour qu'il vous renvoie une invitation.
              </p>
              <button
                onClick={() => navigate('/login')}
                className="text-sm text-gray-600 underline hover:text-gray-900"
              >
                Retour à la connexion
              </button>
            </div>
          )}

          {/* ── SET PASSWORD ────────────────────────────────────────────── */}
          {step === 'set-password' && (
            <form onSubmit={handleSetPassword} className="p-8">
              {/* Email confirmé */}
              <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-6">
                <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-emerald-700 font-medium">Email confirmé</p>
                  <p className="text-sm text-emerald-900 font-semibold">{userEmail}</p>
                </div>
              </div>

              <h2 className="text-lg font-bold text-gray-900 mb-1">Définissez votre mot de passe</h2>
              <p className="text-sm text-gray-500 mb-6">
                Choisissez un mot de passe sécurisé pour accéder à votre compte.
              </p>

              {/* Mot de passe */}
              <div className="mb-4">
                <label htmlFor="new-pwd" className="block text-sm font-medium text-gray-700 mb-1">
                  Nouveau mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="new-pwd"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm pr-10 focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none"
                    placeholder="Minimum 8 caractères"
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showPwd ? 'Masquer' : 'Afficher'}
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Indicateur de force */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map(i => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColor : 'bg-gray-200'}`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">{strengthLabel}</p>
                  </div>
                )}
              </div>

              {/* Confirmer mot de passe */}
              <div className="mb-6">
                <label htmlFor="confirm-pwd" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    id="confirm-pwd"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    className={`w-full px-4 py-2.5 border rounded-xl text-sm pr-10 focus:ring-2 focus:border-transparent outline-none transition-colors ${
                      confirm && confirm !== password
                        ? 'border-red-300 focus:ring-red-300'
                        : 'border-gray-200 focus:ring-gray-900'
                    }`}
                    placeholder="Répétez le mot de passe"
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    aria-label={showConfirm ? 'Masquer' : 'Afficher'}
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <p className="text-xs text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting || !password || !confirm}
                className="w-full bg-[#1a1a1a] text-white py-3 rounded-xl font-semibold text-sm hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Enregistrement…</>
                  : <><ShieldCheck className="w-4 h-4" /> Enregistrer et accéder à mon compte</>
                }
              </button>
            </form>
          )}

          {/* ── SUCCESS ─────────────────────────────────────────────────── */}
          {step === 'success' && (
            <div className="p-10 text-center">
              <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-200 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 mb-2">Compte activé !</h2>
              <p className="text-sm text-gray-500">
                Votre mot de passe a été enregistré. Redirection vers le tableau de bord…
              </p>
              <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto mt-4" />
            </div>
          )}

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Atlas Finance &amp; Accounting — Suite de gestion pour l'Afrique francophone
        </p>
      </div>
    </div>
  );
};

export default PremierConnexionPage;
