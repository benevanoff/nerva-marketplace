import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import UserContext from './UserContext';
import './command-palette.css';

const HomeIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
);

const CartIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="9" cy="21" r="1"></circle>
        <circle cx="20" cy="21" r="1"></circle>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
    </svg>
);

const HeartIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
    </svg>
);

const BoxIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
        <line x1="12" y1="22.08" x2="12" y2="12"></line>
    </svg>
);

const PlusIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="16"></line>
        <line x1="8" y1="12" x2="16" y2="12"></line>
    </svg>
);

const LoginIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
        <polyline points="10 17 15 12 10 7"></polyline>
        <line x1="15" y1="12" x2="3" y2="12"></line>
    </svg>
);

const CommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeIndex, setActiveIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { userDetails, authChecked } = useContext(UserContext);

    const isVendor = Boolean(userDetails && userDetails.is_vendor);

    // open/close from anywhere with ctrl+k (or cmd+k on mac)
    useEffect(() => {
        const handleKeyDown = (event) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setIsOpen(open => !open);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // the trigger button in the navbar opens the palette through an event,
    // so both stay decoupled
    useEffect(() => {
        const openPalette = () => setIsOpen(true);
        window.addEventListener('nerva-open-palette', openPalette);
        return () => window.removeEventListener('nerva-open-palette', openPalette);
    }, []);

    // reset the search whenever the palette opens
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setActiveIndex(0);
            // let the input mount before focusing it
            window.setTimeout(() => {
                if (inputRef.current) inputRef.current.focus();
            }, 10);
        }
    }, [isOpen]);

    const commands = useMemo(() => {
        const items = [
            { id: 'listings', label: 'Browse listings', icon: <HomeIcon />, run: () => navigate('/listings') },
            { id: 'cart', label: 'Open cart', icon: <CartIcon />, run: () => navigate('/cart') },
            { id: 'favorites', label: 'Open favorites', icon: <HeartIcon />, run: () => navigate('/favorites') },
        ];
        if (authChecked && userDetails) {
            if (isVendor) {
                items.push({ id: 'create', label: 'Create a listing', icon: <PlusIcon />, run: () => navigate('/create_listing') });
                items.push({ id: 'vendor-orders', label: 'Vendor orders', icon: <BoxIcon />, run: () => navigate('/vendor/orders') });
            } else {
                items.push({ id: 'orders', label: 'Your orders', icon: <BoxIcon />, run: () => navigate('/customer/orders') });
            }
        } else if (authChecked) {
            items.push({ id: 'login', label: 'Log in', icon: <LoginIcon />, run: () => navigate('/login') });
        }
        return items;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authChecked, userDetails, isVendor]);

    const filteredCommands = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return commands;
        return commands.filter(command => command.label.toLowerCase().includes(q));
    }, [commands, query]);

    useEffect(() => {
        // keep the highlight inside the visible range while typing
        if (activeIndex >= filteredCommands.length) {
            setActiveIndex(0);
        }
    }, [filteredCommands.length, activeIndex]);

    const closePalette = () => setIsOpen(false);

    const runCommand = (command) => {
        closePalette();
        command.run();
    };

    const handleInputKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            closePalette();
            return;
        }
        if (event.key === 'ArrowDown') {
            event.preventDefault();
            setActiveIndex(index => Math.min(index + 1, filteredCommands.length - 1));
            return;
        }
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            setActiveIndex(index => Math.max(index - 1, 0));
            return;
        }
        if (event.key === 'Enter' && filteredCommands[activeIndex]) {
            event.preventDefault();
            runCommand(filteredCommands[activeIndex]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="palette-backdrop" onClick={closePalette}>
            <div
                className="palette"
                role="dialog"
                aria-modal="true"
                aria-label="Quick navigation"
                onClick={event => event.stopPropagation()}
            >
                <div className="palette-input-row">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        ref={inputRef}
                        className="palette-input"
                        type="text"
                        placeholder="Where do you want to go?"
                        value={query}
                        onChange={event => setQuery(event.target.value)}
                        onKeyDown={handleInputKeyDown}
                        aria-label="Search commands"
                    />
                    <kbd className="palette-kbd">esc</kbd>
                </div>
                <div className="palette-list" role="listbox">
                    {filteredCommands.map((command, index) => (
                        <button
                            key={command.id}
                            className={`palette-item ${index === activeIndex ? 'active' : ''}`}
                            role="option"
                            aria-selected={index === activeIndex}
                            onMouseEnter={() => setActiveIndex(index)}
                            onClick={() => runCommand(command)}
                        >
                            <span className="palette-item-icon">{command.icon}</span>
                            <span className="palette-item-label">{command.label}</span>
                            {index === activeIndex && <kbd className="palette-kbd">enter</kbd>}
                        </button>
                    ))}
                    {filteredCommands.length === 0 && (
                        <div className="palette-empty">Nothing matches "{query}"</div>
                    )}
                </div>
                <div className="palette-footer">
                    <span><kbd className="palette-kbd">↑</kbd><kbd className="palette-kbd">↓</kbd> to move</span>
                    <span><kbd className="palette-kbd">enter</kbd> to go</span>
                    <span><kbd className="palette-kbd">ctrl</kbd>+<kbd className="palette-kbd">k</kbd> to toggle</span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
