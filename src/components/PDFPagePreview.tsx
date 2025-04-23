import React, { useState, useCallback } from 'react';
import { usePDFThumbnails } from '../hooks/usePDFThumbnails';
import { usePDFPageData } from '../hooks/usePDFPageData';
import PDFPageThumbnail from './PDFPageThumbnail';

interface PDFPagePreviewProps {
  pdfData: ArrayBuffer;
  className?: string;
  onPageSelect?: (pageNumber: number, selected: boolean) => void;
  onPageClick?: (pageNumber: number) => void;
  selectedPages?: number[];
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  showPageNumbers?: boolean;
}

/**
 * Component to display thumbnails for all pages in a PDF
 */
const PDFPagePreview: React.FC<PDFPagePreviewProps> = ({
  pdfData,
  className = '',
  onPageSelect,
  onPageClick,
  selectedPages = [],
  thumbnailWidth = 120,
  thumbnailHeight,
  showPageNumbers = true
}) => {
  // State for grid view settings
  const [gridGap, setGridGap] = useState(8);
  
  // Load thumbnails and page data
  const { 
    pageCount,
    isLoading: isThumbnailLoading, 
    error: thumbnailError
  } = usePDFThumbnails(pdfData, {
    width: thumbnailWidth,
    height: thumbnailHeight
  });
  
  const { 
    documentInfo,
    pagesData,
    isLoading: isDataLoading,
    error: dataError 
  } = usePDFPageData(pdfData);
  
  // Handle page selection
  const handlePageSelect = useCallback((pageNumber: number) => {
    if (onPageSelect) {
      // Toggle selection state
      const isCurrentlySelected = selectedPages.includes(pageNumber);
      onPageSelect(pageNumber, !isCurrentlySelected);
    }
  }, [onPageSelect, selectedPages]);
  
  // Handle page click
  const handlePageClick = useCallback((pageNumber: number) => {
    if (onPageClick) {
      onPageClick(pageNumber);
    }
  }, [onPageClick]);
  
  // Loading state
  const isLoading = isThumbnailLoading || isDataLoading;
  const error = thumbnailError || dataError;
  
  if (isLoading && pageCount === 0) {
    return (
      <div className={`flex items-center justify-center h-40 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="text-gray-500 dark:text-gray-400 animate-pulse">
          Loading PDF pages...
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className={`flex items-center justify-center h-40 bg-red-50 dark:bg-red-900 text-red-500 dark:text-red-300 rounded-lg p-4 ${className}`}>
        <div>Error loading PDF: {error}</div>
      </div>
    );
  }
  
  if (pageCount === 0) {
    return (
      <div className={`flex items-center justify-center h-40 bg-gray-100 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="text-gray-500 dark:text-gray-400">
          No pages found in PDF
        </div>
      </div>
    );
  }
  
  // Create an array of page numbers from 1 to pageCount
  const pageNumbers = Array.from({ length: pageCount }, (_, i) => i + 1);
  
  return (
    <div className={`pdf-page-preview ${className}`}>
      {/* Document info header */}
      {documentInfo && (
        <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h3 className="text-sm font-semibold mb-1">
            {documentInfo.metadata.Title || 'Untitled Document'}
          </h3>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
            {documentInfo.metadata.Author && ` • Author: ${documentInfo.metadata.Author}`}
          </div>
        </div>
      )}
      
      {/* Page thumbnails grid */}
      <div 
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
        style={{ gap: `${gridGap}px` }}
      >
        {pageNumbers.map(pageNumber => (
          <div key={pageNumber} className="pdf-page-thumbnail-container">
            <PDFPageThumbnail
              pdfData={pdfData}
              pageNumber={pageNumber}
              pageCount={pageCount}
              width={thumbnailWidth}
              height={thumbnailHeight}
              selected={selectedPages.includes(pageNumber)}
              onSelect={onPageSelect ? handlePageSelect : undefined}
              onPreview={onPageClick ? handlePageClick : undefined}
            />
          </div>
        ))}
      </div>
      
      {/* Loading indicator for additional pages */}
      {isLoading && pageCount > 0 && (
        <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
          Loading additional pages...
        </div>
      )}
    </div>
  );
};

export default PDFPagePreview; 