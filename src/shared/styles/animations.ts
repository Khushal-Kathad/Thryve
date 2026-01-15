import { keyframes } from 'styled-components';

// Common animations used across components

export const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

export const fadeInScale = keyframes`
    from {
        opacity: 0;
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
`;

export const slideInLeft = keyframes`
    from {
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
`;

export const slideInRight = keyframes`
    from {
        opacity: 0;
        transform: translateX(20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
`;

export const slideDown = keyframes`
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

export const slideIn = keyframes`
    from {
        transform: translateX(-100%);
    }
    to {
        transform: translateX(0);
    }
`;

export const spin = keyframes`
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
`;

export const pulse = keyframes`
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.5;
    }
`;

export const pulseScale = keyframes`
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.7;
        transform: scale(0.95);
    }
`;

export const shimmer = keyframes`
    0% {
        background-position: -200% 0;
    }
    100% {
        background-position: 200% 0;
    }
`;

export const bounce = keyframes`
    0%, 60%, 100% {
        transform: translateY(0);
    }
    30% {
        transform: translateY(-4px);
    }
`;

export const float = keyframes`
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-10px);
    }
`;

export const popIn = keyframes`
    0% {
        opacity: 0;
        transform: scale(0.5);
    }
    70% {
        transform: scale(1.1);
    }
    100% {
        opacity: 1;
        transform: scale(1);
    }
`;

export const breathe = keyframes`
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.7;
        transform: scale(1.1);
    }
`;

export const onlinePulse = keyframes`
    0%, 100% {
        box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4);
    }
    50% {
        box-shadow: 0 0 0 4px rgba(34, 197, 94, 0);
    }
`;

export const pulseHighlight = keyframes`
    0%, 100% {
        background: rgba(124, 58, 237, 0.15);
    }
    50% {
        background: rgba(124, 58, 237, 0.25);
    }
`;

export const recordingPulse = keyframes`
    0%, 100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.2);
        opacity: 0.7;
    }
`;

export const waveAnimation = keyframes`
    0%, 100% {
        height: 8px;
    }
    50% {
        height: 24px;
    }
`;
