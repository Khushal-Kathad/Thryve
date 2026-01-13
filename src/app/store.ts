import { configureStore } from '@reduxjs/toolkit';
import appReducer from '../features/appSlice';
import callReducer from '../features/callSlice';

export const store = configureStore({
  reducer: {
    app: appReducer,
    call: callReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
