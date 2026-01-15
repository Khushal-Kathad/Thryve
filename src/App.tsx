import React, { useEffect, lazy, Suspense, useState, useCallback } from 'react';
import './App.css';
import Header from './components/Header';
import styled, { keyframes } from 'styled-components';
import Sidebar from './components/Sidebar';
// Use modularized Chat component
import Chat from './features/messaging/components/Chat';
import { useAuthState } from 'react-firebase-hooks/auth';
import { getAuth } from 'firebase/auth';
import Login from './components/Login';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { ToastProvider, useToast } from './context/ToastContext';
import { useNetworkStatus } from './hooks/useNetworkStatus';
import { syncService } from './services/syncService';
import { offlineService } from './services/offlineService';
import { useDispatch, useSelector } from 'react-redux';
import { setPendingCount, selectActivePanel, selectShowNewMessageModal, setActivePanel } from './features/appSlice';
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
import IncomingCallModal from './components/ui/IncomingCallModal';
import NewMessageModal from './components/ui/NewMessageModal';
import ErrorBoundary from './components/ErrorBoundary';
import BottomNav, { NavTab } from './components/BottomNav';

// Lazy load heavy components (VideoCall has ~4MB Agora SDK)
const VideoCall = lazy(() => import('./components/VideoCall'));

// Lazy load panels (only one renders at a time)
const SavedPanel = lazy(() => import('./components/panels/SavedPanel'));
const PeoplePanel = lazy(() => import('./components/panels/PeoplePanel'));
const SettingsPanel = lazy(() => import('./components/panels/SettingsPanel'));

const auth = getAuth();

const AppContent: React.FC = () => {
    const [user, loading] = useAuthState(auth);
    const dispatch = useDispatch();
    const isOnline = useNetworkStatus();
    const { showToast } = useToast();

    // Mobile sidebar state
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [mobileTab, setMobileTab] = useState<NavTab>('chats');

    // Call state selectors
    const currentCall = useSelector(selectCurrentCall);
    const incomingCall = useSelector(selectIncomingCall);
    const isInCall = useSelector(selectIsInCall);

    // Panel state selectors
    const activePanel = useSelector(selectActivePanel);
    const showNewMessageModal = useSelector(selectShowNewMessageModal);

    // Close sidebar when switching panels on mobile
    const handleSidebarToggle = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    const handleCloseSidebar = () => {
        setIsSidebarOpen(false);
    };

    // Handle mobile bottom nav tab changes
    const handleMobileTabChange = useCallback((tab: NavTab) => {
        setMobileTab(tab);
        if (tab === 'chats' || tab === 'groups') {
            setIsSidebarOpen(true);
            dispatch(setActivePanel('none'));
        } else if (tab === 'calls') {
            dispatch(setActivePanel('people'));
            setIsSidebarOpen(false);
        } else if (tab === 'profile') {
            dispatch(setActivePanel('settings'));
            setIsSidebarOpen(false);
        }
    }, [dispatch]);

    // Render the appropriate panel based on activePanel state
    const renderMainContent = () => {
        switch (activePanel) {
            case 'saved':
                return <Suspense fallback={<PanelLoader />}><SavedPanel /></Suspense>;
            case 'people':
                return <Suspense fallback={<PanelLoader />}><PeoplePanel /></Suspense>;
            case 'settings':
                return <Suspense fallback={<PanelLoader />}><SettingsPanel /></Suspense>;
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

        let isMounted = true;

        // Save user to users collection with proper error handling
        const initializeUser = async () => {
            try {
                const success = await userService.saveUser({
                    uid: user.uid,
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                });

                if (isMounted && success) {
                    console.log('User initialized successfully:', user.displayName);
                } else if (isMounted && !success) {
                    console.error('Failed to save user data');
                    showToast('Failed to sync user data', 'error');
                }
            } catch (error) {
                console.error('Error initializing user:', error);
                if (isMounted) {
                    showToast('Failed to sync user data', 'error');
                }
            }
        };

        initializeUser();

        // Set user offline when they leave
        const handleBeforeUnload = () => {
            userService.setUserOnline(user.uid, false);
        };

        // Handle visibility change (tab switch, minimize)
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                userService.setUserOnline(user.uid, true);
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            isMounted = false;
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            userService.setUserOnline(user.uid, false);
            userService.cleanup();
        };
    }, [user, showToast]);

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
                    <Header
                        onMenuClick={handleSidebarToggle}
                        isSidebarOpen={isSidebarOpen}
                    />
                    <AppBody>
                        <Sidebar
                            isOpen={isSidebarOpen}
                            onClose={handleCloseSidebar}
                        />
                        <MainContent>
                            {renderMainContent()}
                        </MainContent>
                    </AppBody>

                    {/* New Message Modal */}
                    <NewMessageModal isOpen={showNewMessageModal} />

                    {/* Video/Audio Call UI - Lazy loaded with Error Boundary */}
                    {isInCall && user && (
                        <ErrorBoundary
                            fallback={<CallLoader>Call error - please retry</CallLoader>}
                            onError={(error) => {
                                console.error('Video call error:', error);
                                showToast('Call failed - please try again', 'error');
                            }}
                        >
                            <Suspense fallback={<CallLoader>Connecting call...</CallLoader>}>
                                <VideoCall userId={user.uid} />
                            </Suspense>
                        </ErrorBoundary>
                    )}

                    {/* Incoming Call Modal */}
                    {incomingCall && (
                        <IncomingCallModal
                            call={incomingCall}
                            onAccept={handleAcceptCall}
                            onReject={handleRejectCall}
                        />
                    )}

                    {/* Mobile Bottom Navigation */}
                    <BottomNav
                        activeTab={mobileTab}
                        onTabChange={handleMobileTabChange}
                    />
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
    min-height: 100dvh;
    min-height: -webkit-fill-available;
    background: var(--bg-primary);
    display: flex;
    flex-direction: column;
    /* GPU acceleration */
    transform: translateZ(0);
`;

const AppBody = styled.div`
    display: flex;
    flex: 1;
    height: 100vh;
    height: 100dvh;
    height: -webkit-fill-available;
    overflow: hidden;
    position: relative;
`;

const MainContent = styled.main`
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
    height: calc(100vh - var(--header-height));
    height: calc(100dvh - var(--header-height));
    margin-top: var(--header-height);
    background: var(--bg-secondary);
    overflow: hidden;
    /* GPU acceleration for smoother rendering */
    transform: translateZ(0);
    will-change: transform;

    @media (max-width: 768px) {
        width: 100%;
        /* Account for bottom nav height with safe area */
        height: calc(100dvh - var(--header-height) - var(--bottom-nav-height, 70px));
        height: calc(100vh - var(--header-height) - var(--bottom-nav-height, 70px));
        padding-bottom: env(safe-area-inset-bottom, 0);
        /* Smooth scrolling for mobile */
        -webkit-overflow-scrolling: touch;
    }

    @media (max-width: 768px) and (orientation: landscape) {
        height: calc(100dvh - var(--header-height) - var(--bottom-nav-height, 56px));
    }
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

// Lazy loading fallbacks
const PanelLoader = styled.div`
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--text-muted);
    font-size: 0.9rem;
`;

const CallLoader = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.8);
    color: var(--text-primary);
    font-size: 1.1rem;
    z-index: 9999;
`;
