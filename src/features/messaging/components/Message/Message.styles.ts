import styled, { keyframes } from 'styled-components';
import { fadeIn, shimmer, pulse, popIn, slideInLeft, slideInRight } from '../../../../shared/styles/animations';

// Re-export
export { fadeIn, shimmer, pulse, popIn, slideInLeft, slideInRight };

// Message Wrapper
export const MessageWrapper = styled.div<{ $isSent: boolean }>`
    display: flex;
    align-items: flex-end;
    gap: var(--spacing-xs);
    margin-bottom: 4px;
    padding: 2px var(--spacing-md);
    justify-content: ${props => props.$isSent ? 'flex-end' : 'flex-start'};
    animation: ${props => props.$isSent ? slideInRight : slideInLeft} 0.25s ease-out;
    position: relative;

    @media (max-width: 480px) {
        padding: 2px var(--spacing-sm);
    }
`;

// Avatar
export const AvatarContainer = styled.div`
    flex-shrink: 0;
    margin-bottom: 18px;
`;

export const Avatar = styled.img`
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    object-fit: cover;
    box-shadow: var(--shadow-sm);

    @media (max-width: 480px) {
        width: 24px;
        height: 24px;
    }
`;

export const AvatarPlaceholder = styled.div`
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.65rem;
    font-weight: 600;
    color: white;
    box-shadow: var(--shadow-sm);

    @media (max-width: 480px) {
        width: 24px;
        height: 24px;
        font-size: 0.55rem;
    }
`;

// Bubble Container
export const BubbleContainer = styled.div<{ $isSent: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: ${props => props.$isSent ? 'flex-end' : 'flex-start'};
    max-width: 70%;
    position: relative;

    @media (max-width: 768px) {
        max-width: 80%;
    }

    @media (max-width: 480px) {
        max-width: 85%;
    }
`;

export const SenderName = styled.span`
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--accent-primary);
    margin-bottom: 2px;
    margin-left: 12px;
`;

// Message Bubble (DreamsChat Inspired - Asymmetric Radius)
export const MessageBubble = styled.div<{ $isSent: boolean; $isPending?: boolean; $hasImage?: boolean }>`
    position: relative;
    padding: ${props => props.$hasImage ? '4px' : 'var(--spacing-sm) var(--spacing-md)'};
    /* DreamsChat asymmetric border-radius */
    border-radius: ${props => props.$isSent
        ? 'var(--bubble-sent-radius, 16px 16px 0 16px)'
        : 'var(--bubble-received-radius, 16px 16px 16px 0)'
    };
    /* Solid color instead of gradient for cleaner look */
    background: ${props => props.$isSent
        ? 'var(--bubble-sent)'
        : 'var(--bubble-received)'
    };
    box-shadow: ${props => props.$isSent
        ? 'var(--shadow-purple)'
        : 'var(--shadow-sm)'
    };
    border: ${props => props.$isSent ? 'none' : '1px solid var(--border-light)'};
    opacity: ${props => props.$isPending ? 0.7 : 1};
    min-width: 60px;
    overflow: hidden;
    transition: box-shadow 0.2s ease, transform 0.15s ease;

    &:hover {
        box-shadow: ${props => props.$isSent
        ? '0 6px 20px rgba(99, 56, 246, 0.4)'
        : 'var(--shadow-md)'
    };
    }
`;

// BubbleTail - Hidden for asymmetric design
export const BubbleTail = styled.div<{ $isSent: boolean; $hasImage?: boolean }>`
    display: none; /* Hidden - using asymmetric border-radius instead */
`;

// Image
export const ImageContainer = styled.div<{ $isOnly?: boolean }>`
    margin: ${props => props.$isOnly ? '0' : '0 0 var(--spacing-xs) 0'};
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    position: relative;
    min-height: 100px;
`;

export const ImageSkeleton = styled.div`
    width: 100%;
    min-width: 200px;
    min-height: 150px;
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s infinite;
    border-radius: 14px;
`;

export const MessageImage = styled.img<{ $loaded: boolean }>`
    width: 100%;
    max-width: 280px;
    min-width: 150px;
    max-height: 350px;
    object-fit: cover;
    opacity: ${props => props.$loaded ? 1 : 0};
    position: ${props => props.$loaded ? 'relative' : 'absolute'};
    top: 0;
    left: 0;
    transition: opacity 0.3s ease, transform 0.2s ease, filter 0.2s ease;

    &:hover {
        filter: brightness(0.95);
    }

    @media (max-width: 480px) {
        max-width: 200px;
        max-height: 250px;
    }
