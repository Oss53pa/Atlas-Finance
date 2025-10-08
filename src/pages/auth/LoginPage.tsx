import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Calculator, Eye, EyeOff, Shield } from 'lucide-react';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../../components/ui';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { selectedRole, targetPath } = (location.state as any) || { targetPath: '/dashboard' };

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    mfaCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    const newErrors: Record<string, string> = {};
    if (!formData.email) {
      newErrors.email = 'L\'email est requis';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }
    if (!formData.password) {
      newErrors.password = 'Le mot de passe est requis';
    }
    if (showMfaInput && !formData.mfaCode) {
      newErrors.mfaCode = 'Le code MFA est requis';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // For demo purposes, simulate a successful login
    setIsLoggingIn(true);

    // Simulate API call
    setTimeout(() => {
      // Check credentials (simple demo validation)
      if (formData.email === 'admin@wisebook.com' && formData.password === 'admin123') {
        // Login successful, redirect to workspace
        navigate(targetPath || '/dashboard');
      } else {
        setErrors({ password: 'Email ou mot de passe incorrect' });
        setIsLoggingIn(false);
      }
    }, 500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleAutoFill = () => {
    setFormData({
      email: 'admin@wisebook.com',
      password: 'admin123',
      mfaCode: '',
    });
    setErrors({});
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)] p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-[var(--color-primary)] text-white rounded-xl">
                  <Calculator className="h-8 w-8" />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-bold text-[var(--color-text-primary)]">WiseBook</h1>
                  <p className="text-sm text-[var(--color-text-secondary)]">ERP Comptable V3.0</p>
                </div>
              </div>
            </div>
            <CardTitle className="text-[var(--color-text-primary)] text-xl">
              Connexion à votre compte
            </CardTitle>
            {selectedRole && (
              <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-text-primary)] text-sm font-medium">
                <Shield className="h-4 w-4" />
                Rôle sélectionné : <span className="capitalize font-semibold">{selectedRole}</span>
              </div>
            )}
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              SYSCOHADA - Système comptable pour l'Afrique
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <Input
                  type="email"
                  name="email"
                  label="Adresse email"
                  placeholder="votre.email@entreprise.com"
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                  autoComplete="email"
                  autoFocus
                  required
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />

                <div className="space-y-2">
                  <label className="text-sm font-medium text-[var(--color-text-primary)]">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      placeholder="Votre mot de passe sécurisé"
                      value={formData.password}
                      onChange={handleChange}
                      error={errors.password}
                      autoComplete="current-password"
                      required
                      aria-describedby={errors.password ? 'password-error' : undefined}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {showMfaInput && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Code d'authentification MFA
                    </label>
                    <Input
                      type="text"
                      name="mfaCode"
                      placeholder="123456"
                      value={formData.mfaCode}
                      onChange={handleChange}
                      error={errors.mfaCode}
                      maxLength={6}
                      autoComplete="one-time-code"
                      required
                      aria-describedby={errors.mfaCode ? 'mfa-error' : undefined}
                      className="text-center text-lg tracking-wider"
                    />
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      Saisissez le code à 6 chiffres de votre application d'authentification
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link 
                  to="/forgot-password" 
                  className="text-[var(--color-text-primary)] hover:text-[var(--color-text-secondary)] hover:underline transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium py-3 text-base transition-colors focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-2"
                loading={isLoggingIn}
                disabled={isLoggingIn}
                aria-describedby="login-status"
              >
                {isLoggingIn ? (
                  <>
                    <span className="sr-only">Connexion en cours</span>
                    Connexion en cours...
                  </>
                ) : (
                  'Se connecter'
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--color-border)]"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-[var(--color-text-secondary)]">Première fois ?</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-[var(--color-text-secondary)]">
                  Contactez votre administrateur système pour obtenir vos identifiants d'accès à WiseBook.
                </p>
              </div>
            </div>

            {/* Demo accounts info */}
            <div className="mt-6 rounded-lg bg-[var(--color-background-secondary)] border border-[var(--color-border)] p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Compte de démonstration
              </h3>
              <div className="text-xs space-y-2 text-[var(--color-text-primary)]">
                <div className="bg-white p-2 rounded border">
                  <p><strong>Administrateur:</strong> admin@wisebook.com</p>
                  <p><strong>Mot de passe:</strong> admin123</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">Accès complet au système</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full mt-3 text-[var(--color-text-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
                onClick={handleAutoFill}
              >
                Remplir automatiquement
              </Button>
              <p className="text-xs text-[var(--color-text-secondary)] mt-3 italic">
                ⚠️ Environnement de démonstration - Données fictives uniquement
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;