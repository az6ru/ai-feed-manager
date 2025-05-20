import React, { ReactNode } from 'react';

interface FieldProps {
  label: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  children: ReactNode;
  help?: string | ReactNode;
  className?: string;
}

const Field = ({ 
  label, 
  htmlFor, 
  required = false, 
  error, 
  children, 
  help,
  className = "" 
}: FieldProps) => {
  return (
    <div className={`mb-4 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-start">
        <label 
          htmlFor={htmlFor} 
          className="block text-sm font-medium text-gray-700 sm:w-1/4 sm:pt-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        <div className="mt-1 sm:mt-0 sm:w-3/4">
          {children}
          
          {error && (
            <p className="mt-1 text-xs text-red-600">{error}</p>
          )}
          
          {help && (
            <p className="mt-1 text-xs text-gray-500">{help}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Field; 