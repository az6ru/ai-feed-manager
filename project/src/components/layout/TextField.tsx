import React, { InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  fullWidth?: boolean;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  hint?: string;
}

const TextField = ({
  error,
  className = '',
  fullWidth = true,
  rightIcon,
  leftIcon,
  hint,
  disabled,
  ...props
}: TextFieldProps) => {
  const baseClasses = [
    'px-3 py-2 border rounded-md text-sm focus:outline-none',
    fullWidth ? 'w-full' : '',
    error
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
    disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : '',
    leftIcon ? 'pl-9' : '',
    rightIcon ? 'pr-9' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="relative">
      {leftIcon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {leftIcon}
        </div>
      )}
      
      <input
        className={baseClasses}
        disabled={disabled}
        {...props}
      />
      
      {rightIcon && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
          {rightIcon}
        </div>
      )}
      
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
      
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default TextField; 