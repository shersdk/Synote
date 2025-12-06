import { useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchIcon, XIcon } from 'lucide-react';

interface SearchBarProps {
    isSearching: boolean;
    searchQuery: string;
    onSearchingChange: (isSearching: boolean) => void;
    onQueryChange: (query: string) => void;
}

export function SearchBar({ isSearching, searchQuery, onSearchingChange, onQueryChange }: SearchBarProps) {
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Focus search input when opened
    useEffect(() => {
        if (isSearching && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isSearching]);

    // Keyboard shortcut for search (⌘K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                onSearchingChange(!isSearching);
                if (!isSearching) {
                    onQueryChange('');
                }
            }
            if (e.key === 'Escape' && isSearching) {
                onSearchingChange(false);
                onQueryChange('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearching, onSearchingChange, onQueryChange]);

    const handleClose = () => {
        onSearchingChange(false);
        onQueryChange('');
    };

    if (isSearching) {
        return (
            <div className="flex items-center gap-2 bg-sidebar-accent/50 rounded-lg px-2.5 py-1.5">
                <SearchIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => onQueryChange(e.target.value)}
                    placeholder="Search notes..."
                    className="h-6 text-sm bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                    onKeyDown={(e) => {
                        if (e.key === 'Escape') handleClose();
                    }}
                />
                <button
                    onClick={handleClose}
                    className="p-0.5 rounded hover:bg-sidebar-accent text-muted-foreground"
                >
                    <XIcon className="h-3.5 w-3.5" />
                </button>
            </div>
        );
    }

    return (
        <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:bg-sidebar-accent/50 h-9"
            onClick={() => onSearchingChange(true)}
        >
            <SearchIcon className="h-4 w-4" />
            <span className="text-sm">Search notes...</span>
            <kbd className="ml-auto hidden text-[10px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded sm:inline-block">
                ⌘K
            </kbd>
        </Button>
    );
}
