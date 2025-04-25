import React, { useRef, useEffect } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import type { DragSourceMonitor } from 'react-dnd';
import { PDFFile } from '../store/slices/pdfSlice';
import { formatFileSize } from '../utils/pdfUtils';
import { FaGripVertical, FaTrash, FaInfoCircle } from 'react-icons/fa';

interface DocumentItemProps {
  file: PDFFile;
  index: number;
  moveFile: (dragIndex: number, hoverIndex: number) => void;
  removeFile: (id: string) => void;
  showFileInfo: (id: string) => void;
  onDragStart?: (index: number) => void;
  onDragEnd?: () => void;
}

// Interface for drag item
interface DragItem {
  index: number;
  type: string;
}

// Item type for drag and drop
export const ItemTypes = {
  DOCUMENT: 'document'
};

const DocumentItem: React.FC<DocumentItemProps> = ({ 
  file, 
  index, 
  moveFile, 
  removeFile,
  showFileInfo,
  onDragStart,
  onDragEnd
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // Set up drag functionality
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.DOCUMENT,
    item: () => {
      // Call onDragStart when drag starts
      if (onDragStart) {
        onDragStart(index);
      }
      return { index };
    },
    collect: (monitor: DragSourceMonitor) => ({
      isDragging: monitor.isDragging(),
    }),
    end: () => {
      // Call onDragEnd when drag ends
      if (onDragEnd) {
        onDragEnd();
      }
    }
  });

  // Set up drop functionality
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: ItemTypes.DOCUMENT,
    hover: (item: DragItem, monitor) => {
      if (!ref.current) {
        return;
      }
      
      const dragIndex = item.index;
      const hoverIndex = index;
      
      // Don't replace items with themselves
      if (dragIndex === hoverIndex) {
        return;
      }
      
      // Determine rectangle on screen
      const hoverBoundingRect = ref.current.getBoundingClientRect();
      
      // Get vertical middle
      const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
      
      // Determine mouse position
      const clientOffset = monitor.getClientOffset();
      
      // Get pixels to the top
      const hoverClientY = clientOffset!.y - hoverBoundingRect.top;
      
      // Only perform the move when the mouse has crossed half of the items height
      // When dragging downwards, only move when the cursor is below 50%
      // When dragging upwards, only move when the cursor is above 50%
      
      // Dragging downwards
      if (dragIndex < hoverIndex && hoverClientY < hoverMiddleY) {
        return;
      }
      
      // Dragging upwards
      if (dragIndex > hoverIndex && hoverClientY > hoverMiddleY) {
        return;
      }
      
      // Time to actually perform the action
      moveFile(dragIndex, hoverIndex);
      
      // Note: we're mutating the monitor item here!
      // Generally it's better to avoid mutations,
      // but it's good here for the sake of performance
      // to avoid expensive index searches.
      item.index = hoverIndex;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  });
  
  // Initialize drag and drop refs
  drag(drop(ref));
  
  // Determine the drag state for styling
  const isDragTarget = isOver && canDrop;
  
  // Format the last modified date
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  return (
    <div 
      ref={ref}
      className={`flex items-center p-3 mb-2 rounded-lg shadow-sm border transition-all duration-200 ${
        isDragging 
          ? 'opacity-50 border-blue-500 bg-blue-50 dark:bg-blue-900 dark:border-blue-400 shadow-md' 
          : isDragTarget
          ? 'border-green-300 bg-green-50 dark:bg-green-900 dark:border-green-500 shadow-md'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
      }`}
      data-testid={`document-item-${index}`}
      aria-label={`Document: ${file.name}`}
    >
      <div 
        className="mr-3 cursor-move text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        title="Drag to reorder"
      >
        {FaGripVertical({ size: 20 })}
      </div>
      
      <div className="flex-grow overflow-hidden">
        <div className="font-medium text-gray-800 dark:text-gray-200 truncate" title={file.name}>
          {file.name}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 flex flex-wrap space-x-4">
          <span>{formatFileSize(file.size)}</span>
          <span>Modified: {formatDate(new Date(file.lastModified))}</span>
          {file.status && (
            <span className={`${
              file.status === 'error' 
                ? 'text-red-500 dark:text-red-400' 
                : file.status === 'loading' 
                  ? 'text-yellow-500 dark:text-yellow-400' 
                  : 'text-green-500 dark:text-green-400'
            }`}>
              {file.status.charAt(0).toUpperCase() + file.status.slice(1)}
            </span>
          )}
        </div>
      </div>
      
      <div className="flex space-x-2">
        <button
          onClick={() => showFileInfo(file.id)}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-full transition-colors"
          title="Show file information"
          aria-label="Show information for file"
        >
          {FaInfoCircle({ size: 18 })}
        </button>
        
        <button
          onClick={() => removeFile(file.id)}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-full transition-colors"
          title="Remove file"
          aria-label="Remove file"
        >
          {FaTrash({ size: 18 })}
        </button>
      </div>
    </div>
  );
};

export default DocumentItem; 