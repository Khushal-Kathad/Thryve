import { useState, useEffect, useCallback, useRef } from 'react';
import { useDebounce } from '../../../hooks/useDebounce';
import type { QuerySnapshot, DocumentData } from 'firebase/firestore';

interface UseMessageSearchOptions {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    roomMessages: QuerySnapshot<any, DocumentData> | undefined;
}

interface UseMessageSearchReturn {
    showSearch: boolean;
    searchQuery: string;
    searchResults: string[];
    currentSearchIndex: number;
    searchInputRef: React.RefObject<HTMLInputElement>;
    handleSearchToggle: () => void;
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSearchKeyDown: (e: React.KeyboardEvent) => void;
    navigateSearch: (direction: 'up' | 'down') => void;
}

export function useMessageSearch({ roomMessages }: UseMessageSearchOptions): UseMessageSearchReturn {
    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<string[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Debounced search query
    const debouncedSearchQuery = useDebounce(searchQuery, 250);

    const handleSearchToggle = useCallback(() => {
        setShowSearch(prev => {
            if (!prev) {
                setTimeout(() => searchInputRef.current?.focus(), 100);
            } else {
                setSearchQuery('');
                setSearchResults([]);
                setCurrentSearchIndex(0);
            }
            return !prev;
        });
    }, []);

    const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    }, []);

    // Perform search when debounced query changes
    useEffect(() => {
        if (!debouncedSearchQuery.trim() || !roomMessages?.docs) {
            setSearchResults([]);
            setCurrentSearchIndex(0);
            return;
        }

        const lowerQuery = debouncedSearchQuery.toLowerCase();
        const matchingIds = roomMessages.docs
            .filter(doc => {
                const data = doc.data();
                return data.message?.toLowerCase().includes(lowerQuery);
            })
            .map(doc => doc.id);

        setSearchResults(matchingIds);
        setCurrentSearchIndex(matchingIds.length > 0 ? 0 : -1);

        // Scroll to first result
        if (matchingIds.length > 0) {
            requestAnimationFrame(() => {
                const element = document.getElementById(`message-${matchingIds[0]}`);
                element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    }, [debouncedSearchQuery, roomMessages]);

    const navigateSearch = useCallback((direction: 'up' | 'down') => {
        if (searchResults.length === 0) return;

        let newIndex;
        if (direction === 'up') {
            newIndex = currentSearchIndex > 0 ? currentSearchIndex - 1 : searchResults.length - 1;
        } else {
            newIndex = currentSearchIndex < searchResults.length - 1 ? currentSearchIndex + 1 : 0;
        }

        setCurrentSearchIndex(newIndex);
        const element = document.getElementById(`message-${searchResults[newIndex]}`);
        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, [searchResults, currentSearchIndex]);

    const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            navigateSearch(e.shiftKey ? 'up' : 'down');
        } else if (e.key === 'Escape') {
            handleSearchToggle();
        }
    }, [navigateSearch, handleSearchToggle]);

    return {
        showSearch,
        searchQuery,
        searchResults,
        currentSearchIndex,
        searchInputRef,
        handleSearchToggle,
        handleSearchChange,
        handleSearchKeyDown,
        navigateSearch,
    };
}
