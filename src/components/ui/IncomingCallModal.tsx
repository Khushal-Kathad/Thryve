import { useEffect, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import CallIcon from '@mui/icons-material/Call';
import CallEndIcon from '@mui/icons-material/CallEnd';
import VideocamIcon from '@mui/icons-material/Videocam';
import type { Call } from '../../types';

interface IncomingCallModalProps {
    call: Call;
    onAccept: () => void;
    onReject: () => void;
}

const IncomingCallModal = ({ call, onAccept, onReject }: IncomingCallModalProps) => {
    const [timeLeft, setTimeLeft] = useState(60);

    // Auto-reject after 60 seconds
    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    onReject();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [onReject]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onReject();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onReject]);

    return (
        <Overlay>
            <ModalBox>
                <PulseRing />
                <CallerAvatar>
                    <img src={call.callerPhoto} alt={call.callerName} />
                </CallerAvatar>
                <CallerInfo>
                    <CallerName>{call.callerName}</CallerName>
                    <CallType>
                        {call.callType === 'video' ? (
                            <>
                                <VideocamIcon fontSize="small" />
                                Incoming video call
                            </>
                        ) : (
                            <>
                                <CallIcon fontSize="small" />
                                Incoming voice call
                            </>
                        )}
                    </CallType>
                    <Timer>Auto-decline in {timeLeft}s</Timer>
                </CallerInfo>
                <Actions>
                    <RejectButton onClick={onReject} title="Decline">
                        <CallEndIcon />
                    </RejectButton>
                    <AcceptButton onClick={onAccept} title="Accept">
                        {call.callType === 'video' ? <VideocamIcon /> : <CallIcon />}
                    </AcceptButton>
                </Actions>
            </ModalBox>
        </Overlay>
    );
};

const fadeIn = keyframes`
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
`;

const scaleIn = keyframes`
    from {
        opacity: 0;
        transform: scale(0.9);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
`;

const pulse = keyframes`
    0% {
        transform: scale(1);
        opacity: 0.8;
    }
    50% {
        transform: scale(1.3);
        opacity: 0;
    }
    100% {
        transform: scale(1);
        opacity: 0;
    }
`;

const ring = keyframes`
    0%, 100% {
        transform: rotate(-10deg);
    }
    50% {
        transform: rotate(10deg);
    }
`;

const Overlay = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: ${fadeIn} 0.2s ease-out;
`;

const ModalBox = styled.div`
    background: linear-gradient(135deg, rgba(30, 35, 60, 0.98), rgba(20, 25, 45, 0.98));
    backdrop-filter: blur(20px);
    border-radius: 24px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
    padding: 40px;
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: ${scaleIn} 0.3s ease-out;
    position: relative;
    min-width: 320px;
`;

const PulseRing = styled.div`
    position: absolute;
    top: 40px;
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: var(--accent-success);
    animation: ${pulse} 2s infinite;
`;

const CallerAvatar = styled.div`
    width: 100px;
    height: 100px;
    border-radius: 50%;
    overflow: hidden;
    border: 4px solid var(--accent-success);
    box-shadow: 0 8px 32px rgba(59, 165, 92, 0.4);
    position: relative;
    z-index: 1;
    animation: ${ring} 0.5s ease-in-out infinite;

    img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
`;

const CallerInfo = styled.div`
    text-align: center;
    margin-top: 20px;
`;

const CallerName = styled.h2`
    color: var(--text-primary);
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 8px 0;
`;

const CallType = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    color: var(--text-secondary);
    font-size: 1rem;

    svg {
        color: var(--accent-success);
    }
`;

const Timer = styled.div`
    color: var(--text-muted);
    font-size: 0.85rem;
    margin-top: 12px;
`;

const Actions = styled.div`
    display: flex;
    gap: 40px;
    margin-top: 32px;
`;

const ActionButton = styled.button`
    width: 64px;
    height: 64px;
    border-radius: 50%;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    svg {
        font-size: 28px;
        color: white;
    }

    &:hover {
        transform: scale(1.1);
    }

    &:active {
        transform: scale(0.95);
    }
`;

const RejectButton = styled(ActionButton)`
    background: var(--accent-danger);
    box-shadow: 0 8px 24px rgba(233, 69, 96, 0.4);

    &:hover {
        background: #ff5a7a;
        box-shadow: 0 12px 32px rgba(233, 69, 96, 0.5);
    }
`;

const AcceptButton = styled(ActionButton)`
    background: var(--accent-success);
    box-shadow: 0 8px 24px rgba(59, 165, 92, 0.4);

    &:hover {
        background: #4bc46a;
        box-shadow: 0 12px 32px rgba(59, 165, 92, 0.5);
    }
`;

export default IncomingCallModal;
