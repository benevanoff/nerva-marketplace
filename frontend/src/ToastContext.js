import React, { createContext, useCallback, useContext, useState } from 'react';
import './toast.css';

const ToastContext = createContext({ showToast: () => {} });

let nextToastId = 0;

const SuccessIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M20 6L9 17l-5-5"></path>
    </svg>
);

const ErrorIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="15" y1="9" x2="9" y2="15"></line>
        <line x1="9" y1="9" x2="15" y2="15"></line>
    </svg>
);

const InfoIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);

const TOAST_ICONS = {
    success: <SuccessIcon />,
    error: <ErrorIcon />,
    info: <InfoIcon />,
};

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

    const dismissToast = (id) => {
        setToasts(current => current.filter(toast => toast.id !== id));
    };

    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = ++nextToastId;
        // keep the stack short, drop the oldest one past 4
        setToasts(current => [...current.slice(-3), { id, message, type }]);
        window.setTimeout(() => {
            setToasts(current => current.filter(toast => toast.id !== id));
        }, duration);
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <div className="toast-stack" aria-live="polite">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`toast toast-${toast.type}`}
                        role={toast.type === 'error' ? 'alert' : 'status'}
                    >
                        <span className="toast-icon">{TOAST_ICONS[toast.type] || TOAST_ICONS.info}</span>
                        <span className="toast-message">{toast.message}</span>
                        <button className="toast-close" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);

export default ToastContext;
