import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Call, CallState, RootState } from '../types';

const initialState: CallState = {
    currentCall: null,
    incomingCall: null,
    isInCall: false,
    isMuted: false,
    isVideoEnabled: true,
    isMinimized: false,
    remoteUsers: [],
};

export const callSlice = createSlice({
    name: 'call',
    initialState,
    reducers: {
        setIncomingCall: (state, action: PayloadAction<Call | null>) => {
            state.incomingCall = action.payload;
        },
        setCurrentCall: (state, action: PayloadAction<Call | null>) => {
            state.currentCall = action.payload;
            state.isInCall = action.payload !== null;
            if (action.payload) {
                state.incomingCall = null;
            }
        },
        endCall: (state) => {
            state.currentCall = null;
            state.incomingCall = null;
            state.isInCall = false;
            state.isMuted = false;
            state.isVideoEnabled = true;
            state.isMinimized = false;
            state.remoteUsers = [];
        },
        toggleMute: (state) => {
            state.isMuted = !state.isMuted;
        },
        toggleVideo: (state) => {
            state.isVideoEnabled = !state.isVideoEnabled;
        },
        toggleMinimize: (state) => {
            state.isMinimized = !state.isMinimized;
        },
        addRemoteUser: (state, action: PayloadAction<string>) => {
            if (!state.remoteUsers.includes(action.payload)) {
                state.remoteUsers.push(action.payload);
            }
        },
        removeRemoteUser: (state, action: PayloadAction<string>) => {
            state.remoteUsers = state.remoteUsers.filter(id => id !== action.payload);
        },
        updateCallStatus: (state, action: PayloadAction<Call['status']>) => {
            if (state.currentCall) {
                state.currentCall.status = action.payload;
            }
        },
    },
});

export const {
    setIncomingCall,
    setCurrentCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleMinimize,
    addRemoteUser,
    removeRemoteUser,
    updateCallStatus,
} = callSlice.actions;

// Selectors
export const selectCurrentCall = (state: RootState) => state.call.currentCall;
export const selectIncomingCall = (state: RootState) => state.call.incomingCall;
export const selectIsInCall = (state: RootState) => state.call.isInCall;
export const selectIsMuted = (state: RootState) => state.call.isMuted;
export const selectIsVideoEnabled = (state: RootState) => state.call.isVideoEnabled;
export const selectIsMinimized = (state: RootState) => state.call.isMinimized;
export const selectRemoteUsers = (state: RootState) => state.call.remoteUsers;

export default callSlice.reducer;
