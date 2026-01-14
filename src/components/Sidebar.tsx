import React, { useState, useEffect } from 'react';
import styled, { keyframes, css } from 'styled-components';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
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

interface SidebarProps {
    isOpen?: boolean;
    onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen = false, onClose }) => {
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const dispatch = useDispatch();
    const { showToast } = useToast();

    // Limit channels query to 50 for faster initial load
    const channelsQuery = query(collection(db, 'rooms'), orderBy('createdAt', 'desc'), limit(50));
    const [channels] = useCollection(channelsQuery);

    const showCreateModal = useSelector(selectShowCreateChannelModal);
    const pendingRoomId = useSelector(selectPendingRoomId);
    const pendingRoomName = useSelector(selectPendingRoomName);

    const [isCreating, setIsCreating] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [showDMs, setShowDMs] = useState(true);
    const [showGroups, setShowGroups] = useState(true);

    // Listen for all users
    useEffect(() => {
        const unsubscribe = userService.listenForUsers((users) => {
            setAllUsers(users);
        });

        return () => unsubscribe();
    }, []);

    // Filter to get other users (not current user) - split by online status
    const otherUsers = allUsers.filter(u => u.uid !== user?.uid);
    const onlineUsers = otherUsers.filter(u => u.isOnline);
    const offlineUsers = otherUsers.filter(u => !u.isOnline);

    // Handle menu option clicks
    const handleMenuClick = (panel: SidebarPanel) => {
        dispatch(setActivePanel(panel));
        onClose?.();
    };

    // Handle new message button click
    const handleNewMessage = () => {
        dispatch(setShowNewMessageModal(true));
        onClose?.();
    };

    // Get DM rooms
    const dmRooms = channels?.docs.filter(doc => doc.data().isDM) || [];
    const publicChannels = channels?.docs.filter(doc => !doc.data().isDM) || [];

    // Handle starting a DM with a user
    const handleStartDM = async (otherUser: AppUser) => {
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
    };

    const handleCreateChannel = async (name: string, password: string | null) => {
        if (!user) return;

        setIsCreating(true);
        try {
            const newRef = doc(collection(db, 'rooms'));
            const channelData: {
                name: string;
                passwordHash: string | null;
                createdAt: ReturnType<typeof Timestamp.fromDate>;
                createdBy: string;
                members: string[];
                memberNames: Record<string, string>;
            } = {
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
    };

    const handlePasswordSubmit = async (password: string) => {
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
    };

    const handlePasswordCancel = () => {
        dispatch(clearPendingRoom());
        setPasswordError('');
    };

    return (
        <>
            {/* Mobile Overlay */}
            <Overlay $isOpen={isOpen} onClick={onClose} />

            <SidebarContainer $isOpen={isOpen}>
                {/* Mobile Close Button */}
                <MobileCloseButton onClick={onClose}>
                    <CloseIcon />
                </MobileCloseButton>

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

                    {/* Direct Messages - First */}
                    <Section>
                        <SectionHeader onClick={() => setShowDMs(!showDMs)}>
                            <SectionHeaderLeft>
                                <ExpandIcon $isExpanded={showDMs}>
                                    <ExpandMoreIcon />
                                </ExpandIcon>
                                <SectionIcon>
                                    <MessageIcon />
                                </SectionIcon>
                                <span>Direct Messages</span>
                            </SectionHeaderLeft>
                            {onlineUsers.length > 0 && (
                                <OnlineBadge>{onlineUsers.length} online</OnlineBadge>
                            )}
                        </SectionHeader>

                        <SectionContent $isExpanded={showDMs}>
                            {/* Current user */}
                            <UserItem>
                                <UserAvatarWrapper>
                                    <UserAvatar src={user?.photoURL || ''} />
                                    <OnlineIndicator $isOnline={true} />
                                </UserAvatarWrapper>
                                <UserInfo>
                                    <UserName>{user?.displayName?.split(' ')[0]} (you)</UserName>
                                    <UserStatus>Online</UserStatus>
                                </UserInfo>
                            </UserItem>

                            {/* Online users section */}
                            {onlineUsers.length > 0 && (
                                <>
                                    <SubSectionTitle>Online Now</SubSectionTitle>
                                    {onlineUsers.map((otherUser) => (
                                        <UserItem
                                            key={otherUser.uid}
                                            onClick={() => handleStartDM(otherUser)}
                                            $clickable
                                        >
                                            <UserAvatarWrapper>
                                                {otherUser.photoURL ? (
                                                    <UserAvatar src={otherUser.photoURL} />
                                                ) : (
                                                    <UserAvatarPlaceholder>
                                                        <PersonIcon />
                                                    </UserAvatarPlaceholder>
                                                )}
                                                <OnlineIndicator $isOnline={true} />
                                            </UserAvatarWrapper>
                                            <UserInfo>
                                                <UserName>{otherUser.displayName}</UserName>
                                                <UserStatus $online>Active now</UserStatus>
                                            </UserInfo>
                                        </UserItem>
                                    ))}
                                </>
                            )}

                            {/* Offline users section */}
                            {offlineUsers.length > 0 && (
                                <>
                                    <SubSectionTitle>Offline</SubSectionTitle>
                                    {offlineUsers.map((otherUser) => (
                                        <UserItem
                                            key={otherUser.uid}
                                            onClick={() => handleStartDM(otherUser)}
                                            $clickable
                                            $offline
                                        >
                                            <UserAvatarWrapper>
                                                {otherUser.photoURL ? (
                                                    <UserAvatar src={otherUser.photoURL} />
                                                ) : (
                                                    <UserAvatarPlaceholder>
                                                        <PersonIcon />
                                                    </UserAvatarPlaceholder>
                                                )}
                                                <OnlineIndicator $isOnline={false} />
                                            </UserAvatarWrapper>
                                            <UserInfo>
                                                <UserName>{otherUser.displayName}</UserName>
                                            </UserInfo>
                                        </UserItem>
                                    ))}
                                </>
                            )}

                            {otherUsers.length === 0 && (
                                <EmptyState>No other users yet</EmptyState>
                            )}
                        </SectionContent>
                    </Section>

                    <Divider />

                    {/* Groups - Second */}
                    <Section>
                        <SectionHeader onClick={() => setShowGroups(!showGroups)}>
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
                            {publicChannels.map((docItem) => (
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
                            ))}
                        </SectionContent>
                    </Section>
                </SidebarContent>

                <SidebarFooter>
                    <FooterContent>
                        <TagIcon />
                        <FooterText>
                            <strong>Free Plan</strong>
                            <span>Unlimited messages</span>
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

export default Sidebar;

// Animations
const slideIn = keyframes`
    from {
        transform: translateX(-100%);
    }
    to {
        transform: translateX(0);
    }
`;

const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
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
const Overlay = styled.div<{ $isOpen: boolean }>`
    display: none;

    @media (max-width: 768px) {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
        z-index: 998;
        opacity: ${({ $isOpen }) => ($isOpen ? 1 : 0)};
        visibility: ${({ $isOpen }) => ($isOpen ? 'visible' : 'hidden')};
        transition: opacity 0.3s ease, visibility 0.3s ease;
    }
`;

const SidebarContainer = styled.aside<{ $isOpen: boolean }>`
    display: flex;
    flex-direction: column;
    width: var(--sidebar-width);
    min-width: var(--sidebar-width);
    height: calc(100vh - var(--header-height));
    margin-top: var(--header-height);
    background: var(--bg-primary);
    border-right: 1px solid var(--border-light);
    position: relative;
    z-index: 10;

    @media (max-width: 768px) {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        width: 85%;
        max-width: 320px;
        height: 100vh;
        margin-top: 0;
        z-index: 999;
        box-shadow: var(--shadow-xl);
        transform: ${({ $isOpen }) => ($isOpen ? 'translateX(0)' : 'translateX(-100%)')};
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
        border-radius: var(--radius-md);
        background: var(--bg-tertiary);
        color: var(--text-secondary);
        z-index: 10;
        transition: all var(--transition-fast);

        &:hover {
            background: var(--accent-primary);
            color: white;
        }

        svg {
            font-size: 1.3rem;
        }
    }
`;

const SidebarHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--border-light);
    background: var(--bg-primary);
`;

const WorkspaceInfo = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
`;

const LogoContainer = styled.div`
    width: 44px;
    height: 44px;
    border-radius: var(--radius-lg);
    background: var(--gradient-primary);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-glow);

    svg {
        font-size: 1.4rem;
        color: white;
    }
`;

const WorkspaceDetails = styled.div`
    display: flex;
    flex-direction: column;
    gap: 2px;
`;

const WorkspaceName = styled.h2`
    font-size: 1.25rem;
    font-weight: 700;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
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
`;

const NewMessageButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--purple-50);
    border: 1px solid var(--purple-100);
    color: var(--accent-primary);
    transition: all var(--transition-fast);

    svg {
        font-size: 1.3rem;
    }

    &:hover {
        background: var(--accent-primary);
        border-color: var(--accent-primary);
        color: white;
        transform: scale(1.05);
        box-shadow: var(--shadow-glow);
    }

    &:active {
        transform: scale(0.95);
    }
`;

const SidebarContent = styled.div`
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    padding: var(--spacing-md) 0;

    /* Custom scrollbar */
    &::-webkit-scrollbar {
        width: 6px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: var(--border-medium);
        border-radius: 3px;
    }

    &::-webkit-scrollbar-thumb:hover {
        background: var(--text-muted);
    }
`;

const MenuSection = styled.div`
    padding: 0 var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
`;

const MenuItem = styled.button`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.95rem;
    font-weight: 500;
    transition: all var(--transition-fast);
    background: transparent;
    border: none;
    cursor: pointer;
    text-align: left;

    &:hover {
        background: var(--purple-50);
        color: var(--accent-primary);
    }

    &:active {
        transform: scale(0.98);
    }
`;

const MenuIcon = styled.span`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;

    svg {
        font-size: 1.2rem;
    }
`;

const Divider = styled.hr`
    border: none;
    height: 1px;
    background: var(--border-light);
    margin: var(--spacing-md) var(--spacing-lg);
`;

const Section = styled.div`
    padding: 0 var(--spacing-md);
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-sm) var(--spacing-sm);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
        background: var(--bg-tertiary);
    }
