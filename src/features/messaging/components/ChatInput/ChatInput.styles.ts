import styled, { keyframes } from 'styled-components';
import { fadeIn, slideDown, spin, recordingPulse, waveAnimation } from '../../../../shared/styles/animations';

// Re-export for components
export { fadeIn, slideDown, spin, recordingPulse, waveAnimation };

// Main Container
export const InputWrapper = styled.div`
    padding: var(--spacing-md) var(--spacing-lg);
    background: var(--bg-primary);
    border-top: 1px solid var(--border-light);

    @media (max-width: 768px) {
        padding: var(--spacing-sm) var(--spacing-md);
    }
`;

export const OfflineBanner = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    margin-bottom: var(--spacing-sm);
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: var(--radius-md);
    color: var(--accent-danger);
    font-size: 0.85rem;
    animation: ${slideDown} 0.3s ease-out;

    svg {
        font-size: 1.1rem;
    }

    @media (max-width: 480px) {
        font-size: 0.8rem;
        padding: var(--spacing-xs) var(--spacing-sm);
    }
`;

export const InputContainer = styled.div<{ $isOffline?: boolean; $isFocused?: boolean }>`
    background: var(--bg-primary);
    border: 1px solid ${(props) => {
        if (props.$isOffline) return 'var(--accent-danger)';
        if (props.$isFocused) return 'var(--accent-primary)';
        return 'var(--border-default)';
    }};
    border-radius: var(--radius-md);
    overflow: hidden;
    transition: all var(--transition-fast);
    box-shadow: ${(props) => props.$isFocused ? 'var(--shadow-md)' : 'var(--shadow-sm)'};
`;

export const InputRow = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);

    @media (max-width: 480px) {
        padding: var(--spacing-xs);
    }
`;

export const ActionButtons = styled.div`
    display: flex;
    gap: 2px;
    flex-shrink: 0;

    @media (max-width: 380px) {
        display: none;
    }
`;

export const ActionButton = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    color: ${(props) => (props.$isActive ? 'var(--accent-primary)' : 'var(--text-muted)')};
    background: ${(props) => (props.$isActive ? 'var(--purple-50)' : 'transparent')};
    transition: all var(--transition-fast);

    svg {
        font-size: 1.4rem;
    }

    &:hover {
        background: var(--purple-50);
        color: var(--accent-primary);
    }

    @media (max-width: 480px) {
        width: 36px;
        height: 36px;

        svg {
            font-size: 1.2rem;
        }
    }
`;

export const InputField = styled.div`
    flex: 1;
    min-width: 0;
`;

export const StyledInput = styled.input`
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    font-size: 1rem;
    background: transparent;
    color: var(--text-primary);
    border: none;
    outline: none;

    &::placeholder {
        color: var(--text-muted);
    }

    &:disabled {
        opacity: 0.6;
    }

    @media (max-width: 480px) {
        font-size: 0.95rem;
        padding: var(--spacing-sm);
    }
`;

export const SendButton = styled.button<{ $hasContent?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    /* DreamsChat: Solid primary color instead of gradient */
    background: ${(props) => (props.$hasContent ? 'var(--accent-primary)' : 'var(--bg-tertiary)')};
    color: ${(props) => (props.$hasContent ? 'white' : 'var(--text-muted)')};
    transition: all var(--transition-fast);
    flex-shrink: 0;
    box-shadow: ${(props) => (props.$hasContent ? 'var(--shadow-purple)' : 'none')};

    svg {
        font-size: 1.2rem;
    }

    &:hover:not(:disabled) {
        background: ${(props) => (props.$hasContent ? 'var(--purple-700)' : 'var(--bg-secondary)')};
        transform: ${(props) => (props.$hasContent ? 'scale(1.02)' : 'none')};
    }

    &:active:not(:disabled) {
        transform: scale(0.95);
    }

    &:disabled {
        cursor: not-allowed;
        opacity: 0.6;
    }

    @media (max-width: 480px) {
        width: 38px;
        height: 38px;

        svg {
            font-size: 1.1rem;
        }
    }
`;

export const LoadingSpinner = styled.div`
    width: 20px;
    height: 20px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: ${spin} 0.8s linear infinite;
`;

export const InputHint = styled.div`
    display: flex;
    justify-content: flex-end;
    padding-top: var(--spacing-xs);
`;

export const HintText = styled.span`
    font-size: 0.75rem;
    color: var(--text-muted);

    kbd {
        display: inline-block;
        padding: 2px 6px;
        background: var(--bg-tertiary);
        border: 1px solid var(--border-light);
        border-radius: var(--radius-sm);
        font-size: 0.7rem;
        font-family: inherit;
        margin: 0 2px;
        color: var(--text-secondary);
    }

    @media (max-width: 480px) {
        display: none;
    }
`;

// Image Preview
export const ImagePreviewContainer = styled.div`
    padding: var(--spacing-md);
    border-bottom: 1px solid var(--border-light);
    background: var(--bg-tertiary);
    animation: ${fadeIn} 0.2s ease-out;
`;

export const PreviewWrapper = styled.div`
    position: relative;
    display: inline-block;
`;

