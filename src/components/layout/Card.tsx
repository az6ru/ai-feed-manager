import React, { ReactNode } from 'react';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

const Card: React.FC<CardProps> = ({ title, children, className = '', footer }) => {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm ${className}`}>
      {title && (
        <div className="border-b border-gray-200 dark:border-gray-700 px-5 py-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">{title}</h3>
        </div>
      )}
      <div className="px-5 py-5">{children}</div>
      {footer && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-5 py-4">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card; 