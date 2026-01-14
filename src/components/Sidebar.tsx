import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import styled, { keyframes, css } from 'styled-components';
import AddIcon from '@mui/icons-material/Add';
import TagIcon from '@mui/icons-material/Tag';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PersonIcon from '@mui/icons-material/Person';
import CloseIcon from '@mui/icons-material/Close';
import GroupsIcon from '@mui/icons-material/Groups';
import MessageIcon from '@mui/icons-material/Message';
import SearchIcon from '@mui/icons-material/Search';
import SidebarOption from './SidebarOption';
import CreateChannelModal from './ui/CreateChannelModal';
import ChannelPasswordModal from './ui/ChannelPasswordModal';
import { db } from '../firebase';
import { collection, doc, setDoc, getDoc, Timestamp, query, orderBy, limit } from 'firebase/firestore';
import { useCollection } from 'react-firebase-hooks/firestore';
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDispatch, useSelector } from 'react-redux';
import {
    selectShowCreateChannelModal,
    setShowCreateChannelModal,
    selectPendingRoomId,
    selectPendingRoomName,
    clearPendingRoom,
    addVerifiedRoom,
    enterRoom,
    setActivePanel,
    setShowNewMessageModal,
} from '../features/appSlice';
import type { SidebarPanel } from '../types';
import { hashPassword, verifyPassword } from '../utils/passwordUtils';
import { useToast } from '../context/ToastContext';
import { userService, AppUser } from '../services/userService';
import { useDebounce } from '../hooks/useDebounce';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

// Memoized User Item Component for performance
const UserItem = memo<{
    user: AppUser;
    isCurrentUser?: boolean;
    onClick?: () => void;
}>(({ user, isCurrentUser, onClick }) => (
    <UserItemContainer
        onClick={onClick}
        $clickable={!isCurrentUser}
        $offline={!user.isOnline && !isCurrentUser}
    >
        <UserAvatarWrapper>
            {user.photoURL ? (
                <UserAvatar src={user.photoURL} alt={user.displayName} loading="lazy" />
            ) : (
                <UserAvatarPlaceholder $online={user.isOnline}>
                    <PersonIcon />
                </UserAvatarPlaceholder>
            )}
            <OnlineIndicator $isOnline={user.isOnline} />
        </UserAvatarWrapper>
        <UserInfo>
            <UserName>
                {user.displayName}
                {isCurrentUser && <YouBadge>you</YouBadge>}
            </UserName>
            <UserStatus $online={user.isOnline}>
                {user.isOnline ? 'Active now' : 'Offline'}
            </UserStatus>
        </UserInfo>
        {!isCurrentUser && user.isOnline && (
            <MessageBadge>
                <MessageIcon />
            </MessageBadge>
        )}
    </UserItemContainer>
));

UserItem.displayName = 'UserItem';

// Skeleton Loading Component
const UserSkeleton = memo(() => (
    <SkeletonContainer>
        <SkeletonAvatar />
        <SkeletonContent>
            <SkeletonName />
            <SkeletonStatus />
        </SkeletonContent>
    </SkeletonContainer>
));

