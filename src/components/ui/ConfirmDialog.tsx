import React, { useEffect } from 'react';
import styled, { keyframes } from 'styled-components';

interface ConfirmDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    danger?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    onConfirm,
    onCancel,
    danger = false
}) => {
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onCancel();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onCancel]);

    if (!isOpen) return null;

    return (
        <Overlay onClick={onCancel}>
            <DialogBox onClick={(e) => e.stopPropagation()}>
                <Title>{title}</Title>
                <Message>{message}</Message>
                <ButtonGroup>
                    <CancelButton onClick={onCancel}>{cancelText}</CancelButton>
                    <ConfirmButton $danger={danger} onClick={onConfirm}>
                        {confirmText}
                    </ConfirmButton>
                </ButtonGroup>
            </DialogBox>
        </Overlay>
    );
};

export default ConfirmDialog;

const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;

const scaleIn = keyframes`
    from {
        opacity: 0;
        transform: scale(0.9);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
`;

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: ${fadeIn} 0.2s ease-out;
`;

const DialogBox = styled.div`
    background: rgba(30, 35, 60, 0.98);
    backdrop-filter: blur(20px);
    border-radius: 16px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 24px;
    min-width: 320px;
    max-width: 400px;
    box-shadow: 0 16px 64px rgba(0, 0, 0, 0.5);
    animation: ${scaleIn} 0.2s ease-out;

    @media (max-width: 768px) {
        min-width: calc(100vw - 48px);
        margin: 0 24px;
    }
`;

const Title = styled.h3`
    color: #ffffff;
    font-size: 18px;
    font-weight: 600;
    margin: 0 0 12px 0;
`;

const Message = styled.p`
    color: rgba(255, 255, 255, 0.7);
    font-size: 14px;
    line-height: 1.5;
    margin: 0 0 24px 0;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: 12px;
    justify-content: flex-end;
`;

const Button = styled.button`
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
`;

const CancelButton = styled(Button)`
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #ffffff;

    &:hover {
        background: rgba(255, 255, 255, 0.15);
    }
`;

const ConfirmButton = styled(Button)<{ $danger?: boolean }>`
    background: ${(props) => (props.$danger ? '#e94560' : '#5865f2')};
    border: none;
    color: #ffffff;

    &:hover {
        background: ${(props) => (props.$danger ? '#d63850' : '#4752c4')};
    }
`;
