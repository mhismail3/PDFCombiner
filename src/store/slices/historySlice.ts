import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { reorderFiles } from './pdfSlice';

// Define interfaces for history actions
interface ReorderAction {
  type: 'reorder';
  sourceIndex: number;
  destinationIndex: number;
}

export type HistoryAction = ReorderAction;

export interface HistoryState {
  past: HistoryAction[];
  future: HistoryAction[];
  isUndoing: boolean;
  isRedoing: boolean;
}

const initialState: HistoryState = {
  past: [],
  future: [],
  isUndoing: false,
  isRedoing: false,
};

// Maximum number of history actions to store
const MAX_HISTORY_LENGTH = 50;

export const historySlice = createSlice({
  name: 'history',
  initialState,
  reducers: {
    addHistoryAction: (state, action: PayloadAction<HistoryAction>) => {
      // Add the action to the past and clear the future when a new action is added
      state.past.push(action.payload);
      
      // Limit the size of the history
      if (state.past.length > MAX_HISTORY_LENGTH) {
        state.past = state.past.slice(-MAX_HISTORY_LENGTH);
      }
      
      state.future = [];
    },
    
    undo: state => {
      if (state.past.length === 0) return;
      
      // Move the last action from past to future
      const lastAction = state.past.pop()!;
      state.future.push(lastAction);
      state.isUndoing = true;
    },
    
    redo: state => {
      if (state.future.length === 0) return;
      
      // Move the last action from future to past
      const nextAction = state.future.pop()!;
      state.past.push(nextAction);
      state.isRedoing = true;
    },
    
    setIsUndoing: (state, action: PayloadAction<boolean>) => {
      state.isUndoing = action.payload;
    },
    
    setIsRedoing: (state, action: PayloadAction<boolean>) => {
      state.isRedoing = action.payload;
    },
    
    clearHistory: state => {
      state.past = [];
      state.future = [];
      state.isUndoing = false;
      state.isRedoing = false;
    },
  },
  // Add extra reducers to track reorder actions
  extraReducers: builder => {
    builder.addCase(reorderFiles, (state, action) => {
      if (!state.isUndoing && !state.isRedoing) {
        // Record the action for future undos
        state.past.push({
          type: 'reorder',
          sourceIndex: action.payload.sourceIndex,
          destinationIndex: action.payload.destinationIndex,
        });
        
        // Limit the size of the history
        if (state.past.length > MAX_HISTORY_LENGTH) {
          state.past = state.past.slice(-MAX_HISTORY_LENGTH);
        }
        
        state.future = [];
      }
      
      // Reset undo/redo flags
      state.isUndoing = false;
      state.isRedoing = false;
    });
  },
});

export const { 
  addHistoryAction, undo, redo, setIsUndoing, setIsRedoing, clearHistory 
} = historySlice.actions;

export default historySlice.reducer; 