import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Notification, { NotificationProps, NotificationType } from './Notification';

// Export ShowNotificationProps interface for reuse
export interface ShowNotificationProps {
  title?: string;
  message: string;
  type?: NotificationType;
  duration?: number;
}

// Notification action types
type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: NotificationProps }
  | { type: 'REMOVE_NOTIFICATION'; payload: { id: string } }
  | { type: 'CLEAR_ALL_NOTIFICATIONS' };

// State type
interface NotificationState {
  notifications: NotificationProps[];
}

// Initial state
const initialState: NotificationState = {
  notifications: [],
};

// Context type
interface NotificationContextType {
  notifications: NotificationProps[];
  addNotification: (notification: ShowNotificationProps) => string;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

// Create context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Reducer function
const notificationReducer = (
  state: NotificationState,
  action: NotificationAction
): NotificationState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(
          notification => notification.id !== action.payload.id
        ),
      };
    case 'CLEAR_ALL_NOTIFICATIONS':
      return {
        ...state,
        notifications: [],
      };
    default:
      return state;
  }
};

// Create the NotificationProvider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Function to add a notification
  const addNotification = useCallback((notification: ShowNotificationProps) => {
    const id = uuidv4();

    // Create a NotificationProps object from ShowNotificationProps
    const notificationProps: NotificationProps = {
      id,
      title: notification.title || '',
      message: notification.message,
      type: notification.type || 'info',
      duration: notification.duration,
      onDismiss: () => {}, // Will be replaced when rendering
    };

    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: notificationProps,
    });

    return id;
  }, []);

  // Function to remove a notification
  const removeNotification = useCallback((id: string) => {
    dispatch({
      type: 'REMOVE_NOTIFICATION',
      payload: { id },
    });
  }, []);

  // Function to clear all notifications
  const clearAllNotifications = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });
  }, []);

  // Create value object
  const value = {
    notifications: state.notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Notification container */}
      <div className="fixed top-0 right-0 p-4 z-50 space-y-4 max-h-screen overflow-hidden pointer-events-none flex flex-col items-end">
        {state.notifications.map(notification => (
          <Notification key={notification.id} {...notification} onDismiss={removeNotification} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// Custom hook to use the notification context
export const useNotification = () => {
  const context = useContext(NotificationContext);

  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }

  return context;
};

// Helper functions for common notification types
export const useNotifications = () => {
  const { addNotification, removeNotification, clearAllNotifications } = useNotification();

  const showNotification = (
    type: NotificationType,
    message: string,
    title?: string,
    duration?: number
  ) => {
    return addNotification({
      type,
      message,
      title,
      duration,
    });
  };

  return {
    showSuccess: (message: string, title?: string, duration?: number) =>
      showNotification('success', message, title, duration || 5000),
    showError: (message: string, title?: string, duration?: number) =>
      showNotification('error', message, title, duration || 8000),
    showWarning: (message: string, title?: string, duration?: number) =>
      showNotification('warning', message, title, duration || 6000),
    showInfo: (message: string, title?: string, duration?: number) =>
      showNotification('info', message, title, duration || 5000),
    removeNotification,
    clearAllNotifications,
  };
};

export default NotificationProvider;
