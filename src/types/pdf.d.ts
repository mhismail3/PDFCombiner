/**
 * Type declarations for PDF.js modules
 */

// Declare the PDF.js worker module to fix TypeScript errors
declare module 'pdfjs-dist/build/pdf.worker.js' {
  const content: any;
  export default content;
} 