UserSkeleton.displayName = 'UserSkeleton';

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const dispatch = useDispatch();
    const { showToast } = useToast();

    // State
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [showDMs, setShowDMs] = useState(true);
    const [showGroups, setShowGroups] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [passwordError, setPasswordError] = useState('');

    // Selectors
    const showCreateModal = useSelector(selectShowCreateChannelModal);
    const pendingRoomId = useSelector(selectPendingRoomId);
    const pendingRoomName = useSelector(selectPendingRoomName);

    // Optimized channels query
    const channelsQuery = useMemo(() =>
        query(collection(db, 'rooms'), orderBy('createdAt', 'desc'), limit(50)),
        []
    );
    const [channels, channelsLoading] = useCollection(channelsQuery);

    // Listen for all users with cleanup
    useEffect(() => {
        setIsLoadingUsers(true);
        const unsubscribe = userService.listenForUsers((users) => {
            setAllUsers(users);
            setIsLoadingUsers(false);
        });

        return () => {
            unsubscribe();
            userService.stopListening();
        };
    }, []);

    // Debounce search query for better performance
    const debouncedSearchQuery = useDebounce(searchQuery, 200);

    // Memoized user lists - prevents recalculation on every render
    const { currentUserData, onlineUsers, offlineUsers, filteredOnlineUsers, filteredOfflineUsers } = useMemo(() => {
        const currentUserData = allUsers.find(u => u.uid === user?.uid) || null;
        const otherUsers = allUsers.filter(u => u.uid !== user?.uid);
        const online = otherUsers.filter(u => u.isOnline);
        const offline = otherUsers.filter(u => !u.isOnline);

        // Apply search filter with debounced query
        const searchLower = debouncedSearchQuery.toLowerCase().trim();
        const filterFn = (u: AppUser) =>
            !searchLower || u.displayName.toLowerCase().includes(searchLower);

        return {
            currentUserData,
            onlineUsers: online,
            offlineUsers: offline,
            filteredOnlineUsers: online.filter(filterFn),
            filteredOfflineUsers: offline.filter(filterFn),
        };
    }, [allUsers, user?.uid, debouncedSearchQuery]);

    // Memoized channel lists
    const { dmRooms, publicChannels } = useMemo(() => ({
        dmRooms: channels?.docs.filter(doc => doc.data().isDM) || [],
        publicChannels: channels?.docs.filter(doc => !doc.data().isDM) || [],
    }), [channels]);

    // Memoized handlers
    const handleMenuClick = useCallback((panel: SidebarPanel) => {
        dispatch(setActivePanel(panel));
        onClose?.();
    }, [dispatch, onClose]);

    const handleNewMessage = useCallback(() => {
        dispatch(setShowNewMessageModal(true));
        onClose?.();
    }, [dispatch, onClose]);

    const handleStartDM = useCallback(async (otherUser: AppUser) => {
        if (!user) return;

        try {
            const dmRoomId = await userService.getOrCreateDMRoom(
                user.uid,
                otherUser.uid,
                user.displayName || 'You',
                otherUser.displayName,
                user.photoURL || '',
                otherUser.photoURL || ''
            );

            dispatch(addVerifiedRoom({ roomId: dmRoomId }));
            dispatch(enterRoom({ roomId: dmRoomId }));
            onClose?.();
        } catch (error) {
            console.error('Error creating DM:', error);
            showToast('Failed to start conversation', 'error');
        }
    }, [user, dispatch, onClose, showToast]);

    const handleCreateChannel = useCallback(async (name: string, password: string | null) => {
        if (!user) return;

        setIsCreating(true);
        try {
            const newRef = doc(collection(db, 'rooms'));
            const channelData = {
                name,
                passwordHash: password ? await hashPassword(password) : null,
                createdAt: Timestamp.fromDate(new Date()),
                createdBy: user.uid,
                members: [user.uid],
                memberNames: { [user.uid]: user.displayName || 'Unknown' },
            };

            await setDoc(newRef, channelData);

            dispatch(addVerifiedRoom({ roomId: newRef.id }));
            dispatch(enterRoom({ roomId: newRef.id }));
            dispatch(setShowCreateChannelModal(false));
            showToast(`Group "${name}" created successfully!`, 'success');
            onClose?.();
        } catch (error) {
            console.error('Error creating group:', error);
            showToast('Failed to create group. Please try again.', 'error');
        } finally {
            setIsCreating(false);
        }
    }, [user, dispatch, onClose, showToast]);

    const handlePasswordSubmit = useCallback(async (password: string) => {
        if (!pendingRoomId) return;

        setIsVerifying(true);
        setPasswordError('');

        try {
            const roomDoc = await getDoc(doc(db, 'rooms', pendingRoomId));
            if (!roomDoc.exists()) {
                setPasswordError('Channel not found');
                return;
            }

            const roomData = roomDoc.data();
            const isValid = await verifyPassword(password, roomData.passwordHash);

            if (isValid) {
                dispatch(addVerifiedRoom({ roomId: pendingRoomId }));
                dispatch(enterRoom({ roomId: pendingRoomId }));
                dispatch(clearPendingRoom());
                setPasswordError('');
                onClose?.();
            } else {
                setPasswordError('Incorrect password');
            }
        } catch (error) {
            console.error('Error verifying password:', error);
            setPasswordError('Failed to verify password');
        } finally {
            setIsVerifying(false);
        }
    }, [pendingRoomId, dispatch, onClose]);

    const handlePasswordCancel = useCallback(() => {
        dispatch(clearPendingRoom());
        setPasswordError('');
    }, [dispatch]);

    const toggleDMs = useCallback(() => setShowDMs(prev => !prev), []);
    const toggleGroups = useCallback(() => setShowGroups(prev => !prev), []);

    return (
        <>
            <Overlay $isOpen={isOpen} onClick={onClose} />

            <SidebarContainer $isOpen={isOpen}>
                <MobileCloseButton onClick={onClose} aria-label="Close sidebar">
                    <CloseIcon />
                </MobileCloseButton>

                {/* Header */}
                <SidebarHeader>
                    <WorkspaceInfo>
                        <LogoContainer>
                            <ChatBubbleOutlineIcon />
                        </LogoContainer>
                        <WorkspaceDetails>
                            <WorkspaceName>Thryve</WorkspaceName>
                            <WorkspaceStatus>
                                <StatusDot />
                                <span>{user?.displayName?.split(' ')[0] || 'User'}</span>
                            </WorkspaceStatus>
                        </WorkspaceDetails>
                    </WorkspaceInfo>
                    <NewMessageButton title="New Message" onClick={handleNewMessage}>
                        <AddIcon />
                    </NewMessageButton>
                </SidebarHeader>

                <SidebarContent>
                    {/* Quick Menu */}
                    <MenuSection>
                        <MenuItem onClick={() => handleMenuClick('threads')}>
                            <MenuIcon><ChatBubbleOutlineIcon /></MenuIcon>
                            <span>Threads</span>
                        </MenuItem>
                        <MenuItem onClick={() => handleMenuClick('mentions')}>
                            <MenuIcon><AlternateEmailIcon /></MenuIcon>
                            <span>Mentions</span>
                        </MenuItem>
                        <MenuItem onClick={() => handleMenuClick('saved')}>
                            <MenuIcon><BookmarkBorderIcon /></MenuIcon>
                            <span>Saved</span>
                        </MenuItem>
                        <MenuItem onClick={() => handleMenuClick('people')}>
                            <MenuIcon><PeopleOutlineIcon /></MenuIcon>
                            <span>People</span>
                        </MenuItem>
                        <MenuItem onClick={() => handleMenuClick('settings')}>
                            <MenuIcon><SettingsIcon /></MenuIcon>
                            <span>Settings</span>
                        </MenuItem>
                    </MenuSection>

                    <Divider />

                    {/* Search Users */}
                    <SearchContainer>
                        <SearchIcon />
                        <SearchInput
                            type="text"
                            placeholder="Search people..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <ClearSearchButton onClick={() => setSearchQuery('')}>
                                <CloseIcon />
                            </ClearSearchButton>
                        )}
                    </SearchContainer>

                    {/* Direct Messages Section */}
                    <Section>
                        <SectionHeader onClick={toggleDMs}>
                            <SectionHeaderLeft>
                                <ExpandIcon $isExpanded={showDMs}>
                                    <ExpandMoreIcon />
                                </ExpandIcon>
                                <SectionIcon>
                                    <MessageIcon />
                                </SectionIcon>
                                <span>Direct Messages</span>
                            </SectionHeaderLeft>
                            <BadgeGroup>
                                {onlineUsers.length > 0 && (
                                    <OnlineBadge>
                                        <span className="dot" />
                                        {onlineUsers.length} online
                                    </OnlineBadge>
                                )}
                            </BadgeGroup>
                        </SectionHeader>

                        <SectionContent $isExpanded={showDMs}>
                            {isLoadingUsers ? (
                                <>
                                    <UserSkeleton />
                                    <UserSkeleton />
                                    <UserSkeleton />
                                </>
                            ) : (
                                <>
                                    {/* Current User */}
                                    {currentUserData && (
                                        <UserItem
                                            user={{
                                                ...currentUserData,
                                                displayName: user?.displayName?.split(' ')[0] || 'You',
                                                isOnline: true,
                                            }}
                                            isCurrentUser
                                        />
                                    )}

                                    {/* Online Users */}
                                    {filteredOnlineUsers.length > 0 && (
                                        <>
                                            <SubSectionTitle>
                                                <OnlineDot />
                                                Online Now ({filteredOnlineUsers.length})
                                            </SubSectionTitle>
                                            {filteredOnlineUsers.map((otherUser) => (
                                                <UserItem
                                                    key={otherUser.uid}
                                                    user={otherUser}
                                                    onClick={() => handleStartDM(otherUser)}
                                                />
                                            ))}
                                        </>
                                    )}

                                    {/* Offline Users */}
                                    {filteredOfflineUsers.length > 0 && (
                                        <>
                                            <SubSectionTitle>
                                                Offline ({filteredOfflineUsers.length})
                                            </SubSectionTitle>
                                            {filteredOfflineUsers.slice(0, 10).map((otherUser) => (
                                                <UserItem
                                                    key={otherUser.uid}
                                                    user={otherUser}
                                                    onClick={() => handleStartDM(otherUser)}
                                                />
                                            ))}
                                            {filteredOfflineUsers.length > 10 && (
                                                <ShowMoreButton onClick={() => handleMenuClick('people')}>
                                                    View all {filteredOfflineUsers.length} users
                                                </ShowMoreButton>
                                            )}
                                        </>
                                    )}

                                    {onlineUsers.length === 0 && offlineUsers.length === 0 && (
                                        <EmptyState>
                                            <PeopleOutlineIcon />
                                            <span>No other users yet</span>
                                        </EmptyState>
                                    )}
                                </>
                            )}
                        </SectionContent>
                    </Section>

                    <Divider />

                    {/* Groups Section */}
                    <Section>
                        <SectionHeader onClick={toggleGroups}>
                            <SectionHeaderLeft>
                                <ExpandIcon $isExpanded={showGroups}>
                                    <ExpandMoreIcon />
                                </ExpandIcon>
                                <SectionIcon>
                                    <GroupsIcon />
                                </SectionIcon>
                                <span>Groups</span>
                            </SectionHeaderLeft>
                            <GroupCount>{publicChannels.length}</GroupCount>
                        </SectionHeader>

                        <SectionContent $isExpanded={showGroups}>
                            <AddGroupButton onClick={() => dispatch(setShowCreateChannelModal(true))}>
                                <AddIcon />
                                <span>Create New Group</span>
                            </AddGroupButton>

                            {channelsLoading ? (
                                <>
                                    <UserSkeleton />
                                    <UserSkeleton />
                                </>
                            ) : (
                                publicChannels.map((docItem) => (
                                    <SidebarOption
                                        key={docItem.id}
                                        id={docItem.id}
                                        title={docItem.data().name}
                                        hasPassword={!!docItem.data().passwordHash}
                                        isPrivate={docItem.data().isPrivate}
                                        createdBy={docItem.data().createdBy}
                                        currentUserId={user?.uid}
                                        members={docItem.data().members || []}
                                    />
                                ))
                            )}
                        </SectionContent>
                    </Section>
                </SidebarContent>

                <SidebarFooter>
                    <FooterContent>
                        <FooterIcon>
                            <TagIcon />
                        </FooterIcon>
                        <FooterText>
                            <strong>Thryve Chat</strong>
                            <span>Built with React & Firebase</span>
                        </FooterText>
                    </FooterContent>
                </SidebarFooter>
            </SidebarContainer>

            <CreateChannelModal
                isOpen={showCreateModal}
                onClose={() => dispatch(setShowCreateChannelModal(false))}
                onSubmit={handleCreateChannel}
                isLoading={isCreating}
            />

            <ChannelPasswordModal
                isOpen={!!pendingRoomId}
                channelName={pendingRoomName || 'Channel'}
                onSubmit={handlePasswordSubmit}
                onCancel={handlePasswordCancel}
                isLoading={isVerifying}
                error={passwordError}
            />
        </>
    );
};

