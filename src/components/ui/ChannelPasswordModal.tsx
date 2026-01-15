import React, { useState, useEffect, FormEvent } from 'react';
import styled, { keyframes } from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import TagIcon from '@mui/icons-material/Tag';

interface ChannelPasswordModalProps {
    isOpen: boolean;
    channelName: string;
    onSubmit: (password: string) => void;
    onCancel: () => void;
    isLoading: boolean;
    error?: string;
}

const ChannelPasswordModal: React.FC<ChannelPasswordModalProps> = ({
    isOpen,
    channelName,
    onSubmit,
    onCancel,
    isLoading,
    error
}) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setPassword('');
            setShowPassword(false);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !isLoading) {
                onCancel();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, isLoading, onCancel]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (password && !isLoading) {
            onSubmit(password);
        }
    };

    if (!isOpen) return null;

    return (
        <Overlay onClick={!isLoading ? onCancel : undefined}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <HeaderTitle>
                        <LockIcon />
                        <span>Enter Password</span>
                    </HeaderTitle>
                    <CloseButton onClick={onCancel} disabled={isLoading}>
                        <CloseIcon />
                    </CloseButton>
                </ModalHeader>

                <Content>
                    <ChannelInfo>
                        <TagIcon />
                        <span>{channelName}</span>
                    </ChannelInfo>

                    <Description>
                        This channel is password protected. Enter the password to access it.
                    </Description>

                    <Form onSubmit={handleSubmit}>
                        <InputWrapper $hasError={!!error}>
                            <LockIcon />
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter channel password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                autoFocus
                                autoComplete="current-password"
                            />
                            <ToggleButton
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </ToggleButton>
                        </InputWrapper>

                        {error && <ErrorText>{error}</ErrorText>}

                        <ButtonGroup>
                            <CancelButton type="button" onClick={onCancel} disabled={isLoading}>
                                Cancel
                            </CancelButton>
                            <SubmitButton type="submit" disabled={!password || isLoading}>
                                {isLoading ? 'Verifying...' : 'Enter Channel'}
                            </SubmitButton>
                        </ButtonGroup>
                    </Form>
                </Content>
            </ModalBox>
        </Overlay>
    );
};

export default ChannelPasswordModal;

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
        transform: scale(0.95);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
`;

const shake = keyframes`
    0%, 100% {
        transform: translateX(0);
    }
    10%, 30%, 50%, 70%, 90% {
        transform: translateX(-4px);
    }
    20%, 40%, 60%, 80% {
        transform: translateX(4px);
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
    padding: var(--spacing-lg);
`;

const ModalBox = styled.div`
    background: rgba(30, 35, 60, 0.98);
    backdrop-filter: blur(20px);
    border-radius: var(--radius-lg);
    border: 1px solid rgba(255, 255, 255, 0.1);
    width: 100%;
    max-width: 400px;
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
    animation: ${scaleIn} 0.2s ease-out;
    overflow: hidden;
`;

const ModalHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
`;

const HeaderTitle = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-primary);
    font-size: 1.1rem;
    font-weight: 600;

    svg {
        font-size: 1.3rem;
        color: var(--accent-primary);
    }
`;

const CloseButton = styled.button`
    background: transparent;
    border: none;
    padding: var(--spacing-xs);
    cursor: pointer;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-md);
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        color: var(--text-primary);
        background: rgba(255, 255, 255, 0.1);
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const Content = styled.div`
    padding: var(--spacing-lg);
`;

const ChannelInfo = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: rgba(255, 255, 255, 0.05);
    border-radius: var(--radius-md);
    margin-bottom: var(--spacing-md);

    svg {
        color: var(--text-muted);
        font-size: 1.2rem;
    }

    span {
        color: var(--text-primary);
        font-weight: 600;
    }
`;

const Description = styled.p`
    color: var(--text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
    margin-bottom: var(--spacing-lg);
`;

const Form = styled.form`
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
`;

const InputWrapper = styled.div<{ $hasError?: boolean }>`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid ${(props) => (props.$hasError ? 'var(--accent-danger)' : 'rgba(255, 255, 255, 0.1)')};
    border-radius: var(--radius-md);
    transition: all 0.2s ease;
    animation: ${(props) => (props.$hasError ? shake : 'none')} 0.5s ease;

    &:focus-within {
        border-color: ${(props) => (props.$hasError ? 'var(--accent-danger)' : 'var(--accent-primary)')};
        box-shadow: 0 0 0 3px ${(props) => (props.$hasError ? 'rgba(233, 69, 96, 0.2)' : 'rgba(88, 101, 242, 0.2)')};
    }

    > svg:first-child {
        color: var(--text-muted);
        font-size: 1.2rem;
    }
`;

const Input = styled.input`
    flex: 1;
    background: transparent;
    border: none;
    color: var(--text-primary);
    font-size: 0.95rem;

    &::placeholder {
        color: var(--text-muted);
    }

    &:disabled {
        opacity: 0.7;
    }
`;

const ToggleButton = styled.button`
    background: transparent;
    border: none;
    padding: 4px;
    cursor: pointer;
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: color 0.2s ease;

    &:hover {
        color: var(--text-primary);
    }

    svg {
        font-size: 1.2rem;
    }
`;

const ErrorText = styled.span`
    color: var(--accent-danger);
    font-size: 0.85rem;
`;

const ButtonGroup = styled.div`
    display: flex;
    gap: var(--spacing-md);
    justify-content: flex-end;
    margin-top: var(--spacing-sm);
`;

const Button = styled.button`
    padding: var(--spacing-sm) var(--spacing-lg);
    border-radius: var(--radius-md);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;

    &:disabled {
        opacity: 0.7;
        cursor: not-allowed;
    }
`;

const CancelButton = styled(Button)`
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: var(--text-secondary);

    &:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.15);
        color: var(--text-primary);
    }
`;

const SubmitButton = styled(Button)`
    background: var(--accent-primary);
    border: none;
    color: white;

    &:hover:not(:disabled) {
        background: var(--purple-700);
    }
`;
