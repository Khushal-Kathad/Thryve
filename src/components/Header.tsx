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
                            <UserName>{user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'User'}</UserName>
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
        box-shadow: 0 0 0 0 rgba(12, 198, 140, 0.4);
    }
    50% {
        box-shadow: 0 0 0 4px rgba(12, 198, 140, 0);
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
    background: linear-gradient(135deg, var(--accent-danger) 0%, #DC2020 100%);
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
    padding: 0 20px;
    padding-left: max(20px, env(safe-area-inset-left, 0));
    padding-right: max(20px, env(safe-area-inset-right, 0));
    background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 50%, #EC4899 100%);
    background-size: 200% 200%;
    animation: gradientShift 8s ease infinite;
    border-bottom: 1px solid rgba(139, 92, 246, 0.3);
    position: fixed;
    top: ${(props) => (props.$hasOfflineBanner ? '44px' : '0')};
    left: 0;
    right: 0;
    z-index: 1000;
    transition: top 0.25s ease;
    transform: translateZ(0);
    will-change: transform;
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4);

    @keyframes gradientShift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
    }

    @media (min-width: 768px) {
        padding: 0 24px;
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
    border-radius: 12px;
    color: white;
    background: rgba(255, 255, 255, 0.15);
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;

    svg {
        font-size: 1.5rem;
        transition: transform 0.2s ease;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.25);
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
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.2rem;
    font-weight: 800;
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
`;

const LogoText = styled.span`
    font-size: 1.4rem;
    font-weight: 800;
    color: white;
    letter-spacing: -0.5px;

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
    gap: 10px;
    width: 100%;
    padding: 10px 18px;
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 50px;
    transition: all 0.25s ease;
    backdrop-filter: blur(10px);

    ${props => props.$isFocused && css`
        background: rgba(255, 255, 255, 0.25);
        border-color: rgba(255, 255, 255, 0.4);
        box-shadow: 0 0 20px rgba(255, 255, 255, 0.1);
    `}

    &:hover:not(:focus-within) {
        background: rgba(255, 255, 255, 0.2);
    }

    @media (max-width: 768px) {
        padding: 12px 18px;
    }
`;

const SearchIconWrapper = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255, 255, 255, 0.7);
    transition: color 0.2s ease;

    svg {
        font-size: 1.25rem;
    }

    ${SearchContainer}:focus-within & {
        color: white;
    }
`;

const SearchInput = styled.input`
    flex: 1;
    font-size: 0.9rem;
    font-weight: 400;
    min-width: 0;
    color: white;
    background: transparent;

    &::placeholder {
        color: rgba(255, 255, 255, 0.6);
    }

    @media (max-width: 768px) {
        font-size: 1rem;
    }
`;

const SearchShortcut = styled.span`
    padding: 4px 10px;
    background: rgba(255, 255, 255, 0.15);
    border-radius: 6px;
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.8);
    font-family: var(--font-mono);
    font-weight: 600;

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
    border-radius: 12px;
    color: white;
    background: rgba(255, 255, 255, 0.1);
    transition: all 0.2s ease;

    svg {
        font-size: 1.3rem;
    }

    &:hover {
        background: rgba(255, 255, 255, 0.2);
    }
`;

const NotificationBadge = styled.span`
    position: absolute;
    top: 4px;
    right: 4px;
    min-width: 18px;
    height: 18px;
    padding: 0 5px;
    background: #FD3A55;
    border-radius: 50px;
    font-size: 0.65rem;
    font-weight: 700;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid #6338F6;
    box-shadow: 0 2px 8px rgba(253, 58, 85, 0.4);
`;

const UserSection = styled.button`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 12px 6px 6px;
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.2s ease;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);

    &:hover {
        background: rgba(255, 255, 255, 0.2);
    }
`;

const StyledAvatar = styled(Avatar)`
    width: 36px !important;
    height: 36px !important;
    border: 2px solid rgba(255, 255, 255, 0.5);
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
    font-size: 0.9rem;
    font-weight: 600;
    color: white;
`;

const UserStatus = styled.span`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.75);
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
    background: var(--glass-bg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--glass-border);
    border-radius: var(--radius-xl);
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.3),
                0 0 0 1px rgba(255, 255, 255, 0.1) inset;
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
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
    border-bottom: 1px solid var(--glass-border);
`;

const MenuAvatar = styled(Avatar)`
    width: 52px !important;
    height: 52px !important;
    border: 3px solid transparent;
    background: linear-gradient(var(--bg-secondary), var(--bg-secondary)) padding-box,
                linear-gradient(135deg, #8B5CF6, #EC4899, #06B6D4) border-box;
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.4);
`;

const MenuUserInfo = styled.div`
    h4 {
        font-size: var(--text-base);
        font-weight: 700;
        background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0 0 4px 0;
    }

    p {
        font-size: var(--text-sm);
        color: var(--text-secondary);
        margin: 0;
    }
`;

const MenuDivider = styled.div`
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--glass-border), transparent);
`;

const MenuItem = styled.button<{ $danger?: boolean }>`
    width: 100%;
    display: flex;
    align-items: center;
    gap: var(--spacing-3);
    padding: var(--spacing-4) var(--spacing-5);
    color: ${props => props.$danger ? '#FD3A55' : 'var(--text-secondary)'};
    font-size: var(--text-sm);
    font-weight: 500;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;

    svg {
        font-size: 1.25rem;
        transition: transform 0.2s ease;
    }

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: ${props => props.$danger
            ? 'linear-gradient(90deg, transparent, rgba(253, 58, 85, 0.1), transparent)'
            : 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.1), transparent)'};
        transition: left 0.3s ease;
    }

    &:hover {
        background: ${props => props.$danger
            ? 'rgba(253, 58, 85, 0.1)'
            : 'rgba(139, 92, 246, 0.1)'};
        color: ${props => props.$danger ? '#FD3A55' : '#8B5CF6'};

        svg {
            transform: scale(1.1);
        }

        &::before {
            left: 100%;
        }
    }

    @media (max-width: 768px) {
        padding: var(--spacing-5) var(--spacing-6);
        font-size: var(--text-base);
    }
`;
