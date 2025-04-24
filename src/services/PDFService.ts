import * as pdfjs from 'pdfjs-dist';
import { showNotification } from '../store/slices/uiSlice';
import { store } from '../store';
import { getPdfWorkerSrc, PDF_LOAD_OPTIONS, CACHE_EXPIRATION_MS } from '../config/pdfjs-config';

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
  private cacheExpirationMs = CACHE_EXPIRATION_MS;
  private workerInitialized = false;
  
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
    if (!this.worker && !this.workerInitialized) {
      try {
        // Initialize the worker for better performance
        const workerSrc = getPdfWorkerSrc();
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        
        // Create a new worker with properly typed parameters
        const workerConfig: any = { name: 'pdf-worker' };
        this.worker = new pdfjs.PDFWorker(workerConfig);
        this.workerInitialized = true;
        
        console.log(`PDF.js worker initialized with: ${workerSrc}`);
      } catch (error) {
        console.error('Failed to initialize PDF.js worker:', error);
        // Mark as initialized to prevent repeated attempts
        this.workerInitialized = true;
      }
    }
  }
  
  /**
   * Clone an ArrayBuffer to prevent detached buffer issues
   * This creates a fresh copy of the ArrayBuffer that won't be affected by transfers
   */
  public cloneArrayBuffer(buffer: ArrayBuffer | ArrayBufferLike): ArrayBuffer {
    // Create a new buffer with the same size
    const clone = new ArrayBuffer(buffer.byteLength);
    // Copy the contents from the source buffer to the new buffer
    new Uint8Array(clone).set(new Uint8Array(buffer as ArrayBuffer));
    return clone;
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
      
      // Create a defensive copy of the ArrayBuffer to prevent detached buffer errors
      let data: ArrayBuffer | Uint8Array | undefined;
      if (source instanceof ArrayBuffer) {
        // Clone the ArrayBuffer to prevent detached buffer issues
        data = this.cloneArrayBuffer(source);
      } else if (source instanceof Uint8Array) {
        // Clone the Uint8Array to prevent detached buffer issues
        const clonedBuffer = this.cloneArrayBuffer(source.buffer);
        data = new Uint8Array(clonedBuffer);
      } else {
        data = undefined;
      }
      
      // Merge provided options with defaults
      const mergedOptions = {
        ...PDF_LOAD_OPTIONS,
        ...options,
        url: typeof source === 'string' || source instanceof URL ? source : undefined,
        data,
      };
      
      // Create loading task with appropriate source
      const loadingTask = pdfjs.getDocument(mergedOptions);
      
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
      // Check if data is valid
      if (!data || data.byteLength === 0) {
        console.error('Invalid PDF: ArrayBuffer is empty or null');
        return { isValid: false, error: 'The PDF file is empty or invalid.' };
      }
      
      console.log(`Validating PDF with ${data.byteLength} bytes`);
      
      // Try to load the document
      const document = await this.loadDocument(data);
      const pageCount = await this.getPageCount(document);
      
      console.log(`PDF validation successful, found ${pageCount} pages`);
      
      if (pageCount < 1) {
        return { isValid: false, error: 'The PDF file does not contain any pages.' };
      }
      
      // Clean up resources
      await document.destroy();
      
      return { isValid: true };
    } catch (error) {
      // Log the error in more detail
      console.error('PDF validation failed:', error);
      
      // Provide a more specific error message
      let errorMessage = 'Could not parse PDF content. The file may be corrupted or password protected.';
      
      if (error instanceof Error) {
        if (error.message.includes('password')) {
          errorMessage = 'This PDF is password protected. Please provide the password.';
        } else if (error.message.includes('Invalid PDF')) {
          errorMessage = 'Invalid PDF structure. The file might be corrupted.';
        } else {
          errorMessage = `Invalid PDF content: ${error.message}`;
        }
      }
      
      return { isValid: false, error: errorMessage };
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