`;

export const ImageErrorPlaceholder = styled.div`
    width: 100%;
    min-width: 150px;
    min-height: 100px;
    max-width: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-tertiary);
    border-radius: 14px;
    color: var(--text-muted);
    font-size: 0.85rem;
    padding: var(--spacing-md);
`;

// Message Text
export const MessageText = styled.p<{ $isSent: boolean; $hasImage?: boolean }>`
    color: ${props => props.$isSent ? 'white' : 'var(--text-primary)'};
    font-size: 0.95rem;
    line-height: 1.45;
    word-wrap: break-word;
    white-space: pre-wrap;
    margin: 0;
    padding: ${props => props.$hasImage ? 'var(--spacing-xs) var(--spacing-sm) 0' : '0'};

    @media (max-width: 480px) {
        font-size: 0.9rem;
    }
`;

// Message Footer
export const MessageFooter = styled.div<{ $isSent: boolean; $isOverImage?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 3px;
    margin-top: 2px;
    padding: ${props => props.$isOverImage ? '4px 8px' : '0'};
    ${props => props.$isOverImage && `
        position: absolute;
        bottom: 8px;
        right: 8px;
        background: rgba(0, 0, 0, 0.5);
        border-radius: 10px;
    `}
`;

export const TimeStamp = styled.span<{ $isSent: boolean; $isOverImage?: boolean }>`
    font-size: 0.65rem;
    color: ${props => {
        if (props.$isOverImage) return 'rgba(255, 255, 255, 0.9)';
        return props.$isSent ? 'rgba(255, 255, 255, 0.75)' : 'var(--text-muted)';
    }};
    font-weight: 500;
`;

// Status Indicators
export const StatusIndicator = styled.div<{ $isOverImage?: boolean }>`
    display: flex;
    align-items: center;
    margin-left: 2px;
`;

export const DeliveredStatus = styled.span`
    color: rgba(255, 255, 255, 0.75);
    display: flex;
    align-items: center;

    svg { font-size: 0.95rem; }
`;

export const ReadStatus = styled.span`
    color: var(--accent-success);
    display: flex;
    align-items: center;

    svg { font-size: 0.95rem; }
`;

export const PendingStatus = styled.span<{ $status?: string }>`
    display: flex;
    align-items: center;
    color: ${props => props.$status === 'failed' ? 'var(--accent-danger)' : 'rgba(255, 255, 255, 0.75)'};
    animation: ${pulse} 2s ease-in-out infinite;

    svg { font-size: 0.85rem; }
`;

// Reactions
export const ReactionsBar = styled.div<{ $isSent: boolean }>`
    display: flex;
    gap: 4px;
    margin-top: -8px;
    margin-bottom: 4px;
    flex-wrap: wrap;
    justify-content: ${props => props.$isSent ? 'flex-end' : 'flex-start'};
    padding: 0 8px;
`;

export const ReactionPill = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 3px 8px;
    background: var(--bg-primary);
    border: 1px solid ${props => props.$isActive ? 'var(--accent-primary)' : 'var(--border-light)'};
    border-radius: 12px;
    font-size: 0.85rem;
    cursor: pointer;
    transition: all 0.15s ease;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);

    .emoji { font-size: 0.95rem; }
    .count {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--text-secondary);
    }

    &:hover {
        transform: scale(1.08);
        box-shadow: 0 3px 10px rgba(0, 0, 0, 0.15);
    }
`;

// Actions
export const ActionsContainer = styled.div<{ $isSent: boolean }>`
    position: absolute;
    display: flex;
    gap: 2px;
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: 12px;
    padding: 4px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
    animation: ${fadeIn} 0.15s ease-out;
    z-index: 100;
    min-width: max-content;

    ${props => props.$isSent ? `
        top: -45px;
        right: 0;
        margin-right: 0;
        transform: none;
    ` : `
        top: 50%;
        left: 100%;
        margin-left: 8px;
        transform: translateY(-50%);
    `}

    @media (max-width: 768px) {
        top: -45px;
        transform: none;
        flex-wrap: nowrap;

        ${props => props.$isSent
        ? 'right: 0; margin-right: 0;'
        : 'left: 0; margin-left: 0;'
    }
    }
