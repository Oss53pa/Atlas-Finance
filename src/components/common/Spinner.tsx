import React from 'react';

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
      <span className="visually-hidden">Chargement...</span>
    </div>
  );
};

export default Spinner;