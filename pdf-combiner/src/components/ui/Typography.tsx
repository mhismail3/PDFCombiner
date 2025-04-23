import React, { ReactNode, HTMLAttributes } from 'react';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
type TextAlign = 'left' | 'center' | 'right';
type FontWeight = 'light' | 'normal' | 'medium' | 'semibold' | 'bold';
type TextVariant = 'default' | 'primary' | 'secondary' | 'success' | 'danger' | 'warning';

// Base Typography Props
interface TypographyBaseProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  align?: TextAlign;
  className?: string;
  variant?: TextVariant;
}

// Heading Component Props
interface HeadingProps extends TypographyBaseProps {
  level?: HeadingLevel;
  weight?: FontWeight;
}

// Text Component Props
interface TextProps extends TypographyBaseProps {
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  weight?: FontWeight;
  muted?: boolean;
}

// Caption Component Props
interface CaptionProps extends TypographyBaseProps {
  size?: 'xs' | 'sm';
  weight?: FontWeight;
  muted?: boolean;
}

// Helper functions for determining classes
const getTextAlignClass = (align: TextAlign): string => {
  switch (align) {
    case 'left':
      return 'text-left';
    case 'center':
      return 'text-center';
    case 'right':
      return 'text-right';
    default:
      return 'text-left';
  }
};

const getFontWeightClass = (weight: FontWeight): string => {
  switch (weight) {
    case 'light':
      return 'font-light';
    case 'normal':
      return 'font-normal';
    case 'medium':
      return 'font-medium';
    case 'semibold':
      return 'font-semibold';
    case 'bold':
      return 'font-bold';
    default:
      return 'font-normal';
  }
};

const getVariantClass = (variant: TextVariant): string => {
  switch (variant) {
    case 'primary':
      return 'text-blue-600 dark:text-blue-400';
    case 'secondary':
      return 'text-gray-600 dark:text-gray-400';
    case 'success':
      return 'text-green-600 dark:text-green-400';
    case 'danger':
      return 'text-red-600 dark:text-red-400';
    case 'warning':
      return 'text-yellow-600 dark:text-yellow-400';
    case 'default':
    default:
      return 'text-gray-900 dark:text-white';
  }
};

// Heading Component
export const Heading: React.FC<HeadingProps> = ({
  level = 'h2',
  align = 'left',
  variant = 'default',
  weight = 'semibold',
  className = '',
  children,
  ...rest
}) => {
  const alignClass = getTextAlignClass(align);
  const variantClass = getVariantClass(variant);
  const weightClass = getFontWeightClass(weight);
  
  const sizeClasses = {
    h1: 'text-3xl md:text-4xl',
    h2: 'text-2xl md:text-3xl',
    h3: 'text-xl md:text-2xl',
    h4: 'text-lg md:text-xl',
    h5: 'text-base md:text-lg',
    h6: 'text-sm md:text-base',
  };
  
  const baseClass = `${sizeClasses[level]} ${weightClass} ${alignClass} ${variantClass} mb-4`;
  
  const Component = level;
  
  return (
    <Component className={`${baseClass} ${className}`} {...rest}>
      {children}
    </Component>
  );
};

// Text Component
export const Text: React.FC<TextProps> = ({
  size = 'base',
  align = 'left',
  variant = 'default',
  weight = 'normal',
  muted = false,
  className = '',
  children,
  ...rest
}) => {
  const alignClass = getTextAlignClass(align);
  const variantClass = muted ? 'text-gray-500 dark:text-gray-400' : getVariantClass(variant);
  const weightClass = getFontWeightClass(weight);
  
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };
  
  const baseClass = `${sizeClasses[size]} ${weightClass} ${alignClass} ${variantClass} mb-2`;
  
  return (
    <p className={`${baseClass} ${className}`} {...rest}>
      {children}
    </p>
  );
};

// Caption Component
export const Caption: React.FC<CaptionProps> = ({
  size = 'xs',
  align = 'left',
  variant = 'secondary',
  weight = 'normal',
  muted = true,
  className = '',
  children,
  ...rest
}) => {
  const alignClass = getTextAlignClass(align);
  const variantClass = muted ? 'text-gray-500 dark:text-gray-400' : getVariantClass(variant);
  const weightClass = getFontWeightClass(weight);
  
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
  };
  
  const baseClass = `${sizeClasses[size]} ${weightClass} ${alignClass} ${variantClass} mb-1`;
  
  return (
    <span className={`${baseClass} ${className}`} {...rest}>
      {children}
    </span>
  );
};

// Define the type for the Typography component with its sub-components
interface TypographyComponent extends React.FC<TypographyProps> {
  Heading: React.FC<HeadingProps>;
  Text: React.FC<TextProps>;
  Caption: React.FC<CaptionProps>;
}

// Typography component that combines all three
interface TypographyProps {
  children: ReactNode;
}

// Create the Typography component as the combined component
const Typography: TypographyComponent = ({ children }) => {
  return <>{children}</>;
};

Typography.displayName = 'Typography';

// Add components as properties
Typography.Heading = Heading;
Typography.Text = Text;
Typography.Caption = Caption;

export default Typography; 