export default memo(Sidebar);

// Animations
const slideIn = keyframes`
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
`;

const fadeIn = keyframes`
    from { opacity: 0; }
    to { opacity: 1; }
`;

const pulse = keyframes`
    0%, 100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.4); }
    50% { box-shadow: 0 0 0 4px rgba(34, 197, 94, 0); }
`;

const shimmer = keyframes`
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
`;

const breathe = keyframes`
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.7; transform: scale(1.1); }
`;

// Styled Components
const Overlay = styled.div<{ $isOpen: boolean }>`
    display: none;

    @media (max-width: 768px) {
        display: block;
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        z-index: 998;
        opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
        visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
        transition: opacity 0.25s ease-out, visibility 0.25s ease-out;
        /* GPU acceleration */
        transform: translateZ(0);
        will-change: opacity;
        /* Prevent scroll on overlay */
        touch-action: none;
    }
`;

const SidebarContainer = styled.aside<{ $isOpen: boolean }>`
    display: flex;
    flex-direction: column;
    width: var(--sidebar-width);
    min-width: var(--sidebar-width);
    height: calc(100vh - var(--header-height));
    height: calc(100dvh - var(--header-height));
    margin-top: var(--header-height);
    background: var(--bg-primary);
    border-right: 1px solid var(--border-light);
    position: relative;
    z-index: 10;
    overflow: hidden;

    @media (max-width: 768px) {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 85%;
        max-width: 340px;
        height: 100vh;
        height: 100dvh;
        height: -webkit-fill-available;
        margin-top: 0;
        z-index: 999;
        box-shadow: ${({ $isOpen }) => ($isOpen ? 'var(--shadow-2xl)' : 'none')};
        /* GPU acceleration for smooth transforms */
        transform: ${({ $isOpen }) => ($isOpen ? 'translate3d(0, 0, 0)' : 'translate3d(-100%, 0, 0)')};
        transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        will-change: transform;
        backface-visibility: hidden;
        /* Safe area padding for notch devices */
        padding-top: env(safe-area-inset-top, 0);
        padding-left: env(safe-area-inset-left, 0);
    }
`;

