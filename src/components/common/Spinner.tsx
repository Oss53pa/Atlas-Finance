import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = ''
}) => {
  const { t } = useLanguage();
  const sizeClass = {
    sm: 'spinner-border-sm',
    md: '',
    lg: 'spinner-border-lg'
  }[size];

  return (
    <div
      className={`spinner-border text-${color} ${sizeClass} ${className}`}
      role="status"
      aria-label="Chargement..."
    >
      <span className="visually-hidden">{t('common.loading')}</span>
    </div>
  );
};

export default Spinner;