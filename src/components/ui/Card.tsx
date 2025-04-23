import React, { ReactNode } from 'react';

export interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  titleAction?: ReactNode;
  footer?: ReactNode;
  noPadding?: boolean;
  bordered?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  children,
  className = '',
  title,
  titleAction,
  footer,
  noPadding = false,
  bordered = true,
  shadow = 'md',
}) => {
  // Shadow classes
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow',
    lg: 'shadow-lg',
  };

  // Border classes
  const borderClasses = bordered ? 'border border-gray-200 dark:border-gray-700' : '';

  // Padding class
  const paddingClass = noPadding ? '' : 'p-4';

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg ${borderClasses} ${shadowClasses[shadow]} ${className}`}
    >
      {title && (
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
          {titleAction && <div className="flex items-center">{titleAction}</div>}
        </div>
      )}

      <div className={paddingClass}>{children}</div>

      {footer && (
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
