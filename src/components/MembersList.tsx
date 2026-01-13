import { useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import PersonIcon from '@mui/icons-material/Person';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import type { DocumentData, QuerySnapshot } from 'firebase/firestore';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { userService, AppUser } from '../services/userService';
import { useToast } from '../context/ToastContext';

interface MembersListProps {
    roomMessages: QuerySnapshot<DocumentData> | undefined;
    currentUserId: string;
    currentUserName: string;
    currentUserPhoto: string;
    onClose: () => void;
    onStartCall: (
        receiverId: string,
        receiverName: string,
        receiverPhoto: string,
        callType: 'audio' | 'video'
    ) => void;
    isInCall: boolean;
    roomId?: string;
    channelName?: string;
    isPrivateChannel?: boolean;
    channelMembers?: string[];
    channelCreatorId?: string;
}

interface MemberInfo {
    odUserId: string;
    name: string;
    photo: string;
    messageCount: number;
}

const MembersList = ({
    roomMessages,
    currentUserId,
    currentUserName,
    currentUserPhoto,
    onClose,
    onStartCall,
    isInCall,
    roomId,
    channelName = 'this channel',
    isPrivateChannel,
    channelMembers = [],
    channelCreatorId,
}: MembersListProps) => {
    const { showToast } = useToast();
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [showAddMember, setShowAddMember] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const isCreator = currentUserId === channelCreatorId;

    // Listen for all users
    useEffect(() => {
        const unsubscribe = userService.listenForUsers((users) => {
            setAllUsers(users);
        });
        return () => unsubscribe();
    }, []);

    // Get users not in channel (for adding)
    const nonMembers = useMemo(() => {
        return allUsers.filter(u => !channelMembers.includes(u.uid) && u.uid !== currentUserId);
    }, [allUsers, channelMembers, currentUserId]);

    // Add member to this specific channel only
    const handleAddMember = async (userId: string, userName: string) => {
        // Validate roomId exists and is a real channel ID
        if (!roomId || roomId === 'null' || isUpdating) {
            console.error('Invalid roomId:', roomId);
            return;
        }

        setIsUpdating(true);
        try {
            // Update ONLY this specific channel document
            const roomRef = doc(db, 'rooms', roomId);
            console.log(`Adding member ${userName} (${userId}) to channel ${roomId}`);

            await updateDoc(roomRef, {
                members: arrayUnion(userId),
                [`memberNames.${userId}`]: userName,
            });

            showToast(`Added ${userName} to #${channelName}. They can now access without password.`, 'success');
            setShowAddMember(false);
        } catch (error) {
            console.error('Error adding member to channel:', roomId, error);
            showToast('Failed to add member', 'error');
        } finally {
            setIsUpdating(false);
        }
    };

    // Extract unique members from messages
    const members = useMemo(() => {
        const memberMap = new Map<string, MemberInfo>();

        // Add current user first
        memberMap.set(currentUserId, {
            odUserId: currentUserId,
            name: currentUserName + ' (You)',
            photo: currentUserPhoto,
            messageCount: 0,
        });

        // Always use actual member list from channel
        if (channelMembers.length > 0) {
            channelMembers.forEach(memberId => {
                if (memberId !== currentUserId) {
                    const user = allUsers.find(u => u.uid === memberId);
                    if (user) {
                        memberMap.set(memberId, {
                            odUserId: memberId,
                            name: user.displayName,
                            photo: user.photoURL || '',
                            messageCount: 0,
                        });
                    }
                }
            });
        }

        // Extract members from messages
        if (roomMessages) {
            roomMessages.docs.forEach((docItem) => {
                const data = docItem.data();
                const odUserId = data.userId || data.users; // userId or username as fallback
                const name = data.users;
                const photo = data.userImage;

                if (odUserId && name && !memberMap.has(odUserId)) {
                    memberMap.set(odUserId, {
                        odUserId,
                        name,
                        photo: photo || '',
                        messageCount: 0,
                    });
                }

                // Count messages
                const existing = memberMap.get(odUserId);
                if (existing) {
                    existing.messageCount++;
                }
            });
        }

        // Sort: current user first, then by message count
        return Array.from(memberMap.values()).sort((a, b) => {
            if (a.odUserId === currentUserId) return -1;
            if (b.odUserId === currentUserId) return 1;
            return b.messageCount - a.messageCount;
        });
    }, [roomMessages, currentUserId, currentUserName, currentUserPhoto, channelMembers, allUsers]);

    return (
        <Container>
            <Header>
                <Title>
                    <PersonIcon />
                    Members ({members.length})
                </Title>
                <HeaderActions>
                    {isCreator && (
                        <AddMemberButton
                            onClick={() => setShowAddMember(!showAddMember)}
                            title="Add member"
                            $active={showAddMember}
                        >
                            <PersonAddIcon />
                        </AddMemberButton>
                    )}
                    <CloseButton onClick={onClose}>
                        <CloseIcon />
                    </CloseButton>
                </HeaderActions>
            </Header>

            {/* Add Member Panel - adds to THIS channel only */}
            {showAddMember && isCreator && (
                <AddMemberPanel>
                    <AddMemberTitle>Add Members to #{channelName}</AddMemberTitle>
                    <AddMemberSubtitle>Members can access this channel without password</AddMemberSubtitle>
                    {nonMembers.length > 0 ? (
                        <AddMemberList>
                            {nonMembers.map(user => (
                                <AddMemberItem
                                    key={user.uid}
                                    onClick={() => handleAddMember(user.uid, user.displayName)}
                                >
                                    {user.photoURL ? (
                                        <AddMemberAvatar src={user.photoURL} />
                                    ) : (
                                        <AddMemberAvatarPlaceholder>
                                            <PersonIcon />
                                        </AddMemberAvatarPlaceholder>
                                    )}
                                    <span>{user.displayName}</span>
                                    <PersonAddIcon />
                                </AddMemberItem>
                            ))}
                        </AddMemberList>
                    ) : (
                        <NoMembersText>All users are already members</NoMembersText>
                    )}
                </AddMemberPanel>
            )}

            <MembersContainer>
                {members.map((member) => {
                    const isCurrentUser = member.odUserId === currentUserId;
                    const isMemberCreator = member.odUserId === channelCreatorId;

                    return (
                        <MemberItem key={member.odUserId}>
                            <MemberAvatar>
                                {member.photo ? (
                                    <img src={member.photo} alt={member.name} />
                                ) : (
                                    <PersonIcon />
                                )}
                                <OnlineIndicator />
                            </MemberAvatar>
                            <MemberInfoContainer>
                                <MemberName>
                                    {member.name}
                                    {isMemberCreator && <CreatorBadge>Creator</CreatorBadge>}
                                </MemberName>
                                <MemberStatus>
                                    {member.messageCount} message{member.messageCount !== 1 ? 's' : ''}
                                </MemberStatus>
                            </MemberInfoContainer>
                            {!isCurrentUser && (
                                <CallActions>
                                    <CallButton
                                        title="Voice Call"
                                        onClick={() =>
                                            onStartCall(
                                                member.odUserId,
                                                member.name,
                                                member.photo,
                                                'audio'
                                            )
                                        }
                                        disabled={isInCall}
                                    >
                                        <CallIcon />
                                    </CallButton>
                                    <CallButton
                                        title="Video Call"
                                        onClick={() =>
                                            onStartCall(
                                                member.odUserId,
                                                member.name,
                                                member.photo,
                                                'video'
                                            )
                                        }
                                        disabled={isInCall}
                                    >
                                        <VideocamIcon />
                                    </CallButton>
                                </CallActions>
                            )}
                        </MemberItem>
                    );
                })}
            </MembersContainer>

            <Footer>
                <FooterText>
                    {isCreator ? 'You can add members to this channel' : 'Click on a member to start a direct call'}
                </FooterText>
            </Footer>
        </Container>
    );
};

const Container = styled.div`
    width: 280px;
    height: 100%;
    background: var(--bg-secondary);
    border-left: 1px solid var(--glass-border);
    display: flex;
    flex-direction: column;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px;
    border-bottom: 1px solid var(--glass-border);
`;

const HeaderActions = styled.div`
    display: flex;
    align-items: center;
    gap: 4px;
`;

const Title = styled.h3`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;

    svg {
        font-size: 1.2rem;
        color: var(--text-muted);
    }
`;

const CloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
    }
