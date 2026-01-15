import styled, { keyframes } from 'styled-components';
import {
    fadeIn,
    spin,
    float,
    bounce,
    pulse,
    onlinePulse,
    pulseHighlight,
} from '../../../../shared/styles/animations';

// Re-export animations for use in components
export { fadeIn, spin, float, bounce, pulse, onlinePulse, pulseHighlight };

// Main Container
export const ChatContainer = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--bg-secondary);
    position: relative;
    overflow: hidden;
    transform: translateZ(0);
    will-change: transform;
`;

export const ChatBody = styled.div`
    flex: 1;
    display: flex;
    overflow: hidden;
    overscroll-behavior: contain;
`;

export const ChatContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
    transform: translateZ(0);
`;

// Welcome Screen
export const WelcomeScreen = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xl);
    background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
`;

export const WelcomeContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 480px;
    animation: ${fadeIn} 0.5s ease-out;
`;

export const WelcomeIcon = styled.div`
    width: 100px;
    height: 100px;
    border-radius: var(--radius-xl);
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-xl);
    animation: ${float} 3s ease-in-out infinite;
    box-shadow: var(--shadow-glow);

    svg {
        font-size: 50px;
        color: white;
    }
`;

export const WelcomeTitle = styled.h1`
    font-size: 2rem;
    font-weight: 700;
    margin-bottom: var(--spacing-md);
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;

    @media (max-width: 480px) {
        font-size: 1.5rem;
    }
`;

export const WelcomeText = styled.p`
    font-size: 1rem;
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xl);
    line-height: 1.6;

    @media (max-width: 480px) {
        font-size: 0.9rem;
    }
`;

export const WelcomeFeatures = styled.div`
    display: flex;
    gap: var(--spacing-lg);
    flex-wrap: wrap;
    justify-content: center;

    @media (max-width: 480px) {
        gap: var(--spacing-md);
    }
`;

export const FeatureItem = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
`;

export const FeatureIcon = styled.div`
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    background: var(--purple-50);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);

    svg {
        font-size: 1.5rem;
        color: var(--accent-primary);
    }

    &:hover {
        background: var(--purple-100);
        transform: scale(1.1);
    }
`;

export const FeatureText = styled.span`
    font-size: 0.85rem;
    color: var(--text-secondary);
    font-weight: 500;
`;

// Chat Header (DreamsChat Inspired)
export const ChatHeaderContainer = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 16px;
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-default);
    box-shadow: var(--shadow-sm);
    gap: var(--spacing-md);

    @media (max-width: 768px) {
        padding: var(--spacing-sm) var(--spacing-md);
    }
`;

export const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    min-width: 0;
    flex: 1;
`;

export const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    flex-shrink: 0;
`;

export const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);

    @media (max-width: 600px) {
        display: none;
    }
`;

export const Separator = styled.div`
    width: 1px;
    height: 24px;
    background: var(--border-light);
    margin: 0 var(--spacing-xs);

    @media (max-width: 600px) {
        display: none;
    }
`;

// DM Header Styles
export const DMUserAvatar = styled.div`
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-full);
    background: var(--purple-100);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: visible;

    img {
        width: 100%;
        height: 100%;
        border-radius: var(--radius-full);
        object-fit: cover;
    }

    svg {
        font-size: 1.5rem;
        color: var(--accent-primary);
    }

    @media (max-width: 480px) {
        width: 40px;
        height: 40px;
    }
`;

export const OnlineIndicator = styled.span<{ $isOnline: boolean }>`
    position: absolute;
    bottom: 0;
    right: 0;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${props => props.$isOnline ? 'var(--accent-success)' : 'var(--text-muted)'};
    border: 3px solid var(--bg-primary);
    animation: ${props => props.$isOnline ? onlinePulse : 'none'} 2s ease-in-out infinite;
`;

export const DMUserInfo = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;
`;

export const DMUserName = styled.h3`
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 480px) {
        font-size: 1rem;
    }
`;

export const DMUserStatus = styled.span<{ $online: boolean }>`
    font-size: 0.8rem;
    color: ${props => props.$online ? 'var(--accent-success)' : 'var(--text-muted)'};
    font-weight: 500;
`;

// Channel Header Styles
export const ChannelIcon = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    background: var(--purple-50);
    flex-shrink: 0;

    svg {
        font-size: 1.3rem;
        color: var(--accent-primary);
    }

    @media (max-width: 480px) {
        width: 36px;
        height: 36px;

        svg {
            font-size: 1.1rem;
        }
    }
`;

export const ChannelInfo = styled.div`
    display: flex;
    flex-direction: column;
    min-width: 0;
`;

export const ChannelName = styled.h3`
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @media (max-width: 480px) {
        font-size: 1rem;
    }
`;

export const ChannelDescription = styled.span`
    font-size: 0.8rem;
    color: var(--text-muted);
`;

// Action Buttons
export const ActionButton = styled.button<{ $active?: boolean; disabled?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: ${props => {
        if (props.disabled) return 'var(--text-muted)';
        if (props.$active) return 'var(--accent-warning)';
        return 'var(--text-secondary)';
    }};
    background: ${props => props.$active ? 'rgba(245, 158, 11, 0.1)' : 'transparent'};
    transition: all var(--transition-fast);
    cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
    opacity: ${props => props.disabled ? 0.5 : 1};

    svg {
        font-size: 1.2rem;
    }

    &:hover:not(:disabled) {
        background: var(--purple-50);
        color: var(--accent-primary);
    }
`;

