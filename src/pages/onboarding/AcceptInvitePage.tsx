
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calculator, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getInvitationByToken, acceptInvitation } from '../../features/onboarding/services/onboardingService';

const AcceptInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'accepted' | 'error'>('loading');
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }

    getInvitationByToken(token).then(inv => {
      if (inv) {
        setInvitation(inv);
        setStatus('valid');
      } else {
        setStatus('invalid');
      }
    }).catch(() => setStatus('invalid'));
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setStatus('loading');
    try {
      await acceptInvitation(token);
      setStatus('accepted');
      setTimeout(() => navigate('/client', { replace: true }), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-2xl shadow-xl border p-8">
          <div className="w-12 h-12 bg-[#171717] rounded-xl flex items-center justify-center mx-auto mb-6">
            <Calculator className="w-6 h-6 text-white" />
          </div>

          {status === 'loading' && (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Vérification de l'invitation...</p>
            </>
          )}

          {status === 'valid' && !isAuthenticated && (
            <>
              <h1 className="text-xl font-bold text-[#171717] mb-2">Vous êtes invité !</h1>
              <p className="text-gray-500 text-sm mb-6">
                Vous avez été invité à rejoindre une organisation sur Atlas Studio.
              </p>
              <p className="text-sm text-gray-600 mb-6">
                Email : <strong>{invitation?.email}</strong>
                <br />Rôle : <strong>{invitation?.role_code}</strong>
              </p>
              <button onClick={() => navigate(`/register?invite=${token}`)}
                className="w-full py-3 bg-[#171717] text-white rounded-lg font-semibold text-sm hover:bg-[#333]">
                Créer mon compte
              </button>
              <p className="text-sm text-gray-500 mt-4">
                Déjà un compte ? <button onClick={() => navigate('/login')} className="text-[#171717] font-semibold hover:underline">Se connecter</button>
              </p>
            </>
          )}

          {status === 'valid' && isAuthenticated && (
            <>
              <h1 className="text-xl font-bold text-[#171717] mb-2">Rejoindre l'organisation</h1>
              <p className="text-gray-500 text-sm mb-6">
                Connecté en tant que <strong>{user?.email}</strong>.
                Accepter l'invitation pour rejoindre l'équipe ?
              </p>
              <button onClick={handleAccept}
                className="w-full py-3 bg-[#171717] text-white rounded-lg font-semibold text-sm hover:bg-[#333]">
                Accepter l'invitation
              </button>
            </>
          )}

          {status === 'accepted' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-[#171717] mb-2">Bienvenue !</h1>
              <p className="text-gray-500 text-sm">Redirection vers Atlas Studio...</p>
            </>
          )}

          {status === 'invalid' && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-[#171717] mb-2">Invitation invalide</h1>
              <p className="text-gray-500 text-sm mb-6">
                Cette invitation a expiré ou a déjà été utilisée.
              </p>
              <button onClick={() => navigate('/login')}
                className="px-6 py-2.5 border rounded-lg text-sm font-medium hover:bg-gray-50">
                Aller à la connexion
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-[#171717] mb-2">Erreur</h1>
              <p className="text-red-600 text-sm">{error}</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AcceptInvitePage;
