import React, { useState, useRef, useCallback, ChangeEvent } from 'react';
import styled, { keyframes } from 'styled-components';
import { Avatar } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth, signOut } from 'firebase/auth';
import { useSelector } from 'react-redux';
import { selectIsOnline, selectPendingCount } from '../features/appSlice';
import useClickOutside from '../hooks/useClickOutside';
import ConfirmDialog from './ui/ConfirmDialog';

interface HeaderProps {
    onSearch?: (query: string) => void;
}

const Header: React.FC<HeaderProps> = ({ onSearch }) => {
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const [searchQuery, setSearchQuery] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const isOnline = useSelector(selectIsOnline);
    const pendingCount = useSelector(selectPendingCount);

    const closeMenu = useCallback(() => {
        setShowUserMenu(false);
    }, []);

    useClickOutside(menuRef, closeMenu);

    const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
        if (onSearch) {
            onSearch(e.target.value);
        }
    };

    const requestLogout = () => {
        setShowUserMenu(false);
        setShowLogoutConfirm(true);
    };

    const confirmLogout = () => {
        signOut(auth);
        setShowLogoutConfirm(false);
    };

    const cancelLogout = () => {
        setShowLogoutConfirm(false);
    };

    return (
        <>
            {!isOnline && (
                <OfflineBanner>
                    <CloudOffIcon />
                    <span>You're offline. Messages will be sent when you reconnect.</span>
                    {pendingCount > 0 && <PendingBadge>{pendingCount} pending</PendingBadge>}
                </OfflineBanner>
            )}
            <HeaderContainer $hasOfflineBanner={!isOnline}>
                <HeaderLeft ref={menuRef}>
                    <UserSection onClick={() => setShowUserMenu(!showUserMenu)}>
                        <StyledAvatar
                            alt={user?.displayName || ''}
                            src={user?.photoURL || ''}
                        />
                        <UserInfo>
                            <UserName>{user?.displayName?.split(' ')[0] || 'User'}</UserName>
                            <UserStatus>
                                <StatusDot $isOnline={isOnline} />
                                {isOnline ? 'Online' : 'Offline'}
                            </UserStatus>
                        </UserInfo>
                    </UserSection>

                    {showUserMenu && (
                        <>
                            <MobileOverlay onClick={closeMenu} />
                            <UserMenu>
                                <MenuHeader>
                                    <Avatar
                                        src={user?.photoURL || ''}
                                        sx={{ width: 48, height: 48 }}
                                    />
                                    <div>
                                        <h4>{user?.displayName}</h4>
                                        <p>{user?.email}</p>
                                    </div>
                                </MenuHeader>
                                <MenuDivider />
                                <MenuItem onClick={requestLogout}>
                                    <LogoutIcon />
                                    <span>Sign Out</span>
                                </MenuItem>
                            </UserMenu>
                        </>
                    )}
                </HeaderLeft>

                <HeaderCenter>
                    <SearchContainer>
                        <SearchIcon />
                        <SearchInput
                            type="text"
                            placeholder="Search messages, channels..."
                            value={searchQuery}
                            onChange={handleSearch}
                        />
                        <SearchShortcut>Ctrl+K</SearchShortcut>
                    </SearchContainer>
                </HeaderCenter>

                <HeaderRight>
                    <IconButton title="Notifications">
                        <NotificationsNoneIcon />
                        <NotificationBadge>3</NotificationBadge>
                    </IconButton>
                    <IconButton title="Help">
                        <HelpOutlineIcon />
                    </IconButton>
                </HeaderRight>
            </HeaderContainer>

            <ConfirmDialog
                isOpen={showLogoutConfirm}
                title="Sign Out"
                message="Are you sure you want to sign out? You'll need to sign in again to access your messages."
                confirmText="Sign Out"
                cancelText="Cancel"
                onConfirm={confirmLogout}
                onCancel={cancelLogout}
                danger
            />
        </>
    );
};

export default Header;

