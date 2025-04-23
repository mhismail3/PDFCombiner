import React, { useMemo } from 'react';
import { PDFFile } from '../store/slices/pdfSlice';
import { formatFileSize } from '../utils/pdfUtils';
import { Button } from './ui';
import FileItem from './FileItem';

interface PDFFileListProps {
  files: PDFFile[];
  onRemove: (id: string) => void;
  onRetry?: (id: string) => void;
  onClearAll: () => void;
  onCombine: () => void;
  onClearErrors?: () => void;
}

const PDFFileList: React.FC<PDFFileListProps> = ({
  files,
  onRemove,
  onRetry,
  onClearAll,
  onCombine,
  onClearErrors
}) => {
  // Group files by their status for better organization and user feedback
  const { validFiles, errorFiles, loadingFiles } = useMemo(() => {
    return {
      validFiles: files.filter(file => file.status === 'ready'),
      errorFiles: files.filter(file => file.status === 'error'),
      loadingFiles: files.filter(file => file.status === 'loading')
    };
  }, [files]);

  // No files to display
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Summary information for quick feedback */}
      <div className="flex flex-wrap gap-2 mb-2 text-sm">
        <span className="text-gray-700 dark:text-gray-300">
          {validFiles.length} valid file{validFiles.length !== 1 ? 's' : ''}
        </span>
        
        {loadingFiles.length > 0 && (
          <span className="text-blue-600 dark:text-blue-400">
            {loadingFiles.length} processing
          </span>
        )}
        
        {errorFiles.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-red-600 dark:text-red-400">
              {errorFiles.length} error{errorFiles.length !== 1 ? 's' : ''}
            </span>
            
            {onClearErrors && (
              <Button
                variant="text"
                size="small"
                onClick={onClearErrors}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
              >
                Clear errors
              </Button>
            )}
          </div>
        )}
      </div>
      
      {/* Error section - highlight problem files for resolution */}
      {errorFiles.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">
            Files with Errors
          </h3>
          <div className="space-y-2">
            {errorFiles.map(file => (
              <FileItem
                key={file.id}
                file={file}
                onRemove={onRemove}
                onRetry={onRetry}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Processing files section */}
      {loadingFiles.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-2">
            Processing Files
          </h3>
          <div className="space-y-2">
            {loadingFiles.map(file => (
              <FileItem
                key={file.id}
                file={file}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Valid files section */}
      {validFiles.length > 0 && (
        <div className="mb-4">
          {errorFiles.length > 0 && (
            <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">
              Valid Files
            </h3>
          )}
          <div className="space-y-2">
            {validFiles.map(file => (
              <FileItem
                key={file.id}
                file={file}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Action buttons */}
      <div className="flex justify-between mt-4">
        <div>
          {errorFiles.length > 0 && (
            <Button 
              variant="secondary" 
              size="small"
              onClick={() => onClearErrors?.()}
              disabled={errorFiles.length === 0}
            >
              Clear Errors
            </Button>
          )}
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="danger" 
            size="small"
            onClick={onClearAll}
          >
            Clear All
          </Button>
          
          <Button
            variant="success"
            size="small"
            onClick={onCombine}
            disabled={validFiles.length < 2 || loadingFiles.length > 0}
          >
            Combine {validFiles.length} File{validFiles.length !== 1 ? 's' : ''}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PDFFileList;
