import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

function getWorkspacePath(role: string): string {
  if (role === 'admin' || role === 'super_admin') return '/workspace/admin';
  if (role === 'manager') return '/workspace/manager';
  if (role === 'comptable') return '/workspace/comptable';
  return '/dashboard';
}

const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(getWorkspacePath(user.role || ''), { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  return null;
};

export default LandingPage;
