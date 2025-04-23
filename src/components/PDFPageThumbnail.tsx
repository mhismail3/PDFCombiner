import React from 'react';
import PDFThumbnail from './PDFThumbnail';

interface PDFPageThumbnailProps {
  pdfData: ArrayBuffer;
  pageNumber: number;
  pageCount: number;
  width?: number;
  height?: number;
  selected?: boolean;
  onSelect?: (pageNumber: number) => void;
  onPreview?: (pageNumber: number) => void;
  className?: string;
  disabled?: boolean;
}

/**
 * Component to render a thumbnail of a specific PDF page with selection controls
 */
const PDFPageThumbnail: React.FC<PDFPageThumbnailProps> = ({
  pdfData,
  pageNumber,
  pageCount,
  width = 120,
  height,
  selected = false,
  onSelect,
  onPreview,
  className = '',
  disabled = false
}) => {
  // Handle click on checkbox for selection
  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (onSelect && !disabled) {
      onSelect(pageNumber);
    }
  };

  // Handle click on thumbnail for preview
  const handleThumbnailClick = () => {
    if (onPreview && !disabled) {
      onPreview(pageNumber);
    }
  };

  return (
    <div 
      className={`
        relative group 
        ${selected ? 'ring-2 ring-blue-500' : ''} 
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} 
        rounded overflow-hidden transition-all duration-200
        ${className}
      `}
      style={{ width: width }}
    >
      {/* Page thumbnail */}
      <div onClick={handleThumbnailClick}>
        <PDFThumbnail
          pdfData={pdfData}
          pageNumber={pageNumber}
          width={width}
          height={height}
          alt={`Page ${pageNumber} of ${pageCount}`}
        />
      </div>
      
      {/* Selection overlay */}
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200" />
      
      {/* Page number label */}
      <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-xs py-1 px-2">
        Page {pageNumber} of {pageCount}
      </div>
      
      {/* Selection checkbox */}
      {onSelect && (
        <div className="absolute top-2 left-2">
          <input
            type="checkbox"
            checked={selected}
            onChange={handleCheckboxChange}
            disabled={disabled}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 rounded"
          />
        </div>
      )}
      
      {/* Preview button */}
      {onPreview && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <button
            onClick={handleThumbnailClick}
            disabled={disabled}
            className="bg-white dark:bg-gray-800 p-1 rounded-full shadow-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label={`Preview page ${pageNumber}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-700 dark:text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default PDFPageThumbnail; 