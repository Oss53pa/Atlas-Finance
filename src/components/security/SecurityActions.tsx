import React, { useEffect, useState } from 'react';
import { Shield, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

/**
 * Carte « Sécurité » partagée par les 3 espaces (Manager / Admin / Comptable).
 *
 * Corrige deux failles d'audit :
 *  - 2FA RÉELLE : l'état reflète les facteurs MFA Supabase (`auth.mfa.listFactors`),
 *    l'activation lance un vrai enrôlement TOTP (QR + vérification de code). Fini le
 *    badge « Actif » cosmétique qui n'activait aucun second facteur.
 *  - CHANGEMENT DE MOT DE PASSE avec ré-authentification de l'ancien mot de passe
 *    (`signInWithPassword`) + confirmation + longueur minimale renforcée.
 */
interface SecurityActionsProps {
  email: string;
  /** Variable CSS d'accent (ex. 'var(--color-primary)'). */
  accentVar?: string;
}

const MIN_PASSWORD_LENGTH = 10;

const SecurityActions: React.FC<SecurityActionsProps> = ({ email, accentVar = 'var(--color-primary)' }) => {
  // ── 2FA ────────────────────────────────────────────────────────────────────
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading2fa, setLoading2fa] = useState(true);
  const [enroll, setEnroll] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [busy2fa, setBusy2fa] = useState(false);

  const refreshFactors = async () => {
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f: any) => f.status === 'verified');
      setFactorId(verified?.id ?? null);
    } catch { /* MFA indisponible (ex. mode local) */ }
    finally { setLoading2fa(false); }
  };

  useEffect(() => { refreshFactors(); }, []);

  const is2faActive = !!factorId;

  const startEnroll = async () => {
    setBusy2fa(true);
    try {
      // Nettoyer un éventuel facteur non vérifié resté d'une tentative précédente
      const { data: existing } = await supabase.auth.mfa.listFactors();
      const stale = existing?.totp?.find((f: any) => f.status !== 'verified');
      if (stale) { try { await supabase.auth.mfa.unenroll({ factorId: stale.id }); } catch { /* ignore */ } }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
      if (error) throw error;
      setEnroll({ factorId: data.id, qr: (data as any).totp.qr_code, secret: (data as any).totp.secret });
    } catch (e: any) {
      toast.error("Impossible d'activer la 2FA : " + (e?.message || 'erreur inconnue'));
    } finally { setBusy2fa(false); }
  };

  const verifyEnroll = async () => {
    if (!enroll || totpCode.length < 6) return;
    setBusy2fa(true);
    try {
      const ch = await supabase.auth.mfa.challenge({ factorId: enroll.factorId });
      if (ch.error) throw ch.error;
      const v = await supabase.auth.mfa.verify({ factorId: enroll.factorId, challengeId: ch.data.id, code: totpCode });
      if (v.error) throw v.error;
      setFactorId(enroll.factorId);
      setEnroll(null);
      setTotpCode('');
      toast.success('2FA activée');
    } catch {
      toast.error('Code invalide, réessayez');
    } finally { setBusy2fa(false); }
  };

  const disable2fa = async () => {
    if (!factorId) return;
    if (!window.confirm('Désactiver la double authentification ?')) return;
    setBusy2fa(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      setFactorId(null);
      toast.success('2FA désactivée');
    } catch (e: any) {
      toast.error('Erreur : ' + (e?.message || 'désactivation impossible'));
    } finally { setBusy2fa(false); }
  };

  // ── Mot de passe ────────────────────────────────────────────────────────────
  const [showPwdModal, setShowPwdModal] = useState(false);
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const resetPwdModal = () => { setShowPwdModal(false); setCurrentPwd(''); setNewPwd(''); setConfirmPwd(''); };

  const changePassword = async () => {
    if (newPwd.length < MIN_PASSWORD_LENGTH) { toast.error(`Le nouveau mot de passe doit faire au moins ${MIN_PASSWORD_LENGTH} caractères`); return; }
    if (newPwd !== confirmPwd) { toast.error('La confirmation ne correspond pas'); return; }
    if (!currentPwd) { toast.error('Saisissez votre mot de passe actuel'); return; }
    setSavingPwd(true);
    try {
      // Ré-authentification : vérifier l'ancien mot de passe avant tout changement
      const { error: reauthErr } = await supabase.auth.signInWithPassword({ email, password: currentPwd });
      if (reauthErr) { toast.error('Mot de passe actuel incorrect'); return; }
      const { error } = await supabase.auth.updateUser({ password: newPwd });
      if (error) throw error;
      toast.success('Mot de passe mis à jour');
      resetPwdModal();
    } catch (e: any) {
      toast.error('Erreur : ' + (e?.message || 'changement impossible'));
    } finally { setSavingPwd(false); }
  };

  const qrIsSvg = enroll?.qr?.trim().startsWith('<svg');

  return (
    <div className="bg-white rounded-xl p-6 border">
      <h4 className="font-semibold mb-4 flex items-center"><Shield className="w-5 h-5 mr-2" style={{ color: accentVar }} />Securite</h4>

      <button onClick={() => setShowPwdModal(true)} className="w-full p-3 border rounded-lg text-sm mb-2 hover:border-[color:var(--accent)]" style={{ ['--accent' as any]: accentVar }}>
        Changer mot de passe
      </button>

      <button
        onClick={() => (is2faActive ? disable2fa() : startEnroll())}
        disabled={loading2fa || busy2fa}
        className="w-full p-3 border rounded-lg text-sm flex justify-between items-center disabled:opacity-50"
      >
        <span className="flex items-center"><Lock className="w-4 h-4 mr-2" style={{ color: accentVar }} />Double authentification (2FA)</span>
        <span className={`text-xs px-2 py-1 rounded ${is2faActive ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
          {loading2fa ? '…' : is2faActive ? 'Actif' : 'Off'}
        </span>
      </button>

      {/* Modale d'enrôlement TOTP */}
      {enroll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-bold text-lg">Activer la 2FA</h3>
            <p className="text-sm text-gray-600">Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy…), puis saisissez le code à 6 chiffres.</p>
            <div className="flex justify-center">
              {qrIsSvg
                ? <div className="w-40 h-40" dangerouslySetInnerHTML={{ __html: enroll.qr }} />
                : <img src={enroll.qr} alt="QR 2FA" className="w-40 h-40" />}
            </div>
            <p className="text-xs text-gray-400 break-all text-center">Clé : {enroll.secret}</p>
            <input
              inputMode="numeric" maxLength={6} placeholder="Code à 6 chiffres"
              value={totpCode} onChange={e => setTotpCode(e.target.value.replace(/\D/g, ''))}
              className="w-full border rounded-lg px-3 py-2 text-sm text-center tracking-widest"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setEnroll(null); setTotpCode(''); }} className="px-4 py-2 border rounded-lg text-sm">Annuler</button>
              <button disabled={busy2fa || totpCode.length < 6} onClick={verifyEnroll} className="px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50" style={{ background: accentVar }}>
                {busy2fa ? '…' : 'Vérifier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modale changement de mot de passe */}
      {showPwdModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h3 className="font-bold text-lg">Changer le mot de passe</h3>
            <input type="password" placeholder="Mot de passe actuel" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" placeholder={`Nouveau mot de passe (${MIN_PASSWORD_LENGTH} car. min)`} value={newPwd} onChange={e => setNewPwd(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <input type="password" placeholder="Confirmer le nouveau mot de passe" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" />
            <div className="flex gap-3 justify-end">
              <button onClick={resetPwdModal} className="px-4 py-2 border rounded-lg text-sm">Annuler</button>
              <button disabled={savingPwd} onClick={changePassword} className="px-4 py-2 text-white rounded-lg text-sm disabled:opacity-50" style={{ background: accentVar }}>
                {savingPwd ? 'En cours...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityActions;
