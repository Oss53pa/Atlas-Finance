import React from 'react';
import { cn } from '../../utils/cn';

type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon';

const buttonVariants = {
  variant: {
    default: "bg-[#6A8A82] text-white hover:bg-[#5A7A72] focus:ring-[#6A8A82]",
    destructive: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    outline: "border border-[#D5D0CD] bg-white text-[#353A3B] hover:bg-[#F5F3F1] focus:ring-[#6A8A82]",
    secondary: "bg-[#B87333] text-white hover:bg-[#A56329] focus:ring-[#B87333]",
    ghost: "text-[#353A3B] hover:bg-[#D5D0CD] hover:bg-opacity-30 focus:ring-[#6A8A82]",
    link: "text-[#6A8A82] underline-offset-4 hover:underline focus:ring-[#6A8A82]",
  },
  size: {
    default: "h-10 px-4 py-2",
    sm: "h-9 px-3 text-sm",
    lg: "h-11 px-8",
    icon: "h-10 w-10",
  },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', loading = false, children, disabled, type = 'button', ...props }, ref) => {
    const baseClasses = "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    const variantClasses = buttonVariants.variant[variant];
    const sizeClasses = buttonVariants.size[size];

    return (
      <button
        type={type}
        className={cn(baseClasses, variantClasses, sizeClasses, className)}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            {children}
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export { Button };