import { useState, useEffect, useMemo } from 'react';
import { userService, AppUser } from '../../../services/userService';
import { useDebounce } from '../../../hooks/useDebounce';
import { TIMING } from '../../../shared/constants';

interface UseUserListOptions {
    currentUserId: string | undefined;
}

interface UseUserListReturn {
    allUsers: AppUser[];
    isLoadingUsers: boolean;
    currentUserData: AppUser | null;
    onlineUsers: AppUser[];
    offlineUsers: AppUser[];
    filteredOnlineUsers: AppUser[];
    filteredOfflineUsers: AppUser[];
    searchQuery: string;
    setSearchQuery: (query: string) => void;
}

export function useUserList({ currentUserId }: UseUserListOptions): UseUserListReturn {
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Debounce search query for better performance
    const debouncedSearchQuery = useDebounce(searchQuery, TIMING.SEARCH_DEBOUNCE_MS);

    // Listen for all users with cleanup and error handling
    useEffect(() => {
        setIsLoadingUsers(true);

        // Set a timeout to stop loading after 10 seconds even if no data
        const loadingTimeout = setTimeout(() => {
            setIsLoadingUsers(false);
            console.warn('User loading timed out');
        }, TIMING.USER_LOADING_TIMEOUT_MS);

        const unsubscribe = userService.listenForUsers((users) => {
            clearTimeout(loadingTimeout);
            setAllUsers(users);
            setIsLoadingUsers(false);
            console.log('Users loaded:', users.length);
        });

        return () => {
            clearTimeout(loadingTimeout);
            unsubscribe();
            userService.stopListening();
        };
    }, []);

    // Memoized user lists - prevents recalculation on every render
    const {
        currentUserData,
        onlineUsers,
        offlineUsers,
        filteredOnlineUsers,
        filteredOfflineUsers
    } = useMemo(() => {
        const currentUserData = allUsers.find(u => u.uid === currentUserId) || null;
        const otherUsers = allUsers.filter(u => u.uid !== currentUserId);
        const online = otherUsers.filter(u => u.isOnline);
        const offline = otherUsers.filter(u => !u.isOnline);

        // Apply search filter with debounced query
        const searchLower = debouncedSearchQuery.toLowerCase().trim();
        const filterFn = (u: AppUser) =>
            !searchLower || u.displayName.toLowerCase().includes(searchLower);

        return {
            currentUserData,
            onlineUsers: online,
            offlineUsers: offline,
            filteredOnlineUsers: online.filter(filterFn),
            filteredOfflineUsers: offline.filter(filterFn),
        };
    }, [allUsers, currentUserId, debouncedSearchQuery]);

    return {
        allUsers,
        isLoadingUsers,
        currentUserData,
        onlineUsers,
        offlineUsers,
        filteredOnlineUsers,
        filteredOfflineUsers,
        searchQuery,
        setSearchQuery,
    };
}
