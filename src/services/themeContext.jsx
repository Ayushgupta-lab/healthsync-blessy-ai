import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: () => {}
});

export function ThemeProvider({ children }) {
  // Theme options: 'light' (White/Clean), 'dark', 'system' (Laptop OS theme)
  const [theme, setThemeState] = useState(() => {
    try {
      return localStorage.getItem('healthsync_theme') || 'system';
    } catch {
      return 'system';
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState('dark');

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let isDark = false;
      if (theme === 'system') {
        isDark = mediaQuery.matches;
      } else {
        isDark = theme === 'dark';
      }

      setResolvedTheme(isDark ? 'dark' : 'light');

      if (isDark) {
        root.classList.add('dark');
        root.style.colorScheme = 'dark';
        const metaThemeColor = document.querySelector("meta[name='theme-color']");
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#0A0F1D');
      } else {
        root.classList.remove('dark');
        root.style.colorScheme = 'light';
        const metaThemeColor = document.querySelector("meta[name='theme-color']");
        if (metaThemeColor) metaThemeColor.setAttribute('content', '#FFFFFF');
      }
    };

    applyTheme();

    const handleMediaChange = () => {
      if (theme === 'system') {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, [theme]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('healthsync_theme', newTheme);
    } catch {}
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
