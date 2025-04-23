import React, { useRef, useState, useCallback, KeyboardEvent } from 'react';
import { Button, Text } from './ui';

interface FileUploadAreaProps {
  onFilesSelected: (files: FileList) => void;
  acceptedFileTypes?: string;
  multiple?: boolean;
  isUploading?: boolean;
  disabled?: boolean;
  className?: string;
}

const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  onFilesSelected,
  acceptedFileTypes = 'application/pdf',
  multiple = true,
  isUploading = false,
  disabled = false,
  className = '',
}) => {
  const [isDragActive, setIsDragActive] = useState(false);
  const [isDragInvalid, setIsDragInvalid] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Handle click on the browse files button
  const handleBrowseClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Handle file input change
  const handleFileInputChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!disabled && event.target.files && event.target.files.length > 0) {
        onFilesSelected(event.target.files);
        // Reset the input value so the same file can be uploaded again if needed
        event.target.value = '';
      }
    },
    [disabled, onFilesSelected]
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
      
      if (disabled || !isDragActive) return;
      
      // Check if any of the dragged items are not accepted file types
      if (acceptedFileTypes) {
        const hasInvalidFile = Array.from(e.dataTransfer.items).some(item => {
          return item.kind === 'file' && !acceptedFileTypes.includes(item.type);
        });
        
        setIsDragInvalid(hasInvalidFile);
      }
    },
    [disabled, isDragActive, acceptedFileTypes]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Only consider it a leave if we're leaving the dropzone element
      if (e.currentTarget === e.target) {
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
      
      const droppedFiles = e.dataTransfer.files;
      if (droppedFiles.length > 0) {
        onFilesSelected(droppedFiles);
      }
    },
    [disabled, onFilesSelected]
  );

  // Get the appropriate border color based on component state
  const getBorderColor = () => {
    if (isDragInvalid) return 'border-red-500 dark:border-red-400';
    if (isDragActive) return 'border-blue-500 dark:border-blue-400';
    if (isFocused) return 'border-blue-400 dark:border-blue-300';
    if (disabled) return 'border-gray-200 dark:border-gray-800';
    return 'border-gray-300 dark:border-gray-700';
  };

  // Get the appropriate background color based on component state
  const getBackgroundColor = () => {
    if (isDragInvalid) return 'bg-red-50 dark:bg-red-900 dark:bg-opacity-20';
    if (disabled) return 'bg-gray-50 dark:bg-gray-900';
    return 'bg-gray-100 dark:bg-gray-800';
  };

  // Get the appropriate message based on component state
  const getMessage = () => {
    if (isDragInvalid) return 'Invalid file type. Please use PDF files only.';
    if (isDragActive) return 'Drop your files here';
    if (disabled) return 'File upload is currently disabled';
    if (isUploading) return 'Uploading files...';
    return 'Drag and drop PDF files here';
  };

  return (
    <div
      ref={dropzoneRef}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${getBorderColor()} ${getBackgroundColor()} ${
        disabled ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'
      } ${className}`}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleBrowseClick}
      onKeyDown={handleKeyDown}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      tabIndex={disabled ? -1 : 0}
      role="button"
      aria-label="Upload PDF files"
      aria-describedby="fileUploadDescription"
      aria-disabled={disabled}
    >
      <div className="flex flex-col items-center justify-center py-4">
        <svg
          className={`w-12 h-12 mb-3 ${
            isDragInvalid
              ? 'text-red-500 dark:text-red-400'
              : isDragActive
              ? 'text-blue-500 dark:text-blue-400'
              : 'text-gray-400 dark:text-gray-500'
          }`}
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
        
        <Text className="mb-2" id="fileUploadDescription">
          {getMessage()}
        </Text>
        
        {!disabled && !isUploading && (
          <>
            <p className="text-gray-500 dark:text-gray-400">or</p>
            <Button
              variant="primary"
              onClick={(e) => {
                e.stopPropagation();
                handleBrowseClick();
              }}
              className="mt-4"
              disabled={disabled || isUploading}
              size="small"
            >
              Browse Files
            </Button>
          </>
        )}
        
        {isUploading && (
          <div className="mt-4 w-full max-w-xs bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div className="bg-blue-500 h-2.5 rounded-full w-1/2"></div>
          </div>
        )}
      </div>
      
      <input
        type="file"
        id="fileInput"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple={multiple}
        accept={acceptedFileTypes}
        disabled={disabled || isUploading}
        className="hidden"
        aria-hidden="true"
      />
    </div>
  );
};

export default FileUploadArea;
