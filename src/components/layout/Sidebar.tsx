import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotes } from '@/hooks/useNotes';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    pointerWithin,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
    PlusIcon,
    FolderPlusIcon,
    FileTextIcon,
    SettingsIcon,
    SparklesIcon,
    Loader2Icon,
} from 'lucide-react';

// Extracted components
import { SearchBar } from './sidebar/SearchBar';
import { SearchResults } from './sidebar/SearchResults';
import { FolderCreator } from './sidebar/FolderCreator';
import { FolderItem } from './sidebar/FolderItem';
import { NoteItem } from './sidebar/NoteItem';
import { UnsortedDropZone } from './sidebar/UnsortedDropZone';

// Extracted hooks
import { useSidebarSearch } from './sidebar/hooks/useSidebarSearch';
import { useFolderOrdering } from './sidebar/hooks/useFolderOrdering';

interface SidebarProps {
    className?: string;
    onOpenChat?: () => void;
    onOpenSettings?: () => void;
}

export function Sidebar({ className, onOpenChat, onOpenSettings }: SidebarProps) {
    const {
        notes,
        folders,
        selectedNoteId,
        isLoading,
        selectNote,
        createNote,
        deleteNote,
        createFolder,
        deleteFolder,
        moveNoteToFolder,
    } = useNotes();

    // Local state
    const [isCreating, setIsCreating] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [activeDragId, setActiveDragId] = useState<string | null>(null);

    // Custom hooks
    const { isSearching, searchQuery, setIsSearching, setSearchQuery, closeSearch } = useSidebarSearch();
    const { orderedFolderIds, orderedFolders, reorderFolders } = useFolderOrdering(folders);

    // DnD sensors
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    // Handlers
    const handleNewNote = async () => {
        setIsCreating(true);
        await createNote();
        setIsCreating(false);
    };

    const handleCreateFolder = async () => {
        if (newFolderName.trim()) {
            await createFolder(newFolderName.trim());
            setNewFolderName('');
            setIsCreatingFolder(false);
        }
    };

    const handleCancelFolder = () => {
        setNewFolderName('');
        setIsCreatingFolder(false);
    };

    const toggleFolder = (folderId: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            next.has(folderId) ? next.delete(folderId) : next.add(folderId);
            return next;
        });
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveDragId(null);
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Handle note dragging to folder or unsorted
        if (activeId.startsWith('note:')) {
            const noteId = activeId.replace('note:', '');
            if (overId.startsWith('folder:')) {
                moveNoteToFolder(noteId, overId.replace('folder:', ''));
            } else if (overId === 'unsorted-zone') {
                moveNoteToFolder(noteId, null);
            }
            return;
        }

        // Handle folder reordering
        if (!activeId.startsWith('note:') && !overId.startsWith('note:') && activeId !== overId) {
            reorderFolders(activeId, overId);
        }
    };

    // Computed values
    const rootNotes = notes.filter(n => !n.folderId);
    const getNotesForFolder = (folderId: string) => notes.filter(n => n.folderId === folderId);
    const activeDragNote = activeDragId?.startsWith('note:')
        ? notes.find(n => n.id === activeDragId.replace('note:', ''))
        : null;

    return (
        <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className={cn(
                'fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col',
                'bg-sidebar/30 backdrop-blur-xl',
                'border-r border-sidebar-border/50',
                className
            )}
        >
            {/* Drag region */}
            <div className="h-[52px] w-full app-drag-region flex items-end pb-2 pl-[78px]">
                <span className="text-xs font-medium text-muted-foreground">Synote</span>
            </div>

            {/* Search */}
            <div className="px-3 pb-3">
                <SearchBar
                    isSearching={isSearching}
                    searchQuery={searchQuery}
                    onSearchingChange={setIsSearching}
                    onQueryChange={setSearchQuery}
                />
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 px-3 pb-4">
                <Button
                    variant="default"
                    size="sm"
                    className="flex-1 gap-1.5 h-8"
                    onClick={handleNewNote}
                    disabled={isCreating}
                >
                    {isCreating ? (
                        <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                        <PlusIcon className="h-3.5 w-3.5" />
                    )}
                    New Note
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-sidebar-accent/30 border-sidebar-border/50 hover:bg-sidebar-accent/60"
                    onClick={() => onOpenChat?.()}
                    title="AI Chat"
                >
                    <SparklesIcon className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-sidebar-accent/30 border-sidebar-border/50 hover:bg-sidebar-accent/60"
                    onClick={() => setIsCreatingFolder(true)}
                    title="New Folder"
                >
                    <FolderPlusIcon className="h-3.5 w-3.5" />
                </Button>
            </div>

            {/* Notes & Folders Tree */}
            <ScrollArea className="flex-1 px-2">
                <div className="space-y-0.5 py-2">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                    ) : isSearching && searchQuery.trim() ? (
                        <SearchResults
                            notes={notes}
                            folders={folders}
                            searchQuery={searchQuery}
                            selectedNoteId={selectedNoteId}
                            onSelectNote={selectNote}
                            onCloseSearch={closeSearch}
                        />
                    ) : (
                        <DndContext
                            sensors={sensors}
                            collisionDetection={pointerWithin}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            {/* Header */}
                            <div className="px-2.5 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                All Notes ({notes.length})
                            </div>

                            {/* New Folder Input */}
                            <AnimatePresence>
                                <FolderCreator
                                    isCreating={isCreatingFolder}
                                    folderName={newFolderName}
                                    onFolderNameChange={setNewFolderName}
                                    onConfirm={handleCreateFolder}
                                    onCancel={handleCancelFolder}
                                />
                            </AnimatePresence>

                            {/* Folders */}
                            <SortableContext items={orderedFolderIds} strategy={verticalListSortingStrategy}>
                                {orderedFolders.map(folder => (
                                    <FolderItem
                                        key={folder.id}
                                        folder={folder}
                                        notes={getNotesForFolder(folder.id)}
                                        expanded={expandedFolders.has(folder.id)}
                                        onToggle={() => toggleFolder(folder.id)}
                                        selectedNoteId={selectedNoteId}
                                        onSelectNote={selectNote}
                                        onDeleteNote={deleteNote}
                                        onDeleteFolder={deleteFolder}
                                    />
                                ))}
                            </SortableContext>

                            {/* Unsorted Notes */}
                            {rootNotes.length > 0 && (
                                <UnsortedDropZone>
                                    <div className="px-2.5 py-1 mt-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                        Unsorted
                                    </div>
                                    {rootNotes.map(note => (
                                        <NoteItem
                                            key={note.id}
                                            note={note}
                                            isSelected={selectedNoteId === note.id}
                                            onSelect={() => selectNote(note.id)}
                                            onDelete={() => deleteNote(note.id)}
                                            showIndicator
                                        />
                                    ))}
                                </UnsortedDropZone>
                            )}

                            {/* Empty state */}
                            {notes.length === 0 && folders.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    <FileTextIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No notes yet</p>
                                    <p className="text-xs">Click "New Note" to get started</p>
                                </div>
                            )}

                            {/* Drag Overlay */}
                            <DragOverlay>
                                {activeDragNote && (
                                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm bg-sidebar-accent text-sidebar-foreground shadow-lg">
                                        <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                                        <span>{activeDragNote.title || 'Untitled'}</span>
                                    </div>
                                )}
                            </DragOverlay>
                        </DndContext>
                    )}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-sidebar-border/50 p-3">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground h-9 hover:bg-sidebar-accent/50"
                    onClick={() => onOpenSettings?.()}
                >
                    <SettingsIcon className="h-4 w-4" />
                    <span className="text-sm">Settings</span>
                </Button>
            </div>
        </motion.aside>
    );
}
