import React, { useState, useEffect, useRef, useCallback } from 'react';

// Check if in browser environment
const isBrowser = typeof window !== 'undefined';

// Export this type so it can be used by NotificationProvider
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// Export the props interface so it can be used by NotificationProvider
export interface NotificationProps {
  id: string;
  type: NotificationType;
  title?: string;
  message: string;
  duration?: number; // Time in ms before auto-dismiss, undefined for no auto-dismiss
  onDismiss: (id: string) => void;
  className?: string;
}

const Notification: React.FC<NotificationProps> = ({
  id,
  type = 'info',
  title,
  message,
  duration,
  onDismiss,
  className = '',
}) => {
  const [visible, setVisible] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<number | undefined>(undefined);
  const remainingTimeRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (isBrowser) {
      setTimeout(() => {
        onDismiss(id);
      }, 300); // Allow time for exit animation
    } else {
      onDismiss(id);
    }
  }, [id, onDismiss]);

  useEffect(() => {
    if (!isBrowser) return;
    
    if (duration && duration > 0) {
      startTimeRef.current = Date.now();
      remainingTimeRef.current = duration;

      const startTimer = () => {
        return window.setTimeout(() => {
          dismiss();
        }, remainingTimeRef.current);
      };

      timerRef.current = startTimer();
    }

    return () => {
      if (timerRef.current !== undefined) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, dismiss]);

  const pauseTimer = () => {
    if (!isBrowser) return;
    
    if (duration && timerRef.current !== undefined) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
      const startTime = startTimeRef.current || 0;
      remainingTimeRef.current = (remainingTimeRef.current || 0) - (Date.now() - startTime);
      setIsPaused(true);
    }
  };

  const resumeTimer = () => {
    if (!isBrowser) return;
    
    if (duration && remainingTimeRef.current !== undefined) {
      startTimeRef.current = Date.now();
      timerRef.current = window.setTimeout(() => {
        dismiss();
      }, remainingTimeRef.current);
      setIsPaused(false);
    }
  };

  // Determine icon and colors based on type
  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return {
          containerClass: 'bg-green-50 dark:bg-green-900 border-green-400 dark:border-green-700 text-green-800 dark:text-green-100',
          iconClass: 'text-green-500 dark:text-green-400',
          progressClass: 'bg-green-500 dark:bg-green-400',
          icon: (
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      case 'error':
        return {
          containerClass: 'bg-red-50 dark:bg-red-900 border-red-400 dark:border-red-700 text-red-800 dark:text-red-100',
          iconClass: 'text-red-500 dark:text-red-400',
          progressClass: 'bg-red-500 dark:bg-red-400',
          icon: (
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      case 'warning':
        return {
          containerClass: 'bg-yellow-50 dark:bg-yellow-900 border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-100',
          iconClass: 'text-yellow-500 dark:text-yellow-400',
          progressClass: 'bg-yellow-500 dark:bg-yellow-400',
          icon: (
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
      case 'info':
      default:
        return {
          containerClass: 'bg-blue-50 dark:bg-blue-900 border-blue-400 dark:border-blue-700 text-blue-800 dark:text-blue-100',
          iconClass: 'text-blue-500 dark:text-blue-400',
          progressClass: 'bg-blue-500 dark:bg-blue-400',
          icon: (
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2h2a1 1 0 000-2H9z"
                clipRule="evenodd"
              />
            </svg>
          ),
        };
    }
  };

  const typeStyles = getTypeStyles();

  // Progress percentage for auto-dismiss notifications
  const getProgressPercentage = () => {
    if (!duration || isPaused || !remainingTimeRef.current || !startTimeRef.current) return 100;
    const elapsed = Date.now() - startTimeRef.current;
    const remaining = remainingTimeRef.current - elapsed;
    return Math.max(0, (remaining / duration) * 100);
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-in-out pointer-events-auto
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${typeStyles.containerClass}
        ${className}
        shadow-lg rounded-lg p-4 mb-4 max-w-md w-full border font-medium`}
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      role="alert"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">{typeStyles.icon}</div>
        <div className="ml-3 flex-1 min-w-0">
          {title && <h3 className="text-sm font-semibold">{title}</h3>}
          <div className="mt-1">
            <p className="text-sm break-words whitespace-normal">{message}</p>
          </div>

          {/* Progress bar for auto-dismiss notifications */}
          {duration && duration > 0 && (
            <div className="h-1 mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${typeStyles.progressClass} transition-all duration-100 ease-linear`}
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <button
            className="inline-flex text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            onClick={() => dismiss()}
          >
            <span className="sr-only">Close</span>
            <svg
              className="h-5 w-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Notification;
