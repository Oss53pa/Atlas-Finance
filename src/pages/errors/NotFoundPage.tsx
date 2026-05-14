import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>404 — Page introuvable · Atlas F&A</title>
      </Helmet>

      <div
        className="min-h-screen flex items-center justify-center px-6"
        style={{ background: 'linear-gradient(180deg, #F7F4ED 0%, #FFFFFF 100%)' }}
      >
        <div className="max-w-md w-full text-center">
          <div className="mb-10">
            <div className="eyebrow-gold mb-6">Atlas Studio · Erreur</div>
            <div
              role="heading"
              aria-level={1}
              className="text-champagne-gloss font-bold"
              style={{
                fontSize: 'clamp(5rem, 14vw, 8rem)',
                lineHeight: 1,
                letterSpacing: '-0.04em',
                fontWeight: 700,
              }}
            >
              404
            </div>
            <hr className="divider-gold" style={{ maxWidth: 96, margin: '1.5rem auto' }} />
          </div>

          <h2
            className="font-semibold mb-3"
            style={{ fontSize: '1.5rem', letterSpacing: '-0.02em', color: 'var(--color-text-primary)' }}
          >
            Cette page est introuvable
          </h2>

          <p style={{ color: 'var(--color-text-tertiary)', maxWidth: 360, margin: '0 auto 2rem' }}>
            La page demandée a peut-être été déplacée ou n'existe plus.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="btn btn-outline"
              style={{ minWidth: 140 }}
            >
              ← Retour
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="btn btn-secondary"
              style={{ minWidth: 160 }}
            >
              Tableau de bord →
            </button>
          </div>

          <div className="mt-10 text-xs" style={{ color: 'var(--color-text-quaternary)' }}>
            <p>Code d'erreur · 404</p>
            <p className="mt-1">
              Besoin d'aide ?{' '}
              <a
                href="/support"
                style={{ color: 'var(--color-accent-deep)' }}
                className="hover:underline"
              >
                Contactez le support
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
