import React, { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import ErrorBoundary from './ErrorBoundary';
import usePersistentPDFState from '../hooks/usePersistentPDFState';

const Layout: React.FC = () => {
  // Load persisted PDF state
  // Hook now handles all the logic internally to prevent loops
  usePersistentPDFState();

  useEffect(() => {
    // Set dark mode based on user preference if not already set
    if (!localStorage.getItem('pdf-combiner-theme')) {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark', prefersDarkMode);
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 shadow-md">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <Link to="/" className="flex items-center gap-2">
              <svg 
                className="h-8 w-8 text-blue-600 dark:text-blue-400" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              <span className="text-xl font-bold text-gray-900 dark:text-white">PDF Combiner</span>
            </Link>
            <div className="flex items-center space-x-4">
              <nav className="hidden md:flex space-x-4 mr-4">
                <NavLink 
                  to="/" 
                  className={({ isActive }) => 
                    `px-3 py-2 rounded-md font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                    }`
                  }
                  end
                >
                  Home
                </NavLink>
                <NavLink 
                  to="/about" 
                  className={({ isActive }) => 
                    `px-3 py-2 rounded-md font-medium transition-colors ${
                      isActive 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                        : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                    }`
                  }
                >
                  About
                </NavLink>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-auto">
        <div className="container mx-auto px-4">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} PDF Combiner. All rights reserved.</p>
            <p className="mt-1">
              Built with React, TypeScript, and Tailwind CSS.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
