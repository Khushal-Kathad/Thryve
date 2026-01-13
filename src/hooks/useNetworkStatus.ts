import { useState, useEffect, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { setOnlineStatus } from '../features/appSlice';

export const useNetworkStatus = (): boolean => {
    const [isOnline, setIsOnline] = useState(
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const dispatch = useDispatch();

    const handleOnline = useCallback(() => {
        setIsOnline(true);
        dispatch(setOnlineStatus(true));
    }, [dispatch]);

    const handleOffline = useCallback(() => {
        setIsOnline(false);
        dispatch(setOnlineStatus(false));
    }, [dispatch]);

    useEffect(() => {
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Initial check
        const online = navigator.onLine;
        setIsOnline(online);
        dispatch(setOnlineStatus(online));

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline, dispatch]);

    return isOnline;
};

export default useNetworkStatus;
