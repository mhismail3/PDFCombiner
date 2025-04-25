import * as pdfjs from 'pdfjs-dist';
import { getPdfWorkerSrc, initializePdfJs } from '../config/pdfjs-config';

// Ensure PDF.js worker is initialized
initializePdfJs();

// Interface for thumbnail options
export interface ThumbnailOptions {
  width?: number;
  height?: number;
  quality?: number;
  scale?: number;
}

/**
 * Cache for storing generated thumbnails
 * Uses LRU (Least Recently Used) strategy to manage memory usage
 */
interface CacheEntry {
  dataUrl: string;
  timestamp: number;
  size: number; // estimated size in bytes
}

class PDFThumbnailCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxCacheSize: number; // in bytes
  private currentCacheSize: number = 0;
  private readonly defaultExpirationTime: number = 5 * 60 * 1000; // 5 minutes
  
  constructor(maxCacheSizeInMB: number = 50) {
    this.maxCacheSize = maxCacheSizeInMB * 1024 * 1024; // Convert to bytes
  }
  
  public get(key: string): string | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // Check if entry has expired
    if (Date.now() - entry.timestamp > this.defaultExpirationTime) {
      this.remove(key);
      return null;
    }
    
    // Update timestamp (mark as recently used)
    entry.timestamp = Date.now();
    this.cache.set(key, entry);
    
    return entry.dataUrl;
  }
  
  public set(key: string, dataUrl: string): void {
    // Calculate size of data URL
    const size = this.estimateSize(dataUrl);
    
    // Ensure there's enough space in the cache
    this.ensureCapacity(size);
    
    // Add to cache
    this.cache.set(key, {
      dataUrl,
      timestamp: Date.now(),
      size
    });
    
    // Update current cache size
    this.currentCacheSize += size;
  }
  
  public remove(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      this.currentCacheSize -= entry.size;
      this.cache.delete(key);
    }
  }
  
  public clear(): void {
    this.cache.clear();
    this.currentCacheSize = 0;
  }
  
  public has(key: string): boolean {
    return this.cache.has(key);
  }
  
  // Make sure there's enough space for new entry
  private ensureCapacity(requiredSize: number): void {
    // If we don't have enough space even after clearing everything, adjust requiredSize
    if (requiredSize > this.maxCacheSize) {
      console.warn(`PDFThumbnailCache: Required size (${requiredSize} bytes) exceeds max cache size (${this.maxCacheSize} bytes). Some items may not be cached.`);
      return; // We'll still try to cache what we can
    }

    // Sort entries by timestamp (oldest first)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest entries until we have enough space
    for (const [key, entry] of entries) {
      if (this.currentCacheSize + requiredSize <= this.maxCacheSize) {
        break; // We now have enough space
      }
      
      this.remove(key);
    }
  }

  // Estimate size of a data URL in bytes
  private estimateSize(dataUrl: string): number {
    // Base64 encoding adds ~33% overhead
    return Math.ceil((dataUrl.length * 3) / 4);
  }
}

// The main service class
export class PDFThumbnailService {
  private cache: PDFThumbnailCache;
  private worker: pdfjs.PDFWorker | null = null;
  private isWorkerInitialized: boolean = false;
  private initializationError: Error | null = null;
  private initializationPromise: Promise<void> | null = null;

  constructor(maxCacheSizeMB: number = 50) {
    this.cache = new PDFThumbnailCache(maxCacheSizeMB);
    this.initializeWorker();
  }

  // Clone an ArrayBuffer to prevent detached buffer issues
  private cloneArrayBuffer(buffer: ArrayBuffer): ArrayBuffer {
    const clone = new ArrayBuffer(buffer.byteLength);
    new Uint8Array(clone).set(new Uint8Array(buffer));
    return clone;
  }

  // Initialize PDF.js worker
  private initializeWorker(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise<void>((resolve, reject) => {
      try {
        if (!this.worker) {
          // Cast to any to avoid typing issues with PDFWorker parameters
          this.worker = new pdfjs.PDFWorker({ name: 'pdf-thumbnail-worker' } as any);
          
          // Set up event handlers for the worker
          this.worker.promise.then(() => {
            console.log('PDF.js worker initialized successfully');
            this.isWorkerInitialized = true;
            resolve();
          }).catch((error) => {
            console.error('PDF.js worker initialization failed:', error);
            this.initializationError = error;
            reject(error);
          });
        } else {
          resolve();
        }
      } catch (error) {
        console.error('Failed to initialize PDF.js worker:', error);
        this.initializationError = error instanceof Error ? error : new Error(String(error));
        reject(this.initializationError);
      }
    });
    
    return this.initializationPromise;
  }

  // Create a cache key for a thumbnail
  private createCacheKey(documentId: string, pageNumber: number, width?: number, height?: number, quality?: number): string {
    return `${documentId}_p${pageNumber}_w${width || 0}_h${height || 0}_q${quality || 0.7}`;
  }

