/**
 * AtlasStudioRedirect — redirige vers le portail centralisé Atlas Studio.
 * Format unifié Suite : /signup, /forgot-password, /reset-password sont gérés
 * sur atlas-studio.org.
 */
import React, { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface Props {
  destination: 'signup' | 'forgot-password' | 'reset-password' | 'portal' | 'pricing';
  message?: string;
}

const DEST: Record<Props['destination'], string> = {
  signup: 'https://atlas-studio.org/portal/signup',
  'forgot-password': 'https://atlas-studio.org/portal/forgot-password',
  'reset-password': 'https://atlas-studio.org/portal/reset-password',
  portal: 'https://atlas-studio.org/portal',
  pricing: 'https://atlas-studio.org/applications/atlas-fa',
};

export const AtlasStudioRedirect: React.FC<Props> = ({ destination, message }) => {
  const url = DEST[destination];
  useEffect(() => {
    const t = setTimeout(() => { window.location.href = url; }, 1500);
    return () => clearTimeout(t);
  }, [url]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-xl shadow-lg p-8 max-w-md text-center border border-gray-200">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <ExternalLink className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Redirection Atlas Studio</h1>
        <p className="text-gray-600 mb-6">
          {message || 'La gestion de compte est centralisée sur le portail Atlas Studio.'}
        </p>
        <a
          href={url}
          className="inline-block w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-all"
        >
          Continuer
        </a>
        <p className="text-xs text-gray-400 mt-3">Redirection automatique…</p>
      </div>
    </div>
  );
};

export default AtlasStudioRedirect;
