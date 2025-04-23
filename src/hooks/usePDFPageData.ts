import { useState, useEffect, useCallback } from 'react';
import { usePDFWorker } from './usePDFWorker';

/**
 * Type definitions for PDF page data
 */
export interface PDFPageData {
  pageNumber: number;
  dimensions: {
    width: number;
    height: number;
  };
  textContent?: string;
  [key: string]: any;
}

export interface PDFDocumentInfo {
  pageCount: number;
  metadata: {
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    [key: string]: any;
  };
  metadataXML?: string | null;
}

export interface PDFExtractResult {
  docInfo: PDFDocumentInfo;
  pagesData: PDFPageData[];
}

interface UsePDFPageDataOptions {
  includeTextContent?: boolean;
  onProgress?: (pageNumber: number, totalPages: number, pageData: PDFPageData) => void;
}

/**
 * Hook to extract and manage page data from a PDF
 */
export const usePDFPageData = (
  pdfData: ArrayBuffer | null,
  options?: UsePDFPageDataOptions
) => {
  // State for page data and loading
  const [documentInfo, setDocumentInfo] = useState<PDFDocumentInfo | null>(null);
  const [pagesData, setPagesData] = useState<PDFPageData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  
  // Get the PDF worker
  const { extractPageData, isProcessing } = usePDFWorker();
  
  // Extract page data
  useEffect(() => {
    if (!pdfData) {
      // Reset state when no PDF data is provided
      setDocumentInfo(null);
      setPagesData([]);
      setPageCount(0);
      setError(null);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    // Use the worker to extract page data
    const extract = () => {
      return extractPageData(
        pdfData,
        options?.includeTextContent || false,
        (result) => {
          // Set document info
          setDocumentInfo(result.docInfo);
          
          // Set page data
          setPagesData(result.pagesData);
          
          // Set page count
          setPageCount(result.pageCount);
          
          // Mark as loaded
          setIsLoading(false);
        },
        (pageNumber, totalPages, pageData) => {
          // Call progress callback if provided
          if (options?.onProgress) {
            options.onProgress(pageNumber, totalPages, pageData);
          }
        }
      );
    };
    
    const cleanup = extract();
    
    return () => {
      if (cleanup) cleanup();
    };
  }, [pdfData, options?.includeTextContent, options?.onProgress, extractPageData]);
  
  /**
   * Get a specific page's data by page number
   */
  const getPageData = useCallback(
    (pageNumber: number): PDFPageData | null => {
      if (!pagesData || pageNumber < 1 || pageNumber > pagesData.length) {
        return null;
      }
      
      // Page numbers are 1-indexed, but array is 0-indexed
      return pagesData.find(page => page.pageNumber === pageNumber) || null;
    },
    [pagesData]
  );
  
  /**
   * Search for text across all pages
   */
  const searchText = useCallback(
    (searchTerm: string): { pageNumber: number; matches: number }[] => {
      if (!pagesData || !searchTerm || !options?.includeTextContent) {
        return [];
      }
      
      const results = pagesData
        .filter(page => page.textContent && page.textContent.includes(searchTerm))
        .map(page => {
          // Count occurrences
          const regex = new RegExp(searchTerm, 'gi');
          const matches = (page.textContent?.match(regex) || []).length;
          
          return {
            pageNumber: page.pageNumber,
            matches
          };
        })
        .sort((a, b) => b.matches - a.matches); // Sort by most matches
      
      return results;
    },
    [pagesData, options?.includeTextContent]
  );
  
  return {
    documentInfo,
    pagesData,
    pageCount,
    isLoading: isLoading || isProcessing,
    error,
    getPageData,
    searchText
  };
}; 