`;

const SectionHeaderLeft = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-secondary);
    font-size: 0.85rem;
    font-weight: 600;
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
    max-height: ${({ $isExpanded }) => ($isExpanded ? '1000px' : '0')};
    overflow: hidden;
    transition: max-height 0.3s ease;
    padding-top: ${({ $isExpanded }) => ($isExpanded ? 'var(--spacing-sm)' : '0')};
`;

const GroupCount = styled.span`
    padding: 4px 10px;
    background: var(--purple-50);
    color: var(--accent-primary);
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 600;
`;

const OnlineBadge = styled.span`
    padding: 4px 10px;
    background: rgba(34, 197, 94, 0.1);
    color: var(--accent-success);
    border-radius: var(--radius-full);
    font-size: 0.75rem;
    font-weight: 600;
`;

const SubSectionTitle = styled.div`
    padding: var(--spacing-sm) var(--spacing-md);
    margin-top: var(--spacing-sm);
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const UserItem = styled.div<{ $clickable?: boolean; $offline?: boolean }>`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    cursor: ${({ $clickable }) => ($clickable ? 'pointer' : 'default')};
    opacity: ${({ $offline }) => ($offline ? 0.6 : 1)};
    transition: all var(--transition-fast);

    ${({ $clickable }) =>
        $clickable &&
        css`
            &:hover {
                background: var(--purple-50);
                opacity: 1;
            }

            &:active {
                transform: scale(0.98);
            }
        `}
