import {
    collection,
    doc,
    setDoc,
    updateDoc,
    onSnapshot,
    query,
    where,
    orderBy,
    limit,
    Unsubscribe,
    getDoc,
    arrayUnion,
    arrayRemove,
} from 'firebase/firestore';
import { db } from '../firebase';
import type { Call, CallParticipant } from '../types';

class CallService {
    private incomingCallUnsubscribe: Unsubscribe | null = null;
    private currentCallUnsubscribe: Unsubscribe | null = null;
    private channelCallUnsubscribe: Unsubscribe | null = null;

    // Generate a unique channel name for Agora
    generateChannelName(): string {
        return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Create a new call (1-to-1 or group)
    async createCall(
        callerId: string,
        callerName: string,
        callerPhoto: string,
        receiverId: string,
        receiverName: string,
        receiverPhoto: string,
        roomId: string,
        callType: 'audio' | 'video',
        isGroupCall: boolean = false
    ): Promise<Call> {
        const callRef = doc(collection(db, 'calls'));
        const channelName = this.generateChannelName();

        const call: Call = {
            id: callRef.id,
            channelName,
            callerId,
            callerName,
            callerPhoto,
            receiverId,
            receiverName,
            receiverPhoto,
            roomId,
            callType,
            isGroupCall,
            status: isGroupCall ? 'active' : 'ringing', // Group calls start as active
            createdAt: Date.now(),
        };

        // Only add participants field for group calls (Firestore rejects undefined values)
        if (isGroupCall) {
            call.participants = [{
                odUserId: callerId,
                odUserName: callerName,
                photo: callerPhoto,
                joinedAt: Date.now(),
            }];
        }

        await setDoc(callRef, call);
        console.log('Call created:', call.id, isGroupCall ? '(group)' : '(1-to-1)');

        return call;
    }

    // Accept a call
    async acceptCall(callId: string): Promise<void> {
        const callRef = doc(db, 'calls', callId);
        await updateDoc(callRef, {
            status: 'active',
            answeredAt: Date.now(),
        });
        console.log('Call accepted:', callId);
    }

    // Reject a call
    async rejectCall(callId: string): Promise<void> {
        const callRef = doc(db, 'calls', callId);
        await updateDoc(callRef, {
            status: 'rejected',
            endedAt: Date.now(),
        });
        console.log('Call rejected:', callId);
    }

    // End a call
    async endCall(callId: string): Promise<void> {
        const callRef = doc(db, 'calls', callId);
        await updateDoc(callRef, {
            status: 'ended',
            endedAt: Date.now(),
        });
        console.log('Call ended:', callId);
    }

    // Mark call as missed
    async missedCall(callId: string): Promise<void> {
        const callRef = doc(db, 'calls', callId);
        await updateDoc(callRef, {
            status: 'missed',
            endedAt: Date.now(),
        });
        console.log('Call missed:', callId);
    }

    // Join a group call
    async joinGroupCall(
        callId: string,
        odUserId: string,
        odUserName: string,
        photo: string
    ): Promise<void> {
        const callRef = doc(db, 'calls', callId);

        // Check if user is already a participant
        const callDoc = await getDoc(callRef);
        if (callDoc.exists()) {
            const call = callDoc.data() as Call;
            const isAlreadyParticipant = call.participants?.some(
                (p) => p.odUserId === odUserId
            );
            if (isAlreadyParticipant) {
                console.log('User already in call:', odUserId);
                return;
            }
        }

        const participant: CallParticipant = {
            odUserId,
            odUserName,
            photo,
            joinedAt: Date.now(),
        };
        await updateDoc(callRef, {
            participants: arrayUnion(participant),
        });
        console.log('User joined group call:', odUserId);
    }

    // Leave a group call
    async leaveGroupCall(
        callId: string,
        odUserId: string
    ): Promise<void> {
        const callRef = doc(db, 'calls', callId);

        // Get the call to find the participant's exact data
        const callDoc = await getDoc(callRef);
        if (!callDoc.exists()) {
            console.log('Call not found:', callId);
            return;
        }

        const call = callDoc.data() as Call;
        const participant = call.participants?.find(p => p.odUserId === odUserId);

        if (participant) {
            await updateDoc(callRef, {
                participants: arrayRemove(participant),
            });
            console.log('User left group call:', odUserId);
        }

        // Check if call should end (no participants left)
        const updatedCallDoc = await getDoc(callRef);
        if (updatedCallDoc.exists()) {
            const updatedCall = updatedCallDoc.data() as Call;
            if (!updatedCall.participants || updatedCall.participants.length === 0) {
                await this.endCall(callId);
            }
        }
    }

    // Get call by ID
    async getCall(callId: string): Promise<Call | null> {
        const callRef = doc(db, 'calls', callId);
        const callDoc = await getDoc(callRef);

        if (callDoc.exists()) {
            return callDoc.data() as Call;
        }
        return null;
    }

    // Listen for incoming calls
    listenForIncomingCalls(
        userId: string,
        onIncomingCall: (call: Call) => void
    ): Unsubscribe {
        // Unsubscribe from previous listener
        if (this.incomingCallUnsubscribe) {
            this.incomingCallUnsubscribe();
        }

        const callsQuery = query(
            collection(db, 'calls'),
            where('receiverId', '==', userId),
            where('status', '==', 'ringing'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        this.incomingCallUnsubscribe = onSnapshot(callsQuery, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const call = change.doc.data() as Call;
                    // Only notify for recent calls (within last 60 seconds)
                    if (Date.now() - call.createdAt < 60000) {
                        onIncomingCall(call);
                    }
                }
            });
        });

