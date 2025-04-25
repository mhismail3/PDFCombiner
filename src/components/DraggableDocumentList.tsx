import React, { useCallback, useState, useEffect, KeyboardEvent, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { PDFFile, reorderFiles, removePDFFile } from '../store/slices/pdfSlice';
import { formatFileSize } from '../utils/pdfUtils';
import DocumentItem from './DocumentItem';
import { ItemTypes } from './DocumentItem';
import KeyboardShortcutHelp from './KeyboardShortcutHelp';
import UndoRedoToolbar from './UndoRedoToolbar';

// Simple FileInfoModal component
interface FileInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: PDFFile | null;
}

const FileInfoModal: React.FC<FileInfoModalProps> = ({ isOpen, onClose, file }) => {
  if (!isOpen || !file) return null;
  
  const lastModifiedDate = new Date(file.lastModified);
  const formattedDate = lastModifiedDate.toLocaleDateString();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">File Information</h2>
        <div className="space-y-2">
          <p><span className="font-semibold">Name:</span> {file.name}</p>
          <p><span className="font-semibold">Size:</span> {formatFileSize(file.size)}</p>
          <p><span className="font-semibold">Type:</span> {file.type}</p>
          <p><span className="font-semibold">Modified:</span> {formattedDate}</p>
          <p><span className="font-semibold">Pages:</span> {file.pageCount}</p>
          <p><span className="font-semibold">Status:</span> {file.status}</p>
          {file.error && <p><span className="font-semibold">Error:</span> {file.error}</p>}
        </div>
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Props for the document list container
interface DraggableDocumentListProps {
  onFileSelect?: (fileId: string, selected: boolean) => void;
  selectedFiles?: string[];
  className?: string;
}

// The main document list container component
const DraggableDocumentList: React.FC<DraggableDocumentListProps> = ({
  onFileSelect,
  selectedFiles = [],
  className = '',
}) => {
  const dispatch = useDispatch();
  const { files } = useSelector((state: RootState) => state.pdf);
  const [fileInfoModal, setFileInfoModal] = useState<{ isOpen: boolean; fileId: string | null }>({
    isOpen: false,
    fileId: null,
  });
  const [isReordering, setIsReordering] = useState(false);
  const [activeDragIndex, setActiveDragIndex] = useState<number | null>(null);
  const [focusedItemIndex, setFocusedItemIndex] = useState<number | null>(null);
  
  // Create refs for each document item
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  // Update refs array when file list changes
  useEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, files.length);
  }, [files.length]);

  // Set up keyboard shortcuts for reordering
  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    // Only process if we have files
    if (files.length === 0) return;
    
    // Get the focused item index or the first selected file if available
    let activeIndex = focusedItemIndex;
    if (activeIndex === null && selectedFiles.length > 0) {
      const selectedFileId = selectedFiles[0];
      activeIndex = files.findIndex(file => file.id === selectedFileId);
    }
    
    if (activeIndex === null || activeIndex === -1) return;
    
    let newIndex = activeIndex;

    // Move up with Alt+ArrowUp
    if (e.altKey && e.key === 'ArrowUp' && activeIndex > 0) {
      e.preventDefault();
      newIndex = activeIndex - 1;
      setIsReordering(true);
      dispatch(reorderFiles({ 
        sourceIndex: activeIndex, 
        destinationIndex: newIndex
      }));
      setFocusedItemIndex(newIndex);
      setTimeout(() => setIsReordering(false), 300);
    }
    
    // Move down with Alt+ArrowDown
    else if (e.altKey && e.key === 'ArrowDown' && activeIndex < files.length - 1) {
      e.preventDefault();
      newIndex = activeIndex + 1;
      setIsReordering(true);
      dispatch(reorderFiles({ 
        sourceIndex: activeIndex, 
        destinationIndex: newIndex
      }));
      setFocusedItemIndex(newIndex);
      setTimeout(() => setIsReordering(false), 300);
    }
    
    // Move to top with Alt+Home
    else if (e.altKey && e.key === 'Home' && activeIndex > 0) {
      e.preventDefault();
      newIndex = 0;
      setIsReordering(true);
      dispatch(reorderFiles({ 
        sourceIndex: activeIndex, 
        destinationIndex: newIndex
      }));
      setFocusedItemIndex(newIndex);
      setTimeout(() => setIsReordering(false), 300);
    }
    
    // Move to bottom with Alt+End
    else if (e.altKey && e.key === 'End' && activeIndex < files.length - 1) {
      e.preventDefault();
      newIndex = files.length - 1;
      setIsReordering(true);
      dispatch(reorderFiles({ 
        sourceIndex: activeIndex, 
        destinationIndex: newIndex
      }));
      setFocusedItemIndex(newIndex);
      setTimeout(() => setIsReordering(false), 300);
    }
    
    // Navigate up with ArrowUp
    else if (e.key === 'ArrowUp' && !e.altKey) {
      e.preventDefault();
      setFocusedItemIndex(Math.max(0, activeIndex - 1));
    }
    
    // Navigate down with ArrowDown
    else if (e.key === 'ArrowDown' && !e.altKey) {
      e.preventDefault();
      setFocusedItemIndex(Math.min(files.length - 1, activeIndex + 1));
    }
    
    // Navigate to first with Home
    else if (e.key === 'Home' && !e.altKey) {
      e.preventDefault();
      setFocusedItemIndex(0);
    }
    
    // Navigate to last with End
    else if (e.key === 'End' && !e.altKey) {
      e.preventDefault();
      setFocusedItemIndex(files.length - 1);
    }
  }, [dispatch, files, focusedItemIndex, selectedFiles]);
  
  // Focus the item when focusedItemIndex changes
  useEffect(() => {
    if (focusedItemIndex !== null && itemRefs.current[focusedItemIndex]) {
      itemRefs.current[focusedItemIndex]?.focus();
    }
  }, [focusedItemIndex]);
  
  // Handle file selection
  const handleFileSelect = useCallback((fileId: string) => {
    if (onFileSelect) {
      const isSelected = selectedFiles.includes(fileId);
      onFileSelect(fileId, !isSelected);
    }
  }, [onFileSelect, selectedFiles]);

  const moveFile = useCallback(
    (sourceIndex: number, destinationIndex: number) => {
      setIsReordering(true);
      dispatch(reorderFiles({ sourceIndex, destinationIndex }));
      
      // Reset reordering state after animation completes
      setTimeout(() => {
        setIsReordering(false);
      }, 300);
      
      // Update focused item to follow the moved item
      setFocusedItemIndex(destinationIndex);
    },
    [dispatch]
  );

  const handleRemoveFile = useCallback(
    (id: string) => {
      dispatch(removePDFFile(id));
    },
    [dispatch]
  );

  const handleShowFileInfo = useCallback((id: string) => {
    setFileInfoModal({
      isOpen: true,
      fileId: id,
    });
  }, []);

  const closeFileInfoModal = useCallback(() => {
    setFileInfoModal({
      isOpen: false,
      fileId: null,
    });
  }, []);

  const handleDragStart = useCallback((index: number) => {
    setActiveDragIndex(index);
    setFocusedItemIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    setActiveDragIndex(null);
  }, []);

  const selectedFile = fileInfoModal.fileId 
    ? files.find(file => file.id === fileInfoModal.fileId) 
    : null;

  return (
    <DndProvider backend={HTML5Backend}>
      <div 
        className={`draggable-document-list ${className}`} 
        aria-label="Document list"
        data-testid="draggable-document-list"
        onKeyDown={handleKeyDown}
        tabIndex={-1}
      >
        {files.length > 0 ? (
          <>
            <div className="mb-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  Documents ({files.length})
                </h2>
                <div className="flex items-center space-x-4">
                  <UndoRedoToolbar />
                  <div className="text-sm text-gray-500 dark:text-gray-400 hidden sm:block">
                    Drag to reorder • Alt+↑/↓ to move
                  </div>
                  <KeyboardShortcutHelp />
                </div>
              </div>
            </div>
            
            <div 
              className={`document-items space-y-2 transition-all duration-300 ${
                isReordering ? 'opacity-90' : ''
              }`}
              aria-live="polite"
              role="list"
            >
              {files.map((file, index) => (
                <div
                  key={file.id}
                  className={`relative ${
                    activeDragIndex !== null && activeDragIndex !== index
                      ? 'transition-transform duration-200'
                      : ''
                  }`}
                  ref={el => itemRefs.current[index] = el}
                  tabIndex={focusedItemIndex === index ? 0 : -1}
                  role="listitem"
                  aria-selected={selectedFiles.includes(file.id)}
                  onFocus={() => setFocusedItemIndex(index)}
                >
                  {activeDragIndex !== null && activeDragIndex !== index && (
                    <div 
                      className={`absolute inset-x-0 h-1 bg-blue-400 rounded-full transform scale-x-0 transition-transform duration-200 ${
                        index === activeDragIndex + 1 ? 'bottom-0 scale-x-100' : ''
                      } ${
                        index === activeDragIndex - 1 ? 'top-0 scale-x-100' : ''
                      }`}
                    />
                  )}
                  <DocumentItem
                    file={file}
                    index={index}
                    moveFile={moveFile}
                    removeFile={handleRemoveFile}
                    showFileInfo={handleShowFileInfo}
                    onDragStart={() => handleDragStart(index)}
                    onDragEnd={handleDragEnd}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-700 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-300">
            <p className="text-lg font-medium">No documents added yet</p>
            <p className="text-sm mt-1">Drag and drop PDF files or use the Add Documents button</p>
          </div>
        )}
        
        {fileInfoModal.isOpen && selectedFile && (
          <FileInfoModal
            file={selectedFile}
            isOpen={fileInfoModal.isOpen}
            onClose={closeFileInfoModal}
          />
        )}
      </div>
    </DndProvider>
  );
};

export default DraggableDocumentList; 