  // Get thumbnail, either from cache or generate a new one
  public async getThumbnail(
    pdfData: ArrayBuffer,
    pageNumber: number,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    if (!pdfData || !(pdfData instanceof ArrayBuffer)) {
      throw new Error('Invalid PDF data: not an ArrayBuffer');
    }
    
    if (pageNumber < 1) {
      throw new Error(`Invalid page number: ${pageNumber}`);
    }
    
    try {
      // Make sure worker is initialized
      await this.initializeWorker();
      
      // Create a defensive copy of the buffer to prevent detached buffer issues
      const pdfDataCopy = this.cloneArrayBuffer(pdfData);
      
      // Create a document id using a hash of the first 1KB of the PDF
      const documentId = this.createDocumentId(pdfDataCopy);
      
      // Generate cache key
      const cacheKey = this.createCacheKey(
        documentId,
        pageNumber,
        options.width,
        options.height,
        options.quality
      );

      // Check if thumbnail is in cache
      const cachedThumbnail = this.cache.get(cacheKey);
      if (cachedThumbnail) {
        return cachedThumbnail;
      }

      // Not in cache, generate thumbnail
      const thumbnailDataUrl = await this.generateThumbnail(pdfDataCopy, pageNumber, options);
      
      // Store in cache
      this.cache.set(cacheKey, thumbnailDataUrl);
      
      return thumbnailDataUrl;
    } catch (error) {
      console.error(`Error in getThumbnail for page ${pageNumber}:`, error);
      // Rethrow with improved error message
      throw new Error(`Failed to get thumbnail for page ${pageNumber}: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Generate a thumbnail for a PDF page
  private async generateThumbnail(
    pdfData: ArrayBuffer,
    pageNumber: number,
    options: ThumbnailOptions = {}
  ): Promise<string> {
    const { width, height, quality = 0.7, scale = 0.5 } = options;
    
    try {
      // Create another defensive copy of the buffer for the loadingTask
      const pdfDataClone = this.cloneArrayBuffer(pdfData);
      
      // Load the PDF document
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(pdfDataClone),
        worker: this.worker || undefined
      });
      
      const pdfDoc = await loadingTask.promise;
      
      // Validate page number
      if (pageNumber < 1 || pageNumber > pdfDoc.numPages) {
        throw new Error(`Page number ${pageNumber} out of range (1-${pdfDoc.numPages})`);
      }
      
      // Get the specified page
      const page = await pdfDoc.getPage(pageNumber);
      
      // Calculate scale based on width/height if provided
      let renderScale = scale;
      if (width || height) {
        const viewport = page.getViewport({ scale: 1.0 });
        
        if (width) {
          renderScale = width / viewport.width;
        } else if (height) {
          renderScale = height / viewport.height;
        }
      }
      
      // Get viewport with the calculated scale
      const viewport = page.getViewport({ scale: renderScale });
      
      // Create canvas for rendering
      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Could not create canvas context');
      }
      
      // Render the page to canvas
      const renderTask = page.render({
        canvasContext: context,
        viewport
      });
      
      await renderTask.promise;
      
      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      
      // Clean up
      await pdfDoc.destroy();
      
      return dataUrl;
    } catch (error) {
      console.error(`Error generating thumbnail for page ${pageNumber}:`, error);
      throw error;
    }
  }

  // Generate a simple hash/ID for a PDF document
  private createDocumentId(pdfData: ArrayBuffer): string {
    // Use first 1KB of data to create a simple hash
    const buffer = new Uint8Array(pdfData.slice(0, 1024));
    let hash = 0;
    
    for (let i = 0; i < buffer.length; i++) {
      hash = ((hash << 5) - hash) + buffer[i];
      hash |= 0; // Convert to 32-bit integer
    }
    
    return hash.toString(16);
  }

  // Clear cache
  public clearCache(): void {
    this.cache.clear();
  }

  // Get total number of pages in a PDF
  public async getPageCount(pdfData: ArrayBuffer): Promise<number> {
    if (!pdfData || !(pdfData instanceof ArrayBuffer)) {
      throw new Error('Invalid PDF data: not an ArrayBuffer');
    }
    
    try {
      // Make sure worker is initialized
      await this.initializeWorker();
      
      // Create a defensive copy of the buffer to prevent detached buffer issues
      const pdfDataCopy = this.cloneArrayBuffer(pdfData);
      
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(pdfDataCopy),
        worker: this.worker || undefined
      });
      
      const pdfDoc = await loadingTask.promise;
      const pageCount = pdfDoc.numPages;
      await pdfDoc.destroy();
      return pageCount;
    } catch (error) {
      console.error('Error getting page count:', error);
      throw new Error(`Failed to get page count: ${error instanceof Error ? error.message : error}`);
    }
  }

  // Clean up resources
  public destroy(): void {
    this.clearCache();
    
    if (this.worker) {
      this.worker.destroy();
      this.worker = null;
    }
    
    this.isWorkerInitialized = false;
    this.initializationPromise = null;
  }
}

// Create singleton instance
export const pdfThumbnailService = new PDFThumbnailService(); 