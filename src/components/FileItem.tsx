import React from 'react';
import { PDFFile } from '../store/slices/pdfSlice';
import { formatFileSize } from '../utils/pdfUtils';
import { Button } from './ui';

interface FileItemProps {
  file: PDFFile;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({ file, onRemove, onRetry }) => {
  // Determine status indicator colors and icons
  const getStatusIndicator = () => {
    if (file.status === 'loading') {
      return {
        className: 'animate-pulse bg-blue-500',
        text: 'Processing...',
        textClass: 'text-blue-700 dark:text-blue-300'
      };
    } else if (file.status === 'error') {
      return {
        className: 'bg-red-500',
        text: file.error || 'Error',
        textClass: 'text-red-700 dark:text-red-300'
      };
    } else {
      return {
        className: 'bg-green-500',
        text: 'Ready',
        textClass: 'text-green-700 dark:text-green-300'
      };
    }
  };

  const indicator = getStatusIndicator();

  return (
    <div className={`
      flex items-center justify-between p-4 rounded-lg 
      border border-gray-200 dark:border-gray-700
      ${file.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-white dark:bg-gray-800'}
      transition-all duration-200
    `}>
      <div className="flex items-center flex-1 min-w-0">
        {/* Status indicator dot */}
        <div className={`h-3 w-3 rounded-full mr-3 ${indicator.className}`}></div>
        
        <div className="truncate">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
          <div className="flex flex-wrap items-center gap-x-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatFileSize(file.size)}
            </span>
            {file.pageCount > 0 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}
              </span>
            )}
            <span className={`text-xs ${indicator.textClass}`}>
              {indicator.text}
            </span>
          </div>
          
          {/* Error message with recovery instructions if applicable */}
          {file.status === 'error' && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
              {file.error}. Try uploading a different file or check if the PDF is valid.
            </p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-4">
        {/* Retry button - only show for error state */}
        {file.status === 'error' && onRetry && (
          <Button
            variant="secondary"
            size="small"
            onClick={() => onRetry(file.id)}
            aria-label={`Retry ${file.name}`}
          >
            Retry
          </Button>
        )}
        
        {/* Remove button */}
        <Button
          variant={file.status === 'error' ? 'danger' : 'text'}
          size="small"
          onClick={() => onRemove(file.id)}
          aria-label={`Remove ${file.name}`}
        >
          Remove
        </Button>
      </div>
    </div>
  );
};

export default FileItem; 