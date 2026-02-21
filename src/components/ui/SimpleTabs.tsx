import React, { useState } from 'react';
import { cn } from '../../lib/utils';

interface SimpleTabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const SimpleTabs: React.FC<SimpleTabsProps> = ({ 
  defaultValue = '', 
  value: controlledValue,
  onValueChange,
  children, 
  className = '' 
}) => {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : internalValue;
  
  const handleValueChange = (newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue);
    }
    onValueChange?.(newValue);
  };

  return (
    <div className={className} data-value={value} data-onchange={handleValueChange}>
      {children}
    </div>
  );
};

export const SimpleTabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className = '' 
}) => {
  return (
    <div className={cn('flex space-x-2 border-b border-[var(--color-border)]', className)}>
      {children}
    </div>
  );
};

export const SimpleTabsTrigger: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ 
  value, 
  children,
  className = ''
}) => {
  const handleClick = () => {
    const tabsElement = document.querySelector('[data-value]');
    if (tabsElement) {
      const currentValue = tabsElement.getAttribute('data-value');
      const onchange = (tabsElement as HTMLElement).dataset.onchange;
      if (typeof onchange === 'function') {
        onchange(value);
      }
      // Force re-render by dispatching custom event
      tabsElement.dispatchEvent(new CustomEvent('tabchange', { detail: value }));
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className={cn(
        'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
        'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
        className
      )}
      data-tab-trigger={value}
    >
      {children}
    </button>
  );
};

export const SimpleTabsContent: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ 
  value, 
  children, 
  className = '' 
}) => {
  const [visible, setVisible] = React.useState(false);
  
  React.useEffect(() => {
    const checkVisibility = () => {
      const tabsElement = document.querySelector('[data-value]');
      if (tabsElement) {
        const currentValue = tabsElement.getAttribute('data-value');
        setVisible(currentValue === value);
      }
    };
    
    checkVisibility();
    
    const tabsElement = document.querySelector('[data-value]');
    if (tabsElement) {
      tabsElement.addEventListener('tabchange', checkVisibility);
      return () => {
        tabsElement.removeEventListener('tabchange', checkVisibility);
      };
    }
  }, [value]);
  
  if (!visible) return null;
  
  return <div className={className}>{children}</div>;
};

// Export avec les mêmes noms pour compatibilité
export const Tabs = SimpleTabs;
export const TabsList = SimpleTabsList;
export const TabsTrigger = SimpleTabsTrigger;
export const TabsContent = SimpleTabsContent;