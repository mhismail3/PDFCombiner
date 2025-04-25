import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Constants for localStorage keys
const STORAGE_KEYS = {
  PDF_FILE_ORDER: 'pdf-combiner-file-order',
  PDF_SELECTED_FILES: 'pdf-combiner-selected-files',
};

// Define types for PDF file management
export interface PDFFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  data: ArrayBuffer | null; // File data as ArrayBuffer - handled specially for Redux
  dataRef?: string; // Reference to the data stored outside Redux (for serialization)
  preview: string | null; // Base64 encoded thumbnail preview
  pageCount: number;
  selected: boolean; // Whether this file is selected for operations
  status: 'loading' | 'ready' | 'error';
  error?: string;
  processingProgress?: number; // Track progress percentage during processing
}

export interface PDFState {
  files: PDFFile[];
  isUploading: boolean;
  uploadProgress: number;
  isMerging: boolean;
  mergeProgress: number;
  mergeError: string | null;
  resultFile: {
    url: string | null;
    name: string | null;
    size: number | null;
  };
}

const initialState: PDFState = {
  files: [],
  isUploading: false,
  uploadProgress: 0,
  isMerging: false,
  mergeProgress: 0,
  mergeError: null,
  resultFile: {
    url: null,
    name: null,
    size: null,
  },
};

// Helper function to save file order to localStorage
const saveFileOrder = (files: PDFFile[]): void => {
  try {
    const orderData = files.map(file => file.id);
    localStorage.setItem(STORAGE_KEYS.PDF_FILE_ORDER, JSON.stringify(orderData));
  } catch (error) {
    // Silently handle errors for localStorage operations
    // Using a custom error handler could be implemented here if needed
  }
};

// Helper function to save selected files to localStorage
const saveSelectedFiles = (files: PDFFile[]): void => {
  try {
    const selectedFiles = files.filter(file => file.selected).map(file => file.id);
    localStorage.setItem(STORAGE_KEYS.PDF_SELECTED_FILES, JSON.stringify(selectedFiles));
  } catch (error) {
    // Silently handle errors for localStorage operations
    // Using a custom error handler could be implemented here if needed
  }
};

// ArrayBuffer cache to store non-serializable data outside Redux
// This is a workaround for Redux serialization issues
const arrayBufferCache = new Map<string, ArrayBuffer>();