`;

const UserAvatarWrapper = styled.div`
    position: relative;
    flex-shrink: 0;
`;

const UserAvatar = styled.img`
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    object-fit: cover;
    border: 2px solid var(--bg-primary);
    box-shadow: var(--shadow-sm);
`;

const UserAvatarPlaceholder = styled.div`
    width: 36px;
    height: 36px;
    border-radius: var(--radius-full);
    background: var(--purple-100);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--bg-primary);
    box-shadow: var(--shadow-sm);

    svg {
        font-size: 1.2rem;
        color: var(--accent-primary);
    }
`;

const OnlineIndicator = styled.span<{ $isOnline: boolean }>`
    position: absolute;
    right: -2px;
    bottom: -2px;
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
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const UserStatus = styled.span<{ $online?: boolean }>`
    font-size: 0.75rem;
    color: ${({ $online }) => ($online ? 'var(--accent-success)' : 'var(--text-muted)')};
`;

const EmptyState = styled.div`
    padding: var(--spacing-lg) var(--spacing-md);
    text-align: center;
    color: var(--text-muted);
    font-size: 0.85rem;
    font-style: italic;
`;

const AddGroupButton = styled.button`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    width: 100%;
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    background: var(--purple-50);
    border: 1px dashed var(--purple-200);
    color: var(--accent-primary);
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all var(--transition-fast);
    margin-bottom: var(--spacing-sm);

    svg {
        font-size: 1.2rem;
    }

    &:hover {
        background: var(--purple-100);
        border-style: solid;
    }

    &:active {
        transform: scale(0.98);
    }
`;

const SidebarFooter = styled.div`
    padding: var(--spacing-md) var(--spacing-lg);
    border-top: 1px solid var(--border-light);
    background: var(--bg-tertiary);
`;

const FooterContent = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);

    > svg {
        font-size: 1.3rem;
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
        font-size: 0.75rem;
        color: var(--text-muted);
    }
`;
