import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import PDFDocumentManager from '../components/PDFDocumentManager';

const PDFPreviewPage: React.FC = () => {
  const [pdfData, setPdfData] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Function to handle file upload
  const handleFileUpload = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setError(null);
    
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        setPdfData(reader.result);
        setFileName(file.name);
        setIsLoading(false);
      } else {
        setError('Failed to read file as ArrayBuffer');
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Error reading file');
      setIsLoading(false);
    };
    
    reader.readAsArrayBuffer(file);
  }, []);
  
  // Attempt to load a sample PDF for testing
  useEffect(() => {
    const loadSamplePDF = async () => {
      try {
        setIsLoading(true);
        
        // Replace this URL with a sample PDF URL (publicly accessible)
        const response = await fetch('/sample.pdf');
        
        if (!response.ok) {
          // Don't throw an error, just silently fail and wait for user upload
          console.log('No sample PDF available:', response.status, response.statusText);
          setIsLoading(false);
          return;
        }
        
        const data = await response.arrayBuffer();
        setPdfData(data);
        setFileName('sample.pdf');
      } catch (err) {
        console.log('Error loading sample PDF:', err);
        // Just log the error but don't display it to the user
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSamplePDF();
  }, []);
  
  // Handle page selection
  const handlePagesSelected = (selectedPages: number[]) => {
    console.log('Selected pages:', selectedPages);
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">PDF Preview</h1>
      
      {/* File upload section */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
          Upload a PDF to preview
        </label>
        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept="application/pdf"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-900 border border-gray-300 rounded-lg cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
          />
        </div>
      </div>
      
      {isLoading && (
        <div className="flex items-center justify-center h-40 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <div className="animate-pulse text-gray-500 dark:text-gray-400">
            Loading PDF...
          </div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg text-red-600 dark:text-red-300">
          <h3 className="font-medium">Error</h3>
          <p>{error}</p>
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
      
      {!pdfData && !isLoading && (
        <div className="flex items-center justify-center h-40 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400 text-center">
            Please upload a PDF file to preview
          </p>
        </div>
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