import React from 'react';
import { cn } from '../../utils/cn';

export interface ToggleLeftProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  children?: React.ReactNode;
}

const ToggleLeft = React.forwardRef<HTMLButtonElement, ToggleLeftProps>(
  ({ checked = false, onCheckedChange, disabled = false, className, id, children, ...props }, ref) => {
    const handleToggle = () => {
      if (!disabled && onCheckedChange) {
        onCheckedChange(!checked);
      }
    };

    return (
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "inline-flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
          checked 
            ? "bg-indigo-100 text-indigo-700 border-indigo-300" 
            : "bg-gray-100 text-gray-700 border-gray-300",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        id={id}
        ref={ref}
        {...props}
      >
        <div
          className={cn(
            "w-4 h-4 rounded-full transition-colors",
            checked ? "bg-indigo-600" : "bg-gray-400"
          )}
        />
        {children}
      </button>
    );
  }
);

ToggleLeft.displayName = "ToggleLeft";

export { ToggleLeft };