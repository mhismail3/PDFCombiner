import React, { useState } from 'react';

interface ShortcutItem {
  key: string;
  description: string;
  keyDisplay: string;
}

interface KeyboardShortcutHelpProps {
  className?: string;
}

const KeyboardShortcutHelp: React.FC<KeyboardShortcutHelpProps> = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleHelp = () => setIsOpen(!isOpen);

  const shortcuts: ShortcutItem[] = [
    { 
      key: 'altUp', 
      description: 'Move selected document up in the list', 
      keyDisplay: 'Alt + ↑' 
    },
    { 
      key: 'altDown', 
      description: 'Move selected document down in the list', 
      keyDisplay: 'Alt + ↓' 
    },
    { 
      key: 'altHome', 
      description: 'Move selected document to the top of the list', 
      keyDisplay: 'Alt + Home' 
    },
    { 
      key: 'altEnd', 
      description: 'Move selected document to the bottom of the list', 
      keyDisplay: 'Alt + End' 
    },
    { 
      key: 'ctrlZ', 
      description: 'Undo the last reordering operation', 
      keyDisplay: 'Ctrl + Z' 
    },
    { 
      key: 'ctrlY', 
      description: 'Redo the last undone operation', 
      keyDisplay: 'Ctrl + Y' 
    },
    { 
      key: 'escape', 
      description: 'Close this help dialog', 
      keyDisplay: 'Esc' 
    }
  ];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div className={`keyboard-shortcut-help ${className}`}>
      <button 
        onClick={toggleHelp}
        className="text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded p-2 transition-colors"
        aria-label="Keyboard shortcuts help"
        title="Keyboard shortcuts"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-lg w-full m-4 max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            aria-labelledby="keyboard-shortcuts-title"
            role="dialog"
            aria-modal="true"
          >
            <h2 
              id="keyboard-shortcuts-title" 
              className="text-xl font-bold mb-4 text-gray-900 dark:text-white"
            >
              Keyboard Shortcuts
            </h2>
            
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {shortcuts.map((shortcut) => (
                <div 
                  key={shortcut.key}
                  className="py-3 flex justify-between items-center"
                >
                  <span className="text-gray-700 dark:text-gray-300">
                    {shortcut.description}
                  </span>
                  <kbd className="ml-4 px-3 py-1 text-sm font-semibold bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded shadow">
                    {shortcut.keyDisplay}
                  </kbd>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KeyboardShortcutHelp; 