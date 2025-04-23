/* eslint-disable no-restricted-globals */
import { mergePDFs, extractPDFPages } from '../utils/pdfUtils';

/**
 * PDF Worker to handle intensive PDF operations in a background thread
 */

// Define worker operation types
type WorkerOperation = 
  | { type: 'MERGE_PDFS'; pdfFiles: { data: ArrayBuffer; name: string }[] }
  | { type: 'EXTRACT_PAGES'; pdfData: ArrayBuffer; pageIndexes: number[] }
  | { type: 'GENERATE_THUMBNAILS'; pdfData: ArrayBuffer; pageCount: number; options?: { width?: number; height?: number; quality?: number } }
  | { type: 'EXTRACT_PAGE_DATA'; pdfData: ArrayBuffer; includeTextContent?: boolean };

// Define worker response types
type WorkerResponse =
  | { type: 'MERGE_COMPLETE'; result: { data: ArrayBuffer; name: string; size: number } }
  | { type: 'EXTRACT_COMPLETE'; result: ArrayBuffer }
  | { type: 'THUMBNAILS_COMPLETE'; result: string[] }
  | { type: 'THUMBNAIL_PROGRESS'; pageNumber: number; totalPages: number; pageInfo: { pageNumber: number; width: number; height: number; scale: number } }
  | { type: 'PAGE_DATA_COMPLETE'; result: { pageCount: number; docInfo: any; pagesData: any[] } }
  | { type: 'PAGE_DATA_PROGRESS'; pageNumber: number; totalPages: number; pageData: any }
  | { type: 'PROGRESS'; progress: number }
  | { type: 'ERROR'; error: string };

// Listen for messages from the main thread
self.addEventListener('message', async (event: MessageEvent<WorkerOperation>) => {
  try {
    const { data } = event;

    // Handle different operation types
    switch (data.type) {
      case 'MERGE_PDFS':
        await handleMergePDFs(data.pdfFiles);
        break;
        
      case 'EXTRACT_PAGES':
        await handleExtractPages(data.pdfData, data.pageIndexes);
        break;
        
      case 'GENERATE_THUMBNAILS':
        await handleGenerateThumbnails(data.pdfData, data.pageCount, data.options);
        break;
        
      case 'EXTRACT_PAGE_DATA':
        await handleExtractPageData(data.pdfData, data.includeTextContent);
        break;
        
      default:
        throw new Error('Unknown operation type');
    }
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      type: 'ERROR',
      error: error instanceof Error ? error.message : 'Unknown error in PDF worker',
    } as WorkerResponse);
  }
});

/**
 * Handle PDF merge operation
 */
