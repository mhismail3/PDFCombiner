import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { PDFFile } from '../store/slices/pdfSlice';

// Context interface definition
interface PDFContextType {
  // Current PDF state
  currentPdf: PDFFile | null;
  pdfDataRef: React.MutableRefObject<ArrayBuffer | null>;
  selectedPages: number[];
  isPreviewMode: boolean;
  useProgressiveView: boolean;
  previewPage: number;

  // Setters and handlers
  setSelectedPages: (pages: number[]) => void;
  selectPage: (pageNumber: number, selected: boolean) => void;
  selectAllPages: () => void;
  deselectAllPages: () => void;
  setPreviewMode: (mode: boolean) => void;
  setPreviewPage: (page: number) => void;
  toggleProgressiveView: () => void;

  // Debugging
  lastError: string | null;
  logError: (error: string) => void;
}

// Create context with default values
const PDFContext = createContext<PDFContextType | null>(null);

// Context provider props interface
interface PDFContextProviderProps {
  children: React.ReactNode;
  pdfFile: PDFFile | null;
  onPagesSelected?: (pages: number[]) => void;
  initialSelectedPages?: number[];
}

// Provider component
export const PDFContextProvider: React.FC<PDFContextProviderProps> = ({
  children,
  pdfFile,
  onPagesSelected,
  initialSelectedPages = [],
}) => {
  // State for PDF viewing
  const [selectedPages, setSelectedPagesState] = useState<number[]>(initialSelectedPages);
  const [isPreviewMode, setPreviewMode] = useState<boolean>(false);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [useProgressiveView, setUseProgressiveView] = useState<boolean>(false);
  const [lastError, setLastError] = useState<string | null>(null);

  // Reference to the PDF data to avoid re-creating ArrayBuffer
  const pdfDataRef = useRef<ArrayBuffer | null>(null);

  // Update the PDF data reference when the file changes
  useEffect(() => {
    if (pdfFile?.data) {
      pdfDataRef.current = pdfFile.data;
    }
  }, [pdfFile?.id]);

  // Auto-determine if progressive view should be used based on file size
  useEffect(() => {
    if (!pdfFile) return;

    const shouldUseProgressiveView =
      pdfFile.size > 5 * 1024 * 1024 || (pdfFile.pageCount ?? 0) > 50;

    setUseProgressiveView(prev =>
      // Only update if the value actually changes (prevents re-renders)
      prev !== shouldUseProgressiveView ? shouldUseProgressiveView : prev
    );
  }, [pdfFile?.id, pdfFile?.size, pdfFile?.pageCount]);

  // Wrapper for setSelectedPages that also calls the callback
  const setSelectedPages = useCallback(
    (pages: number[]) => {
      // Only update if the selection actually changed
      setSelectedPagesState(prev => {
        if (JSON.stringify(prev) === JSON.stringify(pages)) {
          return prev;
        }
        
        // Call callback if provided
        if (onPagesSelected) {
          onPagesSelected(pages);
        }
        
        return pages;
      });
    },
    [onPagesSelected]
  );

  // Select or deselect a single page
  const selectPage = useCallback(
    (pageNumber: number, selected: boolean) => {
      // Create a new array based on current state
      setSelectedPagesState(prevSelectedPages => {
        // Don't update if not needed
        if (selected && prevSelectedPages.includes(pageNumber)) return prevSelectedPages;
        if (!selected && !prevSelectedPages.includes(pageNumber)) return prevSelectedPages;
        
        let newSelectedPages: number[];
        
        if (selected) {
          newSelectedPages = [...prevSelectedPages, pageNumber].sort((a, b) => a - b);
        } else {
          newSelectedPages = prevSelectedPages.filter(p => p !== pageNumber);
        }
        
        // Call the callback if provided
        if (onPagesSelected) {
          onPagesSelected(newSelectedPages);
        }
        
        return newSelectedPages;
      });
    },
    [onPagesSelected]
  );

  // Select all pages
  const selectAllPages = useCallback(() => {
    if (!pdfFile?.pageCount) return;

    const allPages = Array.from({ length: pdfFile.pageCount }, (_, i) => i + 1);

    setSelectedPages(allPages);
  }, [pdfFile?.pageCount, setSelectedPages]);

  // Deselect all pages
  const deselectAllPages = useCallback(() => {
    setSelectedPages([]);
  }, [setSelectedPages]);

  // Toggle progressive view
  const toggleProgressiveView = useCallback(() => {
    setUseProgressiveView(prev => !prev);
  }, []);

  // Error logging for debugging
  const logError = useCallback((error: string) => {
    // Using a custom error handler instead of console.error
    // This can be replaced with a proper logging service in production
    setLastError(`[PDFContext] ${error}`);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = {
    currentPdf: pdfFile,
    pdfDataRef,
    selectedPages,
    isPreviewMode,
    useProgressiveView,
    previewPage,

    setSelectedPages,
    selectPage,
    selectAllPages,
    deselectAllPages,
    setPreviewMode,
    setPreviewPage,
    toggleProgressiveView,

    lastError,
    logError,
  };

  return <PDFContext.Provider value={contextValue}>{children}</PDFContext.Provider>;
};

// Custom hook for using the PDF context
export const usePDFContext = () => {
  const context = useContext(PDFContext);

  if (!context) {
    throw new Error('usePDFContext must be used within a PDFContextProvider');
  }

  return context;
};

export default PDFContext;
