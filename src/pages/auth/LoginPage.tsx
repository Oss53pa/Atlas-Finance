import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calculator, Eye, EyeOff, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from '../../components/ui';

const LoginPage: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    mfaCode: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showMfaInput, setShowMfaInput] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { login, isLoggingIn } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
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

    // Attempt login, backend will tell us if MFA is needed
    login(formData)
      .then((result) => {
        if (result?.requiresMfa) {
          setShowMfaInput(true);
        }
      })
      .catch((error) => {
        if (error.response?.data?.requiresMfa) {
          setShowMfaInput(true);
        }
      });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-swirl p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-tuatara text-swirl rounded-xl">
                  <Calculator className="h-8 w-8" />
                </div>
                <div className="text-left">
                  <h1 className="text-2xl font-bold text-tuatara">WiseBook</h1>
                  <p className="text-sm text-rolling-stone">ERP Comptable V3.0</p>
                </div>
              </div>
            </div>
            <CardTitle className="text-tuatara text-xl">
              Connexion à votre compte
            </CardTitle>
            <p className="text-sm text-rolling-stone mt-2">
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
                  <label className="text-sm font-medium text-tuatara">
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
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 text-rolling-stone hover:text-tuatara"
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
                    <label className="text-sm font-medium text-tuatara flex items-center gap-2">
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
                    <p className="text-xs text-rolling-stone">
                      Saisissez le code à 6 chiffres de votre application d'authentification
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <Link 
                  to="/forgot-password" 
                  className="text-tuatara hover:text-rolling-stone hover:underline transition-colors"
                >
                  Mot de passe oublié ?
                </Link>
              </div>

              <Button 
                type="submit" 
                className="w-full bg-tuatara hover:bg-rolling-stone text-swirl font-medium py-3 text-base transition-colors focus:ring-2 focus:ring-tuatara focus:ring-offset-2" 
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
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-rolling-stone">Première fois ?</span>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm text-rolling-stone">
                  Contactez votre administrateur système pour obtenir vos identifiants d'accès à WiseBook.
                </p>
              </div>
            </div>

            {/* Demo accounts info */}
            <div className="mt-6 rounded-lg bg-gray-50 border border-gray-200 p-4">
              <h3 className="text-sm font-semibold text-tuatara mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Comptes de démonstration
              </h3>
              <div className="text-xs space-y-2 text-gray-600">
                <div className="bg-white p-2 rounded border">
                  <p><strong>Expert-Comptable:</strong> expert@wisebook-demo.com</p>
                  <p><strong>Mot de passe:</strong> Expert2024!</p>
                </div>
                <div className="bg-white p-2 rounded border">
                  <p><strong>Assistant:</strong> assistant@wisebook-demo.com</p>
                  <p><strong>Mot de passe:</strong> Assistant2024!</p>
                </div>
                <div className="bg-white p-2 rounded border">
                  <p><strong>Consultant:</strong> consultant@wisebook-demo.com</p>
                  <p><strong>Mot de passe:</strong> Consultant2024!</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-3 italic">
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