// Animations
const fadeIn = keyframes`
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const slideUp = keyframes`
    from {
        opacity: 0;
        transform: translateY(100%);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
`;

const pulse = keyframes`
    0%, 100% {
        box-shadow: 0 0 0 0 rgba(59, 165, 92, 0.4);
    }
    50% {
        box-shadow: 0 0 0 4px rgba(59, 165, 92, 0);
    }
`;

// Styled Components
const OfflineBanner = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 40px;
    background: rgba(233, 69, 96, 0.9);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-sm);
    color: white;
    font-size: 0.85rem;
    z-index: 101;

    svg {
        font-size: 1.2rem;
    }
`;

const PendingBadge = styled.span`
    background: rgba(255, 255, 255, 0.2);
    padding: 2px 8px;
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 500;
`;

const MobileOverlay = styled.div`
    display: none;

    @media (max-width: 768px) {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
    }
`;

const HeaderContainer = styled.header<{ $hasOfflineBanner?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height);
    padding: 0 var(--spacing-lg);
    background: var(--glass-bg);
    border-bottom: 1px solid var(--glass-border);
    position: fixed;
    top: ${(props) => (props.$hasOfflineBanner ? '40px' : '0')};
    left: 0;
    right: 0;
    z-index: 100;
    transition: top 0.3s ease;
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    flex: 0.25;
    position: relative;
`;

const UserSection = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
        background: var(--glass-bg-hover);
    }
`;

const StyledAvatar = styled(Avatar)`
    width: 36px !important;
    height: 36px !important;
    border: 2px solid var(--accent-primary);
    box-shadow: var(--shadow-glow);
`;

const UserInfo = styled.div`
    display: flex;
    flex-direction: column;

    @media (max-width: 768px) {
        display: none;
    }
`;

const UserName = styled.span`
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
`;

const UserStatus = styled.span`
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.75rem;
    color: var(--text-muted);
`;

const StatusDot = styled.span<{ $isOnline?: boolean }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${(props) => (props.$isOnline ? 'var(--accent-success)' : 'var(--text-muted)')};
    animation: ${(props) => (props.$isOnline ? pulse : 'none')} 2s ease-in-out infinite;
`;

const UserMenu = styled.div`
    position: absolute;
    top: calc(100% + var(--spacing-sm));
    left: 0;
    min-width: 280px;
    background: var(--bg-secondary);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
    animation: ${fadeIn} 0.2s ease-out;
    z-index: 1000;

    @media (max-width: 768px) {
        position: fixed;
        top: auto;
        bottom: 0;
        left: 0;
        right: 0;
        min-width: 100%;
        border-radius: var(--radius-xl) var(--radius-xl) 0 0;
        animation: ${slideUp} 0.3s ease-out;
    }
`;

const MenuHeader = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-lg);
    background: var(--glass-bg);

    h4 {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary);
        margin: 0;
    }

    p {
        font-size: 0.8rem;
        color: var(--text-muted);
        margin: 0;
    }
`;

const MenuDivider = styled.div`
    height: 1px;
    background: var(--glass-border);
`;

const MenuItem = styled.button`
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md) var(--spacing-lg);
    color: var(--text-secondary);
    font-size: 0.9rem;
    transition: all var(--transition-fast);

    svg {
        font-size: 1.2rem;
    }

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--accent-danger);
    }
`;

const HeaderCenter = styled.div`
    flex: 0.5;
    display: flex;
    justify-content: center;
    padding: 0 var(--spacing-lg);
`;

const SearchContainer = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    width: 100%;
    max-width: 500px;
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-full);
    transition: all var(--transition-normal);

    svg {
        color: var(--text-muted);
        font-size: 1.2rem;
    }

    &:focus-within {
        border-color: var(--accent-primary);
        box-shadow: var(--shadow-glow);
        background: var(--glass-bg-hover);

        svg {
            color: var(--accent-primary);
        }
    }
`;

const SearchInput = styled.input`
    flex: 1;
    font-size: 0.9rem;

    &::placeholder {
        color: var(--text-muted);
    }
`;

const SearchShortcut = styled.span`
    padding: 2px 8px;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-sm);
    font-size: 0.7rem;
    color: var(--text-muted);
    font-family: monospace;

    @media (max-width: 768px) {
        display: none;
    }
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    flex: 0.25;
    justify-content: flex-end;
`;

const IconButton = styled.button`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    transition: all var(--transition-fast);

    svg {
        font-size: 1.4rem;
    }

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
    }
`;

const NotificationBadge = styled.span`
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    background: var(--accent-danger);
    border-radius: var(--radius-full);
    font-size: 0.65rem;
    font-weight: 600;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
`;
