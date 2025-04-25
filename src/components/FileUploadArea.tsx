import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { FileValidator } from '../utils/fileValidator';
import { formatFileSize } from '../utils/pdfUtils';
import { Button } from './ui';
import { useValidationNotifications } from '../services/notificationService';

interface FileUploadAreaProps {
  onFilesSelected: (files: FileList) => void;
  acceptedFileTypes?: string;
  multiple?: boolean;
  isUploading?: boolean;
  disabled?: boolean;
  className?: string;
  maxFileSize?: number; // in bytes, default to 500MB
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  onFilesSelected,
  acceptedFileTypes = 'application/pdf',
  multiple = true,
  isUploading = false,
  disabled = false,
  className = '',
  maxFileSize = FileValidator.MAX_FILE_SIZE, // Use the constant from FileValidator
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDragInvalid, setIsDragInvalid] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);
  const notifications = useValidationNotifications();

  // Handle click on the browse files button
  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Validate files before passing to the parent component
  const validateAndHandleFiles = useCallback(
    async (files: FileList) => {
      if (!files.length) return;

      // Debug info - log the file list we received
      console.log(`Validating ${files.length} files:`, 
        Array.from(files).map(f => f.name).join(', '));

      // Filter for PDF files and check size
      const validFiles: File[] = [];
      const invalidFiles: { file: File; validationResult: any }[] = [];

      // Convert FileList to Array for safer iteration
      const filesArray = Array.from({ length: files.length }).map((_, i) => {
        // Ensure we can access each file regardless of browser quirks
        return files[i] || files.item?.(i);
      }).filter(Boolean) as File[];
      
      console.log(`Processing ${filesArray.length} files after conversion to array`);

      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        
        if (!file) {
          console.warn(`Skipping null file at index ${i}`);
          continue;
        }

        // Perform full PDF validation
        const validationResult = await FileValidator.validatePdfFile(file, maxFileSize);
        
        if (!validationResult.isValid) {
          invalidFiles.push({
            file,
            validationResult
          });
          continue;
        }

        validFiles.push(file);
      }

      // Show error notification if there are invalid files
      if (invalidFiles.length > 0) {
        const totalFiles = filesArray.length;
        
        if (invalidFiles.length === totalFiles) {
          // All files are invalid
          if (totalFiles === 1) {
            // If only one file was uploaded, show specific error message
            const { validationResult } = invalidFiles[0];
            notifications.showValidationError(validationResult);
          } else {
            // Multiple files, all invalid
            // Group similar errors to provide more meaningful feedback
            const sizeErrors = invalidFiles.filter(f => 
              f.validationResult.errorCode === 'FILE_TOO_LARGE'
            ).length;
            
            const typeErrors = invalidFiles.filter(f => 
              f.validationResult.errorCode === 'INVALID_FILE_TYPE' || 
              f.validationResult.errorCode === 'INVALID_FILE_EXTENSION'
            ).length;
            
            let message = `All ${totalFiles} files are invalid.`;
            
            if (sizeErrors > 0) {
              message += ` ${sizeErrors} ${sizeErrors === 1 ? 'file exceeds' : 'files exceed'} the size limit of ${formatFileSize(maxFileSize)}.`;
            }
            
            if (typeErrors > 0) {
              message += ` ${typeErrors} ${typeErrors === 1 ? 'file is not' : 'files are not'} in PDF format.`;
            }
            
            notifications.showError(message, 'Invalid Files');
          }
          return;
        } else {
          // Some files are valid, some are invalid - show a partial success message
          notifications.showPartialUploadSuccess(validFiles.length, invalidFiles.length);
        }
      }

      // Final log of how many files passed validation
      console.log(`${validFiles.length} valid files after validation`);

      // If we have valid files, pass them to the callback
      if (validFiles.length > 0) {
        // Instead of using DataTransfer which has browser compatibility issues,
        // directly pass the valid files to the callback
        
        // Show success notification
        notifications.showFileUploadSuccess(validFiles.length);
        
        // Call the onFilesSelected callback with the valid files - using a compatibility approach
        if (validFiles.length === 1) {
          // For single file, just use a simple FileList-like object
          const singleFileList = {
            0: validFiles[0],
            length: 1,
            item(index: number) { 
              return index === 0 ? validFiles[0] : null; 
            }
          };
          // Cast to unknown first to satisfy TypeScript
          onFilesSelected(singleFileList as unknown as FileList);
        } else {
          try {
            // Try the modern approach with DataTransfer API
            const dataTransfer = new DataTransfer();
            validFiles.forEach(file => dataTransfer.items.add(file));
            onFilesSelected(dataTransfer.files);
          } catch (error) {
            // Fallback for browsers that don't support DataTransfer well
            // Create a FileList-like object with proper iterator support
            const fileListLike = {
              ...Object.fromEntries(validFiles.map((file, idx) => [idx, file])),
              length: validFiles.length,
              item(index: number) { 
                return index >= 0 && index < validFiles.length ? validFiles[index] : null; 
              },
              [Symbol.iterator]: function* () {
                for (let i = 0; i < validFiles.length; i++) {
                  yield validFiles[i];
                }
              }
            };
            // Cast to unknown first to satisfy TypeScript
            onFilesSelected(fileListLike as unknown as FileList);
          }
        }
      }
    },
    [onFilesSelected, maxFileSize, notifications]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled && event.target.files && event.target.files.length > 0) {
        // Log what we're seeing from the browser
        console.log(`FileInput: Selected ${event.target.files.length} files`);
        
        // Make sure we properly handle the files
        const files = event.target.files;
        
        // Create a proper copy in case browser reuses the FileList
        try {
          // Create a copy of the FileList to prevent issues with browser-based recycling
          const filesCopy = new DataTransfer();
          for (let i = 0; i < files.length; i++) {
            filesCopy.items.add(files[i]);
          }
          validateAndHandleFiles(filesCopy.files);
        } catch (error) {
          // Fallback for browsers without DataTransfer API
          console.log('Using fallback file handling');
          validateAndHandleFiles(files);
        }
        
        // Reset the input value so the same file can be uploaded again if needed
        event.target.value = '';
      }
    },
    [disabled, validateAndHandleFiles]
  );

  // Handle keyboard events for accessibility
  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        handleBrowseClick();
      }
    },
    [disabled, handleBrowseClick]
  );

  // Handle drag events
  const handleDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (disabled) return;
      
      // Check if the dragged items contain files
      const items = Array.from(e.dataTransfer.items);
      const containsFiles = items.some(item => item.kind === 'file');
      
      // Basic check for PDF files
      const containsPdfs = items.some(item => 
        item.kind === 'file' && 
        (item.type === 'application/pdf' || item.type.includes('pdf'))
      );
      
      if (containsFiles) {
        setIsDragActive(true);
        // If we detect non-PDF files, show invalid state
        if (containsFiles && !containsPdfs && items.length > 0) {
          setIsDragInvalid(true);
        }
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (disabled) return;
      
      // Always set drag active
      setIsDragActive(true);
      
      // Check if the dragged items contain valid file types
      const items = Array.from(e.dataTransfer.items);
      const containsFiles = items.some(item => item.kind === 'file');
      
      // Try to detect PDF files in the drag event
      const containsPdfs = items.some(item => 
        item.kind === 'file' && 
        (item.type === 'application/pdf' || item.type.includes('pdf'))
      );
      
      // Set invalid state if we have files but no PDFs detected
      if (containsFiles && !containsPdfs && items.length > 0) {
        setIsDragInvalid(true);
      } else {
        setIsDragInvalid(false);
      }
    },
    [disabled]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only consider it a leave if we're leaving the dropzone element
      if (e.currentTarget === dropzoneRef.current && !e.currentTarget.contains(e.relatedTarget as Node)) {
        setIsDragActive(false);
        setIsDragInvalid(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      setIsDragActive(false);
      setIsDragInvalid(false);
      
      if (disabled) return;
      
      if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) {
        return;
      }
      
      // Log the number of files being dropped for debugging
      console.log(`Dropping ${e.dataTransfer.files.length} files:`, 
        Array.from(e.dataTransfer.files).map(f => f.name).join(', '));
      
      // If multiple is false, only take the first file
      if (!multiple && e.dataTransfer.files.length > 1) {
        // Create a new FileList with just the first file
        try {
          const firstFile = e.dataTransfer.files[0];
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(firstFile);
          
          validateAndHandleFiles(dataTransfer.files);
        } catch (error) {
          // Fallback for browsers without DataTransfer support
          const singleFileList = {
            0: e.dataTransfer.files[0],
            length: 1,
            item(index: number) { 
              return index === 0 ? e.dataTransfer.files[0] : null; 
            },
            [Symbol.iterator]: function* () {
              yield e.dataTransfer.files[0];
            }
          };
          validateAndHandleFiles(singleFileList as unknown as FileList);
        }
        
        // Show a notification that only the first file was accepted
        notifications.showInfo(
          'Multiple files were dropped, but only the first file was accepted since multiple selection is disabled.',
          'Single File Mode'
        );
      } else {
        // Process all files (multiple is true)
        // Clone the FileList to avoid any issues with browser-specific handling
        try {
          const filesCopy = new DataTransfer();
          for (let i = 0; i < e.dataTransfer.files.length; i++) {
            filesCopy.items.add(e.dataTransfer.files[i]);
          }
          validateAndHandleFiles(filesCopy.files);
        } catch (error) {
          // Fallback if DataTransfer is not supported
          console.log('Using fallback for drag-drop handling');
          validateAndHandleFiles(e.dataTransfer.files);
        }
      }
    },
    [disabled, multiple, validateAndHandleFiles, notifications]
  );

  // Handle focus and blur for keyboard accessibility
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Get area class names based on component state
  const getAreaClassNames = () => {
    let classes = `
      relative flex flex-col items-center justify-center p-8 border-2 border-dashed 
      rounded-lg transition-all duration-200 ease-in-out
      ${className}
    `;

    if (isFocused) {
      classes += ' border-blue-500 bg-blue-50 dark:bg-blue-900/20';
    } else if (isDragActive) {
      if (isDragInvalid) {
        classes += ' border-red-500 bg-red-50 dark:bg-red-900/20';
      } else {
        classes += ' border-green-500 bg-green-50 dark:bg-green-900/20';
      }
    } else if (disabled) {
      classes += ' border-gray-300 bg-gray-100 cursor-not-allowed opacity-75 dark:border-gray-600 dark:bg-gray-800';
    } else {
      classes += ' border-gray-300 hover:border-blue-400 hover:bg-blue-50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/10';
    }

    return classes;
  };

  return (
    <div
      ref={dropzoneRef}
      className={getAreaClassNames()}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label={`Upload files${disabled ? ' (disabled)' : ''}`}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept={acceptedFileTypes}
        multiple={multiple}
        onChange={handleFileInputChange}
        disabled={disabled || isUploading}
      />

      {/* Dropzone content */}
      <div className="flex flex-col items-center space-y-4">
        {/* Icon based on state */}
        <div className="text-4xl">
          {isUploading ? (
            <svg
              className="animate-spin h-12 w-12 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : isDragActive ? (
            isDragInvalid ? (
              <svg
                className="h-12 w-12 text-red-500"
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
            ) : (
              <svg
                className="h-12 w-12 text-green-500"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H9V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L7 9.414V13H5.5z" />
                <path d="M9 13h2v5a1 1 0 11-2 0v-5z" />
              </svg>
            )
          ) : (
            <svg
              className="h-12 w-12 text-gray-400"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        {/* Text based on state */}
        <div className="text-center">
          {isUploading ? (
            <p className="text-sm text-gray-700 dark:text-gray-300">
              Uploading files, please wait...
            </p>
          ) : isDragActive ? (
            isDragInvalid ? (
              <p className="text-sm text-red-700 dark:text-red-300">
                Invalid file type! Only PDF files are accepted.
              </p>
            ) : (
              <p className="text-sm text-green-700 dark:text-green-300">
                Drop your files here
              </p>
            )
          ) : (
            <div className="space-y-1">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Drag & drop your PDF files here, or
              </p>
              <Button
                onClick={handleBrowseClick}
                disabled={disabled || isUploading}
                className="w-full"
              >
                Browse files
              </Button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                PDF files only, up to {formatFileSize(maxFileSize)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUploadArea;
