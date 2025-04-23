import React, { useState, useCallback, useRef, useEffect } from 'react';
import PDFProgressiveView from './PDFProgressiveView';
import { usePDFProcessor } from '../hooks/usePDFProcessor';

interface PDFDocumentManagerProps {
  pdfData: ArrayBuffer;
  fileName?: string;
  className?: string;
  onPagesSelected?: (selectedPages: number[]) => void;
  initialSelectedPages?: number[];
  initialPage?: number;
  maxCacheSize?: number;
  onClose?: () => void;
}

/**
 * A comprehensive PDF document manager with progressive loading
 * and page selection capabilities for large documents
 */
const PDFDocumentManager: React.FC<PDFDocumentManagerProps> = ({
  pdfData,
  fileName,
  className = '',
  onPagesSelected,
  initialSelectedPages = [],
  initialPage = 1,
  maxCacheSize = 200,
  onClose
}) => {
  // State for selected pages
  const [selectedPages, setSelectedPages] = useState<number[]>(initialSelectedPages);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [viewMode, setViewMode] = useState<'all' | 'selected'>('all');
  const [thumbnailSize, setThumbnailSize] = useState<number>(150);
  const [documentPerformance, setDocumentPerformance] = useState<'normal' | 'large' | 'very-large'>('normal');
  
  // Use PDF processor to get page count
  const { pageCount } = usePDFProcessor(pdfData, { 
    autoProcess: true,
    generateThumbnails: false // We don't need thumbnails here, just page count
  });
  
  // Determine document performance settings based on page count
  useEffect(() => {
    if (pageCount > 1000) {
      setDocumentPerformance('very-large');
    } else if (pageCount > 200) {
      setDocumentPerformance('large');
    } else {
      setDocumentPerformance('normal');
    }
  }, [pageCount]);
  
  // Adjust maxCacheSize based on document size for performance
  const effectiveMaxCacheSize = useCallback(() => {
    // For very large documents, further reduce cache size
    if (documentPerformance === 'very-large') {
      return Math.min(100, maxCacheSize);
    }
    // For large documents, use the provided maxCacheSize
    else if (documentPerformance === 'large') {
      return maxCacheSize;
    }
    // For normal documents, we can use a larger cache
    return Math.max(500, maxCacheSize);
  }, [documentPerformance, maxCacheSize]);
  
  // Handle page selection
  const handlePageSelect = useCallback((pageNumber: number, selected: boolean) => {
    setSelectedPages(prev => {
      let newSelection;
      
      if (selected) {
        newSelection = [...prev, pageNumber].sort((a, b) => a - b);
      } else {
        newSelection = prev.filter(p => p !== pageNumber);
      }
      
      // Call external handler if provided
      if (onPagesSelected) {
        onPagesSelected(newSelection);
      }
      
      return newSelection;
    });
  }, [onPagesSelected]);
  
  // Handle page preview
  const handlePagePreview = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    // TODO: Add a preview modal or panel to show the full page
  }, []);
  
  // Handle select all pages
  const handleSelectAll = useCallback(() => {
    if (pageCount > 0) {
      const allPages = Array.from({ length: pageCount }, (_, i) => i + 1);
      setSelectedPages(allPages);
      
      if (onPagesSelected) {
        onPagesSelected(allPages);
      }
    }
  }, [onPagesSelected, pageCount]);
  
  // Handle clear selection
  const handleClearSelection = useCallback(() => {
    setSelectedPages([]);
    
    if (onPagesSelected) {
      onPagesSelected([]);
    }
  }, [onPagesSelected]);
  
  // Toggle view mode between all pages and selected pages
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'all' ? 'selected' : 'all');
  }, []);
  
  // Increase thumbnail size
  const increaseThumbnailSize = useCallback(() => {
    setThumbnailSize(prev => Math.min(prev + 25, 250));
  }, []);
  
  // Decrease thumbnail size
  const decreaseThumbnailSize = useCallback(() => {
    setThumbnailSize(prev => Math.max(prev - 25, 75));
  }, []);
  
  // Get visible pages based on view mode
  const getVisiblePages = useCallback(() => {
    return viewMode === 'selected' ? selectedPages : [];
  }, [viewMode, selectedPages]);
  
  // Memory management warning for very large documents
  const renderPerformanceIndicator = () => {
    if (documentPerformance === 'very-large') {
      return (
        <div className="p-2 bg-yellow-50 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 text-xs border-b border-yellow-200 dark:border-yellow-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          Large document detected ({pageCount} pages). Performance optimizations enabled.
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className={`pdf-document-manager rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden ${className}`}>
      {/* Control bar */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center">
          <button
            onClick={toggleViewMode}
            className={`px-3 py-1 text-xs rounded-md mr-2 ${
              viewMode === 'all' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All Pages
          </button>
          <button
            onClick={toggleViewMode}
            className={`px-3 py-1 text-xs rounded-md mr-2 ${
              viewMode === 'selected' 
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' 
                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
            disabled={selectedPages.length === 0}
          >
            Selected ({selectedPages.length})
          </button>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={decreaseThumbnailSize}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Decrease thumbnail size"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
          </button>
          <button
            onClick={increaseThumbnailSize}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label="Increase thumbnail size"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        <div className="flex items-center">
          <button
            onClick={() => handleClearSelection()}
            className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md mr-2"
            disabled={selectedPages.length === 0}
          >
            Clear Selection
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Performance indicator for large documents */}
      {renderPerformanceIndicator()}
      
      {/* PDF Progressive View */}
      <PDFProgressiveView
        pdfData={pdfData}
        fileName={fileName}
        onPageSelect={handlePageSelect}
        selectedPages={viewMode === 'all' ? selectedPages : getVisiblePages()}
        thumbnailWidth={thumbnailSize}
        onPreview={handlePagePreview}
        initialPage={currentPage}
        maxCacheSize={effectiveMaxCacheSize()}
      />
      
      {/* Action footer */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between bg-gray-50 dark:bg-gray-900">
        <div>
          {selectedPages.length > 0 && (
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">{selectedPages.length}</span> of {pageCount} pages selected
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
            disabled={pageCount === 0}
          >
            Select All
          </button>
          
          <button
            onClick={() => {
              if (onPagesSelected) {
                onPagesSelected(selectedPages);
              }
            }}
            disabled={selectedPages.length === 0}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900 text-white rounded"
          >
            Apply Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default PDFDocumentManager; 