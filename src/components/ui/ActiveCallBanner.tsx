import styled, { keyframes } from 'styled-components';
import CallIcon from '@mui/icons-material/Call';
import VideocamIcon from '@mui/icons-material/Videocam';
import GroupIcon from '@mui/icons-material/Group';
import CallEndIcon from '@mui/icons-material/CallEnd';
import type { Call } from '../../types';

interface ActiveCallBannerProps {
    call: Call;
    onJoin: () => void;
    onEndCall?: () => void;
    currentUserId?: string;
    isJoining?: boolean;
}

const ActiveCallBanner = ({
    call,
    onJoin,
    onEndCall,
    currentUserId,
    isJoining = false
}: ActiveCallBannerProps) => {
    const participantCount = call.participants?.length || 0;
    const isCallCreator = currentUserId === call.callerId;
    const isAlreadyInCall = call.participants?.some(
        (p) => p.odUserId === currentUserId
    );

    return (
        <BannerContainer>
            <BannerContent>
                <CallIndicator>
                    <PulsingDot />
                    {call.callType === 'video' ? <VideocamIcon /> : <CallIcon />}
                </CallIndicator>
                <CallInfo>
                    <CallTitle>
                        {call.callType === 'video' ? 'Video' : 'Voice'} call in progress
                    </CallTitle>
                    <CallDetails>
                        <GroupIcon fontSize="small" />
                        <span>
                            {participantCount} participant{participantCount !== 1 ? 's' : ''}
                        </span>
                        {call.participants && call.participants.length > 0 && (
                            <ParticipantAvatars>
                                {call.participants.slice(0, 3).map((p, index) => (
                                    <Avatar key={`${p.odUserId}-${index}`} title={p.odUserName}>
                                        <img src={p.photo} alt={p.odUserName} />
                                    </Avatar>
                                ))}
                                {call.participants.length > 3 && (
                                    <MoreCount>+{call.participants.length - 3}</MoreCount>
                                )}
                            </ParticipantAvatars>
                        )}
                    </CallDetails>
                </CallInfo>
                <ButtonGroup>
                    {isAlreadyInCall ? (
                        <InCallBadge>In Call</InCallBadge>
                    ) : (
                        <JoinButton onClick={onJoin} disabled={isJoining}>
                            {isJoining ? 'Joining...' : 'Join Call'}
                        </JoinButton>
                    )}
                    {isCallCreator && onEndCall && (
                        <EndCallButton onClick={onEndCall} title="End call for everyone">
                            <CallEndIcon />
                        </EndCallButton>
                    )}
                </ButtonGroup>
            </BannerContent>
        </BannerContainer>
    );
};

const pulse = keyframes`
    0%, 100% {
        transform: scale(1);
        opacity: 1;
    }
    50% {
        transform: scale(1.2);
        opacity: 0.7;
    }
`;

const BannerContainer = styled.div`
    background: linear-gradient(135deg, rgba(59, 165, 92, 0.15), rgba(59, 165, 92, 0.05));
    border-bottom: 1px solid rgba(59, 165, 92, 0.3);
    padding: 12px 20px;
`;

const BannerContent = styled.div`
    display: flex;
    align-items: center;
    gap: 16px;
    max-width: 1200px;
    margin: 0 auto;
`;

const CallIndicator = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--accent-success);

    svg {
        font-size: 1.3rem;
    }
`;

const PulsingDot = styled.div`
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent-success);
    animation: ${pulse} 1.5s ease-in-out infinite;
`;

const CallInfo = styled.div`
    flex: 1;
`;

const CallTitle = styled.h4`
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--text-primary);
    margin: 0 0 4px 0;
`;

const CallDetails = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 0.85rem;
    color: var(--text-muted);

    svg {
        font-size: 1rem;
    }
`;

const ParticipantAvatars = styled.div`
    display: flex;
    align-items: center;
    margin-left: 8px;
`;

const Avatar = styled.div`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    overflow: hidden;
    border: 2px solid var(--bg-chat);
    margin-left: -8px;

    &:first-child {
        margin-left: 0;
    }

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const MoreCount = styled.div`
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: var(--glass-bg);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-left: -8px;
    border: 2px solid var(--bg-chat);
`;

const ButtonGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
`;

const JoinButton = styled.button<{ disabled?: boolean }>`
    padding: 10px 20px;
    border-radius: var(--radius-md);
    background: var(--accent-success);
    color: white;
    font-weight: 600;
    font-size: 0.9rem;
    transition: all var(--transition-fast);
    cursor: ${(props) => (props.disabled ? 'not-allowed' : 'pointer')};
    opacity: ${(props) => (props.disabled ? 0.7 : 1)};

    &:hover:not(:disabled) {
        background: #4bc46a;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 165, 92, 0.3);
    }

    &:active:not(:disabled) {
        transform: translateY(0);
    }
`;

const InCallBadge = styled.div`
    padding: 10px 20px;
    border-radius: var(--radius-md);
    background: rgba(59, 165, 92, 0.15);
    color: var(--accent-success);
    font-weight: 600;
    font-size: 0.9rem;
    border: 1px solid rgba(59, 165, 92, 0.3);
`;

const EndCallButton = styled.button`
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: var(--accent-danger);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all var(--transition-fast);
    cursor: pointer;

    svg {
        font-size: 1.2rem;
    }

    &:hover {
        background: #ff5a7a;
        transform: scale(1.05);
        box-shadow: 0 4px 12px rgba(233, 69, 96, 0.3);
    }

    &:active {
        transform: scale(0.95);
    }
`;

export default ActiveCallBanner;
