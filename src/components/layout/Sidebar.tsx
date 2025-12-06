import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useNotes, Note, Folder } from '@/hooks/useNotes';
import {
    DndContext,
    DragOverlay,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragStartEvent,
    DragEndEvent,
    useDroppable,
    useDraggable,
    pointerWithin,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    PlusIcon,
    FolderIcon,
    FolderPlusIcon,
    FileTextIcon,
    SearchIcon,
    SettingsIcon,
    SparklesIcon,
    ChevronRightIcon,
    TrashIcon,
    Loader2Icon,
    CheckIcon,
    XIcon,
    GripVerticalIcon,
} from 'lucide-react';

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

    const [isCreating, setIsCreating] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [orderedFolderIds, setOrderedFolderIds] = useState<string[]>([]);
    const [activeDragId, setActiveDragId] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const folderInputRef = useRef<HTMLInputElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Sync ordered folder IDs when folders change
    useEffect(() => {
        const currentIds = folders.map(f => f.id);
        const orderedIds = orderedFolderIds.filter(id => currentIds.includes(id));
        const newIds = currentIds.filter(id => !orderedFolderIds.includes(id));
        setOrderedFolderIds([...newIds, ...orderedIds]);
    }, [folders]);

    useEffect(() => {
        if (isCreatingFolder && folderInputRef.current) {
            folderInputRef.current.focus();
        }
    }, [isCreatingFolder]);

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
                setIsSearching(prev => !prev);
                if (!isSearching) {
                    setSearchQuery('');
                }
            }
            if (e.key === 'Escape' && isSearching) {
                setIsSearching(false);
                setSearchQuery('');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isSearching]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

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
            if (next.has(folderId)) {
                next.delete(folderId);
            } else {
                next.add(folderId);
            }
            return next;
        });
    };

    const handleDragStart = (event: DragStartEvent) => {
        console.log('Drag started:', event.active.id);
        setActiveDragId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        console.log('Drag ended:', { activeId: active.id, overId: over?.id });
        setActiveDragId(null);

        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Handle note dragging
        if (activeId.startsWith('note:')) {
            const noteId = activeId.replace('note:', '');

            // Dropping on a folder
            if (overId.startsWith('folder:')) {
                const folderId = overId.replace('folder:', '');
                moveNoteToFolder(noteId, folderId);
                return;
            }

            // Dropping on "unsorted" drop zone
            if (overId === 'unsorted-zone') {
                moveNoteToFolder(noteId, null);
                return;
            }
        }

        // Handle folder reordering
        if (!activeId.startsWith('note:') && !overId.startsWith('note:')) {
            if (activeId !== overId) {
                setOrderedFolderIds(items => {
                    const oldIndex = items.indexOf(activeId);
                    const newIndex = items.indexOf(overId);
                    if (oldIndex !== -1 && newIndex !== -1) {
                        return arrayMove(items, oldIndex, newIndex);
                    }
                    return items;
                });
            }
        }
    };

    const rootNotes = notes.filter(n => !n.folderId);
    const getNotesForFolder = (folderId: string) => notes.filter(n => n.folderId === folderId);
    const orderedFolders = orderedFolderIds
        .map(id => folders.find(f => f.id === id))
        .filter((f): f is Folder => f !== undefined);

    // Get the currently dragged item for the overlay
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
                {isSearching ? (
                    <div className="flex items-center gap-2 bg-sidebar-accent/50 rounded-lg px-2.5 py-1.5">
                        <SearchIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <Input
                            ref={searchInputRef}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search notes..."
                            className="h-6 text-sm bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setIsSearching(false);
                                    setSearchQuery('');
                                }
                            }}
                        />
                        <button
                            onClick={() => {
                                setIsSearching(false);
                                setSearchQuery('');
                            }}
                            className="p-0.5 rounded hover:bg-sidebar-accent text-muted-foreground"
                        >
                            <XIcon className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ) : (
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-2 text-muted-foreground hover:bg-sidebar-accent/50 h-9"
                        onClick={() => setIsSearching(true)}
                    >
                        <SearchIcon className="h-4 w-4" />
                        <span className="text-sm">Search notes...</span>
                        <kbd className="ml-auto hidden text-[10px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded sm:inline-block">
                            ⌘K
                        </kbd>
                    </Button>
                )}
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
                        // Search Results View
                        <>
                            {(() => {
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
                                                        selectNote(note.id);
                                                        setIsSearching(false);
                                                        setSearchQuery('');
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
                            })()}
                        </>
                    ) : (
                        // Normal Folder View
                        <DndContext
                            sensors={sensors}
                            collisionDetection={pointerWithin}
                            onDragStart={handleDragStart}
                            onDragEnd={handleDragEnd}
                        >
                            {/* All Notes header */}
                            <div className="px-2.5 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                All Notes ({notes.length})
                            </div>

                            {/* New Folder Input - Inline at top */}
                            <AnimatePresence>
                                {isCreatingFolder && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.15, ease: 'easeOut' }}
                                        className="overflow-hidden"
                                    >
                                        <div className="flex items-center gap-1 px-1 py-0.5">
                                            <div className="flex flex-1 items-center gap-2 rounded-lg px-2.5 py-1 bg-sidebar-accent/50">
                                                <FolderIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                                <Input
                                                    ref={folderInputRef}
                                                    value={newFolderName}
                                                    onChange={(e) => setNewFolderName(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleCreateFolder();
                                                        if (e.key === 'Escape') handleCancelFolder();
                                                    }}
                                                    placeholder="Folder name..."
                                                    className="h-6 text-sm bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                                                />
                                            </div>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleCreateFolder}>
                                                <CheckIcon className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={handleCancelFolder}>
                                                <XIcon className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Folders */}
                            <SortableContext items={orderedFolderIds} strategy={verticalListSortingStrategy}>
                                {orderedFolders.map(folder => (
                                    <DroppableFolder
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
                                        <DraggableNote
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

// ============================================
// Unsorted Drop Zone - allows dropping notes here to "unfolder" them
// ============================================

function UnsortedDropZone({ children }: { children: React.ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id: 'unsorted-zone' });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'transition-colors rounded-lg',
                isOver && 'bg-green-500/10 ring-1 ring-green-500/30'
            )}
        >
            {children}
        </div>
    );
}

