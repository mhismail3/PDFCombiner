import React, { FormHTMLAttributes, ReactNode } from 'react';

interface FormProps extends FormHTMLAttributes<HTMLFormElement> {
  children: ReactNode;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  className?: string;
}

const Form: React.FC<FormProps> = ({ children, onSubmit, className = '', ...rest }) => {
  // Prevent default form submission behavior and call the onSubmit handler
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onSubmit(e);
  };

  return (
    <form 
      onSubmit={handleSubmit} 
      className={`${className}`}
      noValidate 
      {...rest}
    >
      {children}
    </form>
  );
};

// Form Section component for grouping related form controls
interface FormSectionProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({ 
  children, 
  title, 
  description, 
  className = '' 
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      {title && (
        <h3 className="text-lg font-medium mb-2 text-gray-900 dark:text-white">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {description}
        </p>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

// Form Actions component for form submission buttons
interface FormActionsProps {
  children: ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right' | 'between' | 'around';
}

export const FormActions: React.FC<FormActionsProps> = ({ 
  children, 
  className = '',
  align = 'right'
}) => {
  const alignClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
    between: 'justify-between',
    around: 'justify-around'
  };
  
  return (
    <div className={`flex mt-6 ${alignClasses[align]} ${className}`}>
      {children}
    </div>
  );
};

export default Form; 