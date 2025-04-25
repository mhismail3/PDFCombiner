import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { pdfThumbnailService } from '../services/PDFThumbnailService';

interface PDFThumbnailRendererProps {
  pdfData: ArrayBuffer;
  pageNumber: number;
  width?: number;
  height?: number;
  quality?: number;
  className?: string;
  selected?: boolean;
  showPageNumber?: boolean;
  onSelect?: (pageNumber: number) => void;
  onPreview?: (pageNumber: number) => void;
  priority?: boolean;
}

/**
 * Component for efficiently rendering PDF thumbnails with memory optimization
 * Uses PDFThumbnailService for better caching and memory management
 */
const PDFThumbnailRenderer: React.FC<PDFThumbnailRendererProps> = ({
  pdfData,
  pageNumber,
  width = 150,
  height,
  quality = 0.7,
  className = '',
  selected = false,
  showPageNumber = true,
  onSelect,
  onPreview,
  priority = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number | null>(null);
  
  // Calculate display height if not provided
  const displayHeight = height || width * 1.4;
  
  // Clone ArrayBuffer to prevent detached buffer issues
  const cloneArrayBuffer = useCallback((buffer: ArrayBuffer): ArrayBuffer => {
    const clone = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(clone).set(new Uint8Array(buffer));
    return clone;
  }, []);
  
  // Use a stable pdfData reference to prevent unnecessary re-renders
  const pdfDataRef = useMemo(() => {
    // Check if pdfData is valid
    if (!pdfData || !(pdfData instanceof ArrayBuffer)) {
      console.warn('Invalid PDF data provided to PDFThumbnailRenderer:', typeof pdfData);
      return null;
    }
    
    // Create a defensive copy to avoid detached buffer issues
    try {
      return cloneArrayBuffer(pdfData);
    } catch (err) {
      console.error('Failed to clone PDF data:', err);
      return null;
    }
  }, [pdfData?.byteLength, cloneArrayBuffer]);
  
  // Get page count
  useEffect(() => {
    let isMounted = true;
    
    const getPageCount = async () => {
      if (!pdfDataRef) {
        if (isMounted) {
          setError('No PDF data available');
          setIsLoading(false);
        }
        return;
      }
      
      try {
        const count = await pdfThumbnailService.getPageCount(pdfDataRef);
        if (isMounted) {
          setPageCount(count);
        }
      } catch (err) {
        console.error('Error getting page count:', err);
        if (isMounted) {
          setError('Failed to get page count');
        }
      }
    };
    
    getPageCount();
    
    return () => { isMounted = false; };
  }, [pdfDataRef]);
  
  // Load the thumbnail
  useEffect(() => {
    let isMounted = true;
    
    const loadThumbnail = async () => {
      if (!pdfDataRef) {
        if (isMounted) {
          setError('No PDF data available');
          setIsLoading(false);
        }
        return;
      }
      
      // Validate page number
      if (pageNumber < 1) {
        if (isMounted) {
          setError(`Invalid page number: ${pageNumber}`);
          setIsLoading(false);
        }
        return;
      }
      
      try {
        setIsLoading(true);
        
        const thumbnail = await pdfThumbnailService.getThumbnail(
          pdfDataRef,
          pageNumber,
          { width, height, quality }
        );
        
        if (isMounted) {
          setThumbnailUrl(thumbnail);
          setIsLoading(false);
          setError(null);
        }
      } catch (err) {
        console.error(`Error loading thumbnail for page ${pageNumber}:`, err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load thumbnail');
          setIsLoading(false);
        }
      }
    };
    
    loadThumbnail();
    
    return () => { isMounted = false; };
  }, [pdfDataRef, pageNumber, width, height, quality]);
  
  // Handle selection
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    if (onSelect) {
      onSelect(pageNumber);
    }
  }, [onSelect, pageNumber]);
  
  // Handle preview
  const handlePreview = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent event bubbling
    if (onPreview) {
      onPreview(pageNumber);
    }
  }, [onPreview, pageNumber]);
  
  return (
    <div 
      className={`relative group rounded overflow-hidden transition-all duration-150 
        ${selected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : 'hover:ring-1 hover:ring-gray-400 dark:hover:ring-gray-500'} 
        ${className}`}
      style={{ width: `${width}px`, height: `${displayHeight}px` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      role="button"
      tabIndex={0}
      aria-label={`Page ${pageNumber}${selected ? ' (selected)' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          if (onSelect) {
            onSelect(pageNumber);
          }
        }
      }}
    >
      {/* Thumbnail container */}
      <div 
        className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 cursor-pointer"
        onClick={handleClick}
      >
        {isLoading ? (
          // Loading state
          <div className="animate-pulse flex flex-col items-center justify-center space-y-2">
            <div className="h-6 w-6 rounded-full bg-gray-300 dark:bg-gray-600"></div>
            <div className="h-2 w-16 rounded bg-gray-300 dark:bg-gray-600"></div>
          </div>
        ) : error ? (
          // Error state
          <div className="text-red-500 dark:text-red-300 text-xs text-center p-2 flex flex-col items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {error}
          </div>
        ) : thumbnailUrl ? (
          // Thumbnail image
          <img
            src={thumbnailUrl}
            alt={`Page ${pageNumber}`}
            className="max-w-full max-h-full object-contain"
            loading="lazy"
            onError={() => setError('Failed to load image')}
          />
        ) : (
          // Fallback/placeholder
          <div className="text-gray-400 dark:text-gray-500 text-xs text-center p-2">
            No thumbnail available
          </div>
        )}
      </div>
      
      {/* Page number badge */}
      {showPageNumber && (
        <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded">
          {pageNumber}{pageCount ? ` / ${pageCount}` : ''}
        </div>
      )}
      
      {/* Action buttons (only visible on hover or when selected) */}
      <div className={`absolute top-1 right-1 transition-opacity duration-150 ${isHovered || selected ? 'opacity-100' : 'opacity-0'}`}>
        {onPreview && (
          <button
            type="button"
            className="bg-blue-500 hover:bg-blue-600 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs"
            onClick={handlePreview}
            aria-label="Preview page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>
      
      {/* Selection indicator */}
      {selected && (
        <div className="absolute top-1 left-1 bg-blue-500 text-white p-1 rounded-full w-6 h-6 flex items-center justify-center text-xs">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default memo(PDFThumbnailRenderer); 