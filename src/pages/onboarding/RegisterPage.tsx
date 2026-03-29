import React, { useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { ATLAS_STUDIO } from '../../config/atlasStudio';

const RegisterPage: React.FC = () => {
  useEffect(() => {
    window.location.href = ATLAS_STUDIO.LOGIN;
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 text-gray-600 animate-spin mx-auto" />
        <p className="text-gray-600">Redirection vers Atlas Studio...</p>
        <p className="text-sm text-gray-400">
          Les comptes sont geres sur{' '}
          <a href={ATLAS_STUDIO.LOGIN} className="text-blue-600 underline">
            atlas-studio.org
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
