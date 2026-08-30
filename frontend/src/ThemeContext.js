import React, { createContext, useContext, useEffect, useState } from 'react';
import './dark-mode.css';

const STORAGE_KEY = 'nerva-marketplace-theme';

const ThemeContext = createContext({
    theme: 'light',
    toggleTheme: () => {},
});

const getInitialTheme = () => {
    // saved choice wins, otherwise follow the OS preference
    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
            return stored;
        }
    } catch (error) {
        // localStorage can throw in private browsing modes, just fall through
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
    }
    return 'light';
};

export const ThemeProvider = ({ children }) => {
    const [theme, setTheme] = useState(getInitialTheme);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        try {
            window.localStorage.setItem(STORAGE_KEY, theme);
        } catch (error) {
            // ignore, theme still applies for the session
        }
        // keep the browser chrome (mobile address bar etc) in sync
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute('content', theme === 'dark' ? '#0b101d' : '#219de5');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(current => (current === 'dark' ? 'light' : 'dark'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

export default ThemeContext;
