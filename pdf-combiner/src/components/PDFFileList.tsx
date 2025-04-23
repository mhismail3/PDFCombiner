import React from 'react';
import { PDFFile } from '../store/slices/pdfSlice';
import { formatFileSize } from '../utils/pdfUtils';
import { Button } from './ui';

interface PDFFileListProps {
  files: PDFFile[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
  onCombine: () => void;
}

const PDFFileList: React.FC<PDFFileListProps> = ({ files, onRemove, onClearAll, onCombine }) => {
  if (files.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {files.map(file => (
        <div
          key={file.id}
          className="flex items-center justify-between bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600"
        >
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatFileSize(file.size)}
                {file.pageCount > 0 && ` • ${file.pageCount} pages`}
                {file.status === 'loading' && ' • Loading...'}
                {file.status === 'error' && ` • Error: ${file.error}`}
              </p>
            </div>
          </div>
          <Button
            variant="text"
            onClick={() => onRemove(file.id)}
            aria-label={`Remove ${file.name}`}
            size="small"
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
};

export default PDFFileList;
