import React, { useState, useRef, useCallback, ChangeEvent } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { Avatar } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import LogoutIcon from '@mui/icons-material/Logout';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth, signOut } from 'firebase/auth';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsOnline, selectPendingCount } from '../features/appSlice';
import useClickOutside from '../hooks/useClickOutside';
import ConfirmDialog from './ui/ConfirmDialog';

interface HeaderProps {
    onSearch?: (query: string) => void;
    onMenuClick?: () => void;
    isSidebarOpen?: boolean;
}

const Header: React.FC<HeaderProps> = ({ onSearch, onMenuClick, isSidebarOpen }) => {
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const [searchQuery, setSearchQuery] = useState('');
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
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
                    <span>You're offline. Messages will sync when you reconnect.</span>
                    {pendingCount > 0 && <PendingBadge>{pendingCount} pending</PendingBadge>}
                </OfflineBanner>
            )}
            <HeaderContainer $hasOfflineBanner={!isOnline}>
                <HeaderLeft>
                    {/* Mobile Menu Button */}
                    <MobileMenuButton onClick={onMenuClick} aria-label="Toggle menu">
                        {isSidebarOpen ? <CloseIcon /> : <MenuIcon />}
                    </MobileMenuButton>

                    {/* Logo */}
                    <Logo>
                        <LogoIcon>T</LogoIcon>
                        <LogoText>Thryve</LogoText>
                    </Logo>
                </HeaderLeft>

                <HeaderCenter $isSearchFocused={isSearchFocused}>
                    <SearchContainer $isFocused={isSearchFocused}>
                        <SearchIconWrapper>
                            <SearchIcon />
                        </SearchIconWrapper>
                        <SearchInput
                            type="text"
                            placeholder="Search conversations..."
                            value={searchQuery}
                            onChange={handleSearch}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                        <SearchShortcut>⌘K</SearchShortcut>
                    </SearchContainer>
                </HeaderCenter>

                <HeaderRight ref={menuRef}>
                    <IconButton title="Notifications" $hasNotification>
                        <NotificationsNoneIcon />
                        <NotificationBadge>3</NotificationBadge>
                    </IconButton>
                    <IconButton title="Help" className="hide-mobile">
                        <HelpOutlineIcon />
                    </IconButton>

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
                                    <MenuAvatar
                                        src={user?.photoURL || ''}
                                    />
                                    <MenuUserInfo>
                                        <h4>{user?.displayName}</h4>
                                        <p>{user?.email}</p>
                                    </MenuUserInfo>
                                </MenuHeader>
                                <MenuDivider />
                                <MenuItem onClick={requestLogout} $danger>
                                    <LogoutIcon />
                                    <span>Sign Out</span>
                                </MenuItem>
                            </UserMenu>
                        </>
                    )}
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
        transform: translateY(-8px);
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
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
    }
    50% {
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0);
    }
`;

const shimmer = keyframes`
    0% {
        background-position: -200% 0;
    }
    100% {
        background-position: 200% 0;
    }
`;

// Styled Components
const OfflineBanner = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 44px;
    background: linear-gradient(135deg, #EF4444 0%, #DC2626 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-2);
    color: white;
    font-size: var(--text-sm);
    font-weight: 500;
    z-index: 1001;
    box-shadow: var(--shadow-md);

    svg {
        font-size: 1.25rem;
    }

    @media (max-width: 640px) {
        font-size: var(--text-xs);
        padding: 0 var(--spacing-4);

        span {
            display: none;
        }

        &::after {
            content: 'Offline mode';
        }
    }
`;

const PendingBadge = styled.span`
    background: rgba(255, 255, 255, 0.2);
    padding: 4px 12px;
    border-radius: var(--radius-full);
    font-size: var(--text-xs);
    font-weight: 600;
    backdrop-filter: blur(10px);
`;

const MobileOverlay = styled.div`
    display: none;

    @media (max-width: 768px) {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 998;
        animation: fadeIn 0.2s ease-out;
    }
`;

const HeaderContainer = styled.header<{ $hasOfflineBanner?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: var(--header-height);
    padding: 0 var(--spacing-4);
    padding-left: max(var(--spacing-4), env(safe-area-inset-left, 0));
    padding-right: max(var(--spacing-4), env(safe-area-inset-right, 0));
    background: var(--glass-bg-strong);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--border-light);
    position: fixed;
    top: ${(props) => (props.$hasOfflineBanner ? '44px' : '0')};
    left: 0;
    right: 0;
    z-index: 1000;
    transition: top var(--transition-normal), background var(--transition-normal);
    /* GPU acceleration */
    transform: translateZ(0);
    will-change: transform;

    @media (min-width: 768px) {
        padding: 0 var(--spacing-6);
    }

    @media (max-width: 768px) and (orientation: landscape) {
        height: var(--header-height);
    }
`;

const HeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    flex: 0 0 auto;
`;

const MobileMenuButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    color: var(--text-secondary);
    transition: all var(--transition-fast);
    /* Touch optimization */
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;

    svg {
        font-size: 1.5rem;
        transition: transform 0.2s ease;
    }

    &:hover {
        background: var(--surface-hover);
        color: var(--accent-primary);
    }

    &:active {
        transform: scale(0.92);

        svg {
            transform: scale(0.95);
        }
    }

    @media (min-width: 768px) {
        display: none;
    }
`;

const Logo = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
`;

const LogoIcon = styled.div`
    width: 36px;
    height: 36px;
    border-radius: var(--radius-lg);
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: var(--text-lg);
    font-weight: 700;
    color: white;
    box-shadow: var(--shadow-purple);
`;

