import React, { useState, useMemo, useCallback, memo, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import AddIcon from '@mui/icons-material/Add';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import GroupsIcon from '@mui/icons-material/Groups';
import ChatIcon from '@mui/icons-material/Chat';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';
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
import { useDebounce } from '../hooks/useDebounce';

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

// Skeleton Loading Component
const ChannelSkeleton = memo(() => (
    <SkeletonContainer>
        <SkeletonAvatar />
        <SkeletonContent>
            <SkeletonName />
            <SkeletonStatus />
        </SkeletonContent>
    </SkeletonContainer>
));

ChannelSkeleton.displayName = 'ChannelSkeleton';

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const dispatch = useDispatch();
    const { showToast } = useToast();

    // State
    const [showChats, setShowChats] = useState(true);
    const [showGroups, setShowGroups] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [isCollapsed, setIsCollapsed] = useState(() => {
        const saved = localStorage.getItem('sidebarCollapsed');
        return saved === 'true';
    });

    // Save collapsed state to localStorage
    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(isCollapsed));
    }, [isCollapsed]);

    const toggleCollapsed = useCallback(() => {
        setIsCollapsed(prev => !prev);
    }, []);

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

    // Debounce search query for better performance
    const debouncedSearchQuery = useDebounce(searchQuery, 200);

    // Memoized channel lists - separate DMs and Groups
    // IMPORTANT: Only show DMs where current user is a member (privacy fix)
    const { dmChannels, groupChannels, filteredDMs, filteredGroups } = useMemo(() => {
        const allDMs = channels?.docs.filter(doc => {
            const data = doc.data();
            // Only show DMs where current user is a member
            return data.isDM === true && data.members?.includes(user?.uid);
        }) || [];
        const allGroups = channels?.docs.filter(doc => !doc.data().isDM) || [];
        const searchLower = debouncedSearchQuery.toLowerCase().trim();

        const filteredDMsList = searchLower
            ? allDMs.filter(doc => {
                const data = doc.data();
                const name = data.name || '';
                const memberNames = data.memberNames ? Object.values(data.memberNames).join(' ') : '';
                return name.toLowerCase().includes(searchLower) || memberNames.toLowerCase().includes(searchLower);
            })
            : allDMs;

        const filteredGroupsList = searchLower
            ? allGroups.filter(doc => doc.data().name.toLowerCase().includes(searchLower))
            : allGroups;

        return {
            dmChannels: allDMs,
            groupChannels: allGroups,
            filteredDMs: filteredDMsList,
            filteredGroups: filteredGroupsList,
        };
    }, [channels, debouncedSearchQuery, user?.uid]);

    // Memoized handlers
    const handleMenuClick = useCallback((panel: SidebarPanel) => {
        dispatch(setActivePanel(panel));
        onClose?.();
    }, [dispatch, onClose]);

    const handleNewMessage = useCallback(() => {
        dispatch(setShowNewMessageModal(true));
        onClose?.();
    }, [dispatch, onClose]);

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

    const toggleChats = useCallback(() => setShowChats(prev => !prev), []);
    const toggleGroups = useCallback(() => setShowGroups(prev => !prev), []);

    // Get display info for DM (show the other person's name and photo)
    const getDMUserInfo = useCallback((roomData: any) => {
        if (!user) return { name: roomData.name || 'Chat', photo: null, odUserId: null };
        const memberNames = roomData.memberNames || {};
        const memberPhotos = roomData.memberPhotos || {};
        const members = roomData.members || [];

        const otherUserId = members.find((id: string) => id !== user.uid);
        const otherMemberName = otherUserId ? memberNames[otherUserId] : null;
        const otherMemberPhoto = otherUserId ? memberPhotos[otherUserId] : null;

        return {
            name: otherMemberName || roomData.name || 'Chat',
            photo: otherMemberPhoto || null,
            odUserId: otherUserId || null
        };
    }, [user]);

    // Get initials from name
    const getInitials = (name: string) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <>
            <Overlay $isOpen={isOpen} onClick={onClose} />

            <SidebarContainer $isOpen={isOpen} $isCollapsed={isCollapsed}>
                <MobileCloseButton onClick={onClose} aria-label="Close sidebar">
                    <CloseIcon />
                </MobileCloseButton>

                {/* Collapse Toggle Button - Desktop Only */}
                <CollapseToggle onClick={toggleCollapsed} $isCollapsed={isCollapsed} title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
                    {isCollapsed ? <KeyboardDoubleArrowRightIcon /> : <KeyboardDoubleArrowLeftIcon />}
                </CollapseToggle>

                {/* Header */}
                <SidebarHeader $isCollapsed={isCollapsed}>
                    <WorkspaceInfo>
                        <LogoContainer>
                            <ChatBubbleOutlineIcon />
                        </LogoContainer>
                        {!isCollapsed && (
                            <WorkspaceDetails>
                                <WorkspaceName>Thryve</WorkspaceName>
                                <WorkspaceStatus>
                                    <StatusDot />
                                    <span>{user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'You'}</span>
                                </WorkspaceStatus>
                            </WorkspaceDetails>
                        )}
                    </WorkspaceInfo>
                    {!isCollapsed && (
                        <NewMessageButton title="New Message" onClick={handleNewMessage}>
                            <AddIcon />
                        </NewMessageButton>
                    )}
                </SidebarHeader>

                <SidebarContent $isCollapsed={isCollapsed}>
                    {/* Search - Hide when collapsed */}
                    {!isCollapsed && (
                        <SearchContainer>
                            <SearchIcon />
                            <SearchInput
                                type="text"
                                placeholder="Search chats & groups..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            {searchQuery && (
                                <ClearSearchButton onClick={() => setSearchQuery('')}>
                                    <CloseIcon />
                                </ClearSearchButton>
                            )}
                        </SearchContainer>
                    )}

                    {/* Collapsed View - Icon buttons only */}
                    {isCollapsed ? (
                        <CollapsedMenu>
                            <CollapsedMenuItem onClick={handleNewMessage} title="New Chat">
                                <ChatIcon />
                            </CollapsedMenuItem>
                            <CollapsedMenuItem onClick={() => dispatch(setShowCreateChannelModal(true))} title="Create Group">
                                <GroupsIcon />
                            </CollapsedMenuItem>
                            <CollapsedDivider />
                            <CollapsedMenuItem onClick={() => handleMenuClick('saved')} title="Saved">
                                <BookmarkBorderIcon />
                            </CollapsedMenuItem>
                            <CollapsedMenuItem onClick={() => handleMenuClick('people')} title="People">
                                <PeopleOutlineIcon />
                            </CollapsedMenuItem>
                            <CollapsedMenuItem onClick={() => handleMenuClick('settings')} title="Settings">
                                <SettingsIcon />
                            </CollapsedMenuItem>
                        </CollapsedMenu>
                    ) : (
                        <>
                            {/* Chats Section */}
                            <Section>
                                <SectionHeader onClick={toggleChats}>
                                    <SectionHeaderLeft>
                                        <ExpandIcon $isExpanded={showChats}>
                                            <ExpandMoreIcon />
                                        </ExpandIcon>
                                        <SectionIcon>
                                            <ChatIcon />
                                        </SectionIcon>
                                        <span>Chats</span>
                                    </SectionHeaderLeft>
                                    <SectionBadge>{dmChannels.length}</SectionBadge>
                                </SectionHeader>

                                <SectionContent $isExpanded={showChats}>
                                    <AddButton onClick={handleNewMessage}>
                                        <AddIcon />
                                        <span>New Chat</span>
                                    </AddButton>

                                    {channelsLoading ? (
                                        <>
                                            <ChannelSkeleton />
                                            <ChannelSkeleton />
                                        </>
                                    ) : filteredDMs.length > 0 ? (
                                        filteredDMs.map((docItem) => {
                                            const userInfo = getDMUserInfo(docItem.data());
                                            return (
                                                <ChatItem
                                                    key={docItem.id}
                                                    onClick={() => {
                                                        dispatch(enterRoom({ roomId: docItem.id }));
                                                        onClose?.();
                                                    }}
                                                >
                                                    {userInfo.photo ? (
                                                        <ChatAvatarImg src={userInfo.photo} alt={userInfo.name} />
                                                    ) : (
                                                        <ChatAvatar>
                                                            {getInitials(userInfo.name)}
                                                        </ChatAvatar>
                                                    )}
                                                    <ChatInfo>
                                                        <ChatName>{userInfo.name}</ChatName>
                                                        <ChatPreview>Tap to continue conversation</ChatPreview>
                                                    </ChatInfo>
                                                </ChatItem>
                                            );
                                        })
                                    ) : (
                                        <EmptyState>
                                            <ChatIcon />
                                            <span>No chats yet. Start a new conversation!</span>
                                        </EmptyState>
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
                                    <SectionBadge>{groupChannels.length}</SectionBadge>
                                </SectionHeader>

                                <SectionContent $isExpanded={showGroups}>
                                    <AddButton onClick={() => dispatch(setShowCreateChannelModal(true))}>
                                        <AddIcon />
                                        <span>Create New Group</span>
                                    </AddButton>

                                    {channelsLoading ? (
                                        <>
                                            <ChannelSkeleton />
                                            <ChannelSkeleton />
                                        </>
                                    ) : filteredGroups.length > 0 ? (
                                        filteredGroups.map((docItem) => (
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
                                    ) : (
                                        <EmptyState>
                                            <GroupsIcon />
                                            <span>No groups yet. Create one!</span>
                                        </EmptyState>
                                    )}
                                </SectionContent>
                            </Section>

                            <Divider />

                            {/* Quick Menu */}
                            <QuickMenu>
                                <QuickMenuItem onClick={() => handleMenuClick('saved')}>
                                    <QuickMenuIcon><BookmarkBorderIcon /></QuickMenuIcon>
                                    <span>Saved</span>
                                </QuickMenuItem>
                                <QuickMenuItem onClick={() => handleMenuClick('people')}>
                                    <QuickMenuIcon><PeopleOutlineIcon /></QuickMenuIcon>
                                    <span>People</span>
                                </QuickMenuItem>
                                <QuickMenuItem onClick={() => handleMenuClick('settings')}>
                                    <QuickMenuIcon><SettingsIcon /></QuickMenuIcon>
                                    <span>Settings</span>
                                </QuickMenuItem>
                            </QuickMenu>
                        </>
                    )}
                </SidebarContent>

                {/* Footer */}
                <SidebarFooter $isCollapsed={isCollapsed}>
                    <FooterText>{isCollapsed ? '💞' : 'Made with 💞'}</FooterText>
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
        background: rgba(15, 15, 26, 0.8);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        z-index: 998;
        opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
        visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
        transition: opacity 0.3s ease-out, visibility 0.3s ease-out;
        transform: translateZ(0);
        will-change: opacity;
        touch-action: none;
    }
`;

const SidebarContainer = styled.aside<{ $isOpen: boolean; $isCollapsed: boolean }>`
    display: flex;
    flex-direction: column;
    width: ${({ $isCollapsed }) => $isCollapsed ? '72px' : 'var(--sidebar-width)'};
    min-width: ${({ $isCollapsed }) => $isCollapsed ? '72px' : 'var(--sidebar-width)'};
    height: calc(100vh - var(--header-height));
    height: calc(100dvh - var(--header-height));
    margin-top: var(--header-height);
    background: var(--glass-bg-strong);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-right: 1px solid var(--glass-border);
    box-shadow: 4px 0 30px rgba(139, 92, 246, 0.1);
    position: relative;
    z-index: 10;
    overflow: hidden;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.3s cubic-bezier(0.4, 0, 0.2, 1);

    @media (min-width: 1024px) {
        height: calc(100vh - 70px);
        height: calc(100dvh - 70px);
        margin-top: 70px;
        width: ${({ $isCollapsed }) => $isCollapsed ? '80px' : '320px'};
        min-width: ${({ $isCollapsed }) => $isCollapsed ? '80px' : '320px'};
    }

    @media (min-width: 1280px) {
        width: ${({ $isCollapsed }) => $isCollapsed ? '80px' : '340px'};
        min-width: ${({ $isCollapsed }) => $isCollapsed ? '80px' : '340px'};
    }

    @media (max-width: 768px) {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 85%;
        max-width: 340px;
        min-width: auto;
        height: 100vh;
        height: 100dvh;
        height: -webkit-fill-available;
        margin-top: 0;
        z-index: 999;
        box-shadow: ${({ $isOpen }) => ($isOpen ? '8px 0 50px rgba(139, 92, 246, 0.3)' : 'none')};
        transform: ${({ $isOpen }) => ($isOpen ? 'translate3d(0, 0, 0)' : 'translate3d(-100%, 0, 0)')};
        transition: transform 0.3s cubic-bezier(0.32, 0.72, 0, 1);
        will-change: transform;
        backface-visibility: hidden;
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
        background: var(--glass-bg);
        backdrop-filter: blur(10px);
        color: var(--text-secondary);
        border: 1px solid var(--glass-border);
        z-index: 10;
        transition: all var(--transition-fast);

        &:hover {
            background: linear-gradient(135deg, #F43F5E 0%, #EC4899 100%);
            color: white;
            transform: rotate(90deg);
            border-color: transparent;
            box-shadow: 0 0 20px rgba(244, 63, 94, 0.4);
        }

        svg { font-size: 1.3rem; }
    }
`;

const CollapseToggle = styled.button<{ $isCollapsed: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    top: 50%;
    right: -14px;
    transform: translateY(-50%);
    width: 28px;
    height: 28px;
    border-radius: var(--radius-full);
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
    color: white;
    border: 2px solid var(--bg-primary);
    z-index: 20;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);

    svg {
        font-size: 1rem;
        transition: transform 0.3s ease;
    }

    &:hover {
        transform: translateY(-50%) scale(1.1);
        box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
    }

    &:active {
        transform: translateY(-50%) scale(0.95);
    }

    @media (max-width: 768px) {
        display: none;
    }
`;

const CollapsedMenu = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 8px 6px;
`;

const CollapsedMenuItem = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: var(--radius-lg);
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    color: var(--text-secondary);
    border: 1px solid var(--glass-border);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    svg {
        font-size: 1.3rem;
        position: relative;
        z-index: 1;
        transition: all 0.3s ease;
    }

    &:hover {
        border-color: var(--accent-primary);
        box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
        transform: scale(1.05);

        &::before {
            opacity: 1;
        }

        svg {
            color: var(--accent-primary);
        }
    }

    &:active {
        transform: scale(0.95);
    }
`;

const CollapsedDivider = styled.div`
    width: 32px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--border-light), transparent);
    margin: 4px 0;
`;

const SidebarHeader = styled.div<{ $isCollapsed?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: ${({ $isCollapsed }) => $isCollapsed ? 'center' : 'space-between'};
    padding: ${({ $isCollapsed }) => $isCollapsed ? '14px 8px' : '14px 16px'};
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
    border-bottom: none;
    margin: ${({ $isCollapsed }) => $isCollapsed ? '10px 6px' : '10px'};
    border-radius: var(--radius-xl);
    box-shadow: 0 8px 32px rgba(139, 92, 246, 0.4);
    position: relative;
    overflow: hidden;
    transition: all 0.3s ease;

    &::before {
        content: '';
        position: absolute;
        top: -50%;
        left: -50%;
        width: 200%;
        height: 200%;
        background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
        animation: ${shimmer} 3s linear infinite;
    }
`;

const WorkspaceInfo = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
`;

const LogoContainer = styled.div`
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(255, 255, 255, 0.3);

    svg {
        font-size: 1.2rem;
        color: white;
    }
`;

const WorkspaceDetails = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const WorkspaceName = styled.h2`
    font-size: 1.1rem;
    font-weight: 700;
    color: white;
    letter-spacing: -0.3px;
`;

const WorkspaceStatus = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.8rem;
    color: rgba(255, 255, 255, 0.85);
`;

const StatusDot = styled.span`
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #00FF88;
    box-shadow: 0 0 8px #00FF88;
    animation: ${pulse} 2s ease-in-out infinite;
`;

const NewMessageButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
    transition: all var(--transition-fast);

    svg { font-size: 1.1rem; }

    &:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: rotate(90deg);
    }

    &:active { transform: scale(0.95); }
`;

const SidebarContent = styled.div<{ $isCollapsed?: boolean }>`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: ${({ $isCollapsed }) => $isCollapsed ? '4px 0' : '4px 0'};
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

const SearchContainer = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 6px 10px 10px;
    padding: 10px 14px;
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border-radius: var(--radius-xl);
    border: 1px solid var(--glass-border);
    transition: all 0.3s ease;

    &:focus-within {
        border-color: var(--accent-primary);
        box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
        background: var(--glass-bg-strong);
    }

    svg {
        font-size: 1.1rem;
        color: var(--accent-primary);
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
    margin: 6px 12px;
`;

const Section = styled.div`
    padding: 0 8px;
    position: relative;
    z-index: 1;
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: all var(--transition-fast);
    min-height: 32px;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    user-select: none;

    &:hover { background: var(--bg-tertiary); }

    &:active {
        background: var(--purple-50);
        transform: scale(0.99);
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
    padding-top: ${({ $isExpanded }) => ($isExpanded ? '4px' : '0')};
    overflow: visible;
`;

const SectionBadge = styled.span`
    padding: 2px 8px;
    background: var(--purple-50);
    color: var(--accent-primary);
    border-radius: var(--radius-full);
    font-size: 0.7rem;
    font-weight: 700;
`;

const AddButton = styled.button`
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 8px;
    background: linear-gradient(135deg, var(--purple-50) 0%, rgba(124, 58, 237, 0.1) 100%);
    border: 1px dashed var(--purple-200);
    color: var(--accent-primary);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all var(--transition-fast);
    margin-bottom: 4px;

    svg { font-size: 1rem; }

    &:hover {
        background: var(--purple-100);
        border-style: solid;
    }

    &:active { transform: scale(0.98); }
`;

const ChatItem = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    margin: 4px 0;
    border-radius: var(--radius-xl);
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    border: 1px solid var(--glass-border);
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    &:hover {
        transform: translateX(6px) scale(1.02);
        border-color: var(--accent-primary);
        box-shadow: 0 8px 32px rgba(139, 92, 246, 0.25);

        &::before {
            opacity: 1;
        }
    }

    &:active {
        transform: scale(0.98);
    }
`;

const ChatAvatar = styled.div`
    width: 42px;
    height: 42px;
    border-radius: var(--radius-full);
    background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    font-size: 0.85rem;
    font-weight: 700;
    color: white;
    text-transform: uppercase;
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
    position: relative;
    z-index: 1;
`;

const ChatAvatarImg = styled.img`
    width: 42px;
    height: 42px;
    border-radius: var(--radius-full);
    object-fit: cover;
    flex-shrink: 0;
    border: 2px solid rgba(139, 92, 246, 0.3);
    box-shadow: 0 4px 15px rgba(139, 92, 246, 0.3);
    position: relative;
    z-index: 1;
`;

const ChatInfo = styled.div`
    flex: 1;
    min-width: 0;
    position: relative;
    z-index: 1;
`;

const ChatName = styled.div`
    font-size: 0.9rem;
    font-weight: 600;
    background: linear-gradient(135deg, #A78BFA 0%, #F472B6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
`;

const ChatPreview = styled.div`
    font-size: 0.75rem;
    color: var(--text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
    margin-top: 2px;
`;

const EmptyState = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    text-align: center;
    color: var(--text-muted);

    svg {
        font-size: 1.5rem;
        opacity: 0.5;
    }

    span {
        font-size: 0.75rem;
    }
`;

const QuickMenu = styled.div`
    display: flex;
    gap: 8px;
    padding: 0 10px;
    margin-bottom: 8px;
`;

const QuickMenuItem = styled.button`
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 10px 8px;
    border-radius: var(--radius-lg);
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    color: var(--text-secondary);
    font-size: 0.7rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: 1px solid var(--glass-border);
    position: relative;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
        opacity: 0;
        transition: opacity 0.3s ease;
    }

    &:hover {
        border-color: var(--accent-primary);
        box-shadow: 0 8px 24px rgba(139, 92, 246, 0.3);
        transform: translateY(-2px);

        &::before {
            opacity: 1;
        }
    }

    &:active {
        transform: scale(0.95);
    }
`;

const QuickMenuIcon = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background: linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(236, 72, 153, 0.2) 100%);
    color: var(--accent-primary);
    transition: all 0.3s ease;
    position: relative;
    z-index: 1;

    svg { font-size: 1.1rem; }

    ${QuickMenuItem}:hover & {
        background: linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%);
        color: white;
        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.4);
    }
`;

const SidebarFooter = styled.div<{ $isCollapsed?: boolean }>`
    padding: ${({ $isCollapsed }) => $isCollapsed ? '12px 6px' : '12px'};
    border-top: 1px solid var(--glass-border);
    background: var(--glass-bg);
    backdrop-filter: blur(10px);
    display: flex;
    justify-content: center;
    transition: padding 0.3s ease;
`;

const FooterText = styled.span`
    font-size: 0.8rem;
    font-weight: 600;
    background: linear-gradient(135deg, #EC4899 0%, #F43F5E 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    display: flex;
    align-items: center;
    gap: 6px;
    animation: pulse 2s ease-in-out infinite;
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
