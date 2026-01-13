import React, { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import CloseIcon from '@mui/icons-material/Close';

interface ToastProps {
    message: string;
    type?: 'info' | 'success' | 'error';
    duration?: number;
    onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', duration = 5000, onClose }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(onClose, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const handleClose = () => {
        setIsExiting(true);
        setTimeout(onClose, 300);
    };

    const getIcon = () => {
        switch (type) {
            case 'success':
                return <CheckCircleIcon />;
            case 'error':
                return <ErrorIcon />;
            default:
                return <InfoIcon />;
        }
    };

    return (
        <ToastContainer $type={type} $isExiting={isExiting}>
            <IconWrapper $type={type}>{getIcon()}</IconWrapper>
            <Message>{message}</Message>
            <CloseButton onClick={handleClose}>
                <CloseIcon />
            </CloseButton>
        </ToastContainer>
    );
};

export default Toast;

const slideIn = keyframes`
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
`;

const slideOut = keyframes`
    from {
        transform: translateX(0);
        opacity: 1;
    }
    to {
        transform: translateX(100%);
        opacity: 0;
    }
`;

const ToastContainer = styled.div<{ $type: string; $isExiting: boolean }>`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    min-width: 300px;
    max-width: 400px;
    background: rgba(30, 35, 60, 0.95);
    backdrop-filter: blur(20px);
    border-radius: 12px;
    border: 1px solid ${(props) => {
        switch (props.$type) {
            case 'success':
                return 'rgba(59, 165, 92, 0.5)';
            case 'error':
                return 'rgba(233, 69, 96, 0.5)';
            default:
                return 'rgba(88, 101, 242, 0.5)';
        }
    }};
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    animation: ${(props) => (props.$isExiting ? slideOut : slideIn)} 0.3s ease-out forwards;

    @media (max-width: 768px) {
        min-width: calc(100vw - 40px);
        max-width: calc(100vw - 40px);
    }
`;

const IconWrapper = styled.div<{ $type: string }>`
    display: flex;
    align-items: center;
    justify-content: center;
    color: ${(props) => {
        switch (props.$type) {
            case 'success':
                return '#3ba55c';
            case 'error':
                return '#e94560';
            default:
                return '#5865f2';
        }
    }};

    svg {
        font-size: 24px;
    }
`;

const Message = styled.span`
    flex: 1;
    color: #ffffff;
    font-size: 14px;
    line-height: 1.4;
`;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;

    &:hover {
        color: rgba(255, 255, 255, 0.9);
    }

    svg {
        font-size: 18px;
    }
`;
