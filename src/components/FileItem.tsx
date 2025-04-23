import React from 'react';
import { PDFFile } from '../store/slices/pdfSlice';
import { formatFileSize } from '../utils/pdfUtils';
import { Button } from './ui';
import ProgressIndicator, { ProcessingStatus } from './ui/ProgressIndicator';

interface FileItemProps {
  file: PDFFile;
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
}

const FileItem: React.FC<FileItemProps> = ({ file, onRemove, onRetry }) => {
  // Map the file status to our ProcessingStatus type
  const getProcessingStatus = (): ProcessingStatus => {
    switch (file.status) {
      case 'loading':
        return 'processing';
      case 'error':
        return 'error';
      case 'ready':
        return 'complete';
      default:
        return 'processing';
    }
  };

  // If it's a simple ready file without detailed progress, use the simplified view
  if (file.status === 'ready' && !file.processingProgress) {
    return (
      <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-all duration-200">
        <div className="flex items-center flex-1 min-w-0">
          {/* Status indicator dot */}
          <div className="h-3 w-3 rounded-full mr-3 bg-green-500"></div>
          
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
              <span className="text-xs text-green-700 dark:text-green-300">
                Ready
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2 ml-4">
          {/* Remove button */}
          <Button
            variant="text"
            size="small"
            onClick={() => onRemove(file.id)}
            aria-label={`Remove ${file.name}`}
          >
            Remove
          </Button>
        </div>
      </div>
    );
  }

  // For loading, error, or processing states, use the full ProgressIndicator
  return (
    <ProgressIndicator
      status={getProcessingStatus()}
      progress={file.processingProgress || 0}
      fileName={file.name}
      fileSize={formatFileSize(file.size)}
      errorMessage={file.error}
      className="mb-2"
    >
      <div className="flex justify-end mt-2">
        {file.status === 'error' && onRetry && (
          <Button
            variant="secondary"
            size="small"
            onClick={() => onRetry(file.id)}
            aria-label={`Retry ${file.name}`}
            className="mr-2"
          >
            Retry
          </Button>
        )}
        
        <Button
          variant={file.status === 'error' ? 'danger' : 'text'}
          size="small"
          onClick={() => onRemove(file.id)}
          aria-label={`Remove ${file.name}`}
        >
          Remove
        </Button>
      </div>
    </ProgressIndicator>
  );
};

export default FileItem; 