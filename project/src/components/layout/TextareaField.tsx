import React, { TextareaHTMLAttributes } from 'react';

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string;
  fullWidth?: boolean;
  hint?: string;
}

const TextareaField = ({
  error,
  className = '',
  fullWidth = true,
  hint,
  disabled,
  rows = 4,
  ...props
}: TextareaFieldProps) => {
  const baseClasses = [
    'px-3 py-2 border rounded-md text-sm focus:outline-none',
    fullWidth ? 'w-full' : '',
    error
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
    disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div>
      <textarea
        className={baseClasses}
        disabled={disabled}
        rows={rows}
        {...props}
      />
      
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
      
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default TextareaField; 