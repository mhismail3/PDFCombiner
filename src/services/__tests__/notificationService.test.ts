import { NotificationService } from '../notificationService';
import { ValidationResult } from '../../utils/fileValidator';

describe('NotificationService', () => {
  // Mock the useNotifications hook return value with proper implementation
  const mockNotificationUtils = {
    // Mock functions with spies that return specific values when called
    showSuccess: jest.fn(),
    showError: jest.fn(),
    showWarning: jest.fn(),
    showInfo: jest.fn(),
    removeNotification: jest.fn(),
    clearAllNotifications: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock return values for each function
    mockNotificationUtils.showSuccess.mockReturnValue('success-id');
    mockNotificationUtils.showError.mockReturnValue('error-id');
    mockNotificationUtils.showWarning.mockReturnValue('warning-id');
    mockNotificationUtils.showInfo.mockReturnValue('info-id');
  });

  describe('showValidationError', () => {
    test('handles file type error correctly', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errorMessage: 'File type is not supported',
        errorCode: 'FILE_TYPE_INVALID',
      };

      const notificationId = NotificationService.showValidationError(validationResult, mockNotificationUtils);

      expect(notificationId).toBe('error-id');
      expect(mockNotificationUtils.showError).toHaveBeenCalledWith(
        'File type is not supported',
        'Invalid File Type',
        8000
      );
    });

    test('handles file size error correctly', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errorMessage: 'File is too large',
        errorCode: 'FILE_TOO_LARGE',
      };

      const notificationId = NotificationService.showValidationError(validationResult, mockNotificationUtils);

      expect(notificationId).toBe('error-id');
      expect(mockNotificationUtils.showError).toHaveBeenCalledWith(
        'File is too large',
        'File Size Exceeded',
        8000
      );
    });

    test('handles password protected file error correctly', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errorMessage: 'File is password protected',
        errorCode: 'PASSWORD_PROTECTED',
      };

      const notificationId = NotificationService.showValidationError(validationResult, mockNotificationUtils);

      expect(notificationId).toBe('error-id');
      expect(mockNotificationUtils.showError).toHaveBeenCalledWith(
        'File is password protected',
        'Password Protected File',
        8000
      );
    });

    test('handles generic validation error correctly', () => {
      const validationResult: ValidationResult = {
        isValid: false,
        errorMessage: 'Unknown validation error',
        errorCode: 'UNKNOWN_ERROR',
      };

      const notificationId = NotificationService.showValidationError(validationResult, mockNotificationUtils);

      expect(notificationId).toBe('error-id');
      expect(mockNotificationUtils.showError).toHaveBeenCalledWith(
        'Unknown validation error',
        'Validation Error',
        8000
      );
    });
  });

  describe('showFileUploadSuccess', () => {
    test('handles single file correctly', () => {
      const notificationId = NotificationService.showFileUploadSuccess(1, mockNotificationUtils);

      expect(notificationId).toBe('success-id');
      expect(mockNotificationUtils.showSuccess).toHaveBeenCalledWith(
        '1 file was successfully uploaded.',
        'Upload Successful'
      );
    });

    test('handles multiple files correctly', () => {
      const notificationId = NotificationService.showFileUploadSuccess(3, mockNotificationUtils);

      expect(notificationId).toBe('success-id');
      expect(mockNotificationUtils.showSuccess).toHaveBeenCalledWith(
        '3 files were successfully uploaded.',
        'Upload Successful'
      );
    });
  });

  describe('showPartialUploadSuccess', () => {
    test('handles mix of success and error files correctly', () => {
      const notificationId = NotificationService.showPartialUploadSuccess(2, 1, mockNotificationUtils);

      expect(notificationId).toBe('warning-id');
      expect(mockNotificationUtils.showWarning).toHaveBeenCalledWith(
        '2 files were uploaded successfully, but 1 file failed validation.',
        'Partial Upload Success'
      );
    });
  });

  describe('utility notification methods', () => {
    test('showSuccess calls the underlying utility correctly', () => {
      const notificationId = NotificationService.showSuccess(
        'Test success message',
        'Test Title',
        mockNotificationUtils
      );

      expect(notificationId).toBe('success-id');
      expect(mockNotificationUtils.showSuccess).toHaveBeenCalledWith(
        'Test success message',
        'Test Title'
      );
    });

    test('showWarning calls the underlying utility correctly', () => {
      const notificationId = NotificationService.showWarning(
        'Test warning message',
        'Test Title',
        mockNotificationUtils
      );

      expect(notificationId).toBe('warning-id');
      expect(mockNotificationUtils.showWarning).toHaveBeenCalledWith(
        'Test warning message',
        'Test Title'
      );
    });

    test('showInfo calls the underlying utility correctly', () => {
      const notificationId = NotificationService.showInfo(
        'Test info message',
        'Test Title',
        mockNotificationUtils
      );

      expect(notificationId).toBe('info-id');
      expect(mockNotificationUtils.showInfo).toHaveBeenCalledWith(
        'Test info message',
        'Test Title'
      );
    });
  });
}); 