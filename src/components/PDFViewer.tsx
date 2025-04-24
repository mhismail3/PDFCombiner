import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { usePDFPageData } from '../hooks/usePDFPageData';
import PDFPagePreview from './PDFPagePreview';
import { usePDFContext } from '../contexts/PDFContext';

// Interface for PDF context that matches the one in PDFContext.tsx
export interface PDFContextType {
  currentPdf: any | null;
  pdfDataRef: React.MutableRefObject<ArrayBuffer | null>;
  selectedPages: number[];
  isPreviewMode: boolean;
  useProgressiveView: boolean;
  previewPage: number;
  
  setSelectedPages: (pages: number[]) => void;
  selectPage: (pageNumber: number, selected: boolean) => void;
  selectAllPages: () => void;
  deselectAllPages: () => void;
  setPreviewMode: (mode: boolean) => void;
  setPreviewPage: (page: number) => void;
  toggleProgressiveView: () => void;
  
  lastError: string | null;
  logError: (error: string) => void;
}

export interface PDFViewerProps {
  pdfData: ArrayBuffer;
  fileName?: string;
  className?: string;
  showPageNumbers?: boolean;
  showDocumentInfo?: boolean;
  onClose?: () => void;
  readonly?: boolean;
  
  // Legacy props - to be deprecated in favor of context
  initialSelectedPages?: number[];
  onPageSelect?: (selectedPages: number[]) => void;
  showPageSelection?: boolean;
}

/**
 * Comprehensive PDF viewer with thumbnails and selection capabilities
 * Uses PDFContext for state management when available
 */
const PDFViewer: React.FC<PDFViewerProps> = (props) => {
  // First, determine if we can use context
  let hasContext = false;
  
  try {
    // Just checking if we can access the context
    usePDFContext();
    hasContext = true;
  } catch (error) {
    hasContext = false;
  }
  
  // Render the appropriate component based on context availability
  if (hasContext) {
    return <PDFViewerWithContext {...props} />;
  } else {
    return <PDFViewerWithoutContext {...props} />;
  }
};

