import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { AppState, RootState, SidebarPanel, SavedMessage, AppSettings } from '../types';

const initialState: AppState = {
    roomId: 'null',
    verifiedRooms: [],
    pendingRoomId: null,
    pendingRoomName: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    pendingMessageCount: 0,
    showCreateChannelModal: false,
    showNewMessageModal: false,
    activePanel: 'none',
    savedMessages: [],
    settings: {
        theme: 'dark',
        notifications: true,
        soundEnabled: true,
        compactMode: false,
    },
};

export const appSlice = createSlice({
    name: 'app',
    initialState,
    reducers: {
        enterRoom: (state, action: PayloadAction<{ roomId: string }>) => {
            state.roomId = action.payload.roomId;
            // Reset panel when entering a room
            state.activePanel = 'none';
        },
        setPendingRoom: (state, action: PayloadAction<{ roomId: string; roomName?: string | null }>) => {
            state.pendingRoomId = action.payload.roomId;
            state.pendingRoomName = action.payload.roomName || null;
        },
        clearPendingRoom: (state) => {
            state.pendingRoomId = null;
            state.pendingRoomName = null;
        },
        addVerifiedRoom: (state, action: PayloadAction<{ roomId: string }>) => {
            if (!state.verifiedRooms.includes(action.payload.roomId)) {
                state.verifiedRooms.push(action.payload.roomId);
            }
        },
        setOnlineStatus: (state, action: PayloadAction<boolean>) => {
            state.isOnline = action.payload;
        },
        setPendingCount: (state, action: PayloadAction<number>) => {
            state.pendingMessageCount = action.payload;
        },
        setShowCreateChannelModal: (state, action: PayloadAction<boolean>) => {
            state.showCreateChannelModal = action.payload;
        },
        setShowNewMessageModal: (state, action: PayloadAction<boolean>) => {
            state.showNewMessageModal = action.payload;
        },
        setActivePanel: (state, action: PayloadAction<SidebarPanel>) => {
            state.activePanel = action.payload;
            // Clear room selection when viewing a panel
            if (action.payload !== 'none') {
                state.roomId = 'null';
            }
        },
        toggleSaveMessage: (state, action: PayloadAction<{ messageId: string; roomId: string }>) => {
            const existingIndex = state.savedMessages.findIndex(
                (m) => m.messageId === action.payload.messageId
            );
            if (existingIndex >= 0) {
                state.savedMessages.splice(existingIndex, 1);
            } else {
                state.savedMessages.push({
                    messageId: action.payload.messageId,
                    roomId: action.payload.roomId,
                    savedAt: Date.now(),
                });
            }
        },
        updateSettings: (state, action: PayloadAction<Partial<AppSettings>>) => {
            state.settings = { ...state.settings, ...action.payload };
        },
    },
});

export const {
    enterRoom,
    setPendingRoom,
    clearPendingRoom,
    addVerifiedRoom,
    setOnlineStatus,
    setPendingCount,
    setShowCreateChannelModal,
    setShowNewMessageModal,
    setActivePanel,
    toggleSaveMessage,
    updateSettings,
} = appSlice.actions;

export const selectRoomId = (state: RootState) => state.app.roomId;
export const selectVerifiedRooms = (state: RootState) => state.app.verifiedRooms;
export const selectPendingRoomId = (state: RootState) => state.app.pendingRoomId;
export const selectPendingRoomName = (state: RootState) => state.app.pendingRoomName;
export const selectIsOnline = (state: RootState) => state.app.isOnline;
export const selectPendingCount = (state: RootState) => state.app.pendingMessageCount;
export const selectShowCreateChannelModal = (state: RootState) => state.app.showCreateChannelModal;
export const selectShowNewMessageModal = (state: RootState) => state.app.showNewMessageModal;
export const selectActivePanel = (state: RootState) => state.app.activePanel;
export const selectSavedMessages = (state: RootState) => state.app.savedMessages;
export const selectSettings = (state: RootState) => state.app.settings;
export const selectIsMessageSaved = (messageId: string) => (state: RootState) =>
    state.app.savedMessages.some((m) => m.messageId === messageId);

export default appSlice.reducer;
