import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

// Types
export interface Note {
    id: string;
    title: string;
    filePath: string;
    folderId: string | null;
    content?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Folder {
    id: string;
    name: string;
    parentId: string | null;
    children?: Folder[];
}

interface NotesContextType {
    notes: Note[];
    folders: Folder[];
    selectedNoteId: string | null;
    selectedNote: Note | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    selectNote: (id: string | null) => void;
    createNote: (title?: string, folderId?: string | null) => Promise<Note | null>;
    updateNote: (id: string, data: { title?: string; content?: string }) => Promise<void>;
    deleteNote: (id: string) => Promise<void>;
    createFolder: (name: string, parentId?: string | null) => Promise<Folder | null>;
    deleteFolder: (id: string) => Promise<void>;
    refreshNotes: () => Promise<void>;
    refreshFolders: () => Promise<void>;
}

const NotesContext = createContext<NotesContextType | null>(null);

export function useNotes() {
    const context = useContext(NotesContext);
    if (!context) {
        throw new Error('useNotes must be used within NotesProvider');
    }
    return context;
}

interface NotesProviderProps {
    children: ReactNode;
}

export function NotesProvider({ children }: NotesProviderProps) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
    const [selectedNote, setSelectedNote] = useState<Note | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Load notes from database
    const refreshNotes = useCallback(async () => {
        try {
            const notesList = await window.electronAPI?.notes.list();
            setNotes(notesList || []);
        } catch (err: any) {
            console.error('Failed to load notes:', err);
            setError(err.message);
        }
    }, []);

    // Load folders from database
    const refreshFolders = useCallback(async () => {
        try {
            const folderTree = await window.electronAPI?.folders.tree();
            setFolders(folderTree || []);
        } catch (err: any) {
            console.error('Failed to load folders:', err);
            setError(err.message);
        }
    }, []);

    // Initial load
    useEffect(() => {
        const init = async () => {
            setIsLoading(true);
            await Promise.all([refreshNotes(), refreshFolders()]);
            setIsLoading(false);
        };
        init();
    }, [refreshNotes, refreshFolders]);

    // Load selected note content
    useEffect(() => {
        const loadNote = async () => {
            if (!selectedNoteId) {
                setSelectedNote(null);
                return;
            }

            try {
                const note = await window.electronAPI?.notes.get(selectedNoteId);
                setSelectedNote(note || null);
            } catch (err: any) {
                console.error('Failed to load note:', err);
                setError(err.message);
            }
        };
        loadNote();
    }, [selectedNoteId]);

    const selectNote = useCallback((id: string | null) => {
        setSelectedNoteId(id);
    }, []);

    const createNote = useCallback(async (title?: string, folderId?: string | null): Promise<Note | null> => {
        try {
            const note = await window.electronAPI?.notes.create({
                title: title || 'Untitled',
                content: '',
                folderId: folderId || undefined,
            });

            if (note) {
                await refreshNotes();
                setSelectedNoteId(note.id);
                return note;
            }
            return null;
        } catch (err: any) {
            console.error('Failed to create note:', err);
            setError(err.message);
            return null;
        }
    }, [refreshNotes]);

    const updateNote = useCallback(async (id: string, data: { title?: string; content?: string }) => {
        try {
            await window.electronAPI?.notes.update(id, data);

            // Update local state
            if (selectedNote && selectedNote.id === id) {
                setSelectedNote(prev => prev ? { ...prev, ...data } : null);
            }

            // Only refresh list if title changed
            if (data.title) {
                await refreshNotes();
            }
        } catch (err: any) {
            console.error('Failed to update note:', err);
            setError(err.message);
        }
    }, [selectedNote, refreshNotes]);

    const deleteNote = useCallback(async (id: string) => {
        try {
            await window.electronAPI?.notes.delete(id);

            if (selectedNoteId === id) {
                setSelectedNoteId(null);
                setSelectedNote(null);
            }

            await refreshNotes();
        } catch (err: any) {
            console.error('Failed to delete note:', err);
            setError(err.message);
        }
    }, [selectedNoteId, refreshNotes]);

    const createFolder = useCallback(async (name: string, parentId?: string | null): Promise<Folder | null> => {
        try {
            const folder = await window.electronAPI?.folders.create({
                name,
                parentId: parentId || undefined,
            });

            if (folder) {
                await refreshFolders();
                return folder;
            }
            return null;
        } catch (err: any) {
            console.error('Failed to create folder:', err);
            setError(err.message);
            return null;
        }
    }, [refreshFolders]);

    const deleteFolder = useCallback(async (id: string) => {
        try {
            await window.electronAPI?.folders.delete(id);
            await refreshFolders();
            await refreshNotes(); // Notes may have been unassigned
        } catch (err: any) {
            console.error('Failed to delete folder:', err);
            setError(err.message);
        }
    }, [refreshFolders, refreshNotes]);

    return (
        <NotesContext.Provider
            value={{
                notes,
                folders,
                selectedNoteId,
                selectedNote,
                isLoading,
                error,
                selectNote,
                createNote,
                updateNote,
                deleteNote,
                createFolder,
                deleteFolder,
                refreshNotes,
                refreshFolders,
            }}
        >
            {children}
        </NotesContext.Provider>
    );
}
