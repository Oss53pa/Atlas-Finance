import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Status = 'loading' | 'error';

const ExternalAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('error');
      setErrorMessage('Aucun token fourni dans l\'URL.');
      return;
    }

    exchangeToken(token);
  }, [searchParams]);

  async function exchangeToken(token: string) {
    try {
      setStatus('loading');

      // Call the atlas-sso edge function to validate the token and get a magic link
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/atlas-sso`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de validation du token');
      }

      // Use the token_hash to establish a local Supabase session
      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      });

      if (otpError) {
        throw new Error(otpError.message);
      }

      // Decode the Atlas Studio JWT to extract plan and configure feature tier
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const plan = (payload.plan || '').toLowerCase();
        if (plan.includes('premium') || plan.includes('pro') || plan.includes('enterprise')) {
          localStorage.setItem('atlas_fna_plan_tier', 'premium');
        } else {
          localStorage.setItem('atlas_fna_plan_tier', 'pme');
        }
      } catch (err) { /* silent */
        localStorage.setItem('atlas_fna_plan_tier', 'pme');
      }

      // Session is now established, AuthContext will pick it up
      navigate('/home', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setStatus('error');
      setErrorMessage(message);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Atlas Finance
          </h1>

          {status === 'loading' && (
            <div className="space-y-4">
              <p className="text-gray-600">Connexion en cours...</p>
              <div className="flex justify-center">
                <Loader2 className="w-8 h-8 text-red-600 animate-spin" />
              </div>
              <p className="text-sm text-gray-400">
                Validation de votre session Atlas Studio
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 text-red-600">
                <AlertCircle className="w-5 h-5" />
                <p className="font-medium">Connexion impossible</p>
              </div>
              <p className="text-sm text-gray-600">{errorMessage}</p>
              <div className="pt-4 space-y-2">
                <a
                  href="https://atlas-studio.org/portal"
                  className="block w-full py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Retour à Atlas Studio
                </a>
                <button
                  onClick={() => navigate('/login')}
                  className="block w-full py-2 px-4 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Se connecter manuellement
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExternalAuthPage;