const LogoText = styled.span`
    font-size: var(--text-xl);
    font-weight: 700;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;

    @media (max-width: 640px) {
        display: none;
    }
`;

const HeaderCenter = styled.div<{ $isSearchFocused?: boolean }>`
    flex: 1;
    display: flex;
    justify-content: center;
    padding: 0 var(--spacing-4);
    max-width: 600px;
    margin: 0 auto;

    @media (max-width: 768px) {
        ${props => props.$isSearchFocused && css`
            position: fixed;
            left: 0;
            right: 0;
            top: var(--header-height);
            padding: var(--spacing-3);
            background: var(--bg-primary);
            border-bottom: 1px solid var(--border-light);
            z-index: 999;
        `}
    }
`;

const SearchContainer = styled.div<{ $isFocused?: boolean }>`
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    width: 100%;
    padding: var(--spacing-2) var(--spacing-4);
    background: var(--surface-secondary);
    border: 2px solid transparent;
    border-radius: var(--radius-full);
    transition: all var(--transition-normal);

    ${props => props.$isFocused && css`
        background: var(--bg-primary);
        border-color: var(--accent-primary);
        box-shadow: var(--shadow-glow);
    `}

    &:hover:not(:focus-within) {
        background: var(--surface-hover);
    }

    @media (max-width: 768px) {
        padding: var(--spacing-3) var(--spacing-4);
    }
`;

const SearchIconWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    transition: color var(--transition-fast);

    svg {
        font-size: 1.25rem;
    }

    ${SearchContainer}:focus-within & {
        color: var(--accent-primary);
    }
`;

const SearchInput = styled.input`
    flex: 1;
    font-size: var(--text-sm);
    font-weight: 400;
    min-width: 0;

    &::placeholder {
        color: var(--text-muted);
    }

    @media (max-width: 768px) {
        font-size: var(--text-base);
    }
`;

const SearchShortcut = styled.span`
    padding: 4px 8px;
    background: var(--surface-hover);
    border-radius: var(--radius-sm);
    font-size: var(--text-xs);
    color: var(--text-muted);
    font-family: var(--font-mono);
    font-weight: 500;

    @media (max-width: 768px) {
        display: none;
    }
`;

const HeaderRight = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-2);
    flex: 0 0 auto;
    position: relative;

    .hide-mobile {
        @media (max-width: 640px) {
            display: none;
        }
    }
`;

const IconButton = styled.button<{ $hasNotification?: boolean }>`
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-lg);
    color: var(--text-secondary);
    transition: all var(--transition-fast);

    svg {
        font-size: 1.4rem;
    }

    &:hover {
        background: var(--surface-hover);
        color: var(--accent-primary);
    }
`;

const NotificationBadge = styled.span`
    position: absolute;
    top: 6px;
    right: 6px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: var(--accent-danger);
    border-radius: var(--radius-full);
    font-size: 0.65rem;
    font-weight: 700;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--bg-primary);
`;

const UserSection = styled.button`
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-2);
    border-radius: var(--radius-xl);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
        background: var(--surface-hover);
    }
`;

const StyledAvatar = styled(Avatar)`
    width: 38px !important;
    height: 38px !important;
    border: 2px solid var(--accent-primary);
    box-shadow: var(--shadow-purple);
`;

const UserInfo = styled.div`
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    text-align: left;

    @media (max-width: 1024px) {
        display: none;
    }
`;

const UserName = styled.span`
    font-size: var(--text-sm);
    font-weight: 600;
    color: var(--text-primary);
`;

const UserStatus = styled.span`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-xs);
    color: var(--text-muted);
`;

const StatusDot = styled.span<{ $isOnline?: boolean }>`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${(props) => (props.$isOnline ? 'var(--status-online)' : 'var(--status-offline)')};
    ${props => props.$isOnline && css`
        animation: ${pulse} 2s ease-in-out infinite;
    `}
`;

const UserMenu = styled.div`
    position: absolute;
    top: calc(100% + var(--spacing-2));
    right: 0;
    min-width: 280px;
    background: var(--bg-primary);
    border: 1px solid var(--border-light);
    border-radius: var(--radius-xl);
    box-shadow: var(--shadow-xl);
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
        border-radius: var(--radius-2xl) var(--radius-2xl) 0 0;
        animation: ${slideUp} 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }
`;

const MenuHeader = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-4);
    padding: var(--spacing-5);
    background: var(--gradient-subtle);
`;

const MenuAvatar = styled(Avatar)`
    width: 52px !important;
    height: 52px !important;
    border: 3px solid var(--accent-primary);
    box-shadow: var(--shadow-purple);
`;

const MenuUserInfo = styled.div`
    h4 {
        font-size: var(--text-base);
        font-weight: 600;
        color: var(--text-primary);
        margin: 0 0 4px 0;
    }

    p {
        font-size: var(--text-sm);
        color: var(--text-muted);
        margin: 0;
    }
`;

const MenuDivider = styled.div`
    height: 1px;
    background: var(--border-light);
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5);
    color: ${props => props.$danger ? 'var(--accent-danger)' : 'var(--text-secondary)'};
    font-size: var(--text-sm);
    font-weight: 500;
    transition: all var(--transition-fast);

    svg {
        font-size: 1.25rem;
    }

    &:hover {
        background: ${props => props.$danger ? 'rgba(239, 68, 68, 0.1)' : 'var(--surface-hover)'};
        color: ${props => props.$danger ? 'var(--accent-danger)' : 'var(--accent-primary)'};
    }

    @media (max-width: 768px) {
        padding: var(--spacing-5) var(--spacing-6);
        font-size: var(--text-base);
    }
`;
