import React, { useEffect } from 'react';
import './App.css';
import Header from './components/Header';
import styled, { keyframes } from 'styled-components';
import Sidebar from './components/Sidebar';
import Chat from './components/Chat';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import Login from './components/Login';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { ToastProvider, useToast } from './context/ToastContext';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { syncService } from './services/syncService';
import { offlineService } from './services/offlineService';
import { useDispatch, useSelector } from 'react-redux';
import { setPendingCount, selectActivePanel, selectShowNewMessageModal } from './features/appSlice';
import { callService } from './services/callService';
import { userService } from './services/userService';
import {
    setIncomingCall,
    setCurrentCall,
    selectCurrentCall,
    selectIncomingCall,
    selectIsInCall,
    endCall,
} from './features/callSlice';
import VideoCall from './components/VideoCall';
import IncomingCallModal from './components/ui/IncomingCallModal';
import NewMessageModal from './components/ui/NewMessageModal';
import { ThreadsPanel, MentionsPanel, SavedPanel, PeoplePanel, SettingsPanel } from './components/panels';

const auth = getAuth();

const AppContent: React.FC = () => {
    const [user, loading] = useAuthState(auth);
    const dispatch = useDispatch();
    const isOnline = useNetworkStatus();
    const { showToast } = useToast();

    // Call state selectors
    const currentCall = useSelector(selectCurrentCall);
    const incomingCall = useSelector(selectIncomingCall);
    const isInCall = useSelector(selectIsInCall);

    // Panel state selectors
    const activePanel = useSelector(selectActivePanel);
    const showNewMessageModal = useSelector(selectShowNewMessageModal);

    // Render the appropriate panel based on activePanel state
    const renderMainContent = () => {
        switch (activePanel) {
            case 'threads':
                return <ThreadsPanel />;
            case 'mentions':
                return <MentionsPanel />;
            case 'saved':
                return <SavedPanel />;
            case 'people':
                return <PeoplePanel />;
            case 'settings':
                return <SettingsPanel />;
            default:
                return <Chat />;
        }
    };

    // Sync pending messages when coming back online
    useEffect(() => {
        const handleSync = async () => {
            if (isOnline) {
                const result = await syncService.syncPendingMessages();
                if (result.synced > 0) {
                    const count = await offlineService.getPendingCount();
                    dispatch(setPendingCount(count));
                }
            }
        };

        handleSync();
    }, [isOnline, dispatch]);

    // Initial pending count
    useEffect(() => {
        const loadPendingCount = async () => {
            const count = await offlineService.getPendingCount();
            dispatch(setPendingCount(count));
        };
        loadPendingCount();
    }, [dispatch]);

    // Save user to Firestore when logged in
    useEffect(() => {
        if (!user) return;

        // Save user to users collection
        userService.saveUser({
            uid: user.uid,
            displayName: user.displayName,
            email: user.email,
            photoURL: user.photoURL,
        });

        // Set user offline when they leave
        const handleBeforeUnload = () => {
            userService.setUserOnline(user.uid, false);
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            userService.setUserOnline(user.uid, false);
        };
    }, [user]);

    // Listen for incoming calls when user is authenticated
    useEffect(() => {
        if (!user) return;

        const unsubscribe = callService.listenForIncomingCalls(user.uid, (call) => {
            // Don't show incoming call if already in a call
            if (!isInCall) {
                dispatch(setIncomingCall(call));
            }
        });

        return () => {
            unsubscribe();
            callService.cleanup();
        };
    }, [user, dispatch, isInCall]);

    // Handle accepting an incoming call
    const handleAcceptCall = async () => {
        if (!incomingCall) return;

        try {
            await callService.acceptCall(incomingCall.id);
            dispatch(setCurrentCall(incomingCall));
            dispatch(setIncomingCall(null));
            showToast('Call connected', 'success');
        } catch (error) {
            console.error('Error accepting call:', error);
            showToast('Failed to accept call', 'error');
        }
    };

    // Handle rejecting an incoming call
    const handleRejectCall = async () => {
        if (!incomingCall) return;

        try {
            await callService.rejectCall(incomingCall.id);
            dispatch(setIncomingCall(null));
        } catch (error) {
            console.error('Error rejecting call:', error);
            dispatch(setIncomingCall(null));
        }
    };

    if (loading) {
        return (
            <LoadingScreen>
                <LoadingContent>
                    <LogoIcon>
                        <ChatBubbleOutlineIcon />
                    </LogoIcon>
                    <LoadingTitle>Thryve Chat</LoadingTitle>
                    <LoadingSpinner />
                    <LoadingText>Loading your workspace...</LoadingText>
                </LoadingContent>
            </LoadingScreen>
        );
    }

    return (
        <AppContainer>
            {!user ? (
                <Login />
            ) : (
                <>
                    <Header />
                    <AppBody>
                        <Sidebar />
                        {renderMainContent()}
                    </AppBody>

                    {/* New Message Modal */}
                    <NewMessageModal isOpen={showNewMessageModal} />

                    {/* Video/Audio Call UI */}
                    {isInCall && user && <VideoCall userId={user.uid} />}

                    {/* Incoming Call Modal */}
                    {incomingCall && (
                        <IncomingCallModal
                            call={incomingCall}
                            onAccept={handleAcceptCall}
                            onReject={handleRejectCall}
                        />
                    )}
                </>
            )}
        </AppContainer>
    );
};

const App: React.FC = () => {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
};

export default App;

// Animations
const spin = keyframes`
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
`;

const pulse = keyframes`
    0%, 100% {
        opacity: 1;
        transform: scale(1);
    }
    50% {
        opacity: 0.7;
        transform: scale(0.95);
    }
`;

const float = keyframes`
    0%, 100% {
        transform: translateY(0);
    }
    50% {
        transform: translateY(-10px);
    }
`;

// Styled Components
const AppContainer = styled.div`
    min-height: 100vh;
    background: var(--gradient-primary);
`;

const AppBody = styled.div`
    display: flex;
    height: 100vh;
`;

const LoadingScreen = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    background: var(--gradient-primary);
`;

const LoadingContent = styled.div`
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spacing-lg);
    animation: ${pulse} 2s ease-in-out infinite;
`;

const LogoIcon = styled.div`
    width: 80px;
    height: 80px;
    border-radius: var(--radius-xl);
    background: var(--gradient-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-glow);
    animation: ${float} 3s ease-in-out infinite;

    svg {
        font-size: 40px;
        color: white;
    }
`;

const LoadingTitle = styled.h1`
    font-size: 2rem;
    font-weight: 700;
    background: var(--gradient-accent);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
`;

const LoadingSpinner = styled.div`
    width: 40px;
    height: 40px;
    border: 3px solid var(--glass-border);
    border-top-color: var(--accent-primary);
    border-radius: 50%;
    animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.p`
    color: var(--text-muted);
    font-size: 0.9rem;
`;
