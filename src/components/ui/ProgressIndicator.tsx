import React from 'react';
import ProgressBar from './ProgressBar';

export type ProcessingStatus = 'queued' | 'validating' | 'uploading' | 'processing' | 'complete' | 'error';

interface ProgressIndicatorProps {
  status: ProcessingStatus;
  progress: number;
  fileName?: string;
  fileSize?: string;
  errorMessage?: string;
  estimatedTimeRemaining?: string;
  className?: string;
  children?: React.ReactNode;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  status,
  progress,
  fileName,
  fileSize,
  errorMessage,
  estimatedTimeRemaining,
  className = '',
  children,
}) => {
  // Status configuration (color, label, icon classes)
  const statusConfig = {
    queued: {
      color: 'secondary' as const,
      label: 'Queued',
      icon: 'clock',
      animated: false,
    },
    validating: {
      color: 'primary' as const,
      label: 'Validating',
      icon: 'check-circle',
      animated: true,
    },
    uploading: {
      color: 'primary' as const,
      label: 'Uploading',
      icon: 'upload',
      animated: true,
    },
    processing: {
      color: 'primary' as const,
      label: 'Processing',
      icon: 'cog',
      animated: true,
    },
    complete: {
      color: 'success' as const,
      label: 'Complete',
      icon: 'check',
      animated: false,
    },
    error: {
      color: 'danger' as const,
      label: 'Error',
      icon: 'exclamation-circle',
      animated: false,
    },
  };

  const config = statusConfig[status];

  // Icon based on status
  const renderIcon = () => {
    switch (config.icon) {
      case 'clock':
        return (
          <svg className="w-5 h-5 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'check-circle':
        return (
          <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'upload':
        return (
          <svg className="w-5 h-5 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
      case 'cog':
        return (
          <svg className="w-5 h-5 text-blue-500 dark:text-blue-400 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'check':
        return (
          <svg className="w-5 h-5 text-green-500 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'exclamation-circle':
        return (
          <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  // Determine if progress should be shown
  const showProgress = status !== 'queued' && status !== 'complete' && status !== 'error';

  // Background color based on status
  const getBgColor = () => {
    switch (status) {
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'complete':
        return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      default:
        return 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700';
    }
  };

  return (
    <div className={`${className} rounded-lg p-4 border ${getBgColor()} transition-all duration-200`}>
      <div className="flex items-center gap-3 mb-2">
        {renderIcon()}
        <div className="flex-1">
          {fileName && (
            <h4 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {fileName}
            </h4>
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {config.label}
            </span>
            {fileSize && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {fileSize}
              </span>
            )}
            {estimatedTimeRemaining && status !== 'complete' && status !== 'error' && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {estimatedTimeRemaining} remaining
              </span>
            )}
          </div>
        </div>
      </div>

      {showProgress && (
        <ProgressBar
          value={progress}
          max={100}
          size="sm"
          color={config.color}
          showValue
          valueFormat="percentage"
          animated={config.animated}
        />
      )}

      {status === 'error' && errorMessage && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">
          {errorMessage}
        </p>
      )}

      {children}
    </div>
  );
};

export default ProgressIndicator; 