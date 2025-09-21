import React, { createContext, useContext, useState } from 'react';

interface TabsContextType {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextType | undefined>(undefined);

interface TabsProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({ value, onValueChange, children, className = '' }) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

export const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => {
  return (
    <div className={`flex space-x-2 border-b border-gray-200 ${className}`}>
      {children}
    </div>
  );
};

export const TabsTrigger: React.FC<{ value: string; children: React.ReactNode }> = ({ value, children }) => {
  const context = useContext(TabsContext);
  if (!context) {
    console.warn('TabsTrigger must be used within Tabs');
    return <button className="px-4 py-2 text-sm font-medium">{children}</button>;
  }
  
  const isActive = context.value === value;
  
  return (
    <button
      onClick={() => context.onValueChange && context.onValueChange(value)}
      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
        isActive 
          ? 'border-blue-500 text-blue-600' 
          : 'border-transparent text-gray-500 hover:text-gray-700'
      }`}
    >
      {children}
    </button>
  );
};

export const TabsContent: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className = '' }) => {
  const context = useContext(TabsContext);
  if (!context) {
    console.warn('TabsContent must be used within Tabs');
    return <div className={className}>{children}</div>;
  }
  
  if (context.value !== value) return null;
  
  return <div className={className}>{children}</div>;
};