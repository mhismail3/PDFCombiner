import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { undo, redo } from '../store/slices/historySlice';
import { reorderFiles } from '../store/slices/pdfSlice';

interface UndoRedoToolbarProps {
  className?: string;
}

const UndoRedoToolbar: React.FC<UndoRedoToolbarProps> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const { past, future, isUndoing, isRedoing } = useSelector(
    (state: RootState) => state.history
  );
  const { files } = useSelector((state: RootState) => state.pdf);
  
  // State for animation feedback
  const [undoAnimation, setUndoAnimation] = useState(false);
  const [redoAnimation, setRedoAnimation] = useState(false);

  // Handle undo click
  const handleUndo = useCallback(() => {
    if (past.length > 0) {
      setUndoAnimation(true);
      dispatch(undo());
      
      // Reset animation after it completes
      setTimeout(() => {
        setUndoAnimation(false);
      }, 500);
    }
  }, [dispatch, past.length]);

  // Handle redo click
  const handleRedo = useCallback(() => {
    if (future.length > 0) {
      setRedoAnimation(true);
      dispatch(redo());
      
      // Reset animation after it completes
      setTimeout(() => {
        setRedoAnimation(false);
      }, 500);
    }
  }, [dispatch, future.length]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only process if not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Undo with Ctrl+Z
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (past.length > 0) {
          setUndoAnimation(true);
          dispatch(undo());
          setTimeout(() => setUndoAnimation(false), 500);
        }
      }
      // Redo with Ctrl+Y or Ctrl+Shift+Z
      else if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        if (future.length > 0) {
          setRedoAnimation(true);
          dispatch(redo());
          setTimeout(() => setRedoAnimation(false), 500);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [dispatch, past.length, future.length]);

  // Process undo/redo actions
  useEffect(() => {
    if (isUndoing && past.length > 0) {
      const lastAction = past[past.length - 1];
      
      if (lastAction.type === 'reorder') {
        // For reorder actions, we need to swap source and destination
        dispatch(
          reorderFiles({
            sourceIndex: lastAction.destinationIndex,
            destinationIndex: lastAction.sourceIndex,
          })
        );
      }
    } else if (isRedoing && future.length > 0) {
      const nextAction = future[future.length - 1];
      
      if (nextAction.type === 'reorder') {
        dispatch(
          reorderFiles({
            sourceIndex: nextAction.sourceIndex,
            destinationIndex: nextAction.destinationIndex,
          })
        );
      }
    }
  }, [isUndoing, isRedoing, dispatch, past, future]);

  // Don't render if there are no files
  if (files.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={handleUndo}
        disabled={past.length === 0}
        className={`p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all ${
          undoAnimation ? 'bg-blue-100 dark:bg-blue-900 scale-105' : ''
        }`}
        aria-label="Undo last action"
        title="Undo (Ctrl+Z)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        <span className="ml-1 text-sm hidden sm:inline">Undo</span>
        {past.length > 0 && (
          <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            {past.length}
          </span>
        )}
      </button>

      <button
        onClick={handleRedo}
        disabled={future.length === 0}
        className={`p-2 rounded-md text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all ${
          redoAnimation ? 'bg-blue-100 dark:bg-blue-900 scale-105' : ''
        }`}
        aria-label="Redo last undone action"
        title="Redo (Ctrl+Y or Ctrl+Shift+Z)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M12.293 3.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 9H9a5 5 0 00-5 5v2a1 1 0 11-2 0v-2a7 7 0 017-7h5.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        <span className="ml-1 text-sm hidden sm:inline">Redo</span>
        {future.length > 0 && (
          <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
            {future.length}
          </span>
        )}
      </button>
    </div>
  );
};

export default UndoRedoToolbar; 