import React, { useState, useEffect, FormEvent } from 'react';
import styled, { keyframes } from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import TagIcon from '@mui/icons-material/Tag';

interface CreateChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (name: string, password: string | null) => void;
    isLoading: boolean;
}

interface FormErrors {
    channelName?: string;
    password?: string;
    confirmPassword?: string;
}

type PasswordStrength = 'weak' | 'medium' | 'strong' | null;

const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ isOpen, onClose, onSubmit, isLoading }) => {
    const [channelName, setChannelName] = useState('');
    const [enablePassword, setEnablePassword] = useState(false);
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [errors, setErrors] = useState<FormErrors>({});

    useEffect(() => {
        if (!isOpen) {
            setChannelName('');
            setEnablePassword(false);
            setPassword('');
            setConfirmPassword('');
            setShowPassword(false);
            setShowConfirmPassword(false);
            setErrors({});
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !isLoading) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, isLoading, onClose]);

    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        if (!channelName.trim()) {
            newErrors.channelName = 'Group name is required';
        } else if (channelName.trim().length < 2) {
            newErrors.channelName = 'Group name must be at least 2 characters';
        } else if (channelName.trim().length > 50) {
            newErrors.channelName = 'Group name must be less than 50 characters';
        }

        if (enablePassword) {
            if (!password) {
                newErrors.password = 'Password is required';
            } else if (password.length < 4) {
                newErrors.password = 'Password must be at least 4 characters';
            }

            if (password !== confirmPassword) {
                newErrors.confirmPassword = 'Passwords do not match';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        if (validate() && !isLoading) {
            onSubmit(channelName.trim(), enablePassword ? password : null);
        }
    };

    const getPasswordStrength = (): PasswordStrength => {
        if (!password) return null;
        if (password.length < 4) return 'weak';
        if (password.length < 8) return 'medium';
        if (password.length >= 8 && /[A-Z]/.test(password) && /[0-9]/.test(password)) return 'strong';
        return 'medium';
    };

    const passwordStrength = getPasswordStrength();

    if (!isOpen) return null;

    return (
        <Overlay onClick={!isLoading ? onClose : undefined}>
            <ModalBox onClick={(e) => e.stopPropagation()}>
                <ModalHeader>
                    <HeaderTitle>
                        <TagIcon />
                        <span>Create Group</span>
                    </HeaderTitle>
                    <CloseButton onClick={onClose} disabled={isLoading}>
                        <CloseIcon />
                    </CloseButton>
                </ModalHeader>

                <Form onSubmit={handleSubmit}>
                    <FormGroup>
                        <Label>Group Name</Label>
                        <InputWrapper $hasError={!!errors.channelName}>
                            <TagIcon />
                            <Input
                                type="text"
                                placeholder="e.g. general, announcements"
                                value={channelName}
                                onChange={(e) => setChannelName(e.target.value)}
                                disabled={isLoading}
                                autoFocus
                            />
                        </InputWrapper>
                        {errors.channelName && <ErrorText>{errors.channelName}</ErrorText>}
                    </FormGroup>

                    <PasswordToggle>
                        <ToggleLabel onClick={() => setEnablePassword(!enablePassword)}>
                            {enablePassword ? <LockIcon /> : <LockOpenIcon />}
                            <span>Password Protection</span>
                        </ToggleLabel>
                        <ToggleSwitch
                            type="button"
                            onClick={() => setEnablePassword(!enablePassword)}
                            $isActive={enablePassword}
                            disabled={isLoading}
                        >
                            <ToggleKnob $isActive={enablePassword} />
                        </ToggleSwitch>
                    </PasswordToggle>

                    {enablePassword && (
                        <>
                            <FormGroup>
                                <Label>
                                    <LockIcon />
                                    Password
                                </Label>
                                <InputWrapper $hasError={!!errors.password}>
                                    <LockIcon />
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="Enter group password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        disabled={isLoading}
                                        autoComplete="new-password"
                                    />
                                    <ToggleButton
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </ToggleButton>
                                </InputWrapper>
                                {password && (
                                    <PasswordStrengthContainer>
                                        <StrengthBar $strength={passwordStrength} />
                                        <StrengthText>
                                            {passwordStrength === 'weak' && 'Weak'}
                                            {passwordStrength === 'medium' && 'Medium'}
                                            {passwordStrength === 'strong' && 'Strong'}
                                        </StrengthText>
                                    </PasswordStrengthContainer>
                                )}
                                {errors.password && <ErrorText>{errors.password}</ErrorText>}
                            </FormGroup>

                            <FormGroup>
                                <Label>Confirm Password</Label>
                                <InputWrapper $hasError={!!errors.confirmPassword}>
                                    <LockIcon />
                                    <Input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        placeholder="Confirm group password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        disabled={isLoading}
                                        autoComplete="new-password"
                                    />
                                    <ToggleButton
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                                    </ToggleButton>
                                </InputWrapper>
                                {errors.confirmPassword && <ErrorText>{errors.confirmPassword}</ErrorText>}
                            </FormGroup>
                        </>
                    )}

                    <InfoBox $variant={enablePassword ? 'protected' : 'public'}>
                        {enablePassword ? <LockIcon /> : <LockOpenIcon />}
                        <span>
                            {enablePassword
                                ? 'This group will be password protected. Share the password with members you want to invite.'
                                : 'This group will be public. Anyone can join without a password.'}
                        </span>
                    </InfoBox>

                    <ButtonGroup>
                        <CancelButton type="button" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </CancelButton>
                        <SubmitButton type="submit" disabled={isLoading}>
                            {isLoading ? 'Creating...' : 'Create Group'}
                        </SubmitButton>
                    </ButtonGroup>
                </Form>
            </ModalBox>
        </Overlay>
    );
};

export default CreateChannelModal;

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
    border-radius: var(--radius-xl);
    border: 1px solid rgba(255, 255, 255, 0.1);
    width: 100%;
    max-width: 440px;
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

const Form = styled.form`
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
`;

const FormGroup = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
`;

const Label = styled.label`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;

    svg {
        font-size: 1rem;
    }
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

const PasswordStrengthContainer = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin-top: var(--spacing-xs);
`;

const StrengthBar = styled.div<{ $strength: PasswordStrength }>`
    flex: 1;
    height: 4px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 2px;
    overflow: hidden;

    &::after {
        content: '';
        display: block;
        height: 100%;
        width: ${(props) => {
            if (props.$strength === 'weak') return '33%';
            if (props.$strength === 'medium') return '66%';
            if (props.$strength === 'strong') return '100%';
            return '0%';
        }};
        background: ${(props) => {
            if (props.$strength === 'weak') return 'var(--accent-danger)';
            if (props.$strength === 'medium') return '#f5a623';
            if (props.$strength === 'strong') return 'var(--accent-success)';
            return 'transparent';
        }};
        transition: width 0.3s ease, background 0.3s ease;
    }
`;

const StrengthText = styled.span`
    font-size: 0.75rem;
    color: var(--text-muted);
    min-width: 50px;
`;

const ErrorText = styled.span`
    color: var(--accent-danger);
    font-size: 0.8rem;
`;

const PasswordToggle = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-md);
    background: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: var(--radius-md);
`;

const ToggleLabel = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: 0.95rem;
    cursor: pointer;

    svg {
        font-size: 1.2rem;
        color: var(--accent-primary);
    }
`;

const ToggleSwitch = styled.button<{ $isActive?: boolean }>`
    width: 48px;
    height: 26px;
    border-radius: 13px;
    background: ${props => props.$isActive ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.1)'};
    border: none;
    cursor: pointer;
    position: relative;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
        background: ${props => props.$isActive ? '#4752c4' : 'rgba(255, 255, 255, 0.15)'};
    }

    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;

const ToggleKnob = styled.div<{ $isActive?: boolean }>`
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    position: absolute;
    top: 3px;
    left: ${props => props.$isActive ? '25px' : '3px'};
    transition: left 0.2s ease;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
`;

const InfoBox = styled.div<{ $variant?: 'protected' | 'public' }>`
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    padding: var(--spacing-md);
    background: ${props => props.$variant === 'public' ? 'rgba(59, 165, 92, 0.1)' : 'rgba(88, 101, 242, 0.1)'};
    border: 1px solid ${props => props.$variant === 'public' ? 'rgba(59, 165, 92, 0.2)' : 'rgba(88, 101, 242, 0.2)'};
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.85rem;
    line-height: 1.4;

    svg {
        font-size: 1.2rem;
        color: ${props => props.$variant === 'public' ? 'var(--accent-success)' : 'var(--accent-primary)'};
        flex-shrink: 0;
        margin-top: 2px;
    }
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
        background: #4752c4;
    }
`;
