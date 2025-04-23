import React, { InputHTMLAttributes, forwardRef, useState } from 'react';

// Define input variants
export type InputVariant = 'default' | 'outline' | 'filled';

// Define input sizes
export type InputSize = 'small' | 'medium' | 'large';

// Define validation state
export type ValidationState = 'success' | 'error' | 'warning' | undefined;

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  fullWidth?: boolean;
  label?: string;
  helperText?: string;
  validationState?: ValidationState;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  showLabel?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    variant = 'default',
    size = 'medium',
    fullWidth = false,
    type = 'text',
    label,
    helperText,
    validationState,
    leftIcon,
    rightIcon,
    showLabel = true,
    className = '',
    disabled,
    required,
    id,
    name,
    onFocus,
    onBlur,
    ...rest
  } = props;

  const [isFocused, setIsFocused] = useState(false);

  // Generate a unique ID for the input if not provided
  const inputId = id || `input-${name || Math.random().toString(36).substring(2, 9)}`;

  // Handle focus and blur events
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    onBlur?.(e);
  };

  // Base classes for all inputs
  const baseClasses =
    'block rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white';

  // Classes for input variants
  const variantClasses = {
    default: 'border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700',
    outline: 'border-2 border-gray-300 bg-transparent dark:border-gray-600',
    filled: 'border border-transparent bg-gray-100 dark:bg-gray-800'
  };

  // Classes for input sizes
  const sizeClasses = {
    small: 'text-xs py-1 px-2',
    medium: 'text-sm py-2 px-3',
    large: 'text-base py-3 px-4'
  };

  // Classes for full width
  const widthClasses = fullWidth ? 'w-full' : 'w-auto';

  // Classes for validation state
  const validationClasses = {
    success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
    warning: 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500',
    undefined: ''
  };

  // Classes for disabled state
  const disabledClasses = disabled ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : '';

  // Calculate helper text color based on validation state
  const helperTextColorClasses = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
    undefined: 'text-gray-500 dark:text-gray-400'
  };

  // Icon wrapper padding classes
  const leftIconPadding = leftIcon ? 'pl-10' : '';
  const rightIconPadding = rightIcon ? 'pr-10' : '';

  return (
    <div className={`mb-4 ${fullWidth ? 'w-full' : ''}`}>
      {label && showLabel && (
        <label 
          htmlFor={inputId} 
          className={`block mb-1 text-sm font-medium ${
            validationState ? helperTextColorClasses[validationState] : 'text-gray-700 dark:text-gray-300'
          }`}
        >
          {label}
          {required && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {leftIcon}
          </div>
        )}
        
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={validationState === 'error'}
          aria-describedby={helperText ? `${inputId}-helper-text` : undefined}
          className={`
            ${baseClasses}
            ${variantClasses[variant]}
            ${sizeClasses[size]}
            ${widthClasses}
            ${validationState ? validationClasses[validationState] : ''}
            ${disabledClasses}
            ${leftIconPadding}
            ${rightIconPadding}
            ${className}
          `}
          onFocus={handleFocus}
          onBlur={handleBlur}
          name={name}
          {...rest}
        />
        
        {rightIcon && (
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            {rightIcon}
          </div>
        )}
      </div>
      
      {helperText && (
        <p 
          id={`${inputId}-helper-text`}
          className={`mt-1 text-xs ${helperTextColorClasses[validationState ?? 'undefined']}`}
        >
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input; 