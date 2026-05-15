import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

function getRoleRedirectPath(_role: string): string {
  return '/home';
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user: authUser, isAuthenticated } = useAuth();
  const { selectedRole, targetPath } = (location.state as { selectedRole?: string; targetPath?: string } | null) || { targetPath: '/dashboard' };

  React.useEffect(() => {
    if (isAuthenticated && authUser) {
      navigate(getRoleRedirectPath(authUser.role), { replace: true });
    }
  }, [isAuthenticated, authUser, navigate]);

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const newErrors: Record<string, string> = {};
    if (!formData.email) newErrors.email = 'L\'email est requis';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Format d\'email invalide';
    if (!formData.password) newErrors.password = 'Le mot de passe est requis';
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setIsLoggingIn(true);
    try {
      await login(formData.email, formData.password);
      setTimeout(() => {
        const role = authUser?.role || selectedRole || 'user';
        navigate(getRoleRedirectPath(role), { replace: true });
      }, 400);
    } catch (error: unknown) {
      setErrors({ password: error instanceof Error ? error.message : 'Identifiants incorrects.' });
      setIsLoggingIn(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleAutoLogin = async (role: 'admin' | 'manager' | 'comptable') => {
    const credentials = {
      admin: { email: 'admin@atlasfna.cm', password: 'admin123' },
      manager: { email: 'manager@atlasfna.com', password: 'manager123' },
      comptable: { email: 'comptable@atlasfna.com', password: 'comptable123' },
    } as const;
    const creds = credentials[role];
    setFormData({ email: creds.email, password: creds.password });
    setErrors({});
    setIsLoggingIn(true);
    try {
      await login(creds.email, creds.password);
      setTimeout(() => navigate(getRoleRedirectPath(role), { replace: true }), 400);
    } catch (error: unknown) {
      setErrors({ password: error instanceof Error ? error.message : 'Identifiants incorrects.' });
      setIsLoggingIn(false);
    }
  };

  const TRUST_SIGNALS = [
    { icon: ShieldCheck, label: 'Chiffrement AES-256 · Conformité OHADA' },
    { icon: Sparkles,    label: 'IA Proph3t · Audit Benford & analyse prédictive' },
    { icon: Lock,        label: 'Piste d\'audit SHA-256 inaltérable' },
  ];

  return (
    <div className="page-shell" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', minHeight: '100vh' }}>
      {/* ═════════════════ Left — Brand panel (obsidian + champagne) ═════════════════ */}
      <aside
        className="surface-obsidian-rich anim-fade"
        style={{
          position: 'relative',
          padding: '3rem clamp(2rem, 4vw, 4rem)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          overflow: 'hidden',
        }}
      >
        {/* Halo decorative top-right */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: '-10%', right: '-10%',
            width: 420, height: 420, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(201,169,97,0.20) 0%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
        {/* Filet gold animé top */}
        <div
          aria-hidden
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent, rgba(201,169,97,0.50), transparent)',
          }}
        />

        {/* Brand mark + nav back */}
        <header className="anim-rise" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="flex items-center gap-3">
            <div
              className="brand-script"
              style={{
                fontSize: '2rem',
                background: 'linear-gradient(135deg, #D4B574 0%, #C9A961 50%, #A88845 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                lineHeight: 1,
              }}
            >
              Atlas Studio
            </div>
          </div>
          <Link
            to="/"
            className="text-xs"
            style={{ color: 'rgba(247,244,237,0.50)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
          >
            ← Accueil
          </Link>
        </header>

        {/* Editorial pitch — center */}
        <div className="anim-rise" style={{ position: 'relative', zIndex: 1, animationDelay: '120ms' }}>
          <div
            className="eyebrow"
            style={{ color: 'rgba(201,169,97,0.80)', marginBottom: '1.25rem' }}
          >
            <span className="gold-dot" style={{ width: 5, height: 5, marginRight: 8 }} />
            Plateforme institutionnelle · OHADA · SYSCOHADA
          </div>

          <h1
            className="display-xl"
            style={{
              color: 'var(--color-text-inverse)',
              letterSpacing: '-0.04em',
              lineHeight: 1.05,
              marginBottom: '1rem',
              fontWeight: 700,
            }}
          >
            La comptabilité<br />
            <span className="serif-italic" style={{
              background: 'linear-gradient(135deg, #D4B574 0%, #C9A961 60%, #A88845 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              fontWeight: 400,
            }}>
              à hauteur d'expert.
            </span>
          </h1>

          <p
            style={{
              fontSize: '1.0625rem',
              lineHeight: 1.55,
              color: 'rgba(247,244,237,0.62)',
              maxWidth: 460,
              letterSpacing: '-0.005em',
            }}
          >
            Pilotage intégral du cycle Order-to-Cash, conformité OHADA et IA <span className="brand-script" style={{ color: '#C9A961', fontSize: '1.15em' }}>Proph3t</span> intégrée — pour les cabinets et directions financières exigeants.
          </p>
        </div>

        {/* Trust signals bottom */}
        <div className="anim-rise stagger-children" style={{ position: 'relative', zIndex: 1, animationDelay: '240ms' }}>
          <ul className="space-y-2.5" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {TRUST_SIGNALS.map((sig, i) => (
              <li key={i} className="flex items-center gap-3" style={{ color: 'rgba(247,244,237,0.55)', fontSize: '0.8125rem' }}>
                <span
                  className="inline-flex items-center justify-center"
                  style={{
                    width: 26, height: 26, borderRadius: 7,
                    background: 'rgba(201,169,97,0.08)',
                    border: '1px solid rgba(201,169,97,0.18)',
                  }}
                >
                  <sig.icon className="w-3.5 h-3.5" style={{ color: '#C9A961' }} strokeWidth={1.5} />
                </span>
                <span style={{ letterSpacing: '-0.005em' }}>{sig.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 pt-6" style={{ borderTop: '1px solid rgba(201,169,97,0.10)' }}>
            <p style={{ color: 'rgba(247,244,237,0.30)', fontSize: '0.6875rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              © {new Date().getFullYear()} Atlas Studio · 17 pays OHADA
            </p>
          </div>
        </div>
      </aside>

      {/* ═════════════════ Right — Form panel ═════════════════ */}
      <main
        className="anim-fade"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem clamp(2rem, 4vw, 5rem)',
          background: 'var(--color-background)',
          animationDelay: '80ms',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }} className="anim-rise" >
          {/* Header */}
          <header className="mb-10">
            <div className="eyebrow-gold mb-3">Connexion · Sécurisé</div>
            <h2 className="display-md mb-2" style={{ color: 'var(--color-text-primary)' }}>
              Bon retour
            </h2>
            <p className="text-sm" style={{ color: 'var(--color-text-tertiary)', lineHeight: 1.55 }}>
              Connectez-vous à votre espace <span className="brand-script" style={{ color: 'var(--color-accent-deep)', fontSize: '1.05em' }}>Atlas F&A</span> pour reprendre votre activité.
            </p>
            {selectedRole && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'var(--color-accent-light)', border: '1px solid rgba(201,169,97,0.25)' }}>
                <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--color-accent-deep)' }} strokeWidth={1.5} />
                <span className="text-xs font-medium capitalize" style={{ color: 'var(--color-accent-deep)' }}>
                  Rôle : {selectedRole}
                </span>
              </div>
            )}
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="login-email"
                className="block mb-1.5"
                style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '-0.005em' }}
              >
                Adresse email
              </label>
              <input
                id="login-email"
                type="email"
                name="email"
                placeholder="vous@entreprise.com"
                value={formData.email}
                onChange={handleChange}
                autoComplete="email"
                autoFocus
                required
                className="w-full"
                style={{
                  padding: '0.75rem 0.875rem',
                  fontSize: '0.9375rem',
                  background: 'var(--color-surface)',
                  border: `1px solid ${errors.email ? 'var(--color-error)' : 'var(--color-border)'}`,
                  borderRadius: 10,
                  color: 'var(--color-text-primary)',
                  transition: 'border-color var(--motion-fast), box-shadow var(--motion-fast)',
                  outline: 'none',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = 'var(--shadow-focus)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = errors.email ? 'var(--color-error)' : 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {errors.email && <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>{errors.email}</p>}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="login-pwd"
                  style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', letterSpacing: '-0.005em' }}
                >
                  Mot de passe
                </label>
                <Link to="/forgot-password" className="text-xs transition-colors" style={{ color: 'var(--color-text-tertiary)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-accent-deep)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}>
                  Oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="login-pwd"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="••••••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                  className="w-full"
                  style={{
                    padding: '0.75rem 2.5rem 0.75rem 0.875rem',
                    fontSize: '0.9375rem',
                    background: 'var(--color-surface)',
                    border: `1px solid ${errors.password ? 'var(--color-error)' : 'var(--color-border)'}`,
                    borderRadius: 10,
                    color: 'var(--color-text-primary)',
                    transition: 'border-color var(--motion-fast), box-shadow var(--motion-fast)',
                    outline: 'none',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.boxShadow = 'var(--shadow-focus)'; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = errors.password ? 'var(--color-error)' : 'var(--color-border)'; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Masquer' : 'Afficher'}
                  className="absolute right-2 top-1/2 transition-colors"
                  style={{ transform: 'translateY(-50%)', padding: 8, color: 'var(--color-text-tertiary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-text-tertiary)'; }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" strokeWidth={1.5} /> : <Eye className="w-4 h-4" strokeWidth={1.5} />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs" style={{ color: 'var(--color-error)' }}>{errors.password}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full press"
              style={{
                marginTop: '0.5rem',
                padding: '0.875rem 1rem',
                background: 'var(--color-primary)',
                color: 'var(--color-text-inverse)',
                borderRadius: 10,
                fontSize: '0.9375rem',
                fontWeight: 600,
                letterSpacing: '-0.005em',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: 'var(--shadow-obsidian)',
                cursor: isLoggingIn ? 'wait' : 'pointer',
                opacity: isLoggingIn ? 0.7 : 1,
                transition: 'background var(--motion-fast), transform var(--motion-fast), box-shadow var(--motion-fast)',
              }}
              onMouseEnter={(e) => { if (!isLoggingIn) e.currentTarget.style.background = 'var(--color-primary-hover)'; }}
              onMouseLeave={(e) => { if (!isLoggingIn) e.currentTarget.style.background = 'var(--color-primary)'; }}
            >
              <span>{isLoggingIn ? 'Connexion en cours…' : 'Se connecter'}</span>
              {!isLoggingIn && <ArrowRight className="w-4 h-4" strokeWidth={1.75} />}
            </button>
          </form>

          {/* Divider */}
          <div className="my-7 flex items-center gap-3">
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
            <span className="eyebrow" style={{ color: 'var(--color-text-quaternary)', letterSpacing: '0.14em' }}>Première fois</span>
            <div className="flex-1 h-px" style={{ background: 'var(--color-border)' }} />
          </div>

          {/* Secondary action */}
          <button
            type="button"
            onClick={() => navigate('/register')}
            className="w-full lift"
            style={{
              padding: '0.75rem 1rem',
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              letterSpacing: '-0.005em',
            }}
          >
            Créer un compte Atlas Studio
            <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} style={{ color: 'var(--color-text-tertiary)' }} />
          </button>

          {/* Dev quick access */}
          {import.meta.env.DEV && (
            <div className="mt-6 pt-6" style={{ borderTop: '1px dashed var(--color-border)' }}>
              <p className="eyebrow mb-3" style={{ color: 'var(--color-text-quaternary)' }}>Accès rapide · Dev</p>
              <div className="grid grid-cols-3 gap-2">
                {(['admin', 'manager', 'comptable'] as const).map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleAutoLogin(role)}
                    disabled={isLoggingIn}
                    className="press"
                    style={{
                      padding: '0.5rem 0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 500,
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border-light)',
                      borderRadius: 8,
                      color: 'var(--color-text-secondary)',
                      textTransform: 'capitalize',
                      letterSpacing: '-0.005em',
                      cursor: isLoggingIn ? 'wait' : 'pointer',
                      transition: 'all var(--motion-fast)',
                    }}
                    onMouseEnter={(e) => { if (!isLoggingIn) { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.color = 'var(--color-accent-deep)'; } }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border-light)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Responsive : sur mobile, panel obsidian devient haut + form en dessous */}
      <style>{`
        @media (max-width: 900px) {
          .page-shell { grid-template-columns: 1fr !important; }
          aside.surface-obsidian-rich { min-height: 40vh; }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
