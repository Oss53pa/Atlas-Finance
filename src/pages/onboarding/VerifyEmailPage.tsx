// @ts-nocheck
import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Calculator, Mail, RefreshCw, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const email = (location.state as any)?.email || '';
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  // Si déjà vérifié → rediriger
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/client', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Poll session
  useEffect(() => {
    const interval = setInterval(async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        navigate('/client', { replace: true });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await supabase.auth.resend({ type: 'signup', email });
      setResent(true);
      setTimeout(() => setResent(false), 5000);
    } catch (e) {
      console.error('Resend failed:', e);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-xl border p-8">
          <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-[#171717] mb-2">Vérifiez votre email</h1>
          <p className="text-gray-500 text-sm mb-6">
            Nous avons envoyé un lien de confirmation à
            {email && <strong className="block mt-1 text-[#171717]">{email}</strong>}
          </p>
          <p className="text-gray-400 text-xs mb-6">
            Cliquez sur le lien dans l'email pour activer votre compte.
            Cette page se mettra à jour automatiquement.
          </p>

          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-500">En attente de confirmation...</span>
          </div>

          <button
            onClick={handleResend}
            disabled={resending || resent}
            className="inline-flex items-center gap-2 px-4 py-2 border rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {resent ? (
              <><CheckCircle className="w-4 h-4 text-green-500" /> Email renvoyé</>
            ) : (
              <><RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} /> Renvoyer l'email</>
            )}
          </button>
        </div>

        <p className="text-xs text-gray-400 mt-6">Atlas Studio &copy; {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
