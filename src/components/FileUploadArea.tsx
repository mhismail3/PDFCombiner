import React, { useState, useRef, useCallback, KeyboardEvent } from 'react';
import { useAppDispatch } from '../store/hooks';
import { showNotification } from '../store/slices/uiSlice';
import { FileValidator } from '../utils/fileValidator';
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
  maxFileSize = 500 * 1024 * 1024, // 500MB default
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
      const invalidFiles: { file: File; reason: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size
        if (file.size > maxFileSize) {
          invalidFiles.push({
            file,
            reason: `File "${file.name}" exceeds the maximum size limit of ${maxFileSize / (1024 * 1024)}MB.`
          });
          continue;
        }

        // Validate file type and integrity
        const validationResult = await FileValidator.validatePdfFile(file);
        if (!validationResult.isValid) {
          invalidFiles.push({
            file,
            reason: validationResult.errorMessage || 'Invalid file'
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
          dispatch(
            showNotification({
              message: totalFiles === 1 
                ? invalidFiles[0].reason 
                : `All ${totalFiles} files are invalid. Please upload only valid PDF files.`,
              type: 'error',
            })
          );
          return;
        } else {
          // Some files are invalid
          dispatch(
            showNotification({
              message: `${invalidFiles.length} of ${totalFiles} files are invalid and will be skipped.`,
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
          disabled={disabled || isUploading}
          aria-hidden="true"
        />
        
        <svg
          className="w-10 h-10 mb-3 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          ></path>
        </svg>
        
        <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
          <span className="font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {multiple ? 'PDF files only (max 500MB per file)' : 'PDF file only (max 500MB)'}
        </p>
        
        <Button
          variant="primary"
          size="small"
          className="mt-4"
          onClick={handleBrowseClick}
          disabled={disabled || isUploading}
          isLoading={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Browse Files'}
        </Button>
      </div>
    </div>
  );
};

export default FileUploadArea;
