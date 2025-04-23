import { ValidationResult } from '../utils/fileValidator';
import { useNotifications } from '../components/ui/NotificationProvider';

/**
 * Service to handle displaying validation notifications
 * This provides a centralized place to manage all notification-related functionality
 */
export class NotificationService {
  /**
   * Show a notification for a file validation error
   * @param result The validation result containing error information
   * @returns The ID of the shown notification
   */
  static showValidationError(
    result: ValidationResult,
    notificationUtils: ReturnType<typeof useNotifications>
  ): string {
    if (!result.isValid && result.errorMessage) {
      const { errorCode, errorMessage, details } = result;
      
      // Determine title based on error code
      let title = 'Validation Error';
      if (errorCode?.includes('FILE_TYPE') || errorCode?.includes('FILE_EXTENSION')) {
        title = 'Invalid File Type';
      } else if (errorCode?.includes('FILE_TOO_LARGE')) {
        title = 'File Size Exceeded';
      } else if (errorCode?.includes('PASSWORD_PROTECTED')) {
        title = 'Password Protected File';
      } else if (errorCode?.includes('INVALID_PDF')) {
        title = 'Invalid PDF File';
      }

      // Show error notification with appropriate duration
      return notificationUtils.showError(errorMessage, title, 8000);
    }
    
    // This should not happen, but just in case
    return notificationUtils.showError(
      'Unknown validation error occurred.',
      'Validation Error',
      5000
    );
  }

  /**
   * Show a success notification
   * @param message The success message
   * @param title Optional title for the notification
   * @returns The ID of the shown notification
   */
  static showSuccess(
    message: string,
    title: string | undefined,
    notificationUtils: ReturnType<typeof useNotifications>
  ): string {
    return notificationUtils.showSuccess(message, title);
  }

  /**
   * Show a warning notification
   * @param message The warning message
   * @param title Optional title for the notification
   * @returns The ID of the shown notification 
   */
  static showWarning(
    message: string,
    title: string | undefined,
    notificationUtils: ReturnType<typeof useNotifications>
  ): string {
    return notificationUtils.showWarning(message, title);
  }

  /**
   * Show an info notification
   * @param message The info message
   * @param title Optional title for the notification
   * @returns The ID of the shown notification
   */
  static showInfo(
    message: string,
    title: string | undefined,
    notificationUtils: ReturnType<typeof useNotifications>
  ): string {
    return notificationUtils.showInfo(message, title);
  }

  /**
   * Show file upload success notification
   * @param fileCount Number of files successfully uploaded
   * @param notificationUtils Notification utilities from useNotifications hook
   * @returns The ID of the shown notification
   */
  static showFileUploadSuccess(
    fileCount: number,
    notificationUtils: ReturnType<typeof useNotifications>
  ): string {
    const message = fileCount === 1
      ? '1 file was successfully uploaded.'
      : `${fileCount} files were successfully uploaded.`;
    
    return notificationUtils.showSuccess(message, 'Upload Successful');
  }

  /**
   * Show partial file upload success notification with some errors
   * @param successCount Number of files successfully uploaded
   * @param errorCount Number of files that failed
   * @param notificationUtils Notification utilities from useNotifications hook
   * @returns The ID of the shown notification
   */
  static showPartialUploadSuccess(
    successCount: number,
    errorCount: number,
    notificationUtils: ReturnType<typeof useNotifications>
  ): string {
    const message = `${successCount} ${successCount === 1 ? 'file was' : 'files were'} uploaded successfully, but ${errorCount} ${errorCount === 1 ? 'file' : 'files'} failed validation.`;
    
    return notificationUtils.showWarning(message, 'Partial Upload Success');
  }
}

/**
 * Custom hook that provides notification functions for validation errors
 * This combines the useNotifications hook with the NotificationService
 */
export const useValidationNotifications = () => {
  const notificationUtils = useNotifications();
  
  return {
    showValidationError: (result: ValidationResult) => 
      NotificationService.showValidationError(result, notificationUtils),
    
    showFileUploadSuccess: (fileCount: number) => 
      NotificationService.showFileUploadSuccess(fileCount, notificationUtils),
    
    showPartialUploadSuccess: (successCount: number, errorCount: number) => 
      NotificationService.showPartialUploadSuccess(successCount, errorCount, notificationUtils),
    
    showSuccess: (message: string, title?: string) => 
      NotificationService.showSuccess(message, title, notificationUtils),
    
    showWarning: (message: string, title?: string) => 
      NotificationService.showWarning(message, title, notificationUtils),
    
    showInfo: (message: string, title?: string) => 
      NotificationService.showInfo(message, title, notificationUtils),
    
    showError: (message: string, title?: string) => 
      notificationUtils.showError(message, title),
    
    removeNotification: notificationUtils.removeNotification,
    clearAllNotifications: notificationUtils.clearAllNotifications
  };
}; 