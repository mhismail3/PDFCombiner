import { useState, useEffect, useCallback, useRef } from 'react';
import { usePDFWorker, PDFPageInfo } from './usePDFWorker';
import { pdfService } from '../services/PDFService';
import { PDFThumbnailCache } from '../utils/cacheManager';

interface UsePDFThumbnailsOptions {
  width?: number;
  height?: number;
  quality?: number;
  maxCacheSize?: number;
  onProgress?: (pageNumber: number, totalPages: number) => void;
}

/**
 * Hook to manage thumbnail generation for a PDF
 */
export const usePDFThumbnails = (
  pdfData: ArrayBuffer | null,
  options?: UsePDFThumbnailsOptions
) => {
  // Extract options with defaults
  const {
    width = 150,
    height,
    quality = 0.7,
    maxCacheSize = 200,
    onProgress
  } = options || {};
  
  // State for thumbnails and loading
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const cacheRef = useRef<PDFThumbnailCache>(new PDFThumbnailCache(maxCacheSize));
  const [pageCount, setPageCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Used to create a unique cache prefix for each PDF file
  const pdfHashRef = useRef<string>('');
  
  // Get the PDF worker
  const { generatePDFThumbnails, isProcessing } = usePDFWorker();
  
  // When maxCacheSize changes, update the cache capacity
  useEffect(() => {
    cacheRef.current.setCapacity(maxCacheSize);
  }, [maxCacheSize]);
  
  // Generate a hash of the PDF data for cache key
  useEffect(() => {
    if (!pdfData) {
      pdfHashRef.current = '';
      return;
    }
    
    // Create a simple hash of the ArrayBuffer
    const hash = Array.from(new Uint8Array(pdfData.slice(0, 1024)))
      .reduce((sum, byte) => sum + byte, 0)
      .toString(16);
    
    pdfHashRef.current = hash;
  }, [pdfData]);
  
  // Get page count first
  useEffect(() => {
    const fetchPageCount = async () => {
      if (!pdfData) {
        setPageCount(0);
        setThumbnails([]);
        return;
      }
      
      try {
        const pdfDoc = await pdfService.loadDocument(pdfData);
        const count = await pdfService.getPageCount(pdfDoc);
        setPageCount(count);
        await pdfDoc.destroy(); // Clean up
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to get PDF page count');
        console.error('Error getting PDF page count:', err);
      }
    };
    
    fetchPageCount();
  }, [pdfData]);
  
  // Generate thumbnails for all pages
  useEffect(() => {
    if (!pdfData || pageCount === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    // Use the worker to get page information
    const generateThumbnails = () => {
      return generatePDFThumbnails(
        pdfData,
        pageCount,
        (result) => {
          setIsLoading(false);
        },
        async (pageNumber, totalPages, pageInfo) => {
          // Use the page info to generate the actual thumbnail in the main thread
          try {
            // Create a cache key for this page/size combination
            const pageWidth = pageInfo.width || width;
            const pageHeight = pageInfo.height || height;
            
            // Check if we already have this thumbnail cached
            if (cacheRef.current.hasThumbnail(pageInfo.pageNumber, pageWidth, pageHeight)) {
              // Update progress even for cached thumbnails
              if (onProgress) {
                onProgress(pageNumber, totalPages);
              }
              return;
            }
            
            // Load the PDF document in the main thread
            const pdfDoc = await pdfService.loadDocument(pdfData);
            
            // Get the page
            const page = await pdfService.getPage(pdfDoc, pageInfo.pageNumber);
            
            // Generate the thumbnail
            const thumbnail = await pdfService.generateThumbnail(pdfDoc, {
              pageNumber: pageInfo.pageNumber,
              width: pageWidth,
              height: pageHeight,
              quality: quality
            });
            
            // Cache the thumbnail
            cacheRef.current.setThumbnail(
              pageInfo.pageNumber,
              pageWidth,
              pageHeight,
              thumbnail
            );
            
            // Update progress
            if (onProgress) {
              onProgress(pageNumber, totalPages);
            }
            
            // Clean up
            await pdfDoc.destroy();
          } catch (err) {
            console.error('Error generating thumbnail:', err);
          }
        },
        {
          width,
          height,
          quality
        }
      );
    };
    
    const cleanup = generateThumbnails();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [pdfData, pageCount, generatePDFThumbnails, width, height, quality, onProgress]);
  
  // Get a specific thumbnail
  const getThumbnail = useCallback(
    (pageNumber: number): string | null => {
      if (!pdfData || pageNumber < 1 || pageNumber > pageCount) {
        return null;
      }
      
      return cacheRef.current.getThumbnail(pageNumber, width, height) || null;
    },
    [pdfData, pageCount, width, height]
  );
  
  // Prefetch a range of thumbnails
  const prefetchThumbnails = useCallback(
    async (startPage: number, endPage: number): Promise<void> => {
      if (!pdfData) return;
      
      const fetchThumbnail = async (pageNumber: number): Promise<string> => {
        // If we already have it cached, return it
        const cached = cacheRef.current.getThumbnail(pageNumber, width, height);
        if (cached) return cached;
        
        // Otherwise generate it
        const pdfDoc = await pdfService.loadDocument(pdfData);
        const thumbnail = await pdfService.generateThumbnail(pdfDoc, {
          pageNumber,
          width,
          height,
          quality
        });
        
        await pdfDoc.destroy();
        return thumbnail;
      };
      
      await cacheRef.current.prefetchRange(
        fetchThumbnail,
        startPage,
        endPage,
        width,
        height
      );
    },
    [pdfData, width, height, quality]
  );
  
  // Clear the cache
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);
  
  // Get cached pages
  const getCachedPages = useCallback(() => {
    return cacheRef.current.getCachedPages();
  }, []);
  
  return {
    thumbnails,
    pageCount,
    isLoading: isLoading || isProcessing,
    error,
    getThumbnail,
    prefetchThumbnails,
    clearCache,
    getCachedPages,
    cacheSize: cacheRef.current.size
  };
}; 