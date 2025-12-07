import React from 'react';
import { Icons } from './Icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  loading = false,
  className = '',
  disabled,
  ...props 
}) => {
  const baseStyle = "relative flex items-center justify-center px-4 py-3.5 rounded-xl font-bold tracking-wide transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none text-sm md:text-base";
  
  const variants = {
    primary: "bg-[#07C160] text-white hover:bg-[#06ad56] shadow-lg shadow-green-100 border border-transparent",
    secondary: "bg-white text-gray-900 hover:bg-gray-50 border border-gray-100 shadow-sm",
    outline: "border-2 border-[#07C160] text-[#07C160] bg-transparent hover:bg-green-50",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <Icons.Loader2 className="animate-spin h-5 w-5" />
        </span>
      ) : children}
      {loading && <span className="opacity-0">{children}</span>}
    </button>
  );
};