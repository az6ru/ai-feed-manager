import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  footer?: ReactNode;
}

const Card = ({ 
  title, 
  children, 
  className = "", 
  headerClassName = "", 
  contentClassName = "",
  footer 
}: CardProps) => {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {title && (
        <div className={`px-5 py-3 border-b border-gray-200 bg-gray-50 ${headerClassName}`}>
          <h3 className="text-sm font-medium uppercase tracking-wider text-gray-700">{title}</h3>
        </div>
      )}
      
      <div className={`p-5 ${contentClassName}`}>
        {children}
      </div>
      
      {footer && (
        <div className="px-5 py-3 bg-gray-50 border-t border-gray-200">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card; 