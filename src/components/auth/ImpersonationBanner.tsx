// @ts-nocheck
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, X } from 'lucide-react';
import { isImpersonating, getImpersonationInfo, stopImpersonation } from '../../features/platform/services/impersonationService';

const ImpersonationBanner: React.FC = () => {
  const navigate = useNavigate();
  const info = getImpersonationInfo();

  if (!isImpersonating() || !info) return null;

  const handleQuit = () => {
    stopImpersonation();
    navigate('/admin-console', { replace: true });
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[999] bg-red-600 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm font-medium shadow-lg">
      <AlertTriangle className="w-4 h-4 shrink-0" />
      <span>Mode impersonation — Tenant : <strong>{info.tenantName}</strong></span>
      <span className="text-white/60 text-xs">({info.adminEmail})</span>
      <button onClick={handleQuit} className="ml-4 px-3 py-1 bg-white text-red-600 rounded font-semibold text-xs hover:bg-red-50 flex items-center gap-1">
        <X className="w-3 h-3" /> Quitter
      </button>
    </div>
  );
};

export default ImpersonationBanner;
