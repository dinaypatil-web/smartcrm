import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ThemeContext = createContext();

const STORAGE_KEY = 'ayurerp-theme';

export function ThemeProvider({ children }) {
    const [theme, setThemeState] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) || 'dark';
        } catch {
            return 'dark';
        }
    });

    // Resolve effective theme (system → actual preference)
    const getResolvedTheme = useCallback(() => {
        if (theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return theme;
    }, [theme]);

    const applyTheme = useCallback((resolved) => {
        const root = document.documentElement;
        // Add smooth transition class
        root.classList.add('theme-transition');
        root.setAttribute('data-theme', resolved);
        // Remove transition class after animation completes
        setTimeout(() => root.classList.remove('theme-transition'), 350);
    }, []);

    // Apply theme on mount and when theme changes
    useEffect(() => {
        const resolved = getResolvedTheme();
        applyTheme(resolved);
        localStorage.setItem(STORAGE_KEY, theme);
    }, [theme, getResolvedTheme, applyTheme]);

    // Listen for OS theme changes when in 'system' mode
    useEffect(() => {
        if (theme !== 'system') return;
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => applyTheme(e.matches ? 'dark' : 'light');
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme, applyTheme]);

    const setTheme = (newTheme) => {
        setThemeState(newTheme);
    };

    const resolvedTheme = getResolvedTheme();

    return (
        <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};
