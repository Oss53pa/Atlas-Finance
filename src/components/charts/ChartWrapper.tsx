import React from 'react';

interface ChartWrapperProps {
  children: React.ReactNode;
  height?: number | string;
  className?: string;
}

const ChartWrapper: React.FC<ChartWrapperProps> = ({ 
  children, 
  height = 300,
  className = '' 
}) => {
  const heightStyle = typeof height === 'number' ? `${height}px` : height;
  
  return (
    <div 
      className={`chart-wrapper ${className}`}
      style={{ 
        position: 'relative',
        width: '100%',
        height: heightStyle,
        minHeight: heightStyle
      }}
    >
      {children}
    </div>
  );
};

export default ChartWrapper;