const MobileCloseButton = styled.button`
    display: none;

    @media (max-width: 768px) {
        display: flex;
        align-items: center;
        justify-content: center;
        position: absolute;
        top: var(--spacing-md);
        right: var(--spacing-md);
        width: 40px;
        height: 40px;
        border-radius: var(--radius-full);
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        z-index: 10;
        transition: all var(--transition-fast);

        &:hover {
            background: var(--accent-danger);
            color: white;
            transform: rotate(90deg);
        }

        svg { font-size: 1.3rem; }
    }
`;

const SidebarHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-light);
    background: linear-gradient(180deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
`;

const WorkspaceInfo = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
`;

const LogoContainer = styled.div`
    width: 48px;
    height: 48px;
    border-radius: var(--radius-xl);
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-glow);
    animation: ${breathe} 4s ease-in-out infinite;

    svg {
        font-size: 1.5rem;
        color: white;
    }
`;

const WorkspaceDetails = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const WorkspaceName = styled.h2`
    font-size: 1.4rem;
    font-weight: 800;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    letter-spacing: -0.5px;
`;

const WorkspaceStatus = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.8rem;
    color: var(--text-secondary);
`;

const StatusDot = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-success);
    animation: ${pulse} 2s ease-in-out infinite;
`;

const NewMessageButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    background: var(--gradient-primary);
    color: white;
    box-shadow: var(--shadow-glow);
    transition: all var(--transition-fast);

    svg { font-size: 1.4rem; }

    &:hover {
        transform: scale(1.1) rotate(90deg);
        box-shadow: var(--shadow-glow-strong);
    }

    &:active { transform: scale(0.95); }
`;

const SidebarContent = styled.div`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--spacing-md) 0;
    /* Smooth momentum scrolling */
    -webkit-overflow-scrolling: touch;
    overscroll-behavior-y: contain;
    scroll-behavior: smooth;
    /* GPU acceleration */
    transform: translateZ(0);

    &::-webkit-scrollbar { width: 4px; }
    &::-webkit-scrollbar-track { background: transparent; }
    &::-webkit-scrollbar-thumb {
        background: var(--border-default);
        border-radius: 4px;
    }
    &::-webkit-scrollbar-thumb:hover {
        background: var(--accent-primary);
    }

    @media (max-width: 768px) {
        /* Hide scrollbar on mobile */
        scrollbar-width: none;
        -ms-overflow-style: none;
        &::-webkit-scrollbar {
            display: none;
        }
        /* Add safe area padding at bottom */
        padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0));
    }
