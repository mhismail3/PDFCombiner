import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

// Create a context with a default value
const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

interface ThemeProviderProps {
  children: ReactNode;
}

// Check if code is running in browser environment
const isBrowser = typeof window !== 'undefined';

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  // Check if theme is saved in localStorage, otherwise use system preference
  const getInitialTheme = (): Theme => {
    // Default to dark if not in browser
    if (!isBrowser) return 'dark';

    try {
      const savedTheme = localStorage.getItem('theme') as Theme;

      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        return savedTheme;
      }

      // Check system preference
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch (error) {
      console.error('Error accessing localStorage or window features:', error);
    }

    // Default to dark instead of light
    return 'dark';
  };

  const [theme, setTheme] = useState<Theme>('dark'); // Default to dark initially

  // Initialize theme state after mount, to handle SSR
  useEffect(() => {
    setTheme(getInitialTheme());
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!isBrowser) return;

    try {
      const root = window.document.documentElement;

      root.classList.remove('light', 'dark');
      root.classList.add(theme);

      // Save to localStorage
      localStorage.setItem('theme', theme);
    } catch (error) {
      console.error('Error setting theme:', error);
    }
  }, [theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (!isBrowser) return;

    try {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = () => {
        try {
          if (!localStorage.getItem('theme')) {
            setTheme(mediaQuery.matches ? 'dark' : 'light');
          }
        } catch (error) {
          console.error('Error in media query handler:', error);
        }
      };

      mediaQuery.addEventListener('change', handleChange);

      return () => mediaQuery.removeEventListener('change', handleChange);
    } catch (error) {
      console.error('Error setting up media query listener:', error);
      return undefined;
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const value = {
    theme,
    toggleTheme,
    setTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// Custom hook to use the theme context
export const useTheme = () => useContext(ThemeContext);

export default ThemeProvider;
