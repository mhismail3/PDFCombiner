import * as pdfjs from 'pdfjs-dist';
import { showNotification } from '../store/slices/uiSlice';
import { store } from '../store';

// Define types for document loading options
export interface PDFLoadOptions {
  password?: string;
  withCredentials?: boolean;
  cMapUrl?: string;
  cMapPacked?: boolean;
}

// Define types for thumbnail options
export interface ThumbnailOptions {
  width?: number;
  height?: number;
  scale?: number;
  quality?: number; // 0.0 to 1.0
  pageNumber?: number; // 1-based page number, defaults to 1
}

// Define cache structure for optimizing thumbnail generation
interface ThumbnailCache {
  [key: string]: {
    dataUrl: string;
    timestamp: number;
  };
}

/**
 * Service for handling all PDF operations including loading, parsing,
 * and generating thumbnails with caching support.
 */
export class PDFService {
  private worker: pdfjs.PDFWorker | null = null;
  private thumbnailCache: ThumbnailCache = {};
  private cacheExpirationMs = 1000 * 60 * 10; // 10 minutes
  
  /**
   * Initialize the PDF service and set up the worker
   */
  constructor() {
    this.initializeWorker();
  }
  
  /**
   * Initialize the PDF.js worker
   */
  private initializeWorker(): void {
    if (!this.worker) {
      // Use a CDN URL for the worker instead of requiring it
      pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      // Create a new worker
      this.worker = new pdfjs.PDFWorker();
    }
  }
  
  /**
   * Load a PDF document from various sources
   */
  async loadDocument(
    source: string | URL | ArrayBuffer | Uint8Array,
    options: PDFLoadOptions = {}
  ): Promise<pdfjs.PDFDocumentProxy> {
    try {
      // Make sure worker is initialized
      this.initializeWorker();
      
      // Create loading task with appropriate source
      const loadingTask = pdfjs.getDocument({
        url: typeof source === 'string' || source instanceof URL ? source : undefined,
        data: source instanceof ArrayBuffer || source instanceof Uint8Array ? source : undefined,
        password: options.password,
        withCredentials: options.withCredentials,
        cMapUrl: options.cMapUrl || 'https://unpkg.com/pdfjs-dist/cmaps/',
        cMapPacked: options.cMapPacked !== undefined ? options.cMapPacked : true,
      });
      
      // Return the document promise
      return await loadingTask.promise;
    } catch (error) {
      this.logError('Failed to load PDF document', error);
      throw error;
    }
  }
  
  /**
   * Get the number of pages in a PDF document
   */
  async getPageCount(document: pdfjs.PDFDocumentProxy): Promise<number> {
    return document.numPages;
  }
  
  /**
   * Get metadata from the document
   */
  async getDocumentMetadata(document: pdfjs.PDFDocumentProxy): Promise<any> {
    try {
      return await document.getMetadata();
    } catch (error) {
      this.logError('Failed to get PDF metadata', error);
      throw error;
    }
  }
  
  /**
   * Get a specific page from the document
   */
  async getPage(document: pdfjs.PDFDocumentProxy, pageNumber: number): Promise<pdfjs.PDFPageProxy> {
    try {
      // Page numbers in PDF.js are 1-based
      if (pageNumber < 1 || pageNumber > document.numPages) {
        throw new Error(`Page number out of range: ${pageNumber}. Document has ${document.numPages} pages.`);
      }
      
      return await document.getPage(pageNumber);
    } catch (error) {
      this.logError(`Failed to get page ${pageNumber}`, error);
      throw error;
    }
  }
  
