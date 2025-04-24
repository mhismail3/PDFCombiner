import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Type definitions for PDF worker communication
 */
type PDFWorkerOperation = 
  | { type: 'MERGE_PDFS'; pdfFiles: { data: ArrayBuffer; name: string }[] }
  | { type: 'EXTRACT_PAGES'; pdfData: ArrayBuffer; pageIndexes: number[] }
  | { type: 'GENERATE_THUMBNAILS'; pdfData: ArrayBuffer; pageCount: number; options?: { width?: number; height?: number; quality?: number } }
  | { type: 'EXTRACT_PAGE_DATA'; pdfData: ArrayBuffer; includeTextContent?: boolean };

type PDFWorkerResponse =
  | { type: 'MERGE_COMPLETE'; result: { data: ArrayBuffer; name: string; size: number } }
  | { type: 'EXTRACT_COMPLETE'; result: ArrayBuffer }
  | { type: 'THUMBNAILS_COMPLETE'; result: string[] }
  | { type: 'THUMBNAIL_PROGRESS'; pageNumber: number; totalPages: number; pageInfo: { pageNumber: number; width: number; height: number; scale: number } }
  | { type: 'PAGE_DATA_COMPLETE'; result: { pageCount: number; docInfo: any; pagesData: any[] } }
  | { type: 'PAGE_DATA_PROGRESS'; pageNumber: number; totalPages: number; pageData: any }
  | { type: 'PROGRESS'; progress: number }
  | { type: 'ERROR'; error: string };

/**
 * Define a type for page info
 */
export interface PDFPageInfo {
  pageNumber: number;
  width: number;
  height: number;
  scale: number;
}

/**
 * Helper function to clone an ArrayBuffer to prevent detached buffer errors
 */
function cloneArrayBuffer(buffer: ArrayBuffer): ArrayBuffer {
  // Create a new ArrayBuffer and copy the contents
  const clone = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(clone).set(new Uint8Array(buffer));
  return clone;
}

/**
 * Hook to interface with the PDF worker
 */