        return this.incomingCallUnsubscribe;
    }

    // Listen for call status changes
    listenForCallChanges(
        callId: string,
        onCallChange: (call: Call) => void
    ): Unsubscribe {
        // Unsubscribe from previous listener
        if (this.currentCallUnsubscribe) {
            this.currentCallUnsubscribe();
        }

        const callRef = doc(db, 'calls', callId);

        this.currentCallUnsubscribe = onSnapshot(callRef, (snapshot) => {
            if (snapshot.exists()) {
                const call = snapshot.data() as Call;
                onCallChange(call);
            }
        });

        return this.currentCallUnsubscribe;
    }

    // Stop listening for incoming calls
    stopListeningForIncomingCalls(): void {
        if (this.incomingCallUnsubscribe) {
            this.incomingCallUnsubscribe();
            this.incomingCallUnsubscribe = null;
        }
    }

    // Stop listening for call changes
    stopListeningForCallChanges(): void {
        if (this.currentCallUnsubscribe) {
            this.currentCallUnsubscribe();
            this.currentCallUnsubscribe = null;
        }
    }

    // Listen for active calls in a specific channel (for group calls)
    listenForChannelCalls(
        roomId: string,
        onActiveCall: (call: Call | null) => void
    ): Unsubscribe {
        // Unsubscribe from previous listener
        if (this.channelCallUnsubscribe) {
            this.channelCallUnsubscribe();
        }

        const callsQuery = query(
            collection(db, 'calls'),
            where('roomId', '==', roomId),
            where('isGroupCall', '==', true),
            where('status', '==', 'active'),
            orderBy('createdAt', 'desc'),
            limit(1)
        );

        this.channelCallUnsubscribe = onSnapshot(callsQuery, (snapshot) => {
            if (snapshot.empty) {
                onActiveCall(null);
            } else {
                const call = snapshot.docs[0].data() as Call;
                onActiveCall(call);
            }
        });

        return this.channelCallUnsubscribe;
    }

    // Stop listening for channel calls
    stopListeningForChannelCalls(): void {
        if (this.channelCallUnsubscribe) {
            this.channelCallUnsubscribe();
            this.channelCallUnsubscribe = null;
        }
    }

    // Clean up all listeners
    cleanup(): void {
        this.stopListeningForIncomingCalls();
        this.stopListeningForCallChanges();
        this.stopListeningForChannelCalls();
    }
}

export const callService = new CallService();
export default callService;
