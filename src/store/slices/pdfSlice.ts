import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// Define types for PDF file management
export interface PDFFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  data: ArrayBuffer | null; // File data as ArrayBuffer
  preview: string | null; // Base64 encoded thumbnail preview
  pageCount: number;
  selected: boolean; // Whether this file is selected for operations
  status: 'loading' | 'ready' | 'error';
  error?: string;
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

export const pdfSlice = createSlice({
  name: 'pdf',
  initialState,
  reducers: {
    // Add new PDF files to the state
    addPDFFiles: (state, action: PayloadAction<Omit<PDFFile, 'selected'>[]>) => {
      const newFiles = action.payload.map(file => ({
        ...file,
        selected: true,
      }));
      state.files = [...state.files, ...newFiles];
    },

    // Remove a PDF file by id
    removePDFFile: (state, action: PayloadAction<string>) => {
      state.files = state.files.filter(file => file.id !== action.payload);
    },

    // Update a specific PDF file
    updatePDFFile: (state, action: PayloadAction<{ id: string; updates: Partial<PDFFile> }>) => {
      const { id, updates } = action.payload;
      const fileIndex = state.files.findIndex(file => file.id === id);
      if (fileIndex >= 0) {
        state.files[fileIndex] = { ...state.files[fileIndex], ...updates };
      }
    },

    // Clear all PDF files
    clearPDFFiles: state => {
      state.files = [];
      state.resultFile = { url: null, name: null, size: null };
    },

    // Toggle file selection
    toggleFileSelection: (state, action: PayloadAction<string>) => {
      const fileIndex = state.files.findIndex(file => file.id === action.payload);
      if (fileIndex >= 0) {
        state.files[fileIndex].selected = !state.files[fileIndex].selected;
      }
    },

    // Select all files
    selectAllFiles: state => {
      state.files = state.files.map(file => ({ ...file, selected: true }));
    },

    // Deselect all files
    deselectAllFiles: state => {
      state.files = state.files.map(file => ({ ...file, selected: false }));
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
} = pdfSlice.actions;

export default pdfSlice.reducer;