`;

const MenuSection = styled.div`
    padding: 0 var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const MenuItem = styled.button`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-lg);
    color: var(--text-secondary);
    font-size: 0.95rem;
    font-weight: 500;
    transition: all var(--transition-fast);
    background: transparent;
    text-align: left;

    &:hover {
        background: var(--purple-50);
        color: var(--accent-primary);
        transform: translateX(4px);
    }

    &:active { transform: scale(0.98); }
`;

const MenuIcon = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background: var(--bg-tertiary);
    transition: all var(--transition-fast);

    svg { font-size: 1.1rem; }

    ${MenuItem}:hover & {
        background: var(--accent-primary);
        color: white;
    }
`;

const SearchContainer = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    margin: 0 var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    background: var(--bg-tertiary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--border-light);
    transition: all var(--transition-fast);

    &:focus-within {
        border-color: var(--accent-primary);
        box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.1);
    }

    svg {
        font-size: 1.1rem;
        color: var(--text-muted);
    }
`;

const SearchInput = styled.input`
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    font-size: 0.9rem;
    color: var(--text-primary);

    &::placeholder { color: var(--text-muted); }
`;

const ClearSearchButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    svg { font-size: 0.9rem; }

    &:hover {
        background: var(--accent-danger);
        color: white;
    }