`;

const AddMemberButton = styled.button<{ $active?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: var(--radius-sm);
    color: ${props => props.$active ? 'var(--accent-primary)' : 'var(--text-muted)'};
    background: ${props => props.$active ? 'var(--glass-bg-hover)' : 'transparent'};
    transition: all var(--transition-fast);

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--accent-primary);
    }
`;

const AddMemberPanel = styled.div`
    border-bottom: 1px solid var(--glass-border);
    padding: 12px;
    background: var(--glass-bg);
`;

const AddMemberTitle = styled.h4`
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px 0;
`;

const AddMemberSubtitle = styled.p`
    font-size: 0.75rem;
    color: var(--text-muted);
    margin: 0 0 12px 0;
`;

const AddMemberList = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    max-height: 200px;
    overflow-y: auto;
`;

const AddMemberItem = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    color: var(--text-secondary);

    span {
        flex: 1;
        font-size: 0.85rem;
    }

    svg {
        font-size: 1rem;
        color: var(--accent-success);
        opacity: 0;
        transition: opacity var(--transition-fast);
    }

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);

        svg {
            opacity: 1;
        }
    }
`;

const AddMemberAvatar = styled.img`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
`;

const AddMemberAvatarPlaceholder = styled.div`
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--glass-bg);
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        font-size: 1rem !important;
        color: var(--text-muted) !important;
        opacity: 1 !important;
    }
`;