// ============================================
// Draggable Note - can be dragged to folders or unsorted
// ============================================

interface DraggableNoteProps {
    note: Note;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    showIndicator?: boolean;
    nested?: boolean;
}

function DraggableNote({ note, isSelected, onSelect, onDelete, showIndicator, nested }: DraggableNoteProps) {
    const [showDelete, setShowDelete] = useState(false);
    const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
        id: `note:${note.id}`,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
    } : undefined;

    // Handle click separately - only trigger if not dragging
    const handleClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!isDragging) {
            onSelect();
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={handleClick}
            onMouseEnter={() => setShowDelete(true)}
            onMouseLeave={() => setShowDelete(false)}
            className={cn(
                'flex items-center gap-1 cursor-grab active:cursor-grabbing select-none',
                nested && 'ml-4',
                isDragging && 'opacity-50 shadow-lg bg-sidebar-accent rounded-lg'
            )}
        >
            <div
                className={cn(
                    'flex flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm',
                    'transition-colors duration-150',
                    isSelected
                        ? 'bg-sidebar-accent text-sidebar-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                )}
            >
                <FileTextIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 truncate text-left">{note.title || 'Untitled'}</span>
                {showIndicator && (
                    <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                )}
            </div>

            <AnimatePresence>
                {showDelete && !isDragging && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this note?')) onDelete();
                        }}
                        className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex-shrink-0 mr-1"
                    >
                        <TrashIcon className="h-3.5 w-3.5" />
                    </motion.button>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// Droppable Folder - sortable + accepts note drops
// ============================================

interface DroppableFolderProps {
    folder: Folder;
    notes: Note[];
    expanded: boolean;
    onToggle: () => void;
    selectedNoteId: string | null;
    onSelectNote: (id: string) => void;
    onDeleteNote: (id: string) => void;
    onDeleteFolder: (id: string) => void;
}

function DroppableFolder({
    folder,
    notes,
    expanded,
    onToggle,
    selectedNoteId,
    onSelectNote,
    onDeleteNote,
    onDeleteFolder,
}: DroppableFolderProps) {
    const [showDelete, setShowDelete] = useState(false);

    // Sortable for folder reordering
    const {
        attributes,
        listeners,
        setNodeRef: setSortableRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: folder.id });

    // Droppable for receiving notes - separate element
    const { setNodeRef: setDroppableRef, isOver } = useDroppable({
        id: `folder:${folder.id}`,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setSortableRef} style={style}>
            {/* This div is the drop target for notes */}
            <div
                ref={setDroppableRef}
                onMouseEnter={() => setShowDelete(true)}
                onMouseLeave={() => setShowDelete(false)}
                className={cn(
                    'flex items-center gap-1 rounded-lg transition-colors',
                    isOver && 'bg-primary/30 ring-2 ring-primary/50'
                )}
            >
                {/* Drag Handle */}
                <button
                    {...attributes}
                    {...listeners}
                    className="p-1 cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground"
                >
                    <GripVerticalIcon className="h-3 w-3" />
                </button>

                <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={onToggle}
                    className={cn(
                        'flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground',
                        'transition-colors duration-150 hover:bg-sidebar-accent/50'
                    )}
                >
                    <motion.span
                        animate={{ rotate: expanded ? 90 : 0 }}
                        transition={{ duration: 0.15 }}
                        className="h-4 w-4 text-muted-foreground flex-shrink-0 flex items-center justify-center"
                    >
                        <ChevronRightIcon className="h-3 w-3" />
                    </motion.span>
                    <FolderIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 truncate text-left">{folder.name}</span>
                    <span className="text-xs text-muted-foreground/70">{notes.length}</span>
                </motion.button>

                <AnimatePresence>
                    {showDelete && (
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('Delete this folder? Notes inside will be moved to Unsorted.')) {
                                    onDeleteFolder(folder.id);
                                }
                            }}
                            className="p-1 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive flex-shrink-0 mr-1"
                        >
                            <TrashIcon className="h-3.5 w-3.5" />
                        </motion.button>
                    )}
                </AnimatePresence>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        {notes.length === 0 ? (
                            <div className="ml-8 px-2.5 py-1 text-xs text-muted-foreground italic">
                                Empty folder
                            </div>
                        ) : (
                            notes.map(note => (
                                <DraggableNote
                                    key={note.id}
                                    note={note}
                                    isSelected={selectedNoteId === note.id}
                                    onSelect={() => onSelectNote(note.id)}
                                    onDelete={() => onDeleteNote(note.id)}
                                    nested
                                />
                            ))
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
