import styled from 'styled-components';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import CallEndIcon from '@mui/icons-material/CallEnd';
import MinimizeIcon from '@mui/icons-material/Minimize';
import LogoutIcon from '@mui/icons-material/Logout';

interface CallControlsProps {
    isMuted: boolean;
    isVideoEnabled: boolean;
    isVideoCall: boolean;
    isGroupCall?: boolean;
    isCallCreator?: boolean;
    onToggleMute: () => void;
    onToggleVideo: () => void;
    onEndCall: () => void;
    onEndForEveryone?: () => void;
    onMinimize: () => void;
}

const CallControls = ({
    isMuted,
    isVideoEnabled,
    isVideoCall,
    isGroupCall = false,
    isCallCreator = false,
    onToggleMute,
    onToggleVideo,
    onEndCall,
    onEndForEveryone,
    onMinimize,
}: CallControlsProps) => {
    return (
        <ControlsContainer>
            <ControlsWrapper>
                <ControlButton
                    onClick={onToggleMute}
                    $active={!isMuted}
                    title={isMuted ? 'Unmute' : 'Mute'}
                >
                    {isMuted ? <MicOffIcon /> : <MicIcon />}
                </ControlButton>

                {isVideoCall && (
                    <ControlButton
                        onClick={onToggleVideo}
                        $active={isVideoEnabled}
                        title={isVideoEnabled ? 'Turn off camera' : 'Turn on camera'}
                    >
                        {isVideoEnabled ? <VideocamIcon /> : <VideocamOffIcon />}
                    </ControlButton>
                )}

                {isGroupCall ? (
                    <>
                        {/* Leave call button - for everyone in group calls */}
                        <LeaveCallButton onClick={onEndCall} title="Leave call">
                            <LogoutIcon />
                        </LeaveCallButton>

                        {/* End for everyone - only for call creator */}
                        {isCallCreator && onEndForEveryone && (
                            <EndCallButton onClick={onEndForEveryone} title="End call for everyone">
                                <CallEndIcon />
                            </EndCallButton>
                        )}
                    </>
                ) : (
                    <EndCallButton onClick={onEndCall} title="End call">
                        <CallEndIcon />
                    </EndCallButton>
                )}

                <ControlButton onClick={onMinimize} $active={true} title="Minimize">
                    <MinimizeIcon />
                </ControlButton>
            </ControlsWrapper>
        </ControlsContainer>
    );
};

const ControlsContainer = styled.div`
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 24px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
`;

const ControlsWrapper = styled.div`
    display: flex;
    justify-content: center;
    gap: 20px;
`;

const ControlButton = styled.button<{ $active: boolean }>`
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    background: ${(props) =>
        props.$active ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)'};

    svg {
        font-size: 24px;
        color: ${(props) => (props.$active ? 'white' : 'rgba(255, 255, 255, 0.5)')};
    }

    &:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(1.05);
    }

    &:active {
        transform: scale(0.95);
    }
`;

const LeaveCallButton = styled.button`
    width: 56px;
    height: 56px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.15);
    transition: all 0.2s ease;

    svg {
        font-size: 24px;
        color: white;
    }

    &:hover {
        background: rgba(255, 193, 7, 0.3);
        transform: scale(1.05);
    }

    &:active {
        transform: scale(0.95);
    }
`;

const EndCallButton = styled.button`
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--accent-danger);
    box-shadow: 0 8px 24px rgba(233, 69, 96, 0.4);
    transition: all 0.2s ease;

    svg {
        font-size: 28px;
        color: white;
    }

    &:hover {
        background: #ff5a7a;
        box-shadow: 0 12px 32px rgba(233, 69, 96, 0.5);
        transform: scale(1.05);
    }

    &:active {
        transform: scale(0.95);
    }
`;

export default CallControls;
