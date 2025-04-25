import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import PDFThumbnailRenderer from './PDFThumbnailRenderer';
import { pdfThumbnailService } from '../services/PDFThumbnailService';
import ZoomControls, { DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM } from './ZoomControls';

// For touch gesture detection
interface TouchInfo {
  initialDistance: number;
  initialZoom: number;
  isTouching: boolean;
  lastMoveTime: number;
}

interface PDFThumbnailGridProps {
  pdfData: ArrayBuffer;
  pageCount: number;
  className?: string;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  gap?: number;
  selectedPages?: number[];
  onPageSelect?: (pageNumber: number, selected: boolean) => void;
  onPagePreview?: (pageNumber: number) => void;
}

/**
 * A grid component for displaying PDF thumbnails with virtual scrolling
 * and zoom controls for optimized performance with large documents.
 */
const PDFThumbnailGrid: React.FC<PDFThumbnailGridProps> = ({
  pdfData,
  pageCount,
  className = '',
  thumbnailWidth: initialThumbnailWidth = 150,
  thumbnailHeight: initialThumbnailHeight,
  gap = 16,
  selectedPages = [],
  onPageSelect,
  onPagePreview
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const touchRef = useRef<TouchInfo>({
    initialDistance: 0,
    initialZoom: 1,
    isTouching: false,
    lastMoveTime: 0
  });
  
  const [columnCount, setColumnCount] = useState(4);
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [visibleEndIndex, setVisibleEndIndex] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPagination, setShowPagination] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pdfDataRef] = useState(() => pdfData); // Create stable reference
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_ZOOM);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [thumbsPerRow, setThumbsPerRow] = useState(4);
  
  // Calculate actual thumbnail dimensions based on zoom level
  const thumbnailWidth = useMemo(() => Math.round(initialThumbnailWidth * zoomLevel), [initialThumbnailWidth, zoomLevel]);
  const thumbnailHeight = useMemo(() => 
    initialThumbnailHeight 
      ? Math.round(initialThumbnailHeight * zoomLevel) 
      : Math.round(thumbnailWidth * 1.4), 
    [initialThumbnailHeight, thumbnailWidth, zoomLevel]
  );
  
  // Initialize device and orientation detection
  useEffect(() => {
    const checkDeviceAndOrientation = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsLandscape(width > height);
    };
    
    checkDeviceAndOrientation();
    window.addEventListener('resize', checkDeviceAndOrientation);
    
    // Also check on orientation change specifically for mobile devices
    window.addEventListener('orientationchange', checkDeviceAndOrientation);
    
    return () => {
      window.removeEventListener('resize', checkDeviceAndOrientation);
      window.removeEventListener('orientationchange', checkDeviceAndOrientation);
    };
  }, []);
  
  // Show pagination for larger documents
  useEffect(() => {
    setShowPagination(pageCount > 20);
  }, [pageCount]);
  
  // Calculate column count based on container width, thumbnail size, and device type
  useEffect(() => {
    const updateColumnCount = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        // Account for gap between thumbnails
        const availableWidth = containerWidth - gap;
        const thumbnailSpacing = thumbnailWidth + gap;
        
        // Adjust minimum columns based on device type and orientation
        let minColumns = 1;
        if (isMobile) {
          minColumns = isLandscape ? 2 : 1;
        } else if (isTablet) {
          minColumns = isLandscape ? 3 : 2;
        }
        
        const columns = Math.max(minColumns, Math.floor(availableWidth / thumbnailSpacing));
        setColumnCount(columns);
        setThumbsPerRow(columns);
      }
    };
    
    // Initial calculation
    updateColumnCount();
    
    // Update on resize
    const resizeObserver = new ResizeObserver(updateColumnCount);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      resizeObserver.disconnect();
    };
  }, [thumbnailWidth, gap, isMobile, isTablet, isLandscape]);
  
  // Handle scroll to update visible range
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const viewportHeight = container.clientHeight;
    
    // Calculate which rows are visible
    const rowHeight = thumbnailHeight + gap;
    const rowsPerPage = Math.ceil(viewportHeight / rowHeight) + 1; // Add extra row for smoother scrolling
    
    // Calculate first visible row
    const firstVisibleRow = Math.floor(scrollTop / rowHeight);
    
    // Update current page based on scroll position
    const approximatePageNumber = Math.max(1, Math.min(pageCount, (firstVisibleRow * columnCount) + 1));
    setCurrentPage(approximatePageNumber);
    
    // Add buffer for smoother scrolling (more buffer rows for better performance)
    const bufferRows = Math.ceil(rowsPerPage); // Full viewport of buffer
    const newStartRow = Math.max(0, firstVisibleRow - bufferRows);
    const newEndRow = Math.min(Math.ceil(pageCount / columnCount), firstVisibleRow + rowsPerPage + bufferRows);
    
    // Convert rows to page indexes
    const newStartIndex = newStartRow * columnCount;
    const newEndIndex = Math.min(newEndRow * columnCount, pageCount);
    
    if (newStartIndex !== visibleStartIndex || newEndIndex !== visibleEndIndex) {
      setVisibleStartIndex(newStartIndex);
      setVisibleEndIndex(newEndIndex);
    }
  }, [columnCount, pageCount, thumbnailHeight, gap, visibleStartIndex, visibleEndIndex]);
  
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
  
  // Handle thumbnail selection
  const handleThumbnailSelect = useCallback((pageNumber: number) => {
    if (onPageSelect) {
      const isSelected = selectedPages.includes(pageNumber);
      onPageSelect(pageNumber, !isSelected);
    }
  }, [onPageSelect, selectedPages]);
  
  // Handle thumbnail preview
  const handleThumbnailPreview = useCallback((pageNumber: number) => {
    if (onPagePreview) {
      onPagePreview(pageNumber);
    }
  }, [onPagePreview]);
  
  // Generate array of page numbers to display
  const visiblePageNumbers = useMemo(() => {
    return Array.from(
      { length: Math.min(visibleEndIndex - visibleStartIndex + 1, pageCount - visibleStartIndex) },
      (_, i) => visibleStartIndex + i + 1 // +1 because page numbers are 1-based
    ).filter(pageNum => pageNum <= pageCount);
  }, [visibleStartIndex, visibleEndIndex, pageCount]);
  
  // Prefetch thumbnails for visible pages and a few pages ahead
  useEffect(() => {
    const prefetchThumbnails = async () => {
      if (visiblePageNumbers.length === 0 || !pdfDataRef) return;
      
      // Prioritize current page and nearby pages
      const pagesToPrefetch = [...visiblePageNumbers].sort((a, b) => {
        return Math.abs(a - currentPage) - Math.abs(b - currentPage);
      });
      
      // Limit prefetch batch to avoid overwhelming the renderer
      const priorityPages = pagesToPrefetch.slice(0, 8);
      
      try {
        // Prefetch in background without awaiting
        priorityPages.forEach(pageNumber => {
          pdfThumbnailService.getThumbnail(
            pdfDataRef,
            pageNumber,
            { width: thumbnailWidth, height: thumbnailHeight, quality: 0.7 }
          ).catch(err => console.warn(`Failed to prefetch thumbnail for page ${pageNumber}:`, err));
        });
      } catch (error) {
        console.warn('Error during thumbnail prefetching:', error);
      }
    };
    
    prefetchThumbnails();
  }, [visiblePageNumbers, currentPage, pdfDataRef, thumbnailWidth, thumbnailHeight]);
  
  // Function to scroll to a specific page
  const scrollToPage = useCallback((pageNumber: number) => {
    if (!containerRef.current || pageNumber < 1 || pageNumber > pageCount) return;
    
    setLoading(true);
    
    // Get the row that contains this page
    const rowIndex = Math.floor((pageNumber - 1) / columnCount);
    const scrollPosition = rowIndex * (thumbnailHeight + gap);
    
    // Scroll to the position
    containerRef.current.scrollTo({
      top: scrollPosition,
      behavior: 'smooth'
    });
    
    // Update the current page
    setCurrentPage(pageNumber);
    
    // Set loading state to false after scroll animation completes
    setTimeout(() => setLoading(false), 500);
  }, [columnCount, pageCount, thumbnailHeight, gap]);
  
  // Generate pagination controls
  const renderPagination = useMemo(() => {
    if (!showPagination) return null;
    
    // Calculate pagination information
    const totalPages = pageCount;
    const pagesPerSection = Math.min(isMobile ? 5 : 10, totalPages);
    const currentSection = Math.floor((currentPage - 1) / pagesPerSection);
    const startPage = currentSection * pagesPerSection + 1;
    const endPage = Math.min(startPage + pagesPerSection - 1, totalPages);
    
    // Create page buttons
    const paginationItems = [];
    
    // Add "First" and "Previous" buttons
    if (!isMobile || (isMobile && currentPage > 1)) {
      paginationItems.push(
        <button
          key="first"
          onClick={() => scrollToPage(1)}
          disabled={currentPage === 1 || loading}
          className="px-2 py-1 rounded-md text-xs md:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="First page"
        >
          {isMobile ? '<<' : 'First'}
        </button>
      );
      
      paginationItems.push(
        <button
          key="prev"
          onClick={() => scrollToPage(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1 || loading}
          className="px-2 py-1 rounded-md text-xs md:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Previous page"
        >
          {isMobile ? '<' : 'Prev'}
        </button>
      );
    }
    
    // Conditionally show ellipsis before page numbers
    if (startPage > 1) {
      paginationItems.push(
        <span key="ellipsis-start" className="px-2 py-1 text-xs md:text-sm">...</span>
      );
    }
    
    // Page number buttons - minimize on mobile
    if (!isMobile || totalPages <= 10) {
      for (let i = startPage; i <= endPage; i++) {
        paginationItems.push(
          <button
            key={i}
            onClick={() => scrollToPage(i)}
            disabled={i === currentPage || loading}
            className={`w-7 h-7 md:w-8 md:h-8 flex items-center justify-center rounded-md text-xs md:text-sm 
              ${i === currentPage 
                ? 'bg-blue-500 text-white' 
                : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'} 
              disabled:opacity-70 disabled:cursor-not-allowed`}
            aria-label={`Page ${i}`}
            aria-current={i === currentPage ? 'page' : undefined}
          >
            {i}
          </button>
        );
      }
    } else {
      // On mobile with many pages, show fewer page numbers
      const pagesToShow = [
        Math.max(1, currentPage - 1),
        currentPage,
        Math.min(totalPages, currentPage + 1)
      ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
      
      for (let i of pagesToShow) {
        paginationItems.push(
          <button
            key={i}
            onClick={() => scrollToPage(i)}
            disabled={i === currentPage || loading}
            className={`w-7 h-7 flex items-center justify-center rounded-md text-xs
              ${i === currentPage 
                ? 'bg-blue-500 text-white' 
                : 'bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'} 
              disabled:opacity-70 disabled:cursor-not-allowed`}
            aria-label={`Page ${i}`}
            aria-current={i === currentPage ? 'page' : undefined}
          >
            {i}
          </button>
        );
      }
    }
    
    // Conditionally show ellipsis after page numbers
    if (endPage < totalPages) {
      paginationItems.push(
        <span key="ellipsis-end" className="px-2 py-1 text-xs md:text-sm">...</span>
      );
    }
    
    // Add "Next" and "Last" buttons
    if (!isMobile || (isMobile && currentPage < totalPages)) {
      paginationItems.push(
        <button
          key="next"
          onClick={() => scrollToPage(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages || loading}
          className="px-2 py-1 rounded-md text-xs md:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next page"
        >
          {isMobile ? '>' : 'Next'}
        </button>
      );
      
      paginationItems.push(
        <button
          key="last"
          onClick={() => scrollToPage(totalPages)}
          disabled={currentPage === totalPages || loading}
          className="px-2 py-1 rounded-md text-xs md:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Last page"
        >
          {isMobile ? '>>' : 'Last'}
        </button>
      );
    }
    
    // Add direct page input - hide on smaller mobile screens
    if (!isMobile) {
      paginationItems.push(
        <div key="page-input" className="flex items-center mx-1">
          <span className="text-xs mr-1 whitespace-nowrap hidden sm:inline">Go to:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value) && value >= 1 && value <= totalPages) {
                scrollToPage(value);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                const value = parseInt((e.target as HTMLInputElement).value);
                if (!isNaN(value) && value >= 1 && value <= totalPages) {
                  scrollToPage(value);
                }
              }
            }}
            className="w-14 sm:w-16 px-1 py-0.5 text-xs border rounded"
            aria-label="Go to page"
          />
        </div>
      );
    }
    
    return (
      <div className={`flex items-center justify-center gap-1 p-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-wrap ${isMobile ? 'sticky bottom-0 z-20' : ''}`}>
        {paginationItems}
      </div>
    );
  }, [currentPage, pageCount, scrollToPage, showPagination, loading, isMobile]);
  
  // Calculate grid layout dimensions
  const gridStyle = useMemo(() => {
    // Base grid styles
    const styles: React.CSSProperties = {
      display: 'grid',
      gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
      gap: `${gap}px`,
      padding: isMobile ? '8px' : '16px',
      transition: 'all 0.2s ease-in-out',
    };
    
    // Adjust styles based on orientation and device type
    if (isMobile) {
      if (isLandscape) {
        styles.maxHeight = '85vh';
        styles.overflowY = 'auto';
      }
    }
    
    return styles;
  }, [columnCount, gap, isMobile, isLandscape]);
  
  // Render skeleton for loading state
  const renderLoadingIndicator = useCallback(() => {
    if (!loading) return null;
    
    return (
      <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
          <p className="mt-2 text-sm text-gray-600">Loading page {currentPage}...</p>
        </div>
      </div>
    );
  }, [loading, currentPage]);

  // Handle zoom level change
  const handleZoomChange = useCallback((newZoom: number) => {
    setZoomLevel(newZoom);
  }, []);
  
  // Handle touch events for pinch zoom on mobile - improved implementation
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      try {
        // Prevent default behavior only if event is cancelable
        if (e.cancelable) {
          e.preventDefault();
        }
        const distance = getTouchDistance(e.touches);
        touchRef.current = {
          initialDistance: distance,
          initialZoom: zoomLevel,
          isTouching: true,
          lastMoveTime: Date.now()
        };
      } catch (error) {
        console.warn('Error in touch start handler:', error);
      }
    }
  }, [zoomLevel]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchRef.current.isTouching || e.touches.length !== 2) return;
    
    // Rate limit touch move events to improve performance
    const now = Date.now();
    if (now - touchRef.current.lastMoveTime < 16) return; // ~60fps
    
    try {
      // Prevent default scrolling behavior during pinch only if event is cancelable
      if (e.cancelable) {
        e.preventDefault();
      }
      
      const currentDistance = getTouchDistance(e.touches);
      const initialDistance = touchRef.current.initialDistance;
      
      if (initialDistance > 0 && currentDistance > 0) {
        // Calculate scale factor based on change in distance
        const scaleFactor = currentDistance / initialDistance;
        
        // Apply scaling to initial zoom (avoiding cumulative errors)
        const newZoom = Math.min(
          Math.max(touchRef.current.initialZoom * scaleFactor, MIN_ZOOM),
          MAX_ZOOM
        );
        
        setZoomLevel(newZoom);
        touchRef.current.lastMoveTime = now;
      }
    } catch (error) {
      console.warn('Error in touch move handler:', error);
    }
  }, []);
  
  const handleTouchEnd = useCallback(() => {
    if (touchRef.current.isTouching) {
      touchRef.current.isTouching = false;
      
      // Store the zoom preference in localStorage
      localStorage.setItem('userZoomPreference', zoomLevel.toString());
    }
  }, [zoomLevel]);
  
  // Helper function for touch distance calculation
  const getTouchDistance = (touches: React.TouchList) => {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  };
  
  // Optimize container style for different devices
  const containerStyle = useMemo(() => {
    const styles: React.CSSProperties = {
      position: 'relative',
      height: '100%',
      overflow: 'auto',
    };
    
    // Add specific optimizations for mobile devices
    if (isMobile) {
      styles.WebkitOverflowScrolling = 'touch'; // Smooth scrolling on iOS
      styles.overscrollBehavior = 'contain'; // Prevent pull-to-refresh on mobile
    }
    
    return styles;
  }, [isMobile]);
  
  // Adjust zoom controls positioning based on device
  const zoomControlsStyle = useMemo(() => {
    const styles: React.CSSProperties = {
      padding: '8px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(4px)',
      borderRadius: '4px',
      zIndex: 10,
    };
    
    // Position controls at bottom of screen on mobile
    if (isMobile) {
      styles.position = 'sticky';
      styles.bottom = '0';
      styles.left = '0';
      styles.right = '0';
      styles.width = '100%';
      styles.borderTop = '1px solid #ddd';
      styles.borderRadius = '12px 12px 0 0';
      styles.boxShadow = '0 -2px 10px rgba(0, 0, 0, 0.1)';
    }
    
    return styles;
  }, [isMobile]);
  
  // Add passive: false to the event listeners in useEffect
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      // Add touch event listeners with passive: false to allow preventDefault()
      container.addEventListener('touchstart', handleTouchStart as any, { passive: false });
      container.addEventListener('touchmove', handleTouchMove as any, { passive: false });
      container.addEventListener('touchend', handleTouchEnd as any);
      container.addEventListener('touchcancel', handleTouchEnd as any);
      
      return () => {
        container.removeEventListener('touchstart', handleTouchStart as any);
        container.removeEventListener('touchmove', handleTouchMove as any);
        container.removeEventListener('touchend', handleTouchEnd as any);
        container.removeEventListener('touchcancel', handleTouchEnd as any);
      };
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
  
  return (
    <div className={`pdf-thumbnail-grid-container ${className}`} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Main container with thumbnails */}
      <div 
        ref={containerRef}
        className="relative flex-grow"
        style={containerStyle}
        onScroll={handleScroll}
        aria-label="PDF page thumbnails"
      >
        {loading && renderLoadingIndicator()}
        
        <div 
          ref={gridRef}
          style={gridStyle}
        >
          {visiblePageNumbers.map(pageNumber => (
            <div 
              key={pageNumber}
              className="thumbnail-wrapper relative"
              aria-label={`Page ${pageNumber}`}
              style={{
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s ease-in-out'
              }}
            >
              <PDFThumbnailRenderer
                pdfData={pdfDataRef}
                pageNumber={pageNumber}
                width={thumbnailWidth}
                height={thumbnailHeight}
                quality={0.7}
                selected={selectedPages.includes(pageNumber)}
                onSelect={handleThumbnailSelect}
                onPreview={handleThumbnailPreview}
                showPageNumber={true}
                priority={Math.abs(pageNumber - currentPage) < 5}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Pagination controls */}
      {renderPagination}
      
      {/* Zoom controls - position based on device */}
      <div style={zoomControlsStyle} className="zoom-controls-container">
        <ZoomControls 
          onZoomChange={handleZoomChange} 
          className={isMobile ? "justify-center" : ""}
        />
      </div>
    </div>
  );
};

export default PDFThumbnailGrid; 