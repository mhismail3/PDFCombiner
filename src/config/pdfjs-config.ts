/**
 * PDF.js Configuration
 * 
 * Central configuration for PDF.js settings to ensure consistency across the application
 */

// Ensure we're importing pdfjs globally for configuration
import * as pdfjs from 'pdfjs-dist';

// The worker path can change based on environment
export const getPdfWorkerSrc = (): string => {
  // Development environment (local server)
  if (process.env.NODE_ENV === 'development') {
    // Try to find the worker from public directory first
    const workerPath = '/pdf-worker/pdf.worker.min.mjs';
    
    // Validate that the worker is accessible
    try {
      // Test if the URL is valid by creating an XMLHttpRequest
      const xhr = new XMLHttpRequest();
      xhr.open('HEAD', workerPath, false);
      xhr.send();
      
      if (xhr.status >= 200 && xhr.status < 300) {
        return workerPath;
      }
      
      console.warn(`PDF.js worker not found at ${workerPath}, using CDN fallback`);
      // Fallback to CDN if worker isn't found
      return 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
    } catch (error) {
      console.warn('Error checking PDF.js worker, using CDN fallback:', error);
      return 'https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js';
    }
  }
  
  // Production environment
  return '/pdf-worker/pdf.worker.min.mjs';
};

// Initialize PDF.js with the worker URL and configure options
export const initializePdfJs = (): void => {
  try {
    // Set the worker source
    const workerSrc = getPdfWorkerSrc();
    pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
    
    // Note: pdfjs.configure is not available in this version of PDF.js
    // Configuration is handled via the PDF_LOAD_OPTIONS object
    
    console.log(`PDF.js worker initialized with: ${workerSrc}`);
  } catch (error) {
    console.error('Failed to initialize PDF.js:', error);
  }
};

// Call initialize function immediately
initializePdfJs();

// Configuration options for PDF.js document loading
export const PDF_LOAD_OPTIONS = {
  cMapUrl: 'https://unpkg.com/pdfjs-dist/cmaps/',
  cMapPacked: true,
  disableStream: false,
  disableAutoFetch: false,
  disableFontFace: false,
  // Enable the use of worker
  useWorkerFetch: true,
  // Prevent memory leaks from transfers
  enableXfa: false,
  // Disable range requests to avoid streaming issues
  disableRange: true,
};

// Default thumbnail options
export const DEFAULT_THUMBNAIL_OPTIONS = {
  scale: 0.5,
  quality: 0.7,
};

// Cache expiration time in milliseconds (10 minutes)
export const CACHE_EXPIRATION_MS = 1000 * 60 * 10; 