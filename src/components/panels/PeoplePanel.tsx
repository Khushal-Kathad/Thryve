import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import ChatIcon from '@mui/icons-material/Chat';
import { useDispatch } from 'react-redux';
import { setActivePanel, enterRoom, addVerifiedRoom } from '../../features/appSlice';
import { userService, AppUser } from '../../services/userService';
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';

interface PeoplePanelProps {
    onStartCall?: (userId: string, userName: string, userPhoto: string, callType: 'audio' | 'video') => void;
}

const PeoplePanel: React.FC<PeoplePanelProps> = ({ onStartCall }) => {
    const dispatch = useDispatch();
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const unsubscribe = userService.listenForUsers((users) => {
            setAllUsers(users);
        });
        return () => unsubscribe();
    }, []);

    const filteredUsers = allUsers.filter((u) =>
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const onlineUsers = filteredUsers.filter((u) => u.isOnline);
    const offlineUsers = filteredUsers.filter((u) => !u.isOnline);

    const handleStartDM = async (otherUser: AppUser) => {
        if (!user) return;

        const dmRoomId = await userService.getOrCreateDMRoom(
            user.uid,
            otherUser.uid,
            user.displayName || 'You',
            otherUser.displayName
        );

        dispatch(addVerifiedRoom({ roomId: dmRoomId }));
        dispatch(enterRoom({ roomId: dmRoomId }));
        dispatch(setActivePanel('none'));
    };

    const handleClose = () => {
        dispatch(setActivePanel('none'));
    };

    return (
        <Container>
            <Header>
                <Title>
                    <PersonIcon />
                    People
                </Title>
                <CloseButton onClick={handleClose}>
                    <CloseIcon />
                </CloseButton>
            </Header>

            <SearchContainer>
                <SearchIcon />
                <SearchInput
                    type="text"
                    placeholder="Search people..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </SearchContainer>

            <Stats>
                <StatItem>
                    <StatValue>{onlineUsers.length}</StatValue>
                    <StatLabel>Online</StatLabel>
                </StatItem>
                <StatItem>
                    <StatValue>{allUsers.length}</StatValue>
                    <StatLabel>Total</StatLabel>
                </StatItem>
            </Stats>

            <UsersList>
                {onlineUsers.length > 0 && (
                    <>
                        <SectionTitle>Online - {onlineUsers.length}</SectionTitle>
                        {onlineUsers.map((u) => (
                            <UserItem key={u.uid}>
                                <UserAvatar>
                                    {u.photoURL ? (
                                        <img src={u.photoURL} alt={u.displayName} />
                                    ) : (
                                        <PersonIcon />
                                    )}
                                    <OnlineIndicator $online={true} />
                                </UserAvatar>
                                <UserInfo>
                                    <UserName>
                                        {u.displayName}
                                        {u.uid === user?.uid && <YouBadge>you</YouBadge>}
                                    </UserName>
                                    <UserEmail>{u.email}</UserEmail>
                                </UserInfo>
                                {u.uid !== user?.uid && (
                                    <UserActions>
                                        <ActionButton title="Message" onClick={() => handleStartDM(u)}>
                                            <ChatIcon />
                                        </ActionButton>
                                        {onStartCall && (
                                            <>
                                                <ActionButton
                                                    title="Voice Call"
                                                    onClick={() => onStartCall(u.uid, u.displayName, u.photoURL, 'audio')}
                                                >
                                                    <CallIcon />
                                                </ActionButton>
                                                <ActionButton
                                                    title="Video Call"
                                                    onClick={() => onStartCall(u.uid, u.displayName, u.photoURL, 'video')}
                                                >
                                                    <VideocamIcon />
                                                </ActionButton>
                                            </>
                                        )}
                                    </UserActions>
                                )}
                            </UserItem>
                        ))}
                    </>
                )}

                {offlineUsers.length > 0 && (
                    <>
                        <SectionTitle>Offline - {offlineUsers.length}</SectionTitle>
                        {offlineUsers.map((u) => (
                            <UserItem key={u.uid} $offline>
                                <UserAvatar>
                                    {u.photoURL ? (
                                        <img src={u.photoURL} alt={u.displayName} />
                                    ) : (
                                        <PersonIcon />
                                    )}
                                    <OnlineIndicator $online={false} />
                                </UserAvatar>
                                <UserInfo>
                                    <UserName>{u.displayName}</UserName>
                                    <UserEmail>
                                        Last seen {new Date(u.lastSeen).toLocaleDateString()}
                                    </UserEmail>
                                </UserInfo>
                                {u.uid !== user?.uid && (
                                    <UserActions>
                                        <ActionButton title="Message" onClick={() => handleStartDM(u)}>
                                            <ChatIcon />
                                        </ActionButton>
                                    </UserActions>
                                )}
                            </UserItem>
                        ))}
                    </>
                )}

                {filteredUsers.length === 0 && (
                    <EmptyState>No users found</EmptyState>
                )}
            </UsersList>
        </Container>
    );
};

