import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import pdfReducer from './slices/pdfSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    pdf: pdfReducer,
    // Additional reducers will be added here as needed
  },
  // Middleware and other config can be added here
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
