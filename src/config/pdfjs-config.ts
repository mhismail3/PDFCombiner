/**
 * PDF.js Configuration
 * 
 * Central configuration for PDF.js settings to ensure consistency across the application
 */

// The worker path can change based on environment
export const getPdfWorkerSrc = (): string => {
  // Development environment (local server)
  if (process.env.NODE_ENV === 'development') {
    return '/pdf-worker/pdf.worker.mjs';
  }
  
  // Production environment
  return '/pdf-worker/pdf.worker.min.mjs';
};

// Configuration options for PDF.js document loading
export const PDF_LOAD_OPTIONS = {
  cMapUrl: 'https://unpkg.com/pdfjs-dist/cmaps/',
  cMapPacked: true,
  disableStream: false,
  disableAutoFetch: false,
  disableFontFace: false,
};

// Default thumbnail options
export const DEFAULT_THUMBNAIL_OPTIONS = {
  scale: 0.5,
  quality: 0.7,
};

// Cache expiration time in milliseconds (10 minutes)
export const CACHE_EXPIRATION_MS = 1000 * 60 * 10; 