export default PeoplePanel;

const Container = styled.div`
    flex: 1;
    display: flex;
    flex-direction: column;
    height: calc(100vh - var(--header-height));
    margin-top: var(--header-height);
    background: var(--bg-chat);
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--glass-border);
    background: var(--glass-bg);
`;

const Title = styled.h2`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;

    svg {
        color: var(--accent-primary);
    }
`;

const CloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    &:hover {
        background: var(--glass-bg-hover);
        color: var(--text-primary);
    }
`;

const SearchContainer = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: var(--spacing-md) var(--spacing-lg);
    border-bottom: 1px solid var(--glass-border);

    svg {
        color: var(--text-muted);
    }
`;

const SearchInput = styled.input`
    flex: 1;
    font-size: 0.95rem;
    color: var(--text-primary);

    &::placeholder {
        color: var(--text-muted);
    }
`;

const Stats = styled.div`
    display: flex;
    gap: var(--spacing-lg);
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--glass-border);
`;

const StatItem = styled.div`
    text-align: center;
`;

const StatValue = styled.div`
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--accent-primary);
`;

const StatLabel = styled.div`
    font-size: 0.8rem;
    color: var(--text-muted);
`;

const UsersList = styled.div`
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-md);
`;

const SectionTitle = styled.div`
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    padding: var(--spacing-sm) var(--spacing-md);
    margin-top: var(--spacing-md);

    &:first-child {
        margin-top: 0;
    }
`;

const UserItem = styled.div<{ $offline?: boolean }>`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    opacity: ${(props) => (props.$offline ? 0.7 : 1)};
    transition: all var(--transition-fast);

    &:hover {
        background: var(--glass-bg-hover);
    }
`;

const UserAvatar = styled.div`
    position: relative;
    width: 44px;
    height: 44px;
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

    > svg {
        font-size: 1.5rem;
        color: var(--text-muted);
    }
`;

const OnlineIndicator = styled.div<{ $online: boolean }>`
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${(props) => (props.$online ? 'var(--accent-success)' : 'var(--text-muted)')};
    border: 2px solid var(--bg-chat);
`;

const UserInfo = styled.div`
    flex: 1;
    min-width: 0;
`;

const UserName = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-primary);
`;

const YouBadge = styled.span`
    font-size: 0.7rem;
    font-weight: 400;
    color: var(--text-muted);
    background: var(--glass-bg);
    padding: 2px 6px;
    border-radius: var(--radius-full);
`;

const UserEmail = styled.div`
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
`;

const UserActions = styled.div`
    display: flex;
    gap: var(--spacing-xs);
    opacity: 0;
    transition: opacity var(--transition-fast);

    ${UserItem}:hover & {
        opacity: 1;
    }
`;

const ActionButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-sm);
    border-radius: var(--radius-md);
    color: var(--text-muted);
    transition: all var(--transition-fast);

    svg {
        font-size: 1.1rem;
    }

    &:hover {
        background: var(--glass-bg);
        color: var(--accent-primary);
    }
`;

const EmptyState = styled.div`
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-muted);
`;