export const PreviewImage = styled.img`
    max-width: 200px;
    max-height: 150px;
    border-radius: var(--radius-lg);
    object-fit: cover;
    box-shadow: var(--shadow-md);

    @media (max-width: 480px) {
        max-width: 150px;
        max-height: 100px;
    }
`;

export const RemoveButton = styled.button`
    position: absolute;
    top: -8px;
    right: -8px;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: var(--bg-primary);
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-md);
    transition: all var(--transition-fast);
    border: 2px solid var(--border-light);

    svg {
        font-size: 1rem;
    }

    &:hover {
        background: var(--accent-danger);
        border-color: var(--accent-danger);
        color: white;
        transform: scale(1.1);
    }
`;

export const PreviewFileName = styled.span`
    display: block;
    margin-top: var(--spacing-sm);
    font-size: 0.8rem;
    color: var(--text-muted);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

// Reply Preview
export const ReplyPreviewContainer = styled.div`
    display: flex;
    align-items: stretch;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-tertiary);
    border-bottom: 1px solid var(--border-light);
    animation: ${slideDown} 0.2s ease-out;
    gap: var(--spacing-sm);
`;

export const ReplyPreviewBar = styled.div`
    width: 4px;
    background: var(--gradient-primary);
    border-radius: 2px;
    flex-shrink: 0;
`;

export const ReplyPreviewContent = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    min-width: 0;
`;

export const ReplyPreviewIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-md);
    background: var(--purple-50);
    flex-shrink: 0;

    svg {
        font-size: 1rem;
        color: var(--accent-primary);
    }
`;

export const ReplyPreviewText = styled.div`
    flex: 1;
    min-width: 0;
`;

export const ReplyPreviewUser = styled.span`
    display: block;
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--accent-primary);
    margin-bottom: 2px;
`;

export const ReplyPreviewMessage = styled.span`
    display: block;
    font-size: 0.85rem;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const ReplyPreviewImage = styled.img`
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    object-fit: cover;
    flex-shrink: 0;
`;

export const ReplyPreviewClose = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    color: var(--text-muted);
    transition: all var(--transition-fast);
    flex-shrink: 0;

    svg {
        font-size: 1rem;
    }

    &:hover {
        background: rgba(239, 68, 68, 0.1);
        color: var(--accent-danger);
    }
`;

// Emoji Picker
export const EmojiPicker = styled.div`
    border-top: 1px solid var(--border-light);
    background: var(--bg-tertiary);
    animation: ${fadeIn} 0.2s ease-out;
    max-height: 300px;
    overflow-y: auto;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--border-default);
        border-radius: 3px;
    }
`;

export const EmojiSection = styled.div`
    &:not(:last-child) {
        border-bottom: 1px solid var(--border-light);
    }
`;

export const EmojiHeader = styled.div`
    padding: var(--spacing-xs) var(--spacing-md);
    background: var(--bg-secondary);
    position: sticky;
    top: 0;
    z-index: 1;

    span {
        font-size: 0.75rem;
        font-weight: 600;
        color: var(--text-muted);
    }
`;

export const EmojiGrid = styled.div`
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 4px;
    padding: var(--spacing-xs) var(--spacing-sm);

    @media (max-width: 480px) {
        grid-template-columns: repeat(6, 1fr);
    }
`;

export const EmojiButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    height: 38px;
    border-radius: var(--radius-md);
    font-size: 1.35rem;
    transition: all var(--transition-fast);
    background: transparent;

    &:hover {
        background: var(--purple-50);
        transform: scale(1.15);
    }

    &:active {
        transform: scale(0.95);
    }

    @media (max-width: 480px) {
        height: 34px;
        font-size: 1.2rem;
    }
`;

// Voice Recording
export const MicButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    background: var(--bg-tertiary);
    color: var(--text-muted);
    transition: all var(--transition-fast);
    flex-shrink: 0;

    svg {
        font-size: 1.3rem;
    }

    &:hover {
        background: var(--purple-50);
        color: var(--accent-primary);
    }

    &:active {
        background: var(--accent-primary);
        color: white;
        transform: scale(0.95);
    }

    @media (max-width: 480px) {
        width: 40px;
        height: 40px;

        svg {
            font-size: 1.2rem;
        }
    }
`;

export const RecordingContainer = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: 0 var(--spacing-sm);
    animation: ${fadeIn} 0.2s ease-out;
`;

export const CancelRecordingButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: rgba(239, 68, 68, 0.1);
    color: var(--accent-danger);
    transition: all var(--transition-fast);

    svg {
        font-size: 1.2rem;
    }

    &:hover {
        background: var(--accent-danger);
        color: white;
    }
`;

export const RecordingIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
`;

export const RecordingPulse = styled.div`
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent-danger);
    animation: ${recordingPulse} 1s ease-in-out infinite;
`;

export const RecordingTime = styled.span`
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    font-variant-numeric: tabular-nums;
    min-width: 45px;
`;

export const RecordingWave = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    height: 32px;
`;

export const WaveBar = styled.div`
    width: 4px;
    height: 16px;
    border-radius: 2px;
    background: var(--accent-primary);
    animation: ${waveAnimation} 0.8s ease-in-out infinite;
`;
