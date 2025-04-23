import React, { useState, useEffect } from 'react';
import PDFDocumentManager from '../components/PDFDocumentManager';

const PDFPreviewPage: React.FC = () => {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Load a sample PDF for testing
  useEffect(() => {
    const loadSamplePDF = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Replace this URL with a sample PDF URL (publicly accessible)
        const response = await fetch('/sample.pdf');
        
        if (!response.ok) {
          throw new Error(`Failed to load sample PDF: ${response.status} ${response.statusText}`);
        }
        
        const data = await response.arrayBuffer();
        setPdfData(data);
        setFileName('sample.pdf');
      } catch (err) {
        console.error('Error loading sample PDF:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sample PDF');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSamplePDF();
  }, []);
  
  // Handle page selection
  const handlePagesSelected = (selectedPages: number[]) => {
    console.log('Selected pages:', selectedPages);
    // In a real app, you would process these pages
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">PDF Preview</h1>
      
      {isLoading && (
        <div className="flex items-center justify-center h-40 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="animate-pulse text-gray-500 dark:text-gray-400">
            Loading sample PDF...
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg text-red-600 dark:text-red-300">
          <h3 className="font-medium">Error</h3>
          <p>{error}</p>
          <p className="mt-2 text-sm">
            <strong>Important:</strong> This demo requires a sample.pdf file in your public directory.
            Please add a PDF file named "sample.pdf" to your project's public directory to see the demo working.
          </p>
          <p className="mt-2 text-sm">
            Alternatively, you can modify the source code in PDFPreviewPage.tsx to use a different PDF file:
            <ul className="list-disc ml-6 mt-1">
              <li>Upload your own PDF file to the public directory</li>
              <li>Update the URL in the loadSamplePDF function to point to your file</li>
              <li>Or use a URL to a publicly accessible PDF (e.g., from a CDN)</li>
            </ul>
          </p>
        </div>
      )}
      
      {!isLoading && !error && pdfData && (
        <PDFDocumentManager
          pdfData={pdfData}
          fileName={fileName}
          onPagesSelected={handlePagesSelected}
          className="mb-8"
        />
      )}
      
      {/* Instructions for using the component */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900 p-4 rounded-lg text-blue-700 dark:text-blue-300">
        <h3 className="font-medium">About this Demo</h3>
        <p className="mt-2">
          This page demonstrates the PDFDocumentManager component which provides:
        </p>
        <ul className="list-disc ml-6 mt-2 space-y-1">
          <li>Progressive loading for large PDFs</li>
          <li>Virtualized rendering of thumbnails</li>
          <li>Page selection capabilities</li>
          <li>Thumbnail size adjustments</li>
          <li>View filtering (all pages / selected pages)</li>
        </ul>
        <p className="mt-2">
          Selected pages are logged to the console and could be used for further processing like merging or extraction.
        </p>
      </div>
    </div>
  );
};

export default PDFPreviewPage; 