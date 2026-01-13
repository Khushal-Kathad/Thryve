import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import Toast from '../components/ui/Toast';

interface ToastItem {
    id: number;
    message: string;
    type: 'info' | 'success' | 'error';
    duration: number;
}

interface ToastContextType {
    showToast: (message: string, type?: 'info' | 'success' | 'error', duration?: number) => void;
    dismissToast: (id: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

interface ToastProviderProps {
    children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info', duration: number = 5000) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, message, type, duration }]);
    }, []);

    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, dismissToast }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
            }}>
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        message={toast.message}
                        type={toast.type}
                        duration={toast.duration}
                        onClose={() => dismissToast(toast.id)}
                    />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export default ToastProvider;
