import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Dev mode: skip login, go straight to dashboard
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  return null;
};

export default LandingPage;
