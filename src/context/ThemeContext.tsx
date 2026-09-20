import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const saved = localStorage.getItem('sentrune_theme') as Theme | null;
      if (saved && ['light', 'dark', 'system'].includes(saved)) {
        return saved;
      }
      return 'system'; // Default option: user's system preference else white mode
    } catch {
      return 'system';
    }
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('sentrune_theme');
      if (saved === 'dark') return true;
      if (saved === 'light') return false;
      const media = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
      return media ? media.matches : false; // else white mode (false)
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateActualTheme = () => {
      let resolvedDark = false;
      if (theme === 'system') {
        resolvedDark = !!(mediaQuery && mediaQuery.matches); // user's system preference else white mode
      } else {
        resolvedDark = theme === 'dark';
      }

      setIsDark(resolvedDark);
      if (resolvedDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        root.style.colorScheme = 'dark';
        document.body.style.backgroundColor = '#050b14';
        document.body.style.color = '#f1f5f9';
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.style.colorScheme = 'light';
        document.body.style.backgroundColor = '#f8fafc';
        document.body.style.color = '#0f172a';
      }
    };

    updateActualTheme();
    try {
      localStorage.setItem('sentrune_theme', theme);
    } catch {}

    const listener = () => {
      if (theme === 'system') {
        updateActualTheme();
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => {
      if (prev === 'system') {
        const isSysDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return isSysDark ? 'light' : 'dark';
      }
      return prev === 'dark' ? 'light' : 'dark';
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
