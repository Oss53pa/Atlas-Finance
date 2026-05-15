import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck, AlertCircle, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';

type Status = 'loading' | 'error';

const SSO_TIMEOUT_MS = 12000; // 12 secondes max avant de proposer un fallback manuel

const ExternalAuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [slowMode, setSlowMode] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');

    // En dev local, bypasser le SSO (edge function non disponible)
    if (import.meta.env.DEV) {
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const plan = (payload.plan || '').toLowerCase();
          if (plan.includes('premium') || plan.includes('pro') || plan.includes('enterprise')) {
            localStorage.setItem('atlas_fna_plan_tier', 'premium');
          } else {
            localStorage.setItem('atlas_fna_plan_tier', 'pme');
          }
        } catch { /* silent */ }
      }
      navigate('/login', { replace: true });
      return;
    }

    if (!token) {
      setStatus('error');
      setErrorMessage("Aucun token fourni dans l'URL.");
      return;
    }

    // Après 5s, on propose déjà l'option manuelle (sans la forcer)
    const slowTimer = setTimeout(() => setSlowMode(true), 5000);
    exchangeToken(token).finally(() => clearTimeout(slowTimer));
  }, [searchParams]);

  async function exchangeToken(token: string) {
    try {
      setStatus('loading');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Configuration Supabase manquante.');
      }

      // Timeout 12s pour ne pas hang sur edge function indisponible
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SSO_TIMEOUT_MS);

      let response: Response;
      try {
        response = await fetch(`${supabaseUrl}/functions/v1/atlas-sso`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseAnonKey,
          },
          body: JSON.stringify({ token }),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeoutId);
        if (fetchErr instanceof Error && fetchErr.name === 'AbortError') {
          throw new Error('Le serveur SSO Atlas Studio ne répond pas (>12s). Veuillez vous connecter manuellement.');
        }
        throw fetchErr;
      }
      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erreur de validation du token');
      }

      const { error: otpError } = await supabase.auth.verifyOtp({
        token_hash: data.token_hash,
        type: 'magiclink',
      });

      if (otpError) {
        throw new Error(otpError.message);
      }

      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const plan = (payload.plan || '').toLowerCase();
        if (plan.includes('premium') || plan.includes('pro') || plan.includes('enterprise')) {
          localStorage.setItem('atlas_fna_plan_tier', 'premium');
        } else {
          localStorage.setItem('atlas_fna_plan_tier', 'pme');
        }
      } catch (err) {
        localStorage.setItem('atlas_fna_plan_tier', 'pme');
      }

      // Synchroniser le tenant_id (tolérant)
      try {
        const userResp = await supabase.auth.getUser();
        const userId = userResp?.data?.user?.id;
        if (userId) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', userId)
            .maybeSingle();
          const companyId = (profileData as { company_id?: string } | null)?.company_id;
          if (companyId) {
            localStorage.setItem('atlas-tenant-id', companyId);
          }
        }
      } catch (_e) { /* fallback */ }

      navigate('/home', { replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setStatus('error');
      setErrorMessage(message);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #F7F4ED 0%, #FFFFFF 100%)', padding: '2rem' }}
    >
      <div className="surface-card anim-rise" style={{ maxWidth: 440, width: '100%', padding: '2.25rem 2rem 1.75rem', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Filet gold supérieur */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)',
            opacity: 0.6,
          }}
        />

        {/* Brand mark */}
        <div className="flex justify-center mb-5">
          <div
            className="inline-flex items-center justify-center"
            style={{
              width: 56, height: 56, borderRadius: 14,
              background: 'var(--gradient-champagne)',
              boxShadow: '0 8px 20px -4px rgba(201,169,97,0.40), inset 0 1px 0 rgba(255,255,255,0.30)',
            }}
          >
            <ShieldCheck className="w-7 h-7 text-white" strokeWidth={1.6} />
          </div>
        </div>

        <div className="eyebrow-gold mb-2">Atlas Studio · SSO</div>
        <h1
          className="font-bold mb-1"
          style={{ fontSize: '1.5rem', letterSpacing: '-0.028em', lineHeight: 1.15, color: 'var(--color-text-primary)' }}
        >
          {status === 'loading' ? 'Connexion en cours' : 'Connexion impossible'}
        </h1>

        {status === 'loading' && (
          <>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '-0.005em' }}>
              Validation de votre session{' '}
              <span className="brand-script" style={{ fontSize: '1.15em', color: 'var(--color-accent-deep)', letterSpacing: 'normal' }}>
                Atlas Studio
              </span>
            </p>

            <div className="flex justify-center mb-6">
              <Loader2 className="w-7 h-7 animate-spin" strokeWidth={1.5} style={{ color: 'var(--color-accent)' }} />
            </div>

            {slowMode && (
              <div
                className="anim-fade"
                style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 10,
                  background: 'var(--color-surface-hover)',
                  border: '1px dashed var(--color-border)',
                }}
              >
                <p className="text-xs mb-2" style={{ color: 'var(--color-text-tertiary)' }}>
                  Le serveur SSO prend plus de temps que prévu.
                </p>
                <button
                  onClick={() => navigate('/login', { replace: true })}
                  className="press inline-flex items-center gap-1.5 text-xs font-semibold transition-colors"
                  style={{ color: 'var(--color-accent-deep)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-accent-deep)'; }}
                >
                  Se connecter manuellement
                  <ArrowRight className="w-3 h-3" strokeWidth={1.75} />
                </button>
              </div>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <div
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3"
              style={{ background: 'rgba(192,50,43,0.08)', border: '1px solid rgba(192,50,43,0.20)', color: '#C0322B' }}
            >
              <AlertCircle className="w-3.5 h-3.5" strokeWidth={1.6} />
              <span className="text-xs font-semibold">Erreur de validation</span>
            </div>
            <p className="text-sm mb-6" style={{ color: 'var(--color-text-tertiary)', letterSpacing: '-0.005em', lineHeight: 1.55 }}>
              {errorMessage}
            </p>

            <div className="space-y-2">
              <button
                onClick={() => navigate('/login', { replace: true })}
                className="press w-full inline-flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold"
                style={{
                  background: 'var(--color-primary)',
                  color: 'var(--color-text-inverse)',
                  boxShadow: 'var(--shadow-obsidian)',
                  letterSpacing: '-0.005em',
                }}
              >
                Se connecter manuellement
                <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.75} />
              </button>
              <a
                href="https://atlas-studio.org/portal"
                className="press block w-full text-center py-2.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  color: 'var(--color-text-secondary)',
                  letterSpacing: '-0.005em',
                }}
              >
                Retour à{' '}
                <span className="brand-script" style={{ fontSize: '1.1em', color: 'var(--color-accent-deep)', letterSpacing: 'normal' }}>
                  Atlas Studio
                </span>
              </a>
            </div>
          </>
        )}

        <div className="mt-6 pt-4" style={{ borderTop: '1px solid var(--color-border-light)' }}>
          <p className="eyebrow" style={{ fontSize: 10, color: 'var(--color-text-quaternary)' }}>
            <span className="gold-dot" style={{ width: 4, height: 4, marginRight: 6 }} />
            Chiffrement AES-256 · Conformité OHADA
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExternalAuthPage;
