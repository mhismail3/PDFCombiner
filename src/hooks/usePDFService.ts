import { useState, useCallback } from 'react';
import { pdfService, ThumbnailOptions } from '../services/PDFService';

/**
 * Hook to provide access to the PDFService functionality
 * with React state management and memoized callbacks
 */
export const usePDFService = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  /**
   * Make a defensive copy of ArrayBuffer to prevent detached buffer issues
   */
  const cloneArrayBuffer = useCallback((buffer: ArrayBuffer): ArrayBuffer => {
    try {
      const clone = new ArrayBuffer(buffer.byteLength);
      new Uint8Array(clone).set(new Uint8Array(buffer));
      return clone;
    } catch (err) {
      console.error('Failed to clone ArrayBuffer:', err);
      throw new Error('Failed to process PDF data');
    }
  }, []);
  
  /**
   * Validate PDF data before processing
   */
  const validateData = useCallback((pdfData: ArrayBuffer): boolean => {
    if (!pdfData || pdfData.byteLength === 0) {
      setError('Invalid PDF data: Empty buffer');
      return false;
    }
    
    // Validate PDF header (simple check for %PDF)
    try {
      const header = new Uint8Array(pdfData, 0, 4);
      const headerString = String.fromCharCode.apply(null, Array.from(header));
      
      if (headerString !== '%PDF') {
        console.error('Invalid PDF header:', headerString);
        setError('Invalid PDF format: File does not appear to be a valid PDF');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error validating PDF header:', err);
      setError('Failed to validate PDF format');
      return false;
    }
  }, []);
  
  /**
   * Get a thumbnail for a specific page
   */
  const getThumbnail = useCallback(async (
    pdfData: ArrayBuffer,
    pageNumber: number,
    width?: number,
    height?: number,
    quality: number = 0.7
  ): Promise<string> => {
    if (!validateData(pdfData)) {
      throw new Error('Invalid PDF data');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Generating thumbnail for page ${pageNumber} with data length ${pdfData.byteLength}`);
      
      // Create a defensive copy of the ArrayBuffer
      const pdfDataCopy = cloneArrayBuffer(pdfData);
      
      // Configure options
      const options: ThumbnailOptions = {
        pageNumber,
        quality
      };
      
      if (width) options.width = width;
      if (height) options.height = height;
      
      // Load the document
      const pdfDoc = await pdfService.loadDocument(pdfDataCopy);
      
      // Generate the thumbnail
      const thumbnail = await pdfService.generateThumbnail(pdfDoc, options);
      
      // Clean up
      await pdfDoc.destroy();
      
      setIsLoading(false);
      return thumbnail;
    } catch (err) {
      console.error(`Error generating thumbnail for page ${pageNumber}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load thumbnail';
      setError(errorMessage);
      setIsLoading(false);
      throw new Error(errorMessage);
    }
  }, [cloneArrayBuffer, validateData]);
  
  /**
   * Get the page count of a PDF
   */
  const getPageCount = useCallback(async (pdfData: ArrayBuffer): Promise<number> => {
    if (!validateData(pdfData)) {
      throw new Error('Invalid PDF data');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Getting page count for PDF with data length ${pdfData.byteLength}`);
      
      // Create a defensive copy of the ArrayBuffer
      const pdfDataCopy = cloneArrayBuffer(pdfData);
      
      const pdfDoc = await pdfService.loadDocument(pdfDataCopy);
      const count = await pdfService.getPageCount(pdfDoc);
      await pdfDoc.destroy();
      
      setIsLoading(false);
      console.log(`PDF has ${count} pages`);
      return count;
    } catch (err) {
      console.error('Error getting page count:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to get page count';
      setError(errorMessage);
      setIsLoading(false);
      throw new Error(errorMessage);
    }
  }, [cloneArrayBuffer, validateData]);
  
  /**
   * Validate a PDF file
   */
  const validatePDF = useCallback(async (pdfData: ArrayBuffer): Promise<boolean> => {
    if (!pdfData || pdfData.byteLength === 0) {
      setError('Invalid PDF data: Empty buffer');
      return false;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Validating PDF with data length ${pdfData.byteLength}`);
      
      // Create a defensive copy of the ArrayBuffer
      const pdfDataCopy = cloneArrayBuffer(pdfData);
      
      const result = await pdfService.validatePDF(pdfDataCopy);
      setIsLoading(false);
      
      if (!result.isValid && result.error) {
        console.error('PDF validation failed:', result.error);
        setError(result.error);
      }
      
      return result.isValid;
    } catch (err) {
      console.error('Error validating PDF:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to validate PDF';
      setError(errorMessage);
      setIsLoading(false);
      return false;
    }
  }, [cloneArrayBuffer]);
  
  return {
    isLoading,
    error,
    getThumbnail,
    getPageCount,
    validatePDF,
    // Expose the service directly for advanced usage
    service: pdfService
  };
}; 