export const pdfSlice = createSlice({
  name: 'pdf',
  initialState,
  reducers: {
    // Add new PDF files to the state
    addPDFFiles: (state, action: PayloadAction<Omit<PDFFile, 'selected'>[]>) => {
      const newFiles = action.payload.map(file => {
        // Store the ArrayBuffer in our cache
        const dataRef = file.id;
        if (file.data) {
          arrayBufferCache.set(dataRef, file.data);
        }
        
        return {
          ...file,
          // Replace the ArrayBuffer with null for Redux
          // Actual data will be accessed via the cache using dataRef
          data: null,
          dataRef: file.data ? dataRef : undefined,
          selected: true,
        };
      });
      state.files = [...state.files, ...newFiles];
      
      // Save file order after adding new files
      saveFileOrder(state.files);
      saveSelectedFiles(state.files);
    },

    // Remove a PDF file by id
    removePDFFile: (state, action: PayloadAction<string>) => {
      // Clean up any cached data
      const fileToRemove = state.files.find(file => file.id === action.payload);
      if (fileToRemove && fileToRemove.dataRef) {
        arrayBufferCache.delete(fileToRemove.dataRef);
      }
      
      state.files = state.files.filter(file => file.id !== action.payload);
      
      // Save updated file order after removing a file
      saveFileOrder(state.files);
      saveSelectedFiles(state.files);
    },

    // Update a specific PDF file
    updatePDFFile: (state, action: PayloadAction<{ id: string; updates: Partial<PDFFile> }>) => {
      const { id, updates } = action.payload;
      const fileIndex = state.files.findIndex(file => file.id === id);
      
      if (fileIndex >= 0) {
        // Handle ArrayBuffer specially
        if (updates.data) {
          const dataRef = state.files[fileIndex].id;
          arrayBufferCache.set(dataRef, updates.data);
          
          // Set the reference and remove the actual data from Redux
          updates.dataRef = dataRef;
          updates.data = null;
        }
        
        state.files[fileIndex] = { ...state.files[fileIndex], ...updates };
        
        // If the 'selected' property was updated, save selected files
        if (updates.hasOwnProperty('selected')) {
          saveSelectedFiles(state.files);
        }
      }
    },

    // Clear all PDF files
    clearPDFFiles: state => {
      // Clean up all cached data
      state.files.forEach(file => {
        if (file.dataRef) {
          arrayBufferCache.delete(file.dataRef);
        }
      });
      
      state.files = [];
      state.resultFile = { url: null, name: null, size: null };
      
      // Clear localStorage when all files are removed
      localStorage.removeItem(STORAGE_KEYS.PDF_FILE_ORDER);
      localStorage.removeItem(STORAGE_KEYS.PDF_SELECTED_FILES);
    },

    // Toggle file selection
    toggleFileSelection: (state, action: PayloadAction<string>) => {
      const fileIndex = state.files.findIndex(file => file.id === action.payload);
      if (fileIndex >= 0) {
        state.files[fileIndex].selected = !state.files[fileIndex].selected;
        
        // Save selected files after toggling
        saveSelectedFiles(state.files);
      }
    },

    // Select all files
    selectAllFiles: state => {
      state.files = state.files.map(file => ({ ...file, selected: true }));
      
      // Save selected files after selecting all
      saveSelectedFiles(state.files);
    },

    // Deselect all files
    deselectAllFiles: state => {
      state.files = state.files.map(file => ({ ...file, selected: false }));
      
      // Save selected files after deselecting all
      saveSelectedFiles(state.files);
    },

    // Set uploading state
    setIsUploading: (state, action: PayloadAction<boolean>) => {
      state.isUploading = action.payload;
    },

    // Update upload progress
    setUploadProgress: (state, action: PayloadAction<number>) => {
      state.uploadProgress = action.payload;
    },

    // Set merging state
    setIsMerging: (state, action: PayloadAction<boolean>) => {
      state.isMerging = action.payload;
    },

    // Update merge progress
    setMergeProgress: (state, action: PayloadAction<number>) => {
      state.mergeProgress = action.payload;
    },

    // Set merge error
    setMergeError: (state, action: PayloadAction<string | null>) => {
      state.mergeError = action.payload;
    },

    // Set the result merged PDF file
    setResultFile: (state, action: PayloadAction<{ url: string; name: string; size: number }>) => {
      state.resultFile = action.payload;
    },

    // Clear the result file
    clearResultFile: state => {
      state.resultFile = { url: null, name: null, size: null };
    },

    // Reorder files (for drag and drop reordering)
    reorderFiles: (
      state,
      action: PayloadAction<{ sourceIndex: number; destinationIndex: number }>
    ) => {
      const { sourceIndex, destinationIndex } = action.payload;
      const result = Array.from(state.files);
      const [removed] = result.splice(sourceIndex, 1);
      result.splice(destinationIndex, 0, removed);
      state.files = result;
      
      // Save updated file order after reordering
      saveFileOrder(state.files);
    },
    
    // Load persisted file order from localStorage
    loadPersistedState: (state) => {
      // This is called by the application during startup to restore file order
      // Note: The actual files data must already be loaded before calling this
      try {
        // Safety check: if there are no files to reorder, do nothing
        if (state.files.length === 0) return;
        
        const savedOrderString = localStorage.getItem(STORAGE_KEYS.PDF_FILE_ORDER);
        const savedSelectedString = localStorage.getItem(STORAGE_KEYS.PDF_SELECTED_FILES);
        
        if (savedOrderString) {
          try {
            const savedOrder = JSON.parse(savedOrderString) as string[];
            
            // Only apply saved order if all current files exist in the saved order
            // and if the order is actually different from current order
            const allFilesExist = state.files.every(file => savedOrder.includes(file.id));
            
            if (allFilesExist) {
              // Check if current order is different from saved order before sorting
              const currentOrder = state.files.map(file => file.id);
              const needsReordering = savedOrder.some((id, index) => 
                index < currentOrder.length && currentOrder[index] !== id
              );
              
              if (needsReordering) {
                // Sort files according to saved order
                state.files = state.files.sort((a, b) => {
                  return savedOrder.indexOf(a.id) - savedOrder.indexOf(b.id);
                });
              }
            }
          } catch (error) {
            // Silently handle JSON parse errors
          }
        }
        
        if (savedSelectedString) {
          try {
            const savedSelected = JSON.parse(savedSelectedString) as string[];
            
            // Only update selection if it's different from current state
            // This prevents unnecessary state updates
            const needsSelectionUpdate = state.files.some(file => 
              file.selected !== savedSelected.includes(file.id)
            );
            
            if (needsSelectionUpdate) {
              // Apply saved selection state
              state.files = state.files.map(file => ({
                ...file,
                selected: savedSelected.includes(file.id)
              }));
            }
          } catch (error) {
            // Silently handle JSON parse errors
          }
        }
      } catch (error) {
        // Silently handle localStorage errors
        // A custom error logging solution could be added here if needed
      }
    },
  },
});

export const {
  addPDFFiles,
  removePDFFile,
  updatePDFFile,
  clearPDFFiles,
  toggleFileSelection,
  selectAllFiles,
  deselectAllFiles,
  setIsUploading,
  setUploadProgress,
  setIsMerging,
  setMergeProgress,
  setMergeError,
  setResultFile,
  clearResultFile,
  reorderFiles,
  loadPersistedState,
} = pdfSlice.actions;

// Helper function to get the actual ArrayBuffer from a PDFFile
export const getPDFDataBuffer = (file: PDFFile): ArrayBuffer | null => {
  if (file.data) {
    return file.data;
  }
  
  if (file.dataRef && arrayBufferCache.has(file.dataRef)) {
    return arrayBufferCache.get(file.dataRef) || null;
  }
  
  return null;
};

export default pdfSlice.reducer;
