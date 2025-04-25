import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { PDFFile } from '../store/slices/pdfSlice';
import PDFDocumentManager from './PDFDocumentManager';

interface PDFDocumentPreviewProps {
  pdfFiles: PDFFile[];
  className?: string;
  onFileSelect?: (fileId: string, selected: boolean) => void;
  onPageSelect?: (fileId: string, pageNumbers: number[]) => void;
  selectedFiles?: string[];
  initialView?: 'grid' | 'list';
}

/**
 * Component that displays thumbnails of all uploaded PDF documents
 * with options for grid or list view and document grouping
 */
const PDFDocumentPreview: React.FC<PDFDocumentPreviewProps> = ({
  pdfFiles,
  className = '',
  onFileSelect,
  onPageSelect,
  selectedFiles = [],
  initialView = 'grid'
}) => {
  // State
  const [viewMode, setViewMode] = useState<'grid' | 'list'>(initialView);
  const [expandedDocuments, setExpandedDocuments] = useState<Record<string, boolean>>({});
  const [selectedPagesByFile, setSelectedPagesByFile] = useState<Record<string, number[]>>({});
  const [sortOption, setSortOption] = useState<'name' | 'date' | 'size' | 'pages'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Initialize expanded state for all documents
  useEffect(() => {
    // Default to expanded for small numbers of documents
    const defaultExpanded = pdfFiles.length <= 5;
    
    setExpandedDocuments(prev => {
      const newExpandedState: Record<string, boolean> = {};
      
      pdfFiles.forEach(file => {
        // Initialize as expanded if not already set in the previous state
        if (prev[file.id] === undefined) {
          newExpandedState[file.id] = defaultExpanded;
        } else {
          newExpandedState[file.id] = prev[file.id];
        }
      });
      
      // Only update state if there are actual changes
      const hasChanges = pdfFiles.some(file => 
        prev[file.id] === undefined || 
        !Object.keys(prev).includes(file.id)
      );
      
      return hasChanges ? newExpandedState : prev;
    });
  }, [pdfFiles]);
  
  // Sort the PDF files based on current sort options
  const sortedPDFFiles = useMemo(() => {
    return [...pdfFiles].sort((a, b) => {
      let comparison = 0;
      
      switch (sortOption) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'date':
          comparison = a.lastModified - b.lastModified;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'pages':
          comparison = (a.pageCount || 0) - (b.pageCount || 0);
          break;
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [pdfFiles, sortOption, sortDirection]);
  
  // Toggle view mode between grid and list
  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === 'grid' ? 'list' : 'grid');
  }, []);
  
  // Toggle document expanded state
  const toggleDocumentExpanded = useCallback((fileId: string) => {
    setExpandedDocuments(prev => ({
      ...prev,
      [fileId]: !prev[fileId]
    }));
  }, []);
  
  // Toggle sort direction or change sort option
  const handleSortChange = useCallback((option: 'name' | 'date' | 'size' | 'pages') => {
    if (sortOption === option) {
      // Toggle direction if same option
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new option with default asc direction
      setSortOption(option);
      setSortDirection('asc');
    }
  }, [sortOption]);
  
  // Handle file selection
  const handleFileSelect = useCallback((fileId: string) => {
    if (onFileSelect) {
      const isSelected = selectedFiles.includes(fileId);
      onFileSelect(fileId, !isSelected);
    }
  }, [onFileSelect, selectedFiles]);
  
  // Handle page selection for a specific file
  const handlePageSelect = useCallback((fileId: string, selectedPages: number[]) => {
    setSelectedPagesByFile(prev => ({
      ...prev,
      [fileId]: selectedPages
    }));
    
    if (onPageSelect) {
      onPageSelect(fileId, selectedPages);
    }
  }, [onPageSelect]);
  
  // Render document list item
  const renderDocumentListItem = (file: PDFFile) => {
    const isExpanded = expandedDocuments[file.id];
    const isSelected = selectedFiles.includes(file.id);
    const selectedPagesCount = selectedPagesByFile[file.id]?.length || 0;
    
    // Format date for display
    const lastModifiedDate = new Date(file.lastModified);
    const formattedDate = lastModifiedDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    return (
      <div 
        key={file.id}
        className={`mb-4 border rounded-lg overflow-hidden ${
          isSelected ? 'border-blue-500 dark:border-blue-700' : 'border-gray-200 dark:border-gray-700'
        }`}
      >
        {/* Document header */}
        <div 
          className={`flex items-center justify-between p-3 cursor-pointer ${
            isSelected 
              ? 'bg-blue-50 dark:bg-blue-900 text-blue-800 dark:text-blue-200' 
              : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200'
          }`}
          onClick={() => handleFileSelect(file.id)}
        >
          <div className="flex items-center flex-grow">
            {/* File icon */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            
            {/* File name and metadata */}
            <div className="mr-2 flex-grow">
              <div className="font-medium truncate">{file.name}</div>
              <div className="flex flex-wrap gap-1 mt-1">
                {/* Page count badge */}
                {file.pageCount > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                    {file.pageCount} {file.pageCount === 1 ? 'page' : 'pages'}
                  </span>
                )}
                
                {/* File size badge */}
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {formatFileSize(file.size)}
                </span>
                
                {/* Date badge */}
                <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                  {formattedDate}
                </span>
                
                {/* Selected pages badge */}
                {selectedPagesCount > 0 && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300">
                    {selectedPagesCount} selected
                  </span>
                )}
                
                {/* Status badge */}
                {file.status === 'loading' && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-100 dark:bg-yellow-800 text-yellow-600 dark:text-yellow-300 flex items-center">
                    <svg className="animate-spin -ml-0.5 mr-1.5 h-2 w-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing
                  </span>
                )}
                {file.status === 'error' && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-300">
                    Error
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Expand/collapse button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleDocumentExpanded(file.id);
            }}
            className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            aria-label={isExpanded ? 'Collapse document' : 'Expand document'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Document content */}
        {isExpanded && file.data && (
          <div className={viewMode === 'grid' ? 'p-3' : 'p-0'}>
            <PDFDocumentManager
              pdfData={file.data}
              fileName={file.name}
              className="rounded-none border-0"
              onPagesSelected={(selectedPages) => handlePageSelect(file.id, selectedPages)}
              initialSelectedPages={selectedPagesByFile[file.id] || []}
            />
          </div>
        )}
      </div>
    );
  };
  
  // Format file size to readable format (copied from pdfUtils to avoid circular dependency)
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  // Render sort button
  const renderSortButton = (option: 'name' | 'date' | 'size' | 'pages', label: string) => {
    const isActive = sortOption === option;
    
    return (
      <button
        onClick={() => handleSortChange(option)}
        className={`px-2 py-1 text-xs rounded-md flex items-center ${
          isActive 
            ? 'bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`}
        aria-label={`Sort by ${label}`}
      >
        {label}
        {isActive && (
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className={`h-3 w-3 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        )}
      </button>
    );
  };
  
  // Render empty state when no files are available
  const renderEmptyState = () => (
    <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 dark:text-gray-400">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 className="text-lg font-medium mb-1">No Documents</h3>
      <p className="text-sm">Upload PDF files to see them here</p>
    </div>
  );
  
  // Calculate document statistics
  const documentStats = useMemo(() => {
    return {
      totalDocuments: pdfFiles.length,
      selectedDocuments: selectedFiles.length,
      totalPages: pdfFiles.reduce((sum, file) => sum + (file.pageCount || 0), 0),
      selectedPages: Object.values(selectedPagesByFile).reduce((sum, pages) => sum + pages.length, 0),
      totalSize: pdfFiles.reduce((sum, file) => sum + file.size, 0)
    };
  }, [pdfFiles, selectedFiles, selectedPagesByFile]);
  
  return (
    <div className={`pdf-document-preview ${className}`}>
      {/* Controls header */}
      {pdfFiles.length > 0 && (
        <div className="flex flex-col mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center">
              <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                Documents ({documentStats.totalDocuments})
              </h2>
              {documentStats.selectedDocuments > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300">
                  {documentStats.selectedDocuments} selected
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* View mode toggle */}
              <button
                onClick={toggleViewMode}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label={`Switch to ${viewMode === 'grid' ? 'list' : 'grid'} view`}
              >
                {viewMode === 'grid' ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                )}
              </button>
              
              {/* Expand/collapse all button */}
              <button
                onClick={() => {
                  const allExpanded = Object.values(expandedDocuments).every(value => value);
                  const newState = !allExpanded;
                  
                  const updatedExpandedState: Record<string, boolean> = {};
                  pdfFiles.forEach(file => {
                    updatedExpandedState[file.id] = newState;
                  });
                  
                  setExpandedDocuments(updatedExpandedState);
                }}
                className="p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                aria-label={Object.values(expandedDocuments).every(value => value) ? 'Collapse all' : 'Expand all'}
              >
                {Object.values(expandedDocuments).every(value => value) ? (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          
          {/* Document metadata summary */}
          <div className="flex flex-wrap gap-2 mb-2 text-xs text-gray-600 dark:text-gray-300">
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
              Total: {documentStats.totalPages} pages
            </span>
            {documentStats.selectedPages > 0 && (
              <span className="px-2 py-1 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 rounded-md">
                Selected: {documentStats.selectedPages} pages
              </span>
            )}
            <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
              Size: {formatFileSize(documentStats.totalSize)}
            </span>
          </div>
          
          {/* Sort controls */}
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">Sort by:</span>
            {renderSortButton('name', 'Name')}
            {renderSortButton('date', 'Date')}
            {renderSortButton('size', 'Size')}
            {renderSortButton('pages', 'Pages')}
          </div>
        </div>
      )}
      
      {/* Document list */}
      <div className={`${viewMode === 'grid' ? 'space-y-4' : 'space-y-4'}`}>
        {pdfFiles.length > 0 ? (
          sortedPDFFiles.map(file => renderDocumentListItem(file))
        ) : (
          renderEmptyState()
        )}
      </div>
    </div>
  );
};

export default PDFDocumentPreview; 