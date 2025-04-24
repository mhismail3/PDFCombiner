/**
 * Utility functions for handling PDF files
 */

import { PDFDocument } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';
import { ValidationResult } from './fileValidator';
import { showNotification } from '../store/slices/uiSlice';
import { store } from '../store';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf-worker/pdf.worker.min.mjs';

/**
 * Check if a file is a PDF
 * @deprecated Use FileValidator.validateFileType instead
 */
export const isPdfFile = (file: File): boolean => {
  return file.type === 'application/pdf';
};

/**
 * Convert File to ArrayBuffer
 */
export const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Log error in a way that can be controlled globally
 * @param message Error message prefix
 * @param error Error object
 */
const logError = (message: string, error: unknown): void => {
  // In development, we might still want to see errors
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.error(message, error);
  }
  
  // Always log to error monitoring service if available
  // errorMonitoringService.captureError(error);
  
  // Notify the user through UI
  const errorMessage = error instanceof Error ? error.message : String(error);
  store.dispatch(
    showNotification({
      message: `${message}: ${errorMessage}`,
      type: 'error',
    })
  );
};

/**
 * Clone an ArrayBuffer to prevent detached buffer issues
 */
const cloneArrayBuffer = (buffer: ArrayBuffer): ArrayBuffer => {
  const clone = new ArrayBuffer(buffer.byteLength);
  new Uint8Array(clone).set(new Uint8Array(buffer));
  return clone;
};

/**
 * Generate a thumbnail for a PDF file
 */
export const generatePDFThumbnail = async (pdfData: ArrayBuffer): Promise<string> => {
  try {
    // Clone the ArrayBuffer to prevent detached buffer issues
    const clonedData = cloneArrayBuffer(pdfData);
    
    // Load the PDF document
    const loadingTask = pdfjs.getDocument({ data: clonedData });
    const pdf = await loadingTask.promise;

    // Get the first page
    const page = await pdf.getPage(1);

    // Set the scale for the thumbnail (adjust as needed)
    const viewport = page.getViewport({ scale: 0.5 });

    // Create a canvas for rendering
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Failed to get canvas context');
    }

    // Set canvas dimensions
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render the page to the canvas
    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    // Convert canvas to base64 image
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch (error) {
    logError('Error generating PDF thumbnail', error);
    throw error;
  }
};

/**
 * Get the number of pages in a PDF
 */
export const getPDFPageCount = async (pdfData: ArrayBuffer): Promise<number> => {
  try {
    // Clone the ArrayBuffer to prevent detached buffer issues
    const clonedData = cloneArrayBuffer(pdfData);
    
    const loadingTask = pdfjs.getDocument({ data: clonedData });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } catch (error) {
    logError('Error getting PDF page count', error);
    throw error;
  }
};

/**
 * Check if the PDF is valid and can be opened
 */
export const validatePDFContent = async (pdfData: ArrayBuffer): Promise<ValidationResult> => {
  try {
    // Clone the ArrayBuffer to prevent detached buffer issues
    const clonedData = cloneArrayBuffer(pdfData);
    
    const loadingTask = pdfjs.getDocument({ data: clonedData });
    const pdf = await loadingTask.promise;

    if (pdf.numPages < 1) {
      return {
        isValid: false,
        errorCode: 'EMPTY_PDF',
        errorMessage: 'The PDF file does not contain any pages.',
      };
    }

    return { isValid: true };
  } catch (error) {
    return {
      isValid: false,
      errorCode: 'INVALID_PDF_CONTENT',
      errorMessage:
        error instanceof Error
          ? `Invalid PDF content: ${error.message}`
          : 'Could not parse PDF content. The file may be corrupted or password protected.',
    };
  }
};

/**
 * Format file size to readable format
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Create a Blob URL from ArrayBuffer
 */
export const createBlobUrl = (data: ArrayBuffer, mimeType = 'application/pdf'): string => {
  const blob = new Blob([data], { type: mimeType });
  return URL.createObjectURL(blob);
};

/**
 * Download a Blob as a file
 */
export const downloadBlob = (blobUrl: string, fileName: string): void => {
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = fileName;
  link.click();
  // Clean up
  setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
};

/**
 * Merge multiple PDFs into a single PDF
 */
export const mergePDFs = async (
  pdfFiles: { data: ArrayBuffer; name: string }[],
  progressCallback?: (progress: number) => void
): Promise<{ data: ArrayBuffer; name: string; size: number }> => {
  try {
    // Create a new PDF document
    const mergedPdf = await PDFDocument.create();

    // Keep track of progress
    let processedFiles = 0;
    const totalFiles = pdfFiles.length;

    // Process each PDF file
    for (const pdfFile of pdfFiles) {
      try {
        // Load the PDF
        const pdf = await PDFDocument.load(pdfFile.data);

        // Copy all pages from the source PDF to the merged PDF
        const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        pages.forEach(page => {
          mergedPdf.addPage(page);
        });

        // Update progress
        processedFiles++;
        if (progressCallback) {
          progressCallback((processedFiles / totalFiles) * 100);
        }
      } catch (error) {
        logError(`Error processing ${pdfFile.name}`, error);
        throw new Error(`Failed to process ${pdfFile.name}. ${error}`);
      }
    }

    // Save the merged PDF as an ArrayBuffer
    const mergedPdfBytes = await mergedPdf.save();

    // Create a name for the merged file
    const timestamp = new Date().toISOString().replace(/:/g, '-').substring(0, 19);
    const mergedFileName = `merged_document_${timestamp}.pdf`;

    // Return the merged PDF data
    return {
      data: mergedPdfBytes.buffer as ArrayBuffer,
      name: mergedFileName,
      size: mergedPdfBytes.byteLength,
    };
  } catch (error) {
    logError('Error merging PDFs', error);
    throw error;
  }
};

/**
 * Extract specific pages from a PDF
 */
export const extractPDFPages = async (
  pdfData: ArrayBuffer,
  pageIndexes: number[]
): Promise<ArrayBuffer> => {
  try {
    // Load the PDF
    const sourcePdf = await PDFDocument.load(pdfData);

    // Create a new PDF document
    const newPdf = await PDFDocument.create();

    // Copy the specified pages
    for (const pageIndex of pageIndexes) {
      if (pageIndex >= 0 && pageIndex < sourcePdf.getPageCount()) {
        const [page] = await newPdf.copyPages(sourcePdf, [pageIndex]);
        newPdf.addPage(page);
      }
    }

    // Save the new PDF
    const newPdfBytes = await newPdf.save();
    return newPdfBytes.buffer as ArrayBuffer;
  } catch (error) {
    logError('Error extracting PDF pages', error);
    throw error;
  }
};

/**
 * Check if the PDF is password protected
 */
export const isPDFPasswordProtected = async (pdfData: ArrayBuffer): Promise<boolean> => {
  try {
    // Attempt to load the PDF document with PDFLib
    await PDFDocument.load(pdfData, {
      ignoreEncryption: false,
    });
    
    // If we get here without an error, the PDF is not encrypted or we have the password
    return false;
  } catch (error) {
    // Check if the error is related to encryption
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (
      errorMessage.includes('encrypted') ||
      errorMessage.includes('password') ||
      errorMessage.includes('decrypt')
    ) {
      return true;
    }
    
    // For other errors, we'll assume it's not related to password protection
    throw error;
  }
};
