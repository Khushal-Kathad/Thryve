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

const Sidebar: React.FC = () => {
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
    const [showAllUsers, setShowAllUsers] = useState(true);

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
    };

    // Handle new message button click
    const handleNewMessage = () => {
        dispatch(setShowNewMessageModal(true));
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
                otherUser.displayName
            );

            dispatch(addVerifiedRoom({ roomId: dmRoomId }));
            dispatch(enterRoom({ roomId: dmRoomId }));
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
            <SidebarContainer>
                <SidebarHeader>
                    <WorkspaceInfo>
                        <WorkspaceName>Thryve</WorkspaceName>
                        <WorkspaceStatus>
                            <FiberManualRecordIcon />
                            <span>{user?.displayName || 'User'}</span>
                        </WorkspaceStatus>
                    </WorkspaceInfo>
                    <NewMessageButton title="New Message" onClick={handleNewMessage}>
                        <AddIcon />
                    </NewMessageButton>
                </SidebarHeader>

                <SidebarContent>
                    <MenuSection>
                        <SidebarOption Icon={ChatBubbleOutlineIcon} title="Threads" onClick={() => handleMenuClick('threads')} />
                        <SidebarOption Icon={AlternateEmailIcon} title="Mentions" onClick={() => handleMenuClick('mentions')} />
                        <SidebarOption Icon={BookmarkBorderIcon} title="Saved" onClick={() => handleMenuClick('saved')} />
                        <SidebarOption Icon={PeopleOutlineIcon} title="People" onClick={() => handleMenuClick('people')} />
                        <SidebarOption Icon={SettingsIcon} title="Settings" onClick={() => handleMenuClick('settings')} />
                    </MenuSection>

                    <Divider />

                    {/* Direct Messages - First */}
                    <DirectMessages>
                        <SectionHeader onClick={() => setShowAllUsers(!showAllUsers)}>
                            <ExpandMoreIcon style={{ transform: showAllUsers ? 'rotate(0deg)' : 'rotate(-90deg)' }} />
                            <span>Direct Messages</span>
                            {onlineUsers.length > 0 && <OnlineBadge>{onlineUsers.length} online</OnlineBadge>}
                        </SectionHeader>

                        {showAllUsers && (
                            <OnlineUsers>
                                {/* Current user */}
                                <OnlineUser>
                                    <UserAvatar src={user?.photoURL || ''} />
                                    <OnlineIndicator $isOnline={true} />
                                    <span>{user?.displayName?.split(' ')[0]} (you)</span>
                                </OnlineUser>

                                {/* Online users section */}
                                {onlineUsers.length > 0 && (
                                    <>
                                        <OnlineSection>
                                            <OnlineSectionTitle>Online Now</OnlineSectionTitle>
                                        </OnlineSection>
                                        {onlineUsers.map((otherUser) => (
                                            <OnlineUser
                                                key={otherUser.uid}
                                                onClick={() => handleStartDM(otherUser)}
                                                title={`Start conversation with ${otherUser.displayName}`}
                                            >
                                                {otherUser.photoURL ? (
                                                    <UserAvatar src={otherUser.photoURL} />
                                                ) : (
                                                    <UserAvatarPlaceholder>
                                                        <PersonIcon />
                                                    </UserAvatarPlaceholder>
                                                )}
                                                <OnlineIndicator $isOnline={true} />
                                                <UserName>{otherUser.displayName}</UserName>
                                                <OnlineText>online</OnlineText>
                                            </OnlineUser>
                                        ))}
                                    </>
                                )}

                                {/* Offline users section */}
                                {offlineUsers.length > 0 && (
                                    <>
                                        <OnlineSection>
                                            <OnlineSectionTitle>Offline</OnlineSectionTitle>
                                        </OnlineSection>
                                        {offlineUsers.map((otherUser) => (
                                            <OnlineUser
                                                key={otherUser.uid}
                                                onClick={() => handleStartDM(otherUser)}
                                                title={`Start conversation with ${otherUser.displayName}`}
                                                $isOffline
                                            >
                                                {otherUser.photoURL ? (
                                                    <UserAvatar src={otherUser.photoURL} />
                                                ) : (
                                                    <UserAvatarPlaceholder>
                                                        <PersonIcon />
                                                    </UserAvatarPlaceholder>
                                                )}
                                                <OnlineIndicator $isOnline={false} />
                                                <UserName>{otherUser.displayName}</UserName>
                                            </OnlineUser>
                                        ))}
                                    </>
                                )}

                                {otherUsers.length === 0 && (
                                    <NoUsersText>No other users yet</NoUsersText>
                                )}
                            </OnlineUsers>
                        )}
                    </DirectMessages>

                    <Divider />

                    {/* Groups - Second */}
                    <GroupSection>
                        <SectionHeader>
                            <ExpandMoreIcon />
                            <span>Groups</span>
                            <GroupCount>{publicChannels.length}</GroupCount>
                        </SectionHeader>

                        <GroupList>
                            <SidebarOption
                                Icon={AddIcon}
                                addChannelOption
                                title="Add Group"
                            />
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
                        </GroupList>
                    </GroupSection>
                </SidebarContent>

                <SidebarFooter>
                    <FooterText>
                        <TagIcon />
                        <span>Free Plan</span>
                    </FooterText>
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
        opacity: 0;
        transform: translateX(-20px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
`;

const pulse = keyframes`
    0%, 100% {
        box-shadow: 0 0 0 0 rgba(59, 165, 92, 0.4);
    }
    50% {
        box-shadow: 0 0 0 3px rgba(59, 165, 92, 0);
    }
`;

// Styled Components
const SidebarContainer = styled.aside`
    display: flex;
    flex-direction: column;
    width: var(--sidebar-width);
    min-width: var(--sidebar-width);
    height: calc(100vh - var(--header-height));
    margin-top: var(--header-height);
    background: var(--gradient-sidebar);
    border-right: 1px solid var(--glass-border);
    animation: ${slideIn} 0.3s ease-out;
`;

const SidebarHeader = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--glass-border);
`;

const WorkspaceInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: var(--spacing-xs);
`;

const WorkspaceName = styled.h2`
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-primary);
    background: var(--gradient-accent);
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

    svg {
        font-size: 0.6rem;
        color: var(--accent-success);
    }
