import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { loadPersistedState } from '../store/slices/pdfSlice';

/**
 * Custom hook to handle loading persisted PDF state from localStorage
 * This hook ensures PDF files state is only loaded once on initial mount
 * and doesn't create infinite update loops
 * 
 * @returns void - This hook doesn't return anything, it's only used for its side effect
 */
const usePersistentPDFState = (): void => {
  const dispatch = useDispatch();
  const { files } = useSelector((state: RootState) => state.pdf);
  // Use refs instead of state to avoid re-renders
  const hasAttemptedLoad = useRef(false);
  const isLoadedFromStorage = useRef(false);
  
  // First effect runs exactly once to mark that we've attempted to load
  useEffect(() => {
    hasAttemptedLoad.current = true;
  }, []);
  
  // Second effect depends on files but only acts when certain conditions are met
  useEffect(() => {
    // Only proceed if:
    // 1. We've already attempted an initial load (to avoid race conditions)
    // 2. We haven't successfully loaded from storage yet
    // 3. There are files to load
    if (
      hasAttemptedLoad.current &&
      !isLoadedFromStorage.current && 
      files.length > 0
    ) {
      // Mark as loaded before dispatching to prevent future attempts
      isLoadedFromStorage.current = true;
      
      // Now safe to dispatch
      dispatch(loadPersistedState());
    }
  }, [files, dispatch]);
};

export default usePersistentPDFState; 