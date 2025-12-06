import { useState, useCallback } from 'react';

export function useSidebarSearch() {
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const openSearch = useCallback(() => {
        setIsSearching(true);
        setSearchQuery('');
    }, []);

    const closeSearch = useCallback(() => {
        setIsSearching(false);
        setSearchQuery('');
    }, []);

    const toggleSearch = useCallback(() => {
        if (isSearching) {
            closeSearch();
        } else {
            openSearch();
        }
    }, [isSearching, openSearch, closeSearch]);

    return {
        isSearching,
        searchQuery,
        setIsSearching,
        setSearchQuery,
        openSearch,
        closeSearch,
        toggleSearch,
    };
}
