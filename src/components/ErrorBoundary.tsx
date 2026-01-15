import React, { Component, ReactNode } from 'react';
import styled, { keyframes } from 'styled-components';
import RefreshIcon from '@mui/icons-material/Refresh';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <ErrorContainer>
                    <ErrorIcon>
                        <ErrorOutlineIcon />
                    </ErrorIcon>
                    <ErrorTitle>Something went wrong</ErrorTitle>
                    <ErrorMessage>
                        {this.state.error?.message || 'An unexpected error occurred'}
                    </ErrorMessage>
                    <RetryButton onClick={this.handleRetry}>
                        <RefreshIcon />
                        <span>Try Again</span>
                    </RetryButton>
                </ErrorContainer>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

// Animations
const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: scale(0.9);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
`;

const shake = keyframes`
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
`;

// Styled Components
const ErrorContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
    text-align: center;
    animation: ${fadeIn} 0.3s ease-out;
    min-height: 200px;
`;

const ErrorIcon = styled.div`
    width: 60px;
    height: 60px;
    border-radius: var(--radius-lg);
    background: rgba(233, 69, 96, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-lg);
    animation: ${shake} 0.5s ease-out;

    svg {
        font-size: 30px;
        color: var(--accent-danger);
    }
`;

const ErrorTitle = styled.h3`
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);
`;

const ErrorMessage = styled.p`
    font-size: 0.9rem;
    color: var(--text-muted);
    margin-bottom: var(--spacing-lg);
    max-width: 300px;
`;

const RetryButton = styled.button`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--radius-md);
    background: var(--accent-primary);
    color: white;
    font-weight: 500;
    transition: all var(--transition-fast);

    svg {
        font-size: 1.1rem;
    }

    &:hover {
        background: var(--accent-secondary);
        transform: translateY(-2px);
    }
`;