`;

export const ActionBtn = styled.button<{ $isActive?: boolean; $isDelete?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    color: ${props => {
        if (props.$isDelete) return 'var(--text-muted)';
        return props.$isActive ? 'var(--accent-primary)' : 'var(--text-muted)';
    }};
    background: ${props => props.$isActive ? 'var(--purple-50)' : 'transparent'};
    transition: all 0.15s ease;

    svg { font-size: 1rem; }

    &:hover {
        background: ${props => props.$isDelete ? 'rgba(253, 58, 85, 0.1)' : 'var(--purple-50)'};
        color: ${props => props.$isDelete ? 'var(--accent-danger)' : 'var(--accent-primary)'};
    }
`;

export const ReactionPicker = styled.div<{ $isSent: boolean }>`
    position: absolute;
    bottom: calc(100% + 8px);
    ${props => props.$isSent ? 'right: 0;' : 'left: 0;'}
    display: flex;
    gap: 4px;
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: 24px;
    padding: 8px 12px;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
    animation: ${popIn} 0.2s ease-out;
    z-index: 20;
`;

export const ReactionBtn = styled.button<{ $isActive?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 38px;
    border-radius: 10px;
    font-size: 1.4rem;
    background: ${props => props.$isActive ? 'var(--purple-100)' : 'transparent'};
    transition: all 0.15s ease;

    &:hover {
        background: var(--purple-50);
        transform: scale(1.25);
    }
`;

// Quoted Reply
export const QuotedReply = styled.div<{ $isSent: boolean }>`
    display: flex;
    align-items: stretch;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm);
    margin: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
    background: ${props => props.$isSent
        ? 'rgba(255, 255, 255, 0.15)'
        : 'var(--bg-tertiary)'
    };
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background 0.15s ease;

    &:hover {
        background: ${props => props.$isSent
        ? 'rgba(255, 255, 255, 0.2)'
        : 'var(--bg-secondary)'
    };
    }
`;

export const QuotedBar = styled.div<{ $isSent: boolean }>`
    width: 3px;
    background: ${props => props.$isSent
        ? 'rgba(255, 255, 255, 0.8)'
        : 'var(--accent-primary)'
    };
    border-radius: 2px;
    flex-shrink: 0;
`;

export const QuotedContent = styled.div`
    flex: 1;
    min-width: 0;
    padding-left: var(--spacing-xs);
`;

export const QuotedUser = styled.span<{ $isSent: boolean }>`
    display: block;
    font-size: 0.7rem;
    font-weight: 600;
    color: ${props => props.$isSent
        ? 'rgba(255, 255, 255, 0.9)'
        : 'var(--accent-primary)'
    };
    margin-bottom: 2px;
`;

export const QuotedText = styled.span<{ $isSent: boolean }>`
    display: block;
    font-size: 0.8rem;
    color: ${props => props.$isSent
        ? 'rgba(255, 255, 255, 0.75)'
        : 'var(--text-secondary)'
    };
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

export const QuotedImage = styled.img`
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    object-fit: cover;
    flex-shrink: 0;
`;

// Image Preview Modal
export const ImagePreviewOverlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.95);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    animation: ${fadeIn} 0.2s ease-out;
    cursor: zoom-out;
    backdrop-filter: blur(8px);
`;

export const ImagePreviewContent = styled.div`
    position: relative;
    max-width: 90vw;
    max-height: 90vh;
    cursor: default;
    display: flex;
    flex-direction: column;
    align-items: center;
`;

export const ClosePreviewBtn = styled.button`
    position: absolute;
    top: -50px;
    right: 0;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-size: 1.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.15s ease;
    line-height: 1;

    &:hover {
        background: rgba(255, 255, 255, 0.2);
        transform: scale(1.1);
    }
`;

export const PreviewImage = styled.img`
    max-width: 90vw;
    max-height: 80vh;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
`;

export const PreviewInfo = styled.div`
    margin-top: 16px;
    text-align: center;
`;

export const PreviewSender = styled.div`
    color: white;
    font-weight: 600;
    font-size: 1rem;
    margin-bottom: 4px;
`;

export const PreviewTime = styled.div`
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.85rem;
`;