`;

const Divider = styled.hr`
    border: none;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-light), transparent);
    margin: var(--spacing-md) var(--spacing-lg);
`;

const Section = styled.div`
    padding: 0 var(--spacing-md);
    /* Ensure section is visible */
    position: relative;
    z-index: 1;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    /* Touch optimization */
    min-height: 48px;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;

    &:hover { background: var(--bg-tertiary); }

    &:active {
        background: var(--purple-50);
        transform: scale(0.99);
    }

    @media (max-width: 768px) {
        padding: var(--spacing-md);
        min-height: 52px;
    }
`;

const SectionHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const ExpandIcon = styled.span<{ $isExpanded: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.2s ease;
    transform: ${({ $isExpanded }) => ($isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)')};

    svg {
        font-size: 1.1rem;
        color: var(--text-muted);
    }
`;

const SectionIcon = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        font-size: 1.1rem;
        color: var(--accent-primary);
    }
`;

const SectionContent = styled.div<{ $isExpanded: boolean }>`
    display: ${({ $isExpanded }) => ($isExpanded ? 'block' : 'none')};
    padding-top: ${({ $isExpanded }) => ($isExpanded ? 'var(--spacing-sm)' : '0')};
    /* Ensure content is visible */
    overflow: visible;

    /* Animation for smooth appearance */
    animation: ${({ $isExpanded }) => ($isExpanded ? 'fadeInSection 0.25s ease-out' : 'none')};

    @keyframes fadeInSection {
        from {
            opacity: 0;
            transform: translateY(-8px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;

const BadgeGroup = styled.div`
    display: flex;
    gap: var(--spacing-xs);
`;

const GroupCount = styled.span`
    padding: 4px 10px;
    background: var(--purple-50);
    color: var(--accent-primary);
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 700;
`;

const OnlineBadge = styled.span`
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    background: rgba(34, 197, 94, 0.15);
    color: var(--accent-success);
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 600;
    /* Ensure visibility */
    white-space: nowrap;
    flex-shrink: 0;

    .dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--accent-success);
        animation: ${pulse} 1.5s ease-in-out infinite;
        flex-shrink: 0;
    }

    @media (max-width: 768px) {
        padding: 8px 14px;
        font-size: 0.8rem;
    }
`;

const SubSectionTitle = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    margin-top: var(--spacing-md);
    margin-bottom: var(--spacing-xs);
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    /* Ensure visibility on mobile */
    position: relative;
    z-index: 1;

    @media (max-width: 768px) {
        padding: var(--spacing-md);
        font-size: 0.8rem;
        background: var(--bg-secondary);
        border-radius: var(--radius-md);
        margin: var(--spacing-sm) var(--spacing-sm) var(--spacing-xs);
    }
`;

const OnlineDot = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--accent-success);
    animation: ${pulse} 2s ease-in-out infinite;
    flex-shrink: 0;
`;

const UserItemContainer = styled.div<{ $clickable?: boolean; $offline?: boolean }>`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-lg);
    cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
    opacity: ${({ $offline }) => ($offline ? 0.65 : 1)};
    transition: all var(--transition-fast);
    /* Ensure visibility */
    min-height: 52px;
    /* Touch optimization */
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;

    ${({ $clickable }) =>
        $clickable &&
        css`
            &:hover {
                background: var(--purple-50);
                opacity: 1;
                transform: translateX(4px);
            }

            &:active {
                transform: scale(0.98);
                background: var(--purple-100);
            }
        `}

    @media (max-width: 768px) {
        padding: var(--spacing-md);
        min-height: 56px;
    }
`;

const UserAvatarWrapper = styled.div`
    position: relative;
    flex-shrink: 0;
`;

const UserAvatar = styled.img`
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    object-fit: cover;
    border: 2px solid var(--bg-primary);
    box-shadow: var(--shadow-sm);
`;

const UserAvatarPlaceholder = styled.div<{ $online?: boolean }>`
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    background: ${({ $online }) => $online ? 'var(--gradient-primary)' : 'var(--purple-100)'};
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--bg-primary);
    box-shadow: var(--shadow-sm);

    svg {
        font-size: 1.3rem;
        color: ${({ $online }) => $online ? 'white' : 'var(--accent-primary)'};
    }
`;

const OnlineIndicator = styled.span<{ $isOnline: boolean }>`
    position: absolute;
    right: 0;
    bottom: 0;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${({ $isOnline }) => ($isOnline ? 'var(--accent-success)' : 'var(--text-muted)')};
    border: 2px solid var(--bg-primary);
    ${({ $isOnline }) =>
        $isOnline &&
        css`
            animation: ${pulse} 2s ease-in-out infinite;
        `}
`;

const UserInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
`;

const UserName = styled.span`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const YouBadge = styled.span`
    padding: 2px 6px;
    background: var(--purple-100);
    color: var(--accent-primary);
    border-radius: var(--radius-sm);
    font-size: 0.65rem;
    font-weight: 700;
    text-transform: uppercase;
`;

const UserStatus = styled.span<{ $online?: boolean }>`
    font-size: 0.75rem;
    color: ${({ $online }) => ($online ? 'var(--accent-success)' : 'var(--text-muted)')};
    font-weight: ${({ $online }) => ($online ? '500' : '400')};
`;

const MessageBadge = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: var(--purple-50);
    color: var(--accent-primary);
    opacity: 0;
    transform: scale(0.8);
    transition: all var(--transition-fast);

    svg { font-size: 0.9rem; }

    ${UserItemContainer}:hover & {
        opacity: 1;
        transform: scale(1);
    }
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-xl) var(--spacing-md);
    text-align: center;
    color: var(--text-muted);

    svg {
        font-size: 2rem;
        opacity: 0.5;
    }

    span {
        font-size: 0.85rem;
    }
`;

const ShowMoreButton = styled.button`
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    margin-top: var(--spacing-xs);
    border-radius: var(--radius-md);
    background: transparent;
    border: 1px dashed var(--border-light);
    color: var(--accent-primary);
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
        background: var(--purple-50);
        border-style: solid;
    }
`;

const AddGroupButton = styled.button`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    width: 100%;
    padding: var(--spacing-md);
    border-radius: var(--radius-lg);
    background: linear-gradient(135deg, var(--purple-50) 0%, rgba(124, 58, 237, 0.1) 100%);
    border: 1px dashed var(--purple-200);
    color: var(--accent-primary);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
    margin-bottom: var(--spacing-sm);

    svg { font-size: 1.2rem; }

    &:hover {
        background: var(--purple-100);
        border-style: solid;
        transform: translateY(-2px);
        box-shadow: var(--shadow-md);
    }

    &:active { transform: scale(0.98); }
`;

const SidebarFooter = styled.div`
    padding: var(--spacing-md) var(--spacing-lg);
    border-top: 1px solid var(--border-light);
    background: linear-gradient(180deg, var(--bg-secondary) 0%, var(--bg-tertiary) 100%);
`;

const FooterContent = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
`;

const FooterIcon = styled.div`
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    background: var(--purple-50);
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        font-size: 1.1rem;
        color: var(--accent-primary);
    }
`;

const FooterText = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;

    strong {
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--text-primary);
    }

    span {
        font-size: 0.7rem;
        color: var(--text-muted);
    }
`;

// Skeleton Styles
const SkeletonContainer = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
`;

const SkeletonAvatar = styled.div`
    width: 40px;
    height: 40px;
    border-radius: var(--radius-full);
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s ease-in-out infinite;
`;

const SkeletonContent = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
`;

const SkeletonName = styled.div`
    width: 70%;
    height: 12px;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s ease-in-out infinite;
`;

const SkeletonStatus = styled.div`
    width: 40%;
    height: 10px;
    border-radius: 4px;
    background: linear-gradient(90deg, var(--bg-tertiary) 25%, var(--bg-secondary) 50%, var(--bg-tertiary) 75%);
    background-size: 200% 100%;
    animation: ${shimmer} 1.5s ease-in-out infinite;
    animation-delay: 0.1s;
`;
