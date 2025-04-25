import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { usePDFProcessor } from '../hooks/usePDFProcessor';
import { usePDFThumbnails } from '../hooks/usePDFThumbnails';
import PDFThumbnailRenderer from './PDFThumbnailRenderer';

interface PDFProgressiveViewProps {
  pdfData: ArrayBuffer;
  fileName?: string;
  className?: string;
  onPageSelect?: (pageNumber: number, selected: boolean) => void;
  selectedPages?: number[];
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  onPreview?: (pageNumber: number) => void;
  initialPage?: number;
  maxCacheSize?: number; // Maximum number of thumbnails to keep in memory
}

/**
 * Component that efficiently renders PDF thumbnails for large documents
 * using virtualization and progressive loading techniques
 */
const PDFProgressiveView: React.FC<PDFProgressiveViewProps> = ({
  pdfData,
  fileName,
  className = '',
  onPageSelect,
  selectedPages = [],
  thumbnailWidth = 150,
  thumbnailHeight,
  onPreview,
  initialPage = 1,
  maxCacheSize = 200 // Default max cache size
}) => {
  // Container refs for virtualization calculations
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  
  // State for virtualization
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [visibleEndIndex, setVisibleEndIndex] = useState(20); // Initial batch size
  const [columnCount, setColumnCount] = useState(4);
  const [itemsPerBatch, setItemsPerBatch] = useState(10);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [showPagination, setShowPagination] = useState(false);
  const [visibleCache, setVisibleCache] = useState<Set<number>>(new Set());
  
  // Get document information and processing status from PDF processor
  const {
    isProcessing,
    progress,
    pageCount,
    documentInfo,
    selectedPages: processorSelectedPages,
    togglePageSelection
  } = usePDFProcessor(pdfData, {
    generateThumbnails: false, // We'll handle thumbnails separately
  });

  // Use the PDF thumbnails hook for thumbnail management
  const {
    thumbnails,
    isLoading: isThumbnailsLoading,
    error: thumbnailsError,
    getThumbnail,
    prefetchThumbnails
  } = usePDFThumbnails(pdfData, {
    width: thumbnailWidth,
    height: thumbnailHeight,
    quality: 0.7,
    maxCacheSize
  });
  
  // Show pagination controls for larger documents
  useEffect(() => {
    setShowPagination(pageCount > 50);
  }, [pageCount]);
  
  // Calculate column count based on container width and thumbnail width
  useEffect(() => {
    const updateColumnCount = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const columns = Math.max(1, Math.floor(containerWidth / (thumbnailWidth + 16)));
        setColumnCount(columns);
        
        // Also adjust items per batch based on column count for better performance
        setItemsPerBatch(columns * 2);
      }
    };
    
    // Initial calculation
    updateColumnCount();
    
    // Recalculate on resize
    const resizeObserver = new ResizeObserver(updateColumnCount);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [thumbnailWidth]);
  
  // Memory management for thumbnails - track which pages are in the cache
  useEffect(() => {
    const newVisiblePages = new Set<number>();
    
    // Add visible pages to the set
    for (let i = visibleStartIndex + 1; i <= Math.min(visibleEndIndex, pageCount); i++) {
      newVisiblePages.add(i);
    }
    
    // If we have more pages than our cache limit, we need to implement LRU-style caching
    // where we keep the most recently viewed pages
    if (newVisiblePages.size > maxCacheSize) {
      // Get array of visible pages
      const visibleArray = Array.from(newVisiblePages);
      
      // Only keep the maximum number of pages
      const reducedPages = new Set(visibleArray.slice(0, maxCacheSize));
      setVisibleCache(reducedPages);
    } else {
      setVisibleCache(newVisiblePages);
    }
  }, [visibleStartIndex, visibleEndIndex, pageCount, maxCacheSize]);
  
  // Setup intersection observer for infinite scrolling
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '200px', // Increased rootMargin for smoother experience
      threshold: 0.1
    };
    
    const handleIntersection = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.id === 'scroll-sentinel') {
          // Load more items when the sentinel element is visible
          setVisibleEndIndex(prev => Math.min(prev + itemsPerBatch, pageCount));
        }
      });
    };
    
    observerRef.current = new IntersectionObserver(handleIntersection, options);
    
    // Add the sentinel element to the observer
    const sentinelElement = document.getElementById('scroll-sentinel');
    if (sentinelElement) {
      observerRef.current.observe(sentinelElement);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [pageCount, itemsPerBatch]);
  
  // Apply pagination logic
  const visiblePageNumbers = useMemo(() => {
    if (pageCount === 0) return [];
    
    // Generate an array of page numbers for the current visible range
    return Array.from(
      { length: visibleEndIndex - visibleStartIndex + 1 },
      (_, i) => visibleStartIndex + i
    ).filter(page => page <= pageCount);
  }, [visibleStartIndex, visibleEndIndex, pageCount]);

  // Prefetch thumbnails for visible pages and a few pages ahead
  useEffect(() => {
    if (prefetchThumbnails && visiblePageNumbers.length > 0) {
      // Add a few pages ahead for smoother scrolling
      const pagesToPrefetch = [];
      for (let i = visibleStartIndex; i <= Math.min(visibleEndIndex + columnCount * 2, pageCount); i++) {
        if (i > 0 && i <= pageCount) {
          pagesToPrefetch.push(i);
        }
      }
      
      if (pagesToPrefetch.length > 0) {
        prefetchThumbnails(pagesToPrefetch, { priority: true });
      }
    }
  }, [
    visiblePageNumbers, 
    prefetchThumbnails, 
    visibleStartIndex, 
    visibleEndIndex, 
    columnCount, 
    pageCount
  ]);
  
  // Use a stable reference to pdfData to prevent unnecessary re-renders
  const pdfDataRef = useRef(pdfData);
  
  // Only update the ref when pdfData actually changes
  useEffect(() => {
    pdfDataRef.current = pdfData;
  }, [pdfData?.byteLength]);

  // Memoize onPageSelect callback to maintain stability
  const memoizedPageSelectHandler = useCallback((pageNumber: number) => {
    if (onPageSelect) {
      const isSelected = selectedPages.includes(pageNumber);
      onPageSelect(pageNumber, !isSelected);
    } else {
      togglePageSelection(pageNumber);
    }
  }, [onPageSelect, selectedPages, togglePageSelection]);

  // Memoize onPreview callback to maintain stability
  const memoizedPreviewHandler = useCallback((pageNumber: number) => {
    setCurrentPage(pageNumber);
    if (onPreview) {
      onPreview(pageNumber);
    }
  }, [onPreview]);
  
  // Handle scroll to implement efficient virtualization
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    
    // Calculate which rows are visible
    const rowHeight = thumbnailHeight || thumbnailWidth * 1.4;
    const rowsPerPage = Math.ceil(viewportHeight / (rowHeight + 16));
    
    // Calculate first visible row
    const firstVisibleRow = Math.floor(scrollTop / (rowHeight + 16));
    
    // Update current page based on scroll position
    const approximatePageNumber = Math.max(1, Math.min(pageCount, Math.floor(firstVisibleRow * columnCount) + 1));
    setCurrentPage(approximatePageNumber);
    
    // Add some buffer rows above and below for smoother scrolling
    const bufferRows = Math.ceil(rowsPerPage / 2); // Half a viewport of buffer
    const newStartRow = Math.max(0, firstVisibleRow - bufferRows);
    const newEndRow = Math.min(Math.ceil(pageCount / columnCount), firstVisibleRow + rowsPerPage + bufferRows);
    
    // Convert rows to indexes
    const newStartIndex = newStartRow * columnCount;
    const newEndIndex = Math.min(newEndRow * columnCount, pageCount);
    
    if (newStartIndex !== visibleStartIndex || newEndIndex !== visibleEndIndex) {
      setVisibleStartIndex(newStartIndex);
      setVisibleEndIndex(newEndIndex);
    }
  }, [columnCount, pageCount, thumbnailHeight, thumbnailWidth, visibleStartIndex, visibleEndIndex]);
  
  // Monitor scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);
  
  // Function to scroll to a specific page
  const scrollToPage = useCallback((pageNumber: number) => {
    if (!containerRef.current || pageNumber < 1 || pageNumber > pageCount) return;
    
    // Get the row that contains this page
    const rowHeight = thumbnailHeight || thumbnailWidth * 1.4;
    const row = Math.floor((pageNumber - 1) / columnCount);
    
    // Calculate the scroll position
    const scrollPosition = row * (rowHeight + 16);
    
    // Scroll to the position
    containerRef.current.scrollTo({
      top: scrollPosition,
      behavior: 'smooth'
    });
    
    // Update the current page
    setCurrentPage(pageNumber);
  }, [columnCount, pageCount, thumbnailHeight, thumbnailWidth]);
  
  // Initialize scroll position to the initial page when the component mounts
  useEffect(() => {
    if (initialPage > 1 && pageCount > 0 && containerRef.current) {
      // Need to schedule this after the component has fully rendered
      setTimeout(() => scrollToPage(initialPage), 100);
    }
  }, [initialPage, pageCount, scrollToPage]);
  
  // Generate pagination controls
  const renderPagination = useMemo(() => {
    if (!showPagination) return null;
    
    // Calculate pagination information
    const totalPages = pageCount;
    const pagesPerSection = 100;
    const section = Math.floor((currentPage - 1) / pagesPerSection);
    const startPage = section * pagesPerSection + 1;
    const endPage = Math.min(startPage + pagesPerSection - 1, totalPages);
    
    // Create page buttons
    const paginationItems = [];
    
    // Add "First" and "Previous" buttons
    paginationItems.push(
      <button 
        key="first"
        onClick={() => scrollToPage(1)}
        disabled={currentPage === 1}
        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-l"
      >
        ≪
      </button>
    );
    
    paginationItems.push(
      <button 
        key="prev"
        onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
      >
        ‹
      </button>
    );
    
    // Add section information
    paginationItems.push(
      <span key="info" className="px-2 py-1 text-xs">
        Page {currentPage} of {totalPages}
      </span>
    );
    
    // Add "Next" and "Last" buttons
    paginationItems.push(
      <button 
        key="next"
        onClick={() => scrollToPage(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50"
      >
        ›
      </button>
    );
    
    paginationItems.push(
      <button 
        key="last"
        onClick={() => scrollToPage(totalPages)}
        disabled={currentPage === totalPages}
        className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-r"
      >
        ≫
      </button>
    );
    
    // Add quick jump input
    paginationItems.push(
      <div key="jump" className="flex items-center ml-2">
        <span className="text-xs mr-1">Go to:</span>
        <input
          type="number"
          min="1"
          max={totalPages}
          value={currentPage}
          onChange={(e) => {
            const page = parseInt(e.target.value);
            if (!isNaN(page) && page >= 1 && page <= totalPages) {
              scrollToPage(page);
            }
          }}
          className="w-16 px-1 py-0.5 text-xs border rounded"
        />
      </div>
    );
    
    return (
      <div className="flex items-center justify-center gap-1 p-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        {paginationItems}
      </div>
    );
  }, [currentPage, pageCount, showPagination, scrollToPage]);
  
  // Loading state
  if (isProcessing && progress < 10) {
    return (
      <div className={`flex flex-col items-center justify-center p-4 ${className}`}>
        <div className="w-full max-w-md">
          <div className="mb-2 text-center text-gray-700 dark:text-gray-300">
            Loading PDF Document
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="mt-1 text-xs text-center text-gray-500 dark:text-gray-400">
            {progress.toFixed(0)}% complete
          </div>
        </div>
      </div>
    );
  }
  
  if (pageCount === 0) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="text-gray-500 dark:text-gray-400">
          No pages found in document
        </div>
      </div>
    );
  }
  
  return (
    <div className={`pdf-progressive-view flex flex-col ${className}`}>
      {/* Document info header */}
      {documentInfo && (
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3">
          <h3 className="text-sm font-semibold truncate">
            {fileName || documentInfo.metadata?.Title || 'Untitled Document'}
          </h3>
          <div className="text-xs text-gray-500 dark:text-gray-400 flex justify-between items-center">
            <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
            <span>
              {selectedPages.length > 0 && (
                <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-0.5 rounded-full">
                  {selectedPages.length} selected
                </span>
              )}
            </span>
          </div>
        </div>
      )}
      
      {/* Loading indicator for when processing but some thumbnails available */}
      {isProcessing && progress >= 10 && progress < 100 && (
        <div className="sticky top-12 z-10 bg-blue-50 dark:bg-blue-900 p-2 text-xs text-blue-700 dark:text-blue-300 flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700 dark:text-blue-300" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading thumbnails: {progress.toFixed(0)}%
        </div>
      )}
      
      {/* Pagination controls - top */}
      {renderPagination}
      
      {/* Thumbnails grid container */}
      <div 
        ref={containerRef}
        className="overflow-auto flex-grow"
        style={{ maxHeight: '65vh' }}
        onScroll={handleScroll}
      >
        {/* Thumbnails grid */}
        <div 
          className="grid gap-4 p-4"
          style={{ 
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          }}
        >
          {/* Only render thumbnails that are in our visible range */}
          {visiblePageNumbers.map(pageNumber => (
            <PDFThumbnailRenderer
              key={pageNumber}
              pdfData={pdfDataRef.current}
              pageNumber={pageNumber}
              width={thumbnailWidth}
              height={thumbnailHeight}
              selected={selectedPages.includes(pageNumber)}
              onSelect={memoizedPageSelectHandler}
              onPreview={memoizedPreviewHandler}
              priority={pageNumber === currentPage || Math.abs(pageNumber - currentPage) < 5}
              quality={0.7}
            />
          ))}
          
          {/* Placeholder for non-visible thumbnails to maintain scroll height */}
          {pageCount > visibleEndIndex && (
            <div 
              style={{ 
                gridColumn: `1 / span ${columnCount}`,
                height: `${Math.ceil((pageCount - visibleEndIndex) / columnCount) * (thumbnailHeight || thumbnailWidth * 1.4)}px`
              }}
            />
          )}
          
          {/* Sentinel element for infinite scrolling */}
          <div 
            id="scroll-sentinel" 
            style={{ 
              gridColumn: `1 / span ${columnCount}`,
              height: '10px'
            }}
          />
        </div>
      </div>
      
      {/* Pagination controls - bottom */}
      {renderPagination}
    </div>
  );
};

export default PDFProgressiveView; 