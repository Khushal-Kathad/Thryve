import React from 'react';
import TagIcon from '@mui/icons-material/Tag';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import PeopleOutlineIcon from '@mui/icons-material/PeopleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import PersonIcon from '@mui/icons-material/Person';
import SearchIcon from '@mui/icons-material/Search';
import {
    ChatHeaderContainer,
    HeaderLeft,
    HeaderRight,
    HeaderActions,
    Separator,
    DMUserAvatar,
    OnlineIndicator,
    DMUserInfo,
    DMUserName,
    DMUserStatus,
    ChannelIcon,
    ChannelInfo,
    ChannelName,
    ChannelDescription,
    ActionButton,
    MembersButton,
    DeleteButton,
} from './Chat.styles';

interface OtherUserInfo {
    odUserId: string;
    name: string;
    odPhoto: string;
}

interface DMChatHeaderProps {
    type: 'dm';
    otherUser: OtherUserInfo;
    otherUserOnline: boolean;
    showSearch: boolean;
    isInCall: boolean;
    isStartingCall: boolean;
    onSearchToggle: () => void;
    onStartCall: (type: 'audio' | 'video') => void;
}

interface GroupChatHeaderProps {
    type: 'group';
    roomName: string;
    messageCount: number;
    showSearch: boolean;
    isStarred: boolean;
    showMembersPanel: boolean;
    isInCall: boolean;
    isStartingCall: boolean;
    isChannelCreator: boolean;
    onSearchToggle: () => void;
    onToggleStar: () => void;
    onStartCall: (type: 'audio' | 'video') => void;
    onToggleMembers: () => void;
    onDeleteChannel: () => void;
}

type ChatHeaderProps = DMChatHeaderProps | GroupChatHeaderProps;

const ChatHeader: React.FC<ChatHeaderProps> = (props) => {
    if (props.type === 'dm') {
        const {
            otherUser,
            otherUserOnline,
            showSearch,
            isInCall,
            isStartingCall,
            onSearchToggle,
            onStartCall,
        } = props;

        return (
            <ChatHeaderContainer>
                <HeaderLeft>
                    <DMUserAvatar>
                        {otherUser.odPhoto ? (
                            <img src={otherUser.odPhoto} alt={otherUser.name} />
                        ) : (
                            <PersonIcon />
                        )}
                        <OnlineIndicator $isOnline={otherUserOnline} />
                    </DMUserAvatar>
                    <DMUserInfo>
                        <DMUserName>{otherUser.name}</DMUserName>
                        <DMUserStatus $online={otherUserOnline}>
                            {otherUserOnline ? 'Online' : 'Offline'}
                        </DMUserStatus>
                    </DMUserInfo>
                </HeaderLeft>
                <HeaderRight>
                    <ActionButton
                        onClick={onSearchToggle}
                        $active={showSearch}
                        title="Search messages"
                    >
                        <SearchIcon />
                    </ActionButton>
                    <ActionButton
                        title="Voice Call"
                        onClick={() => onStartCall('audio')}
                        disabled={isInCall || isStartingCall}
                    >
                        <CallIcon />
                    </ActionButton>
                    <ActionButton
                        title="Video Call"
                        onClick={() => onStartCall('video')}
                        disabled={isInCall || isStartingCall}
                    >
                        <VideocamIcon />
                    </ActionButton>
                    <ActionButton title="Info">
                        <InfoOutlinedIcon />
                    </ActionButton>
                </HeaderRight>
            </ChatHeaderContainer>
        );
    }

    // Group Chat Header
    const {
        roomName,
        messageCount,
        showSearch,
        isStarred,
        showMembersPanel,
        isInCall,
        isStartingCall,
        isChannelCreator,
        onSearchToggle,
        onToggleStar,
        onStartCall,
        onToggleMembers,
        onDeleteChannel,
    } = props;

    return (
        <ChatHeaderContainer>
            <HeaderLeft>
                <ChannelIcon>
                    <TagIcon />
                </ChannelIcon>
                <ChannelInfo>
                    <ChannelName>{roomName}</ChannelName>
                    <ChannelDescription>
                        {messageCount} messages
                    </ChannelDescription>
                </ChannelInfo>
            </HeaderLeft>
            <HeaderRight>
                <HeaderActions>
                    <ActionButton
                        onClick={onSearchToggle}
                        $active={showSearch}
                        title="Search messages"
                    >
                        <SearchIcon />
                    </ActionButton>
                    <ActionButton
                        onClick={onToggleStar}
                        $active={isStarred}
                        title={isStarred ? 'Unstar' : 'Star channel'}
                    >
                        {isStarred ? <StarIcon /> : <StarBorderIcon />}
                    </ActionButton>
                    <ActionButton
                        title="Voice Call"
                        onClick={() => onStartCall('audio')}
                        disabled={isInCall || isStartingCall}
                    >
                        <CallIcon />
                    </ActionButton>
                    <ActionButton
                        title="Video Call"
                        onClick={() => onStartCall('video')}
                        disabled={isInCall || isStartingCall}
                    >
                        <VideocamIcon />
                    </ActionButton>
                </HeaderActions>
                <Separator />
                <MembersButton
                    title="Members"
                    onClick={onToggleMembers}
                    $active={showMembersPanel}
                >
                    <PeopleOutlineIcon />
                    <span className="button-text">Members</span>
                </MembersButton>
                <ActionButton title="Details">
                    <InfoOutlinedIcon />
                </ActionButton>
                {isChannelCreator && (
                    <DeleteButton
                        title="Delete Channel"
                        onClick={onDeleteChannel}
                    >
                        <DeleteOutlineIcon />
                    </DeleteButton>
                )}
            </HeaderRight>
        </ChatHeaderContainer>
    );
};

export default ChatHeader;
