import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Type definitions for PDF worker communication
 */
type PDFWorkerOperation = 
  | { type: 'MERGE_PDFS'; pdfFiles: { data: ArrayBuffer; name: string }[] }
  | { type: 'EXTRACT_PAGES'; pdfData: ArrayBuffer; pageIndexes: number[] };

type PDFWorkerResponse =
  | { type: 'MERGE_COMPLETE'; result: { data: ArrayBuffer; name: string; size: number } }
  | { type: 'EXTRACT_COMPLETE'; result: ArrayBuffer }
  | { type: 'PROGRESS'; progress: number }
  | { type: 'ERROR'; error: string };

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
    onComplete: (result: T) => void
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
          break;
          
        case 'MERGE_COMPLETE':
        case 'EXTRACT_COMPLETE':
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
    
    // Send operation to worker
    workerRef.current.postMessage(operation);
    
    // Return a function to cancel the operation
    return () => {
      if (workerRef.current) {
        workerRef.current.removeEventListener('message', handleMessage);
      }
      setIsProcessing(false);
    };
  }, []);
  
  /**
   * Merge multiple PDFs into a single PDF
   */
  const mergePDFs = useCallback(
    (
      pdfFiles: { data: ArrayBuffer; name: string }[],
      onComplete: (result: { data: ArrayBuffer; name: string; size: number }) => void
    ) => {
      return executeWorkerOperation<{ data: ArrayBuffer; name: string; size: number }>(
        { type: 'MERGE_PDFS', pdfFiles },
        onComplete
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
      onComplete: (result: ArrayBuffer) => void
    ) => {
      return executeWorkerOperation<ArrayBuffer>(
        { type: 'EXTRACT_PAGES', pdfData, pageIndexes },
        onComplete
      );
    },
    [executeWorkerOperation]
  );
  
  return {
    isProcessing,
    progress,
    error,
    mergePDFs,
    extractPDFPages
  };
}; 