import { useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { callService } from '../../../services/callService';
import { setCurrentCall, selectIsInCall } from '../../../features/callSlice';
import type { Call } from '../../../types';

interface UseCallManagementOptions {
    userId: string | undefined;
    userDisplayName: string | undefined;
    userPhotoURL: string | undefined;
    roomId: string;
    roomName?: string;
    showToast: (message: string, type: 'info' | 'success' | 'error') => void;
}

interface UseCallManagementReturn {
    isStartingCall: boolean;
    isJoiningCall: boolean;
    handleStartGroupCall: (callType: 'audio' | 'video') => Promise<void>;
    handleStartDirectCall: (
        callType: 'audio' | 'video',
        otherUserId: string,
        otherUserName: string,
        otherUserPhoto: string
    ) => Promise<void>;
    handleJoinGroupCall: (call: Call) => Promise<void>;
    handleEndGroupCall: (call: Call) => Promise<void>;
    handleMemberCall: (
        receiverId: string,
        receiverName: string,
        receiverPhoto: string,
        callType: 'audio' | 'video'
    ) => Promise<void>;
}

export function useCallManagement({
    userId,
    userDisplayName,
    userPhotoURL,
    roomId,
    roomName,
    showToast,
}: UseCallManagementOptions): UseCallManagementReturn {
    const dispatch = useDispatch();
    const isInCall = useSelector(selectIsInCall);
    const [isStartingCall, setIsStartingCall] = useState(false);
    const [isJoiningCall, setIsJoiningCall] = useState(false);

    // Start a group call in the channel
    const handleStartGroupCall = useCallback(async (callType: 'audio' | 'video') => {
        if (!userId || !roomId || roomId === 'null' || isInCall || isStartingCall) return;

        setIsStartingCall(true);
        try {
            const call = await callService.createCall(
                userId,
                userDisplayName || 'Unknown',
                userPhotoURL || '',
                'channel',
                roomName || 'Channel',
                '',
                roomId,
                callType,
                true
            );

            dispatch(setCurrentCall(call));
            showToast(`Starting ${callType} call in #${roomName}...`, 'info');

            callService.listenForCallChanges(call.id, (updatedCall) => {
                if (updatedCall.status === 'ended') {
                    showToast('Call ended', 'info');
                }
            });
        } catch (error) {
            console.error('Error starting group call:', error);
            showToast('Failed to start call', 'error');
        } finally {
            setIsStartingCall(false);
        }
    }, [userId, userDisplayName, userPhotoURL, roomId, roomName, isInCall, isStartingCall, dispatch, showToast]);

    // Start a direct call (for DMs)
    const handleStartDirectCall = useCallback(async (
        callType: 'audio' | 'video',
        otherUserId: string,
        otherUserName: string,
        otherUserPhoto: string
    ) => {
        if (!userId || !roomId || roomId === 'null' || isInCall || isStartingCall) return;

        if (!otherUserId) {
            console.error('Cannot start call: other user info is missing');
            showToast('Unable to start call - user info not loaded yet', 'error');
            return;
        }

        setIsStartingCall(true);
        try {
            const call = await callService.createCall(
                userId,
                userDisplayName || 'Unknown',
                userPhotoURL || '',
                otherUserId,
                otherUserName,
                otherUserPhoto,
                roomId,
                callType,
                false
            );

            dispatch(setCurrentCall(call));
            showToast(`Calling ${otherUserName}...`, 'info');

            callService.listenForCallChanges(call.id, (updatedCall) => {
                if (updatedCall.status === 'rejected') {
                    showToast(`${otherUserName} declined the call`, 'info');
                } else if (updatedCall.status === 'ended') {
                    showToast('Call ended', 'info');
                } else if (updatedCall.status === 'missed') {
                    showToast(`${otherUserName} didn't answer`, 'info');
                }
            });
        } catch (error) {
            console.error('Error starting direct call:', error);
            showToast('Failed to start call', 'error');
        } finally {
            setIsStartingCall(false);
        }
    }, [userId, userDisplayName, userPhotoURL, roomId, isInCall, isStartingCall, dispatch, showToast]);

    // For MembersList callback (groups only)
    const handleMemberCall = useCallback(async (
        receiverId: string,
        receiverName: string,
        receiverPhoto: string,
        callType: 'audio' | 'video'
    ) => {
        if (!userId || !roomId || roomId === 'null' || isInCall || isStartingCall) return;

        if (!receiverId) {
            console.error('Cannot start call: receiver ID is missing');
            showToast('Unable to start call - user info missing', 'error');
            return;
        }

        setIsStartingCall(true);
        try {
            const call = await callService.createCall(
                userId,
                userDisplayName || 'Unknown',
                userPhotoURL || '',
                receiverId,
                receiverName || 'Unknown',
                receiverPhoto || '',
                roomId,
                callType,
                false
            );

            dispatch(setCurrentCall(call));
            showToast(`Calling ${receiverName || 'User'}...`, 'info');

            callService.listenForCallChanges(call.id, (updatedCall) => {
                if (updatedCall.status === 'rejected') {
                    showToast(`${receiverName || 'User'} declined the call`, 'info');
                } else if (updatedCall.status === 'ended') {
                    showToast('Call ended', 'info');
                } else if (updatedCall.status === 'missed') {
                    showToast(`${receiverName || 'User'} didn't answer`, 'info');
                }
            });
        } catch (error) {
            console.error('Error starting direct call:', error);
            showToast('Failed to start call', 'error');
        } finally {
            setIsStartingCall(false);
        }
    }, [userId, userDisplayName, userPhotoURL, roomId, isInCall, isStartingCall, dispatch, showToast]);

    // Join an existing group call
    const handleJoinGroupCall = useCallback(async (activeChannelCall: Call) => {
        if (!userId || !activeChannelCall || isInCall || isJoiningCall) return;

        const isAlreadyParticipant = activeChannelCall.participants?.some(
            (p) => p.odUserId === userId
        );

        if (isAlreadyParticipant) {
            dispatch(setCurrentCall(activeChannelCall));
            return;
        }

        setIsJoiningCall(true);
        try {
            await callService.joinGroupCall(
                activeChannelCall.id,
                userId,
                userDisplayName || 'Unknown',
                userPhotoURL || ''
            );

            dispatch(setCurrentCall(activeChannelCall));
            showToast('Joined the call', 'success');
        } catch (error) {
            console.error('Error joining group call:', error);
            showToast('Failed to join call', 'error');
        } finally {
            setIsJoiningCall(false);
        }
    }, [userId, userDisplayName, userPhotoURL, isInCall, isJoiningCall, dispatch, showToast]);

    // End group call (only for call creator)
    const handleEndGroupCall = useCallback(async (activeChannelCall: Call) => {
        if (!activeChannelCall) return;

        try {
            await callService.endCall(activeChannelCall.id);
            showToast('Call ended for everyone', 'success');
        } catch (error) {
            console.error('Error ending group call:', error);
            showToast('Failed to end call', 'error');
        }
    }, [showToast]);

    return {
        isStartingCall,
        isJoiningCall,
        handleStartGroupCall,
        handleStartDirectCall,
        handleJoinGroupCall,
        handleEndGroupCall,
        handleMemberCall,
    };
}
