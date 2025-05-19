import React, { SelectHTMLAttributes } from 'react';

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  error?: string;
  fullWidth?: boolean;
  hint?: string;
  options: Array<{
    value: string;
    label: string;
    disabled?: boolean;
  }>;
}

const SelectField = ({
  error,
  className = '',
  fullWidth = true,
  hint,
  options,
  disabled,
  ...props
}: SelectFieldProps) => {
  const baseClasses = [
    'px-3 py-2 border rounded-md text-sm focus:outline-none appearance-none bg-white',
    fullWidth ? 'w-full' : '',
    error
      ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
      : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
    disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="relative">
      <div className="relative">
        <select
          className={baseClasses}
          disabled={disabled}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value} disabled={option.disabled}>
              {option.label}
            </option>
          ))}
        </select>
        
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      </div>
      
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
      
      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default SelectField; 