export const MembersButton = styled.button<{ $active: boolean }>`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    color: ${props => props.$active ? 'var(--accent-primary)' : 'var(--text-secondary)'};
    background: ${props => props.$active ? 'var(--purple-50)' : 'transparent'};
    font-size: 0.9rem;
    font-weight: 500;
    transition: all var(--transition-fast);

    svg {
        font-size: 1.1rem;
    }

    .button-text {
        @media (max-width: 600px) {
            display: none;
        }
    }

    &:hover {
        background: var(--purple-50);
        color: var(--accent-primary);
    }
`;

export const DeleteButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    svg {
        font-size: 1.2rem;
    }

    &:hover {
        background: rgba(239, 68, 68, 0.1);
        color: var(--accent-danger);
    }
`;

// Messages Area
export const ChatMessages = styled.div`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--spacing-md);
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    scroll-behavior: smooth;
    transform: translateZ(0);
    will-change: scroll-position;

    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--border-default);
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted);
    }

    @media (max-width: 768px) {
        padding: var(--spacing-sm);
        scrollbar-width: none;
        -ms-overflow-style: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }

    @media (max-width: 480px) {
        padding: var(--spacing-xs);
    }
`;

export const MessagesWrapper = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
`;

export const MessageWrapper = styled.div<{ $highlighted?: boolean }>`
    transition: background 0.3s ease;
    border-radius: var(--radius-lg);
    padding: 2px;
    margin: -2px;
    ${props => props.$highlighted && `
        background: rgba(124, 58, 237, 0.15);
        animation: ${pulseHighlight} 1s ease-in-out;
    `}
`;

// Loading States
export const LoadingContainer = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    gap: var(--spacing-lg);
`;

export const LoadingSpinner = styled.div`
    width: 48px;
    height: 48px;
    border: 3px solid var(--border-light);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: ${spin} 1s linear infinite;
`;

export const LoadingText = styled.span`
    color: var(--text-muted);
    font-size: 0.9rem;
    animation: ${pulse} 1.5s ease-in-out infinite;
`;

// Channel/DM Start
export const ChannelStart = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-xl);
    margin-bottom: var(--spacing-lg);
    animation: ${fadeIn} 0.5s ease-out;
    text-align: center;
`;

export const ChannelStartBadge = styled.div`
    width: 64px;
    height: 64px;
    border-radius: var(--radius-xl);
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-glow);

    svg {
        font-size: 32px;
        color: white;
    }
`;

export const ChannelStartTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);

    @media (max-width: 480px) {
        font-size: 1.25rem;
    }
`;

export const ChannelStartText = styled.p`
    color: var(--text-muted);
    font-size: 0.95rem;
    max-width: 400px;
    line-height: 1.5;
`;

export const DMChatStart = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: var(--spacing-xl);
    margin-bottom: var(--spacing-lg);
    animation: ${fadeIn} 0.5s ease-out;
    text-align: center;
`;

export const DMChatStartAvatar = styled.div`
    width: 80px;
    height: 80px;
    border-radius: var(--radius-full);
    background: var(--purple-100);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: var(--spacing-lg);
    box-shadow: var(--shadow-lg);

    img {
        width: 100%;
        height: 100%;
        border-radius: var(--radius-full);
        object-fit: cover;
    }

    svg {
        font-size: 2.5rem;
        color: var(--accent-primary);
    }
`;

export const DMChatStartTitle = styled.h2`
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: var(--spacing-sm);

    @media (max-width: 480px) {
        font-size: 1.25rem;
    }
`;

export const DMChatStartText = styled.p`
    color: var(--text-muted);
    font-size: 0.95rem;
    max-width: 400px;
    line-height: 1.5;
`;

export const ChatBottom = styled.div`
    height: 80px;
`;

// Typing Indicator
export const TypingIndicatorContainer = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-lg);
    animation: ${fadeIn} 0.2s ease-out;
`;

export const TypingDots = styled.div`
    display: flex;
    gap: 3px;
    padding: var(--spacing-xs) var(--spacing-sm);
    background: var(--purple-50);
    border-radius: var(--radius-full);

    span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--accent-primary);
        animation: ${bounce} 1.4s ease-in-out infinite;

        &:nth-child(2) {
            animation-delay: 0.2s;
        }

        &:nth-child(3) {
            animation-delay: 0.4s;
        }
    }
`;

export const TypingText = styled.span`
    color: var(--text-muted);
    font-size: 0.85rem;
    font-style: italic;
`;

// Search Bar
export const SearchBarContainer = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-primary);
    border-bottom: 1px solid var(--border-light);
    animation: ${fadeIn} 0.2s ease-out;
`;

export const SearchInputWrapper = styled.div`
    flex: 1;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-light);

    svg {
        font-size: 1.2rem;
        color: var(--text-muted);
    }
`;

export const SearchInput = styled.input`
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.95rem;
    color: var(--text-primary);

    &::placeholder {
        color: var(--text-muted);
    }
`;

export const SearchResults = styled.span`
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: nowrap;
`;

export const SearchNavButtons = styled.div`
    display: flex;
    gap: 2px;
`;

export const SearchNavButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: all var(--transition-fast);

    &:hover:not(:disabled) {
        background: var(--purple-50);
        color: var(--accent-primary);
    }

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }

    svg {
        font-size: 1.2rem;
    }
`;

export const CloseSearchButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    &:hover {
        background: rgba(239, 68, 68, 0.1);
        color: var(--accent-danger);
    }

    svg {
        font-size: 1.2rem;
    }
`;