async function handleMergePDFs(pdfFiles: { data: ArrayBuffer; name: string }[]): Promise<void> {
  try {
    // Merge PDFs and report progress
    const result = await mergePDFs(pdfFiles, (progress) => {
      self.postMessage({ 
        type: 'PROGRESS', 
        progress 
      } as WorkerResponse);
    });
    
    // Send the completed merged PDF back to main thread
    self.postMessage({
      type: 'MERGE_COMPLETE',
      result
    } as WorkerResponse);
  } catch (error) {
    throw new Error(`Failed to merge PDFs: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Handle PDF page extraction operation
 */
async function handleExtractPages(pdfData: ArrayBuffer, pageIndexes: number[]): Promise<void> {
  try {
    // Extract the specified pages
    const result = await extractPDFPages(pdfData, pageIndexes);
    
    // Send the extracted PDF back to main thread
    self.postMessage({
      type: 'EXTRACT_COMPLETE',
      result
    } as WorkerResponse);
  } catch (error) {
    throw new Error(`Failed to extract PDF pages: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Handle thumbnail generation for a PDF document
 */
async function handleGenerateThumbnails(
  pdfData: ArrayBuffer, 
  pageCount: number,
  options?: { width?: number; height?: number; quality?: number }
): Promise<void> {
  try {
    // Import pdfjs at runtime to avoid issues with web workers
    const pdfjs = await import('pdfjs-dist');
    
    // Set worker source
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Load the PDF
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    // Process each page
    for (let i = 1; i <= pageCount; i++) {
      try {
        // Get the page
        const page = await pdf.getPage(i);
        
        // Set scale - if width and height are specified, calculate scale to fit
        let scale = 0.5; // Default scale
        
        if (options && (options.width || options.height)) {
          const viewport = page.getViewport({ scale: 1.0 });
          
          if (options.width) {
            scale = options.width / viewport.width;
          } else if (options.height) {
            scale = options.height / viewport.height;
          }
        }
        
        // Get the viewport with the calculated scale
        const viewport = page.getViewport({ scale });
        
        // Instead of generating the actual thumbnails in the worker,
        // we'll send back the PDF data with page number and viewport dimensions
        // The main thread will handle the actual rendering
        self.postMessage({
          type: 'THUMBNAIL_PROGRESS',
          pageNumber: i,
          totalPages: pageCount,
          pageInfo: {
            pageNumber: i,
            width: viewport.width,
            height: viewport.height,
            scale: scale
          }
        } as WorkerResponse);
      } catch (pageError) {
        // Log error but continue with other pages
        console.error(`Error processing page ${i}:`, pageError);
        self.postMessage({
          type: 'ERROR',
          error: `Failed to process page ${i}: ${pageError instanceof Error ? pageError.message : String(pageError)}`
        } as WorkerResponse);
      }
    }
    
    // Send completion message
    self.postMessage({
      type: 'THUMBNAILS_COMPLETE',
      result: [] // We're not actually generating thumbnails in the worker now
    } as WorkerResponse);
  } catch (error) {
    throw new Error(`Failed to process PDF pages: ${error instanceof Error ? error.message : error}`);
  }
}

/**
 * Handle extraction of page data from a PDF
 */
async function handleExtractPageData(
  pdfData: ArrayBuffer,
  includeTextContent: boolean = false
): Promise<void> {
  try {
    // Import pdfjs at runtime to avoid issues with web workers
    const pdfjs = await import('pdfjs-dist');
    
    // Set worker source
    pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    
    // Load the PDF
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    
    // Get document info and metadata
    const pageCount = pdf.numPages;
    const metadata = await pdf.getMetadata();
    
    // Send initial document info
    const docInfo = {
      pageCount,
      metadata: metadata.info || {},
      metadataXML: metadata.metadata ? metadata.metadata.toString() : null
    };
    
    // Process each page
    const pagesData = [];
    
    for (let i = 1; i <= pageCount; i++) {
      try {
        // Get the page
        const page = await pdf.getPage(i);
        
        // Get viewport to determine dimensions
        const viewport = page.getViewport({ scale: 1.0 });
        
        // Initialize page data
        const pageData: any = {
          pageNumber: i,
          dimensions: {
            width: viewport.width,
            height: viewport.height
          }
        };
        
        // Extract text content if requested
        if (includeTextContent) {
          const textContent = await page.getTextContent();
          let fullText = '';
          
          // Combine text items with spaces
          for (const item of textContent.items) {
            if ('str' in item) {
              fullText += item.str + ' ';
            }
          }
          
          pageData.textContent = fullText.trim();
        }
        
        // Add to pages data
        pagesData.push(pageData);
        
        // Send progress update with the page data
        self.postMessage({
          type: 'PAGE_DATA_PROGRESS',
          pageNumber: i,
          totalPages: pageCount,
          pageData
        } as WorkerResponse);
      } catch (pageError) {
        // Log error but continue with other pages
        console.error(`Error extracting data from page ${i}:`, pageError);
      }
    }
    
    // Send all page data back to main thread
    self.postMessage({
      type: 'PAGE_DATA_COMPLETE',
      result: {
        pageCount,
        docInfo,
        pagesData
      }
    } as WorkerResponse);
  } catch (error) {
    throw new Error(`Failed to extract PDF data: ${error instanceof Error ? error.message : error}`);
  }
}

export {}; 