import React, { useState, useEffect, useCallback } from 'react';

// Zoom control constants
export const MIN_ZOOM = 0.5;  // 50% of original size
export const MAX_ZOOM = 2.0;  // 200% of original size
export const DEFAULT_ZOOM = 1.0;
export const ZOOM_STEP = 0.1;

interface ZoomControlsProps {
  onZoomChange: (zoom: number) => void;
  className?: string;
}

/**
 * Component that provides zoom controls with buttons, slider, and keyboard shortcuts
 */
const ZoomControls: React.FC<ZoomControlsProps> = ({
  onZoomChange,
  className = ''
}) => {
  // Get stored zoom level or use default
  const [currentZoom, setCurrentZoom] = useState(() => {
    const storedZoom = localStorage.getItem('userZoomPreference');
    return storedZoom ? parseFloat(storedZoom) : DEFAULT_ZOOM;
  });

  // Initialize zoom level on component mount
  useEffect(() => {
    onZoomChange(currentZoom);
  }, [currentZoom, onZoomChange]);

  // Update zoom level and save to localStorage
  const updateZoom = useCallback((newZoom: number) => {
    const clampedZoom = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
    setCurrentZoom(clampedZoom);
    onZoomChange(clampedZoom);
    localStorage.setItem('userZoomPreference', clampedZoom.toString());
  }, [onZoomChange]);

  // Handle zoom in button click
  const handleZoomIn = useCallback(() => {
    updateZoom(currentZoom + ZOOM_STEP);
  }, [currentZoom, updateZoom]);

  // Handle zoom out button click
  const handleZoomOut = useCallback(() => {
    updateZoom(currentZoom - ZOOM_STEP);
  }, [currentZoom, updateZoom]);

  // Handle slider change
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateZoom(parseInt(e.target.value) / 100);
  }, [updateZoom]);

  // Handle reset to default zoom
  const handleResetZoom = useCallback(() => {
    updateZoom(DEFAULT_ZOOM);
  }, [updateZoom]);

  // Setup keyboard shortcuts for zooming
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle keyboard shortcuts if not in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.ctrlKey && e.key === '=') {
        e.preventDefault();
        updateZoom(currentZoom + ZOOM_STEP);
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        updateZoom(currentZoom - ZOOM_STEP);
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        updateZoom(DEFAULT_ZOOM);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentZoom, updateZoom]);

  // Format zoom level for display
  const formattedZoom = `${Math.round(currentZoom * 100)}%`;

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <button
        onClick={handleZoomOut}
        disabled={currentZoom <= MIN_ZOOM}
        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Zoom out"
        title="Zoom out (Ctrl + -)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      </button>
      
      <div className="flex items-center space-x-2">
        <input
          type="range"
          min={MIN_ZOOM * 100}
          max={MAX_ZOOM * 100}
          value={currentZoom * 100}
          onChange={handleSliderChange}
          className="w-24 md:w-32"
          aria-label="Zoom level"
        />
        <span className="text-xs whitespace-nowrap">{formattedZoom}</span>
      </div>
      
      <button
        onClick={handleZoomIn}
        disabled={currentZoom >= MAX_ZOOM}
        className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Zoom in"
        title="Zoom in (Ctrl + =)"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
        </svg>
      </button>
      
      <button
        onClick={handleResetZoom}
        className="text-xs px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
        aria-label="Reset zoom"
        title="Reset zoom (Ctrl + 0)"
      >
        Reset
      </button>
    </div>
  );
};

export default ZoomControls; 