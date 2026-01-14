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

// Styled Components
const NavContainer = styled.nav`
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--bg-primary);
    border-top: 1px solid var(--border-light);
    padding: var(--spacing-xs) 0;
    padding-bottom: env(safe-area-inset-bottom, var(--spacing-xs));
    z-index: 1000;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.1);
    animation: ${slideUp} 0.3s ease-out;

    @media (max-width: 768px) {
        display: flex;
        justify-content: space-around;
        align-items: center;
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
    transition: all 0.2s ease;
    min-width: 60px;

    &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: var(--purple-50);
        transform: translate(-50%, -50%) scale(0);
        transition: transform 0.2s ease;
    }

    &:active::before {
        transform: translate(-50%, -50%) scale(1);
    }

    svg {
        font-size: 1.6rem;
        color: ${props => props.$active ? 'var(--accent-primary)' : 'var(--text-muted)'};
        transition: all 0.2s ease;
        position: relative;
        z-index: 1;
    }

    &:active svg {
        transform: scale(0.9);
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
    background: ${props => props.$danger ? 'var(--accent-danger)' : 'var(--accent-primary)'};
    color: white;
    font-size: 0.65rem;
    font-weight: 700;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    animation: ${pop} 0.3s ease-out;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
`;

const NavLabel = styled.span<{ $active: boolean }>`
    font-size: 0.7rem;
    font-weight: ${props => props.$active ? '600' : '500'};
    color: ${props => props.$active ? 'var(--accent-primary)' : 'var(--text-muted)'};
    margin-top: 4px;
    position: relative;
    z-index: 1;
    transition: all 0.2s ease;
`;

const ActiveIndicator = styled.div`
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 24px;
    height: 3px;
    background: var(--gradient-primary);
    border-radius: 0 0 3px 3px;
    animation: ${pop} 0.2s ease-out;
`;
