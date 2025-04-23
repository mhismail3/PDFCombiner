/* eslint-disable no-restricted-globals */
import { mergePDFs, extractPDFPages } from '../utils/pdfUtils';

/**
 * PDF Worker to handle intensive PDF operations in a background thread
 */

// Define worker operation types
type WorkerOperation = 
  | { type: 'MERGE_PDFS'; pdfFiles: { data: ArrayBuffer; name: string }[] }
  | { type: 'EXTRACT_PAGES'; pdfData: ArrayBuffer; pageIndexes: number[] };

// Define worker response types
type WorkerResponse =
  | { type: 'MERGE_COMPLETE'; result: { data: ArrayBuffer; name: string; size: number } }
  | { type: 'EXTRACT_COMPLETE'; result: ArrayBuffer }
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

export {}; 