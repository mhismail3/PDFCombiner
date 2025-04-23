import React from 'react';

export type ProgressBarSize = 'sm' | 'md' | 'lg';
export type ProgressBarColor = 'primary' | 'secondary' | 'success' | 'danger' | 'warning';

interface ProgressBarProps {
  value: number;
  max?: number;
  size?: ProgressBarSize;
  color?: ProgressBarColor;
  showValue?: boolean;
  valueFormat?: 'percentage' | 'value' | 'fraction';
  label?: string;
  showLabel?: boolean;
  className?: string;
  animated?: boolean;
  striped?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  color = 'primary',
  showValue = false,
  valueFormat = 'percentage',
  label,
  showLabel = false,
  className = '',
  animated = true,
  striped = false,
}) => {
  // Ensure value is between 0 and max
  const clampedValue = Math.max(0, Math.min(value, max));
  
  // Calculate percentage
  const percentage = (clampedValue / max) * 100;
  
  // Size classes
  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2.5',
    lg: 'h-4',
  };
  
  // Color classes
  const colorClasses = {
    primary: 'bg-blue-600',
    secondary: 'bg-gray-600',
    success: 'bg-green-600',
    danger: 'bg-red-600',
    warning: 'bg-yellow-600',
  };
  
  // Format value based on desired format
  const getFormattedValue = () => {
    switch (valueFormat) {
      case 'percentage':
        return `${Math.round(percentage)}%`;
      case 'value':
        return `${clampedValue}`;
      case 'fraction':
        return `${clampedValue}/${max}`;
      default:
        return `${Math.round(percentage)}%`;
    }
  };
  
  // Background for track
  const trackBg = 'bg-gray-200 dark:bg-gray-700';
  
  // Classes for striped effect
  const stripedClass = striped ? 'bg-stripes' : '';
  
  // Classes for animation
  const animatedClass = animated ? 'transition-all duration-300 ease-out' : '';
  
  return (
    <div className={`${className} w-full`}>
      {(showLabel || label) && (
        <div className="flex justify-between mb-1">
          {showLabel && label && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {label}
            </span>
          )}
          {showValue && (
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {getFormattedValue()}
            </span>
          )}
        </div>
      )}
      
      <div 
        className={`w-full ${sizeClasses[size]} ${trackBg} rounded-full overflow-hidden`}
        role="progressbar" 
        aria-valuenow={clampedValue} 
        aria-valuemin={0} 
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div 
          className={`${sizeClasses[size]} ${colorClasses[color]} ${stripedClass} ${animatedClass} rounded-full`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    </div>
  );
};

export default ProgressBar; 