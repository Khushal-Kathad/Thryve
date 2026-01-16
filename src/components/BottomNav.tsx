import React, { memo } from 'react';
import styled, { keyframes } from 'styled-components';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import GroupsIcon from '@mui/icons-material/Groups';
import SearchIcon from '@mui/icons-material/Search';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import PersonIcon from '@mui/icons-material/Person';
import VideoCallOutlinedIcon from '@mui/icons-material/VideoCallOutlined';
import VideoCallIcon from '@mui/icons-material/VideoCall';

export type NavTab = 'chats' | 'groups' | 'calls' | 'profile';

interface BottomNavProps {
    activeTab: NavTab;
    onTabChange: (tab: NavTab) => void;
    unreadCount?: number;
    missedCallsCount?: number;
}

const BottomNav: React.FC<BottomNavProps> = ({
    activeTab,
    onTabChange,
    unreadCount = 0,
    missedCallsCount = 0
}) => {
    return (
        <NavContainer>
            <NavItem
                $active={activeTab === 'chats'}
                onClick={() => onTabChange('chats')}
            >
                <IconWrapper>
                    {activeTab === 'chats' ? <ChatBubbleIcon /> : <ChatBubbleOutlineIcon />}
                    {unreadCount > 0 && (
                        <Badge>{unreadCount > 99 ? '99+' : unreadCount}</Badge>
                    )}
                </IconWrapper>
                <NavLabel $active={activeTab === 'chats'}>Chats</NavLabel>
                {activeTab === 'chats' && <ActiveIndicator />}
            </NavItem>

            <NavItem
                $active={activeTab === 'groups'}
                onClick={() => onTabChange('groups')}
            >
                <IconWrapper>
                    {activeTab === 'groups' ? <GroupsIcon /> : <GroupsOutlinedIcon />}
                </IconWrapper>
                <NavLabel $active={activeTab === 'groups'}>Groups</NavLabel>
                {activeTab === 'groups' && <ActiveIndicator />}
            </NavItem>

            <NavItem
                $active={activeTab === 'calls'}
                onClick={() => onTabChange('calls')}
            >
                <IconWrapper>
                    {activeTab === 'calls' ? <VideoCallIcon /> : <VideoCallOutlinedIcon />}
                    {missedCallsCount > 0 && (
                        <Badge $danger>{missedCallsCount > 9 ? '9+' : missedCallsCount}</Badge>
                    )}
                </IconWrapper>
                <NavLabel $active={activeTab === 'calls'}>Calls</NavLabel>
                {activeTab === 'calls' && <ActiveIndicator />}
            </NavItem>

            <NavItem
                $active={activeTab === 'profile'}
                onClick={() => onTabChange('profile')}
            >
                <IconWrapper>
                    {activeTab === 'profile' ? <PersonIcon /> : <PersonOutlineIcon />}
                </IconWrapper>
                <NavLabel $active={activeTab === 'profile'}>Profile</NavLabel>
                {activeTab === 'profile' && <ActiveIndicator />}
            </NavItem>
        </NavContainer>
    );
};

export default memo(BottomNav);

// Animations
const slideUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const pop = keyframes`
    0% { transform: scale(0.8); opacity: 0; }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); opacity: 1; }
`;

const ripple = keyframes`
    0% { transform: scale(0); opacity: 1; }
    100% { transform: scale(2); opacity: 0; }
`;

const glow = keyframes`
    0%, 100% { box-shadow: 0 0 20px rgba(139, 92, 246, 0.4); }
    50% { box-shadow: 0 0 30px rgba(236, 72, 153, 0.5); }
`;

// Styled Components
const NavContainer = styled.nav`
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(15, 15, 26, 0.9);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid rgba(139, 92, 246, 0.2);
    padding: var(--spacing-xs) 0;
    /* Enhanced safe area handling */
    padding-bottom: max(env(safe-area-inset-bottom, 8px), 8px);
    padding-left: env(safe-area-inset-left, 0);
    padding-right: env(safe-area-inset-right, 0);
    z-index: 1000;
    box-shadow: 0 -8px 32px rgba(139, 92, 246, 0.15),
                0 0 0 1px rgba(255, 255, 255, 0.05) inset;
    animation: ${slideUp} 0.3s ease-out;
    /* GPU acceleration */
    transform: translateZ(0);
    will-change: transform;

    @media (max-width: 768px) {
        display: flex;
        justify-content: space-around;
        align-items: center;
        min-height: var(--bottom-nav-height, 70px);
    }

    /* Landscape optimization */
    @media (max-width: 768px) and (orientation: landscape) {
        min-height: var(--bottom-nav-height, 56px);
        padding: var(--spacing-xs) var(--spacing-lg);
    }
`;

const NavItem = styled.button<{ $active: boolean }>`
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    padding: var(--spacing-sm) var(--spacing-xs);
    background: transparent;
    position: relative;
    transition: transform 0.2s ease;
    min-width: 60px;
    min-height: 52px;
    /* Touch optimization */
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;

    &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 48px;
        height: 48px;
        border-radius: 14px;
        background: ${props => props.$active
            ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(236, 72, 153, 0.3) 100%)'
            : 'transparent'};
        transform: translate(-50%, -50%) scale(${props => props.$active ? 1 : 0});
        transition: all 0.25s cubic-bezier(0.32, 0.72, 0, 1);
        will-change: transform;
    }

    &:active::before {
        transform: translate(-50%, -50%) scale(1);
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
    }

    svg {
        font-size: 1.5rem;
        color: ${props => props.$active ? '#8B5CF6' : 'rgba(255, 255, 255, 0.5)'};
        transition: all 0.2s ease;
        position: relative;
        z-index: 1;
        filter: ${props => props.$active ? 'drop-shadow(0 0 8px rgba(139, 92, 246, 0.6))' : 'none'};
    }

    &:active svg {
        transform: scale(0.9);
    }

    /* Landscape: horizontal layout */
    @media (max-width: 768px) and (orientation: landscape) {
        flex-direction: row;
        gap: var(--spacing-xs);
        padding: var(--spacing-xs) var(--spacing-sm);
    }
`;

const IconWrapper = styled.div`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
`;

const Badge = styled.span<{ $danger?: boolean }>`
    position: absolute;
    top: -6px;
    right: -10px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: ${props => props.$danger
        ? 'linear-gradient(135deg, #FD3A55 0%, #FF6B6B 100%)'
        : 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)'};
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ${pop} 0.3s ease-out;
    box-shadow: ${props => props.$danger
        ? '0 2px 10px rgba(253, 58, 85, 0.5)'
        : '0 2px 10px rgba(139, 92, 246, 0.5)'};
`;

const NavLabel = styled.span<{ $active: boolean }>`
    font-size: 0.7rem;
    font-weight: ${props => props.$active ? '700' : '500'};
    color: ${props => props.$active ? '#8B5CF6' : 'rgba(255, 255, 255, 0.5)'};
    margin-top: 4px;
    position: relative;
    z-index: 1;
    transition: all 0.2s ease;
    text-shadow: ${props => props.$active ? '0 0 10px rgba(139, 92, 246, 0.5)' : 'none'};
`;

const ActiveIndicator = styled.div`
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 32px;
    height: 3px;
    background: linear-gradient(90deg, #8B5CF6 0%, #EC4899 100%);
    border-radius: 0 0 4px 4px;
    animation: ${pop} 0.2s ease-out;
    box-shadow: 0 2px 12px rgba(139, 92, 246, 0.6);
`;
