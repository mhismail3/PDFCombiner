import React, { useState, useEffect } from 'react';
import { pdfService, ThumbnailOptions } from '../services/PDFService';
import { usePDFThumbnails } from '../hooks/usePDFThumbnails';

interface PDFThumbnailProps {
  pdfData: ArrayBuffer;
  pageNumber?: number;
  width?: number;
  height?: number;
  className?: string;
  onClick?: () => void;
  alt?: string;
  useWorker?: boolean; // Whether to use the web worker for thumbnail generation
}

/**
 * Component to render a thumbnail of a PDF page
 */
const PDFThumbnail: React.FC<PDFThumbnailProps> = ({
  pdfData,
  pageNumber = 1,
  width = 150,
  height,
  className = '',
  onClick,
  alt = 'PDF thumbnail',
  useWorker = true
}) => {
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // If useWorker is true, use the hook that leverages the web worker
  const {
    getThumbnail,
    isLoading: isWorkerLoading,
    error: workerError
  } = usePDFThumbnails(useWorker ? pdfData : null, {
    width,
    height,
    quality: 0.7
  });
  
  // Effect to get thumbnail when not using worker (or as fallback)
  useEffect(() => {
    let isMounted = true;
    
    const generateThumbnail = async () => {
      // If we're using the worker and it has generated a thumbnail, use that
      if (useWorker) {
        const workerThumbnail = getThumbnail(pageNumber);
        if (workerThumbnail) {
          setThumbnailUrl(workerThumbnail);
          setIsLoading(false);
          return;
        }
      }
      
      // Otherwise, fallback to direct generation
      try {
        setIsLoading(true);
        setError(null);
        
        // Calculate the options for the thumbnail
        const options: ThumbnailOptions = {
          pageNumber,
          quality: 0.7
        };
        
        // Use width or height if specified (maintain aspect ratio)
        if (width) {
          options.width = width;
        } else if (height) {
          options.height = height;
        }
        
        // Generate the thumbnail
        const pdfDoc = await pdfService.loadDocument(pdfData);
        const thumbnail = await pdfService.generateThumbnail(pdfDoc, options);
        await pdfDoc.destroy(); // Clean up resources
        
        // Update state if component is still mounted
        if (isMounted) {
          setThumbnailUrl(thumbnail);
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Failed to generate thumbnail');
          setIsLoading(false);
        }
      }
    };
    
    generateThumbnail();
    
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [pdfData, pageNumber, width, height, useWorker, getThumbnail]);
  
  // If using worker, check its state first
  const finalIsLoading = useWorker ? isWorkerLoading || isLoading : isLoading;
  const finalError = useWorker ? workerError || error : error;
  
  // Loading state
  if (finalIsLoading && !thumbnailUrl) {
    return (
      <div 
        className={`bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-center ${className}`}
        style={{ width: `${width}px`, height: height || width * 1.4 }}
      >
        <div className="animate-pulse h-8 w-8 rounded-full bg-gray-300 dark:bg-gray-600"></div>
      </div>
    );
  }
  
  // Error state
  if (finalError && !thumbnailUrl) {
    return (
      <div 
        className={`bg-red-100 dark:bg-red-900 rounded flex items-center justify-center ${className}`}
        style={{ width: `${width}px`, height: height || width * 1.4 }}
      >
        <div className="text-red-500 dark:text-red-300 text-xs text-center p-2">
          {finalError || 'Failed to load thumbnail'}
        </div>
      </div>
    );
  }
  
  // Render the thumbnail
  return (
    <img
      src={thumbnailUrl || ''}
      alt={alt}
      className={`rounded ${onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''} ${className}`}
      style={{ 
        width: width ? `${width}px` : 'auto',
        height: height ? `${height}px` : 'auto',
        objectFit: 'contain'
      }}
      onClick={onClick}
    />
  );
};

export default PDFThumbnail; 