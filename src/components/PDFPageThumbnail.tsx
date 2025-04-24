import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { usePDFService } from '../hooks/usePDFService';

interface PDFPageThumbnailProps {
  pdfData: ArrayBuffer;
  pageNumber: number;
  pageCount?: number;
  width?: number;
  height?: number;
  selected?: boolean;
  onSelect?: (pageNumber: number) => void;
  onPreview?: (pageNumber: number) => void;
  className?: string;
}

/**
 * Memory-optimized thumbnail component for PDF pages
 * Uses usePDFService hook to generate thumbnails
 */
const PDFPageThumbnail: React.FC<PDFPageThumbnailProps> = ({
  pdfData,
  pageNumber,
  pageCount,
  width = 150,
  height,
  selected = false,
  onSelect,
  onPreview,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const { getThumbnail, isLoading: serviceLoading } = usePDFService();
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Create a stable reference to the ArrayBuffer to prevent re-renders
  const pdfDataRef = useMemo(() => pdfData, [pdfData?.byteLength]);
  
  // Calculate thumbnail height if not provided
  const thumbnailHeight = height || width * 1.4;
  
  // Load thumbnail
  useEffect(() => {
    let isMounted = true;
    let thumbnailDataUrl: string | null = null;
    
    const loadThumbnail = async () => {
      // Don't attempt to load if no data
      if (!pdfDataRef || pdfDataRef.byteLength === 0) {
        if (isMounted) {
          setError('PDF data is invalid or empty');
          setIsLoading(false);
        }
        return;
      }
      
      try {
        setIsLoading(true);
        
        // Get thumbnail from service
        thumbnailDataUrl = await getThumbnail(pdfDataRef, pageNumber, width, height);
        
        if (isMounted) {
          setThumbnailUrl(thumbnailDataUrl);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to load thumbnail');
          setThumbnailUrl(null);
          setIsLoading(false);
        }
      }
    };
    
    // Start loading
    loadThumbnail();
    
    // Cleanup function
    return () => {
      isMounted = false;
      // Free memory
      if (thumbnailDataUrl) {
        URL.revokeObjectURL(thumbnailDataUrl);
      }
    };
  }, [pdfDataRef, pdfDataRef?.byteLength, pageNumber, width, height, getThumbnail]);
  
  // Handle clicks
  const handleClick = useCallback(() => {
    if (onSelect) {
      onSelect(pageNumber);
    }
  }, [onSelect, pageNumber]);
  
  // Handle preview
  const handlePreview = useCallback(() => {
    if (onPreview) {
      onPreview(pageNumber);
    }
  }, [onPreview, pageNumber]);
  
  return (
    <div 
      className={`relative group rounded overflow-hidden transition-all duration-150 
        ${selected ? 'ring-2 ring-blue-500 dark:ring-blue-400' : 'hover:ring-1 hover:ring-gray-400 dark:hover:ring-gray-500'} 
        ${className}`}
      style={{ width: `${width}px`, height: `${thumbnailHeight}px` }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail container */}
      <div 
        className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 cursor-pointer"
        onClick={handleClick}
      >
        {isLoading || !thumbnailUrl ? (
          // Loading state
          <div className="animate-pulse h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600"></div>
        ) : error ? (
          // Error state
          <div className="text-red-500 dark:text-red-300 text-xs text-center p-2">
            {error}
          </div>
        ) : (
          // Thumbnail image
          <img
            src={thumbnailUrl}
            alt={`Page ${pageNumber}`}
            className="max-w-full max-h-full object-contain"
            loading="lazy" // Add native lazy loading
          />
        )}
      </div>
      
      {/* Page number badge */}
      <div className="absolute bottom-1 left-1 bg-black bg-opacity-60 text-white text-xs px-1.5 py-0.5 rounded">
        {pageNumber}{pageCount ? ` / ${pageCount}` : ''}
      </div>
      
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
export default memo(PDFPageThumbnail); 