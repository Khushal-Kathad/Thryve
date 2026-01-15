import React, { RefObject } from 'react';
import SearchIcon from '@mui/icons-material/Search';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CloseIcon from '@mui/icons-material/Close';
import {
    SearchBarContainer,
    SearchInputWrapper,
    SearchInput,
    SearchResults,
    SearchNavButtons,
    SearchNavButton,
    CloseSearchButton,
} from './Chat.styles';

interface SearchBarProps {
    searchQuery: string;
    searchResults: string[];
    currentSearchIndex: number;
    searchInputRef: RefObject<HTMLInputElement>;
    onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onSearchKeyDown: (e: React.KeyboardEvent) => void;
    onNavigateSearch: (direction: 'up' | 'down') => void;
    onClose: () => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
    searchQuery,
    searchResults,
    currentSearchIndex,
    searchInputRef,
    onSearchChange,
    onSearchKeyDown,
    onNavigateSearch,
    onClose,
}) => {
    return (
        <SearchBarContainer>
            <SearchInputWrapper>
                <SearchIcon />
                <SearchInput
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search in messages..."
                    value={searchQuery}
                    onChange={onSearchChange}
                    onKeyDown={onSearchKeyDown}
                />
                {searchQuery && (
                    <SearchResults>
                        {searchResults.length > 0
                            ? `${currentSearchIndex + 1} of ${searchResults.length}`
                            : 'No results'}
                    </SearchResults>
                )}
            </SearchInputWrapper>
            <SearchNavButtons>
                <SearchNavButton
                    onClick={() => onNavigateSearch('up')}
                    disabled={searchResults.length === 0}
                    title="Previous (Shift+Enter)"
                >
                    <KeyboardArrowUpIcon />
                </SearchNavButton>
                <SearchNavButton
                    onClick={() => onNavigateSearch('down')}
                    disabled={searchResults.length === 0}
                    title="Next (Enter)"
                >
                    <KeyboardArrowDownIcon />
                </SearchNavButton>
            </SearchNavButtons>
            <CloseSearchButton onClick={onClose} title="Close (Esc)">
                <CloseIcon />
            </CloseSearchButton>
        </SearchBarContainer>
    );
};

export default SearchBar;
