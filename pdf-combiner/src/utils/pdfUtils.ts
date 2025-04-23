/**
 * Utility functions for handling PDF files
 */

import { PDFDocument, PDFPage } from 'pdf-lib';
import * as pdfjs from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

/**
 * Check if a file is a PDF
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
 * Generate a thumbnail preview for a PDF
 */
export const generatePDFThumbnail = async (
  pdfData: ArrayBuffer,
  pageNumber = 1,
  scale = 0.5
): Promise<string> => {
  try {
    // Load the PDF file
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;

    // Get the first page
    const page = await pdf.getPage(pageNumber);

    // Set the scale for the thumbnail
    const viewport = page.getViewport({ scale });

    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Unable to create canvas context');
    }

    // Set canvas dimensions to match the viewport
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render the PDF page to the canvas
    await page.render({
      canvasContext: context,
      viewport,
    }).promise;

    // Convert canvas to base64 data URL
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generating PDF thumbnail:', error);
    throw error;
  }
};

/**
 * Get the number of pages in a PDF
 */
export const getPDFPageCount = async (pdfData: ArrayBuffer): Promise<number> => {
  try {
    const loadingTask = pdfjs.getDocument({ data: pdfData });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } catch (error) {
    console.error('Error getting PDF page count:', error);
    throw error;
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
        console.error(`Error processing ${pdfFile.name}:`, error);
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
    console.error('Error merging PDFs:', error);
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
    console.error('Error extracting PDF pages:', error);
    throw error;
  }
};