  /**
   * Generate a thumbnail for a specific page
   */
  async generateThumbnail(
    pdfDoc: pdfjs.PDFDocumentProxy,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    const { 
      pageNumber = 1, 
      scale = 0.5, 
      quality = 0.7,
      width,
      height
    } = options;
    
    // Create a cache key based on document fingerprint and options
    const cacheKey = `${pdfDoc.fingerprints[0]}_page${pageNumber}_scale${scale}_quality${quality}`;
    
    // Check if we have a cached version
    const cachedThumbnail = this.thumbnailCache[cacheKey];
    if (cachedThumbnail && Date.now() - cachedThumbnail.timestamp < this.cacheExpirationMs) {
      return cachedThumbnail.dataUrl;
    }
    
    try {
      // Get the specified page
      const page = await this.getPage(pdfDoc, pageNumber);
      
      // Get the viewport (with scaling or specific dimensions)
      let viewport;
      if (width || height) {
        const originalViewport = page.getViewport({ scale: 1.0 });
        
        // Calculate scale based on requested dimensions
        let targetScale = scale;
        if (width) {
          targetScale = width / originalViewport.width;
        } else if (height) {
          targetScale = height / originalViewport.height;
        }
        
        viewport = page.getViewport({ scale: targetScale });
      } else {
        viewport = page.getViewport({ scale });
      }
      
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
      const renderTask = page.render({
        canvasContext: context,
        viewport
      });
      
      await renderTask.promise;
      
      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Cache the result
      this.thumbnailCache[cacheKey] = {
        dataUrl,
        timestamp: Date.now()
      };
      
      return dataUrl;
    } catch (error) {
      this.logError('Error generating PDF thumbnail', error);
      throw error;
    }
  }
  
  /**
   * Generate thumbnails for all pages in a document
   */
  async generateAllThumbnails(
    pdfDoc: pdfjs.PDFDocumentProxy,
    options: ThumbnailOptions = {},
    progressCallback?: (page: number, total: number) => void
  ): Promise<string[]> {
    const thumbnails: string[] = [];
    const numPages = await this.getPageCount(pdfDoc);
    
    for (let i = 1; i <= numPages; i++) {
      // Update progress
      if (progressCallback) {
        progressCallback(i, numPages);
      }
      
      // Generate thumbnail for this page
      const thumbnail = await this.generateThumbnail(pdfDoc, {
        ...options,
        pageNumber: i
      });
      
      thumbnails.push(thumbnail);
    }
    
    return thumbnails;
  }
  
  /**
   * Check if a PDF is valid
   */
  async validatePDF(data: ArrayBuffer): Promise<{ isValid: boolean; error?: string }> {
    try {
      const document = await this.loadDocument(data);
      const pageCount = await this.getPageCount(document);
      
      if (pageCount < 1) {
        return { isValid: false, error: 'The PDF file does not contain any pages.' };
      }
      
      // Clean up resources
      await document.destroy();
      
      return { isValid: true };
    } catch (error) {
      return { 
        isValid: false, 
        error: error instanceof Error 
          ? `Invalid PDF content: ${error.message}` 
          : 'Could not parse PDF content. The file may be corrupted or password protected.' 
      };
    }
  }
  
  /**
   * Check if a PDF is password protected
   */
  async isPasswordProtected(data: ArrayBuffer): Promise<boolean> {
    try {
      const loadingTask = pdfjs.getDocument({ data });
      await loadingTask.promise;
      return false;
    } catch (error) {
      // Check for password error
      if (error instanceof Error && error.message.includes('password')) {
        return true;
      }
      return false;
    }
  }
  
  /**
   * Clear the thumbnail cache
   */
  clearCache(): void {
    this.thumbnailCache = {};
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.worker) {
      this.worker.destroy();
      this.worker = null;
    }
    this.clearCache();
  }
  
  /**
   * Log error with consistent format
   * Made public so utility functions can access it
   */
  logError(message: string, error: unknown): void {
    // Log the error
    if (process.env.NODE_ENV === 'development') {
      console.error(message, error);
    }
    
    // Notify the user
    const errorMessage = error instanceof Error ? error.message : String(error);
    store.dispatch(
      showNotification({
        message: `${message}: ${errorMessage}`,
        type: 'error',
      })
    );
  }
}

// Create a singleton instance for app-wide use
export const pdfService = new PDFService();

// Export utility functions that use the service
export const generatePDFThumbnail = async (pdfData: ArrayBuffer, options?: ThumbnailOptions): Promise<string> => {
  try {
    const pdfDoc = await pdfService.loadDocument(pdfData);
    const thumbnail = await pdfService.generateThumbnail(pdfDoc, options);
    await pdfDoc.destroy(); // Clean up resources
    return thumbnail;
  } catch (error) {
    pdfService.logError('Error generating PDF thumbnail', error);
    throw error;
  }
};

export const getPDFPageCount = async (pdfData: ArrayBuffer): Promise<number> => {
  try {
    const pdfDoc = await pdfService.loadDocument(pdfData);
    const pageCount = await pdfService.getPageCount(pdfDoc);
    await pdfDoc.destroy(); // Clean up resources
    return pageCount;
  } catch (error) {
    pdfService.logError('Error getting PDF page count', error);
    throw error;
  }
}; 