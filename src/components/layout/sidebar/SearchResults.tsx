import { cn } from '@/lib/utils';
import { FileTextIcon, FolderIcon, SearchIcon } from 'lucide-react';
import type { Note, Folder } from '@/hooks/useNotes';

interface SearchResultsProps {
    notes: Note[];
    folders: Folder[];
    searchQuery: string;
    selectedNoteId: string | null;
    onSelectNote: (id: string) => void;
    onCloseSearch: () => void;
}

export function SearchResults({
    notes,
    folders,
    searchQuery,
    selectedNoteId,
    onSelectNote,
    onCloseSearch,
}: SearchResultsProps) {
    const query = searchQuery.toLowerCase().trim();
    const matchingNotes = notes.filter(note =>
        note.title.toLowerCase().includes(query)
    );

    if (matchingNotes.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground text-sm">
                <SearchIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No notes found</p>
                <p className="text-xs">Try a different search term</p>
            </div>
        );
    }

    return (
        <>
            <div className="px-2.5 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Results ({matchingNotes.length})
            </div>
            {matchingNotes.map(note => {
                const folder = note.folderId
                    ? folders.find(f => f.id === note.folderId)
                    : null;
                return (
                    <button
                        key={note.id}
                        onClick={() => {
                            onSelectNote(note.id);
                            onCloseSearch();
                        }}
                        className={cn(
                            'flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-left',
                            'transition-colors duration-150',
                            selectedNoteId === note.id
                                ? 'bg-sidebar-accent text-sidebar-foreground'
                                : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                        )}
                    >
                        <FileTextIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                            <div className="truncate">{note.title || 'Untitled'}</div>
                            {folder && (
                                <div className="text-xs text-muted-foreground/70 truncate flex items-center gap-1">
                                    <FolderIcon className="h-3 w-3" />
                                    {folder.name}
                                </div>
                            )}
                        </div>
                    </button>
                );
            })}
        </>
    );
}
