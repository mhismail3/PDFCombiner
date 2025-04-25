import { configureStore } from '@reduxjs/toolkit';
import { getDefaultMiddleware } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import pdfReducer from './slices/pdfSlice';
import historyReducer from './slices/historySlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    pdf: pdfReducer,
    history: historyReducer,
    // Additional reducers will be added here as needed
  },
  middleware: getDefaultMiddleware({
    // Configure middleware to handle non-serializable values
    serializableCheck: {
      // Ignore these action types
      ignoredActions: ['pdf/addPDFFiles', 'pdf/updatePDFFile', 'pdf/setResultFile'],
      // Ignore these field paths in the state
      ignoredPaths: ['pdf.files.data', 'pdf.files.dataRef'],
    },
  }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