// Component that uses context for state management
const PDFViewerWithContext: React.FC<PDFViewerProps> = ({
  pdfData,
  fileName,
  className = '',
  showPageNumbers = true,
  showDocumentInfo = true,
  onClose,
  readonly = false,
  showPageSelection = true
}) => {
  // Use context for state management
  const pdfContext = usePDFContext();
  
  // Load PDF document information and page data
  const { 
    documentInfo, 
    pageCount, 
    isLoading, 
    error 
  } = usePDFPageData(pdfData);
  
  // Handle page selection - memoized to prevent rerenders
  const handlePageSelect = useCallback((pageNumber: number, selected: boolean) => {
    if (readonly) return;
    pdfContext.selectPage(pageNumber, selected);
  }, [readonly, pdfContext]);
  
  // Handle page click/selection - memoized to prevent rerenders
  const handlePageClick = useCallback((pageNumber: number) => {
    pdfContext.setPreviewPage(pageNumber);
    pdfContext.setPreviewMode(true);
  }, [pdfContext]);
  
  // Handle select all pages - memoized to prevent rerenders
  const handleSelectAll = useCallback(() => {
    if (readonly || !pageCount) return;
    
    const allPages = Array.from({ length: pageCount }, (_, i) => i + 1);
    pdfContext.setSelectedPages(allPages);
  }, [pageCount, readonly, pdfContext]);
  
  // Handle clear selection - memoized to prevent rerenders
  const handleClearSelection = useCallback(() => {
    if (readonly) return;
    pdfContext.deselectAllPages();
  }, [readonly, pdfContext]);
  
  // Handle close button - memoized to prevent rerenders
  const handleClose = useCallback(() => {
    pdfContext.setPreviewMode(false);
    
    if (onClose) {
      onClose();
    }
  }, [onClose, pdfContext]);
  
  return (
    <div className={`pdf-viewer border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Document header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {fileName || (documentInfo?.metadata?.Title ? documentInfo.metadata.Title : 'PDF Document')}
          </h2>
          {showDocumentInfo && documentInfo && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {pageCount} {pageCount === 1 ? 'page' : 'pages'}
              {documentInfo.metadata?.Author && ` • ${documentInfo.metadata.Author}`}
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-2">
          {showPageSelection && !readonly && (
            <>
              <button
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                onClick={handleSelectAll}
                disabled={isLoading}
              >
                Select All
              </button>
              <button
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                onClick={handleClearSelection}
                disabled={isLoading || pdfContext.selectedPages.length === 0}
              >
                Clear
              </button>
            </>
          )}
          
          {(onClose || true) && (
            <button
              className="p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={handleClose}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Selected pages summary */}
      {showPageSelection && pdfContext.selectedPages.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900 p-2 text-sm text-blue-700 dark:text-blue-300">
          <span className="font-medium">{pdfContext.selectedPages.length}</span> {pdfContext.selectedPages.length === 1 ? 'page' : 'pages'} selected
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 p-4 text-red-700 dark:text-red-300">
          <p className="font-medium">Error loading PDF</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}
      
      {/* Loading state */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-800 p-4 flex items-center justify-center">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Page thumbnails */}
      <div className="p-4 bg-white dark:bg-gray-800">
        <PDFPagePreview
          pdfData={pdfData}
          onPageSelect={showPageSelection ? handlePageSelect : undefined}
          onPageClick={handlePageClick}
          selectedPages={pdfContext.selectedPages}
          showPageNumbers={showPageNumbers}
        />
      </div>
    </div>
  );
};

// Component that uses local state
const PDFViewerWithoutContext: React.FC<PDFViewerProps> = ({
  pdfData,
  fileName,
  className = '',
  showPageNumbers = true,
  showDocumentInfo = true,
  onClose,
  readonly = false,
  
  // Legacy props
  initialSelectedPages,
  onPageSelect,
  showPageSelection = true
}) => {
  // Initialize local state
  const [selectedPages, setSelectedPages] = useState<number[]>(
    initialSelectedPages || []
  );
  
  // Store preview state since we don't have context
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  
  // Effect to update state when initialSelectedPages prop changes
  useEffect(() => {
    if (initialSelectedPages) {
      setSelectedPages(initialSelectedPages);
    }
  }, [initialSelectedPages]);
  
  // Load PDF document information and page data
  const { 
    documentInfo, 
    pageCount, 
    isLoading, 
    error 
  } = usePDFPageData(pdfData);
  
  // Handle page selection - memoized to prevent rerenders
  const handlePageSelect = useCallback((pageNumber: number, selected: boolean) => {
    if (readonly) return;
    
    setSelectedPages(prev => {
      // Don't update if not needed
      if (selected && prev.includes(pageNumber)) return prev;
      if (!selected && !prev.includes(pageNumber)) return prev;
      
      const updatedPages = selected
        ? [...prev, pageNumber].sort((a, b) => a - b)
        : prev.filter(p => p !== pageNumber);
      
      // Call external handler if provided
      if (onPageSelect) {
        onPageSelect(updatedPages);
      }
      
      return updatedPages;
    });
  }, [readonly, onPageSelect]);
  
  // Handle page click/selection - memoized to prevent rerenders
  const handlePageClick = useCallback((pageNumber: number) => {
    setPreviewPage(pageNumber);
    setIsPreviewMode(true);
  }, []);
  
  // Handle select all pages - memoized to prevent rerenders
  const handleSelectAll = useCallback(() => {
    if (readonly || !pageCount) return;
    
    const allPages = Array.from({ length: pageCount }, (_, i) => i + 1);
    setSelectedPages(allPages);
    
    if (onPageSelect) {
      onPageSelect(allPages);
    }
  }, [pageCount, readonly, onPageSelect]);
  
  // Handle clear selection - memoized to prevent rerenders
  const handleClearSelection = useCallback(() => {
    if (readonly) return;
    
    setSelectedPages([]);
    
    if (onPageSelect) {
      onPageSelect([]);
    }
  }, [readonly, onPageSelect]);
  
  // Handle close button - memoized to prevent rerenders
  const handleClose = useCallback(() => {
    setIsPreviewMode(false);
    
    if (onClose) {
      onClose();
    }
  }, [onClose]);
  
  return (
    <div className={`pdf-viewer border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Document header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {fileName || (documentInfo?.metadata?.Title ? documentInfo.metadata.Title : 'PDF Document')}
          </h2>
          {showDocumentInfo && documentInfo && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {pageCount} {pageCount === 1 ? 'page' : 'pages'}
              {documentInfo.metadata?.Author && ` • ${documentInfo.metadata.Author}`}
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center space-x-2">
          {showPageSelection && !readonly && (
            <>
              <button
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                onClick={handleSelectAll}
                disabled={isLoading}
              >
                Select All
              </button>
              <button
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded"
                onClick={handleClearSelection}
                disabled={isLoading || selectedPages.length === 0}
              >
                Clear
              </button>
            </>
          )}
          
          {onClose && (
            <button
              className="p-1 rounded-full text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              onClick={handleClose}
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Selected pages summary */}
      {showPageSelection && selectedPages.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900 p-2 text-sm text-blue-700 dark:text-blue-300">
          <span className="font-medium">{selectedPages.length}</span> {selectedPages.length === 1 ? 'page' : 'pages'} selected
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900 p-4 text-red-700 dark:text-red-300">
          <p className="font-medium">Error loading PDF</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}
      
      {/* Loading state */}
      {isLoading && (
        <div className="bg-white dark:bg-gray-800 p-4 flex items-center justify-center">
          <div className="animate-pulse flex space-x-4">
            <div className="flex-1 space-y-4 py-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Page thumbnails */}
      <div className="p-4 bg-white dark:bg-gray-800">
        <PDFPagePreview
          pdfData={pdfData}
          onPageSelect={showPageSelection ? handlePageSelect : undefined}
          onPageClick={handlePageClick}
          selectedPages={selectedPages}
          showPageNumbers={showPageNumbers}
        />
      </div>
    </div>
  );
};

export default PDFViewer; 