const NoMembersText = styled.div`
    font-size: 0.85rem;
    color: var(--text-muted);
    text-align: center;
    padding: 16px 0;
`;

const MembersContainer = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: 8px;
`;

const MemberItem = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: var(--radius-md);
    transition: all var(--transition-fast);

    &:hover {
        background: var(--glass-bg-hover);
    }
`;

const MemberAvatar = styled.div`
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    overflow: hidden;
    background: var(--glass-bg);
    display: flex;
    align-items: center;
    justify-content: center;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }

    svg {
        font-size: 1.5rem;
        color: var(--text-muted);
    }
`;

const OnlineIndicator = styled.div`
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent-success);
    border: 2px solid var(--bg-secondary);
`;

const MemberInfoContainer = styled.div`
    flex: 1;
    min-width: 0;
`;

const MemberName = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const CreatorBadge = styled.span`
    font-size: 0.65rem;
    font-weight: 600;
    color: var(--accent-primary);
    background: rgba(108, 92, 231, 0.15);
    padding: 2px 6px;
    border-radius: var(--radius-full);
    text-transform: uppercase;
    letter-spacing: 0.3px;
`;

const MemberStatus = styled.div`
    font-size: 0.75rem;
    color: var(--text-muted);
`;

const CallActions = styled.div`
    display: flex;
    gap: 4px;
    opacity: 0;
    transition: opacity var(--transition-fast);

    ${MemberItem}:hover & {
        opacity: 1;
    }
`;

const CallButton = styled.button<{ disabled?: boolean }>`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 6px;
    border-radius: var(--radius-sm);
    color: var(--text-muted);
    transition: all var(--transition-fast);
    cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
    opacity: ${(props) => (props.disabled ? 0.5 : 1)};

    svg {
        font-size: 1.1rem;
    }

    &:hover:not(:disabled) {
        background: rgba(59, 165, 92, 0.1);
        color: var(--accent-success);
    }
`;

const Footer = styled.div`
    padding: 12px 16px;
    border-top: 1px solid var(--glass-border);
`;

const FooterText = styled.p`
    font-size: 0.75rem;
    color: var(--text-muted);
    text-align: center;
    margin: 0;
`;

export default MembersList;
