import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import TagIcon from '@mui/icons-material/Tag';
import { useDispatch } from 'react-redux';
import { setShowNewMessageModal, enterRoom, addVerifiedRoom } from '../../features/appSlice';
import { userService, AppUser } from '../../services/userService';
import { useCollection } from 'react-firebase-hooks/firestore';
import { collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { getAuth } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';

interface NewMessageModalProps {
    isOpen: boolean;
}

const NewMessageModal: React.FC<NewMessageModalProps> = ({ isOpen }) => {
    const dispatch = useDispatch();
    const auth = getAuth();
    const [user] = useAuthState(auth);
    const [searchQuery, setSearchQuery] = useState('');
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [activeTab, setActiveTab] = useState<'users' | 'channels'>('users');

    const [channels] = useCollection(collection(db, 'rooms'));

    useEffect(() => {
        const unsubscribe = userService.listenForUsers((users) => {
            setAllUsers(users);
        });
        return () => unsubscribe();
    }, []);

    if (!isOpen) return null;

    const otherUsers = allUsers.filter((u) => u.uid !== user?.uid);
    const publicChannels = channels?.docs.filter((doc) => !doc.data().isDM) || [];

    const filteredUsers = otherUsers.filter((u) =>
        u.displayName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const filteredChannels = publicChannels.filter((doc) =>
        doc.data().name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelectUser = async (otherUser: AppUser) => {
        if (!user) return;

        const dmRoomId = await userService.getOrCreateDMRoom(
            user.uid,
            otherUser.uid,
            user.displayName || 'You',
            otherUser.displayName
        );

        dispatch(addVerifiedRoom({ roomId: dmRoomId }));
        dispatch(enterRoom({ roomId: dmRoomId }));
        dispatch(setShowNewMessageModal(false));
    };

    const handleSelectChannel = (channelId: string) => {
        dispatch(addVerifiedRoom({ roomId: channelId }));
        dispatch(enterRoom({ roomId: channelId }));
        dispatch(setShowNewMessageModal(false));
    };

    const handleClose = () => {
        dispatch(setShowNewMessageModal(false));
        setSearchQuery('');
    };

    return (
        <Overlay onClick={handleClose}>
            <ModalContainer onClick={(e) => e.stopPropagation()}>
                <Header>
                    <Title>New Message</Title>
                    <CloseButton onClick={handleClose}>
                        <CloseIcon />
                    </CloseButton>
                </Header>

                <SearchContainer>
                    <SearchIcon />
                    <SearchInput
                        type="text"
                        placeholder="Search users or channels..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        autoFocus
                    />
                </SearchContainer>

                <TabsContainer>
                    <Tab $active={activeTab === 'users'} onClick={() => setActiveTab('users')}>
                        <PersonIcon />
                        Users ({filteredUsers.length})
                    </Tab>
                    <Tab $active={activeTab === 'channels'} onClick={() => setActiveTab('channels')}>
                        <TagIcon />
                        Channels ({filteredChannels.length})
                    </Tab>
                </TabsContainer>

                <ListContainer>
                    {activeTab === 'users' ? (
                        filteredUsers.length > 0 ? (
                            filteredUsers.map((u) => (
                                <ListItem key={u.uid} onClick={() => handleSelectUser(u)}>
                                    {u.photoURL ? (
                                        <Avatar src={u.photoURL} />
                                    ) : (
                                        <AvatarPlaceholder>
                                            <PersonIcon />
                                        </AvatarPlaceholder>
                                    )}
                                    <ItemInfo>
                                        <ItemName>{u.displayName}</ItemName>
                                        <ItemStatus $online={u.isOnline}>
                                            {u.isOnline ? 'Online' : 'Offline'}
                                        </ItemStatus>
                                    </ItemInfo>
                                    <OnlineIndicator $online={u.isOnline} />
                                </ListItem>
                            ))
                        ) : (
                            <EmptyState>No users found</EmptyState>
                        )
                    ) : filteredChannels.length > 0 ? (
                        filteredChannels.map((doc) => (
                            <ListItem key={doc.id} onClick={() => handleSelectChannel(doc.id)}>
                                <ChannelIcon>
                                    <TagIcon />
                                </ChannelIcon>
                                <ItemInfo>
                                    <ItemName>{doc.data().name}</ItemName>
                                    <ItemStatus>
                                        {doc.data().passwordHash ? 'Private' : 'Public'} channel
                                    </ItemStatus>
                                </ItemInfo>
                            </ListItem>
                        ))
                    ) : (
                        <EmptyState>No channels found</EmptyState>
                    )}
                </ListContainer>
            </ModalContainer>
        </Overlay>
    );
};

export default NewMessageModal;

const Overlay = styled.div`
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding-top: 10vh;
    z-index: 1000;
`;

const ModalContainer = styled.div`
    width: 100%;
    max-width: 500px;
    background: var(--bg-secondary);
    border-radius: var(--radius-lg);
    border: 1px solid var(--glass-border);
    box-shadow: var(--shadow-lg);
    overflow: hidden;
`;

const Header = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-lg);
    border-bottom: 1px solid var(--glass-border);
`;

const Title = styled.h2`
    font-size: 1.2rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0;
`;

const CloseButton = styled.button`
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-xs);
    border-radius: var(--radius-sm);
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
    padding: var(--spacing-md);
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

const TabsContainer = styled.div`
    display: flex;
    border-bottom: 1px solid var(--glass-border);
`;

const Tab = styled.button<{ $active: boolean }>`
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spacing-xs);
    padding: var(--spacing-md);
    font-size: 0.85rem;
    color: ${(props) => (props.$active ? 'var(--accent-primary)' : 'var(--text-muted)')};
    border-bottom: 2px solid ${(props) => (props.$active ? 'var(--accent-primary)' : 'transparent')};
    transition: all var(--transition-fast);

    svg {
        font-size: 1rem;
    }

    &:hover {
        background: var(--glass-bg-hover);
    }
`;

const ListContainer = styled.div`
    max-height: 400px;
    overflow-y: auto;
    padding: var(--spacing-sm);
`;

const ListItem = styled.div`
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    padding: var(--spacing-md);
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);

    &:hover {
        background: var(--glass-bg-hover);
    }
`;

const Avatar = styled.img`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    object-fit: cover;
`;

const AvatarPlaceholder = styled.div`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--glass-bg);
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        color: var(--text-muted);
    }
`;

const ChannelIcon = styled.div`
    width: 40px;
    height: 40px;
    border-radius: var(--radius-md);
    background: var(--glass-bg);
    display: flex;
    align-items: center;
    justify-content: center;

    svg {
        color: var(--accent-primary);
    }
`;

const ItemInfo = styled.div`
    flex: 1;
`;

const ItemName = styled.div`
    font-size: 0.95rem;
    font-weight: 500;
    color: var(--text-primary);
`;

const ItemStatus = styled.div<{ $online?: boolean }>`
    font-size: 0.8rem;
    color: ${(props) => (props.$online ? 'var(--accent-success)' : 'var(--text-muted)')};
`;

const OnlineIndicator = styled.div<{ $online: boolean }>`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: ${(props) => (props.$online ? 'var(--accent-success)' : 'var(--text-muted)')};
`;

const EmptyState = styled.div`
    text-align: center;
    padding: var(--spacing-xl);
    color: var(--text-muted);
    font-size: 0.9rem;
`;
