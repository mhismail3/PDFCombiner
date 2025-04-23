import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import ErrorBoundary from './ErrorBoundary';
import { NotificationProvider } from './ui';

const Layout: React.FC = () => {
  return (
    <NotificationProvider>
      <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 dark:text-white">
        <header className="bg-blue-600 dark:bg-blue-800 text-white shadow-md">
          <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-center">
            <Link to="/" className="text-2xl font-bold mb-2 sm:mb-0 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                  clipRule="evenodd"
                />
              </svg>
              PDF Combiner
            </Link>
            <div className="flex items-center space-x-6">
              <nav className="flex space-x-6">
                <NavLink
                  to="/"
                  className={({ isActive }) =>
                    isActive ? 'font-semibold border-b-2 border-white' : 'hover:text-blue-200'
                  }
                  end
                >
                  Home
                </NavLink>
                <NavLink
                  to="/about"
                  className={({ isActive }) =>
                    isActive ? 'font-semibold border-b-2 border-white' : 'hover:text-blue-200'
                  }
                >
                  About
                </NavLink>
              </nav>
              <ThemeToggle />
            </div>
          </div>
        </header>

        <main className="flex-grow container mx-auto px-4 py-8">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>

        <footer className="bg-gray-800 dark:bg-gray-900 text-white py-6">
          <div className="container mx-auto px-4 text-center">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div>
                <p className="mb-2">PDF Combiner - Client-side PDF merging with privacy</p>
                <p className="text-sm text-gray-400">
                  © {new Date().getFullYear()} PDF Combiner. All rights reserved.
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <ul className="flex space-x-4 justify-center">
                  <li>
                    <a href="#privacy" className="text-gray-400 hover:text-white">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#terms" className="text-gray-400 hover:text-white">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a href="#contact" className="text-gray-400 hover:text-white">
                      Contact
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </NotificationProvider>
  );
};

export default Layout;