export const usePDFWorker = () => {
  // Create worker reference
  const workerRef = useRef<Worker | null>(null);
  
  // State for tracking operations
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Initialize worker on mount
  useEffect(() => {
    // Create worker
    workerRef.current = new Worker(new URL('../workers/pdfWorker.ts', import.meta.url), {
      type: 'module'
    });
    
    // Clean up worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);
  
  /**
   * Send a message to the worker and handle responses
   */
  const executeWorkerOperation = useCallback(<T>(
    operation: PDFWorkerOperation,
    onComplete: (result: T) => void,
    onProgress?: (progress: number) => void,
    onThumbnailProgress?: (pageNumber: number, totalPages: number, pageInfo: PDFPageInfo) => void,
    onPageDataProgress?: (pageNumber: number, totalPages: number, pageData: any) => void
  ) => {
    if (!workerRef.current) {
      setError('PDF worker not initialized');
      return;
    }
    
    setIsProcessing(true);
    setProgress(0);
    setError(null);
    
    // Set up message handler
    const handleMessage = (event: MessageEvent<PDFWorkerResponse>) => {
      const { data } = event;
      
      switch (data.type) {
        case 'PROGRESS':
          setProgress(data.progress);
          if (onProgress) {
            onProgress(data.progress);
          }
          break;
          
        case 'THUMBNAIL_PROGRESS':
          if (onThumbnailProgress) {
            onThumbnailProgress(
              data.pageNumber,
              data.totalPages,
              data.pageInfo
            );
          }
          setProgress((data.pageNumber / data.totalPages) * 100);
          break;
          
        case 'PAGE_DATA_PROGRESS':
          if (onPageDataProgress) {
            onPageDataProgress(
              data.pageNumber,
              data.totalPages,
              data.pageData
            );
          }
          setProgress((data.pageNumber / data.totalPages) * 100);
          break;
          
        case 'MERGE_COMPLETE':
        case 'EXTRACT_COMPLETE':
        case 'THUMBNAILS_COMPLETE':
        case 'PAGE_DATA_COMPLETE':
          setIsProcessing(false);
          setProgress(100);
          onComplete(data.result as unknown as T);
          
          // Remove event listener
          if (workerRef.current) {
            workerRef.current.removeEventListener('message', handleMessage);
          }
          break;
          
        case 'ERROR':
          setIsProcessing(false);
          setError(data.error);
          
          // Remove event listener
          if (workerRef.current) {
            workerRef.current.removeEventListener('message', handleMessage);
          }
          break;
      }
    };
    
    // Add event listener
    workerRef.current.addEventListener('message', handleMessage);
    
    try {
      // Clone operation data to prevent detached buffer issues
      let clonedOperation: PDFWorkerOperation;
      
      switch (operation.type) {
        case 'MERGE_PDFS':
          clonedOperation = {
            type: 'MERGE_PDFS',
            pdfFiles: operation.pdfFiles.map(file => ({
              name: file.name,
              data: cloneArrayBuffer(file.data)
            }))
          };
          break;
          
        case 'EXTRACT_PAGES':
          clonedOperation = {
            type: 'EXTRACT_PAGES',
            pdfData: cloneArrayBuffer(operation.pdfData),
            pageIndexes: [...operation.pageIndexes]
          };
          break;
          
        case 'GENERATE_THUMBNAILS':
          clonedOperation = {
            type: 'GENERATE_THUMBNAILS',
            pdfData: cloneArrayBuffer(operation.pdfData),
            pageCount: operation.pageCount,
            options: operation.options ? { ...operation.options } : undefined
          };
          break;
          
        case 'EXTRACT_PAGE_DATA':
          clonedOperation = {
            type: 'EXTRACT_PAGE_DATA',
            pdfData: cloneArrayBuffer(operation.pdfData),
            includeTextContent: operation.includeTextContent
          };
          break;
          
        default:
          throw new Error('Unknown operation type');
      }
      
      // Send cloned operation to worker
      workerRef.current.postMessage(clonedOperation);
    } catch (error) {
      // Handle any cloning errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(errorMessage);
      setIsProcessing(false);
      
      // Clean up event listener
      if (workerRef.current) {
        workerRef.current.removeEventListener('message', handleMessage);
      }
    }
    
    // Return a function to cancel the operation
    return () => {
      if (workerRef.current) {
        workerRef.current.removeEventListener('message', handleMessage);
      }
      setIsProcessing(false);
    };
  }, [workerRef]);
  
  /**
   * Merge multiple PDFs into a single PDF
   */
  const mergePDFs = useCallback(
    (
      pdfFiles: { data: ArrayBuffer; name: string }[],
      onComplete: (result: { data: ArrayBuffer; name: string; size: number }) => void,
      onProgress?: (progress: number) => void
    ) => {
      return executeWorkerOperation<{ data: ArrayBuffer; name: string; size: number }>(
        { type: 'MERGE_PDFS', pdfFiles },
        onComplete,
        onProgress
      );
    },
    [executeWorkerOperation]
  );
  
  /**
   * Extract specific pages from a PDF
   */
  const extractPDFPages = useCallback(
    (
      pdfData: ArrayBuffer,
      pageIndexes: number[],
      onComplete: (result: ArrayBuffer) => void,
      onProgress?: (progress: number) => void
    ) => {
      return executeWorkerOperation<ArrayBuffer>(
        { type: 'EXTRACT_PAGES', pdfData, pageIndexes },
        onComplete,
        onProgress
      );
    },
    [executeWorkerOperation]
  );
  
  /**
   * Generate thumbnails for a PDF document
   */
  const generatePDFThumbnails = useCallback(
    (
      pdfData: ArrayBuffer,
      pageCount: number,
      onComplete: (result: string[]) => void,
      onThumbnailProgress?: (pageNumber: number, totalPages: number, pageInfo: PDFPageInfo) => void,
      options?: { width?: number; height?: number; quality?: number }
    ) => {
      return executeWorkerOperation<string[]>(
        { type: 'GENERATE_THUMBNAILS', pdfData, pageCount, options },
        onComplete,
        undefined,
        onThumbnailProgress
      );
    },
    [executeWorkerOperation]
  );
  
  /**
   * Extract page data from a PDF document
   */
  const extractPageData = useCallback(
    (
      pdfData: ArrayBuffer,
      includeTextContent: boolean = false,
      onComplete: (result: { pageCount: number; docInfo: any; pagesData: any[] }) => void,
      onPageDataProgress?: (pageNumber: number, totalPages: number, pageData: any) => void
    ) => {
      return executeWorkerOperation<{ pageCount: number; docInfo: any; pagesData: any[] }>(
        { type: 'EXTRACT_PAGE_DATA', pdfData, includeTextContent },
        onComplete,
        undefined,
        undefined,
        onPageDataProgress
      );
    },
    [executeWorkerOperation]
  );
  
  return {
    isProcessing,
    progress,
    error,
    mergePDFs,
    extractPDFPages,
    generatePDFThumbnails,
    extractPageData
  };
}; 