`;

const NewMessageButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    color: var(--text-secondary);
    transition: all var(--transition-fast);

    svg {
        font-size: 1.2rem;
    }

    &:hover {
        background: var(--accent-primary);
        border-color: var(--accent-primary);
        color: white;
        box-shadow: var(--shadow-glow);
    }
`;

const SidebarContent = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-md) 0;
`;

const MenuSection = styled.div`
    padding: 0 var(--spacing-sm);
`;

const Divider = styled.hr`
    border: none;
    height: 1px;
    background: var(--glass-border);
    margin: var(--spacing-md) var(--spacing-lg);
`;

const GroupSection = styled.div`
    padding: 0 var(--spacing-sm);
`;

const SectionHeader = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    cursor: pointer;
    transition: color var(--transition-fast);

    svg {
        font-size: 1rem;
        transition: transform var(--transition-fast);
    }

    &:hover {
        color: var(--text-secondary);
    }
`;

const GroupCount = styled.span`
    margin-left: auto;
    padding: 2px 8px;
    background: var(--glass-bg);
    border-radius: var(--radius-full);
    font-size: 0.7rem;
`;

const OnlineBadge = styled.span`
    margin-left: auto;
    padding: 2px 8px;
    background: rgba(59, 165, 92, 0.15);
    color: var(--accent-success);
    border-radius: var(--radius-full);
    font-size: 0.7rem;
    font-weight: 500;
`;

const GroupList = styled.div`
    display: flex;
    flex-direction: column;
`;

const DirectMessages = styled.div`
    padding: 0 var(--spacing-sm);
`;

const OnlineUsers = styled.div`
    padding: var(--spacing-sm) 0;
`;

const OnlineSection = styled.div`
    padding: var(--spacing-xs) var(--spacing-md);
    margin-top: var(--spacing-sm);
`;

const OnlineSectionTitle = styled.span`
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
`;

const OnlineUser = styled.div<{ $isOffline?: boolean }>`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-sm) var(--spacing-md);
    border-radius: var(--radius-md);
    color: var(--text-secondary);
    font-size: 0.9rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;
    opacity: ${({ $isOffline }) => $isOffline ? 0.6 : 1};

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
        opacity: 1;
    }
`;

const UserAvatar = styled.img`
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    object-fit: cover;
`;

const OnlineIndicator = styled.span<{ $isOnline: boolean }>`
    position: absolute;
    left: 32px;
    bottom: 8px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${({ $isOnline }) => $isOnline ? 'var(--accent-success)' : 'var(--text-muted)'};
    border: 2px solid var(--bg-primary);
    ${({ $isOnline }) => $isOnline && css`animation: ${pulse} 2s ease-in-out infinite;`}
`;

const UserAvatarPlaceholder = styled.div`
    width: 24px;
    height: 24px;
    border-radius: var(--radius-full);
    background: var(--glass-bg);
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        font-size: 16px;
        color: var(--text-muted);
    }
`;

const UserName = styled.span`
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
`;

const OnlineText = styled.span`
    font-size: 0.7rem;
    color: var(--accent-success);
    margin-left: auto;
`;

const NoUsersText = styled.div`
    padding: var(--spacing-sm) var(--spacing-md);
    color: var(--text-muted);
    font-size: 0.85rem;
    font-style: italic;
`;

const SidebarFooter = styled.div`
    padding: var(--spacing-md) var(--spacing-lg);
    border-top: 1px solid var(--glass-border);
`;

const FooterText = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    color: var(--text-muted);
    font-size: 0.8rem;

    svg {
        font-size: 1rem;
        color: var(--accent-primary);
    }
`;
