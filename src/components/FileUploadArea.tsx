import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { useAppDispatch } from '../store/hooks';
import { showNotification } from '../store/slices/uiSlice';
import { FileValidator } from '../utils/fileValidator';
import { formatFileSize } from '../utils/pdfUtils';
import { Button } from './ui';

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
  const dispatch = useAppDispatch();

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

      // Filter for PDF files and check size
      const validFiles: File[] = [];
      const invalidFiles: { file: File; reason: string; errorCode?: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Perform full PDF validation
        const validationResult = await FileValidator.validatePdfFile(file, maxFileSize);
        
        if (!validationResult.isValid) {
          invalidFiles.push({
            file,
            reason: validationResult.errorMessage || 'Invalid file',
            errorCode: validationResult.errorCode
          });
          continue;
        }

        validFiles.push(file);
      }

      // Show error notification if there are invalid files
      if (invalidFiles.length > 0) {
        const totalFiles = files.length;
        
        if (invalidFiles.length === totalFiles) {
          // All files are invalid
          if (totalFiles === 1) {
            // If only one file was uploaded, show specific error message
            const { reason, errorCode } = invalidFiles[0];
            
            // Determine the notification type based on error code
            const notificationType = errorCode === 'FILE_TOO_LARGE' ? 'warning' : 'error';
            
            dispatch(
              showNotification({
                message: reason,
                type: notificationType,
              })
            );
          } else {
            // Multiple files, all invalid
            // Categorize errors to provide better feedback
            const sizeErrors = invalidFiles.filter(f => f.errorCode === 'FILE_TOO_LARGE').length;
            const typeErrors = invalidFiles.filter(f => 
              f.errorCode === 'INVALID_FILE_TYPE' || f.errorCode === 'INVALID_FILE_EXTENSION'
            ).length;
            
            let message = `All ${totalFiles} files are invalid.`;
            
            if (sizeErrors > 0) {
              message += ` ${sizeErrors} ${sizeErrors === 1 ? 'file exceeds' : 'files exceed'} the size limit of ${formatFileSize(maxFileSize)}.`;
            }
            
            if (typeErrors > 0) {
              message += ` ${typeErrors} ${typeErrors === 1 ? 'file is not' : 'files are not'} in PDF format.`;
            }
            
            dispatch(
              showNotification({
                message,
                type: 'error',
              })
            );
          }
          return;
        } else {
          // Some files are invalid
          // Categorize errors to provide better feedback
          const sizeErrors = invalidFiles.filter(f => f.errorCode === 'FILE_TOO_LARGE').length;
          const typeErrors = invalidFiles.filter(f => 
            f.errorCode === 'INVALID_FILE_TYPE' || f.errorCode === 'INVALID_FILE_EXTENSION'
          ).length;
          
          let message = `${invalidFiles.length} of ${totalFiles} files are invalid and will be skipped.`;
          
          if (sizeErrors > 0) {
            message += ` ${sizeErrors} ${sizeErrors === 1 ? 'file exceeds' : 'files exceed'} the size limit.`;
          }
          
          if (typeErrors > 0) {
            message += ` ${typeErrors} ${typeErrors === 1 ? 'file is not' : 'files are not'} in PDF format.`;
          }
          
          dispatch(
            showNotification({
              message,
              type: 'warning',
            })
          );
        }
      }

      // If we have valid files, create a new FileList-like object
      if (validFiles.length > 0) {
        // Create a DataTransfer object to create a new FileList
        const dataTransfer = new DataTransfer();
        validFiles.forEach(file => dataTransfer.items.add(file));
        
        // Show success notification
        dispatch(
          showNotification({
            message: `${validFiles.length} ${validFiles.length === 1 ? 'file' : 'files'} ready for processing.`,
            type: 'success',
          })
        );
        
        // Call the onFilesSelected callback with the valid files
        onFilesSelected(dataTransfer.files);
      }
    },
    [onFilesSelected, maxFileSize, dispatch]
  );

  // Handle file input change
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled && event.target.files && event.target.files.length > 0) {
        validateAndHandleFiles(event.target.files);
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
      const containsFiles = Array.from(e.dataTransfer.items).some(
        item => item.kind === 'file'
      );
      
      if (containsFiles) {
        setIsDragActive(true);
      }
    },
    [disabled]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (disabled) return;
      
      // Check if the dragged items are valid
      const isValid = Array.from(e.dataTransfer.items).some(
        item => item.kind === 'file' && 
               (item.type === acceptedFileTypes || 
                acceptedFileTypes.includes(item.type.split('/')[1]))
      );
      
      setIsDragInvalid(!isValid && !multiple);
    },
    [disabled, acceptedFileTypes, multiple]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Check if we're leaving the drop zone
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
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        validateAndHandleFiles(e.dataTransfer.files);
      }
    },
    [disabled, validateAndHandleFiles]
  );

  // Generate classnames based on state
  const getAreaClassNames = () => {
    let classes = 
      'border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 ';
    
    if (isDragActive && !isDragInvalid) {
      classes += 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 ';
    } else if (isDragInvalid) {
      classes += 'border-red-400 bg-red-50 dark:bg-red-900/20 ';
    } else if (isFocused) {
      classes += 'border-blue-300 bg-blue-50/50 dark:bg-blue-900/10 ';
    } else {
      classes += 'border-gray-300 hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-600 dark:hover:border-blue-500 dark:hover:bg-blue-900/10 ';
    }
    
    if (disabled) {
      classes += 'opacity-60 cursor-not-allowed ';
    }
    
    return classes + className;
  };

  return (
    <div className="w-full">
      <div
        ref={dropzoneRef}
        className={getAreaClassNames()}
        onClick={handleBrowseClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        tabIndex={disabled ? -1 : 0}
        role="button"
        aria-label="Upload files"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedFileTypes}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
        
        <div className="flex flex-col items-center justify-center">
          <svg
            className="w-12 h-12 text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          
          <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            PDF files only (max {formatFileSize(maxFileSize)})
          </p>
          
          {multiple && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              You can select multiple files
            </p>
          )}
          
          <Button
            variant="secondary"
            size="small"
            onClick={handleBrowseClick}
            disabled={disabled || isUploading}
            className="mt-4"
          >
            Browse Files
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FileUploadArea;
