import { useState, useEffect, useCallback, useMemo } from 'react';
import * as pdfjs from 'pdfjs-dist';
import { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import { usePDFWorker } from './usePDFWorker';
import { usePDFThumbnails } from './usePDFThumbnails';
import { usePDFPageData, PDFPageData, PDFDocumentInfo } from './usePDFPageData';

// Initialize PDFjs worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';

// Helper function to clone an ArrayBuffer
function cloneArrayBuffer(buffer: ArrayBuffer | null): ArrayBuffer | null {
  if (!buffer) return null;
  
  // Create a new ArrayBuffer and copy the contents
  const clone = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(clone).set(new Uint8Array(buffer));
  return clone;
}

export interface PDFProcessorOptions {
  includeTextContent?: boolean;
  generateThumbnails?: boolean;
  thumbnailWidth?: number;
  thumbnailHeight?: number;
  thumbnailQuality?: number;
  autoProcess?: boolean;
}

export interface PDFProcessorResult {
  thumbnails: { [pageNumber: number]: string };
  pageData: PDFPageData[];
  docInfo: PDFDocumentInfo | null;
  pageCount: number;
  selectedPages: number[];
}

/**
 * Comprehensive hook for processing PDFs with web workers
 */
export const usePDFProcessor = (
  pdfData: ArrayBuffer | null,
  options: PDFProcessorOptions = {}
) => {
  // Default options
  const {
    includeTextContent = false,
    generateThumbnails = true,
    thumbnailWidth = 150,
    thumbnailHeight,
    thumbnailQuality = 0.7,
    autoProcess = true
  } = options;
  
  // Make defensive copies of the ArrayBuffer to prevent detached buffer issues
  const pdfDataCopy = useMemo(() => cloneArrayBuffer(pdfData), [pdfData]);
  const thumbnailPdfData = useMemo(() => generateThumbnails ? cloneArrayBuffer(pdfData) : null, [pdfData, generateThumbnails]);
  const pageDataPdfData = useMemo(() => cloneArrayBuffer(pdfData), [pdfData]);
  
  // State for processing
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  
  // Get hooks for PDF processing
  const pdfWorker = usePDFWorker();
  const { 
    pageCount: thumbnailPageCount, 
    getThumbnail,
    cacheSize
  } = usePDFThumbnails(thumbnailPdfData, {
    width: thumbnailWidth,
    height: thumbnailHeight,
    quality: thumbnailQuality,
    onProgress: (page, total) => {
      // Update progress based on thumbnail generation (50% of total)
      const thumbnailProgress = (page / total) * 50;
      setProgress(thumbnailProgress);
    }
  });
  
  const {
    documentInfo,
    pagesData,
    pageCount: dataPageCount,
    isLoading: isDataLoading
  } = usePDFPageData(pageDataPdfData, {
    includeTextContent,
    onProgress: (page, total) => {
      // Update progress based on page data extraction (50% to 100%)
      const dataProgress = ((page / total) * 50) + 50;
      setProgress(dataProgress);
    }
  });
  
  // Sync processing state
  useEffect(() => {
    const isWorking = pdfWorker.isProcessing || isDataLoading;
    setIsProcessing(isWorking);
    
    if (!isWorking) {
      setProgress(100);
    }
  }, [pdfWorker.isProcessing, isDataLoading]);
  
  // Sync errors
  useEffect(() => {
    const newError = pdfWorker.error;
    if (newError) {
      setError(newError);
    }
  }, [pdfWorker.error]);
  
  // Get page count
  const pageCount = Math.max(thumbnailPageCount, dataPageCount);
  
  /**
   * Get PDF processing result
   */
  const getResult = useCallback((): PDFProcessorResult => {
    return {
      thumbnails: {}, // Now empty as we're using usePDFThumbnails directly for thumbnails
      pageData: pagesData,
      docInfo: documentInfo,
      pageCount,
      selectedPages
    };
  }, [pageCount, pagesData, documentInfo, selectedPages]);
  
  /**
   * Extract specific pages from the PDF
   */
  const extractPages = useCallback((
    pageIndexes: number[],
    onComplete: (result: ArrayBuffer) => void
  ) => {
    if (!pdfDataCopy) {
      setError('No PDF data available');
      return;
    }
    
    setIsProcessing(true);
    
    // Make another copy for extraction to prevent detached buffer issues
    const extractPdfData = cloneArrayBuffer(pdfDataCopy);
    
    if (!extractPdfData) {
      setError('Failed to clone PDF data for extraction');
      return;
    }
    
    return pdfWorker.extractPDFPages(
      extractPdfData,
      pageIndexes.map(p => p - 1), // Convert to 0-indexed for the worker
      result => {
        setIsProcessing(false);
        onComplete(result);
      },
      prog => {
        setProgress(prog);
      }
    );
  }, [pdfDataCopy, pdfWorker]);
  
  /**
   * Update selected pages
   */
  const selectPages = useCallback((
    pages: number[],
    replace: boolean = true
  ) => {
    if (replace) {
      setSelectedPages(pages);
    } else {
      setSelectedPages(prev => {
        const combined = [...prev, ...pages];
        // Remove duplicates and sort
        return Array.from(new Set(combined)).sort((a, b) => a - b);
      });
    }
  }, []);
  
  /**
   * Toggle page selection
   */
  const togglePageSelection = useCallback((
    pageNumber: number
  ) => {
    setSelectedPages(prev => {
      const isSelected = prev.includes(pageNumber);
      if (isSelected) {
        return prev.filter(p => p !== pageNumber);
      } else {
        return [...prev, pageNumber].sort((a, b) => a - b);
      }
    });
  }, []);
  
  /**
   * Select all pages
   */
  const selectAllPages = useCallback(() => {
    if (pageCount > 0) {
      const allPages = Array.from({ length: pageCount }, (_, i) => i + 1);
      setSelectedPages(allPages);
    }
  }, [pageCount]);
  
  /**
   * Clear page selection
   */
  const clearSelection = useCallback(() => {
    setSelectedPages([]);
  }, []);
  
  return {
    isProcessing,
    progress,
    error,
    pageCount,
    selectedPages,
    documentInfo,
    pagesData,
    extractPages,
    selectPages,
    togglePageSelection,
    selectAllPages,
    clearSelection,
    getResult
  };
}; 