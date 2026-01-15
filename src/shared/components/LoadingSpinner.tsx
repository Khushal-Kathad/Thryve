import React from 'react';
import styled from 'styled-components';
import { spin } from '../styles/animations';

interface LoadingSpinnerProps {
    size?: 'small' | 'medium' | 'large';
    color?: string;
}

const SIZES = {
    small: 20,
    medium: 40,
    large: 48,
};

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
    size = 'medium',
    color
}) => {
    return <Spinner $size={SIZES[size]} $color={color} />;
};

export default LoadingSpinner;

const Spinner = styled.div<{ $size: number; $color?: string }>`
    width: ${props => props.$size}px;
    height: ${props => props.$size}px;
    border: 3px solid var(--border-light);
    border-top-color: ${props => props.$color || 'var(--accent-primary)'};
    border-radius: 50%;
    animation: ${spin} 1s linear infinite;
`;
