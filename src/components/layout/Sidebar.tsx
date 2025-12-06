import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useNotes, Note, Folder } from '@/hooks/useNotes';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
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
    } = useNotes();

    const [isCreating, setIsCreating] = useState(false);
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');
    const [orderedFolderIds, setOrderedFolderIds] = useState<string[]>([]);
    const folderInputRef = useRef<HTMLInputElement>(null);

    // Sync ordered folder IDs when folders change
    useEffect(() => {
        const currentIds = folders.map(f => f.id);
        const orderedIds = orderedFolderIds.filter(id => currentIds.includes(id));
        const newIds = currentIds.filter(id => !orderedFolderIds.includes(id));
        // New folders go at the top
        setOrderedFolderIds([...newIds, ...orderedIds]);
    }, [folders]);

    useEffect(() => {
        if (isCreatingFolder && folderInputRef.current) {
            folderInputRef.current.focus();
        }
    }, [isCreatingFolder]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
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

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setOrderedFolderIds((items) => {
                const oldIndex = items.indexOf(active.id as string);
                const newIndex = items.indexOf(over.id as string);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const rootNotes = notes.filter(n => !n.folderId);
    const getNotesForFolder = (folderId: string) =>
        notes.filter(n => n.folderId === folderId);

    // Get folders in the user's custom order
    const orderedFolders = orderedFolderIds
        .map(id => folders.find(f => f.id === id))
        .filter((f): f is Folder => f !== undefined);

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
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground hover:bg-sidebar-accent/50 h-9"
                >
                    <SearchIcon className="h-4 w-4" />
                    <span className="text-sm">Search notes...</span>
                    <kbd className="ml-auto hidden text-[10px] text-muted-foreground/70 bg-muted/50 px-1.5 py-0.5 rounded sm:inline-block">
                        ⌘K
                    </kbd>
                </Button>
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
                    onClick={() => {
                        console.log('AI Chat button clicked');
                        onOpenChat?.();
                    }}
                    title="AI Chat"
                >
                    <SparklesIcon className="h-3.5 w-3.5" />
                </Button>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 bg-sidebar-accent/30 border-sidebar-border/50 hover:bg-sidebar-accent/60"
                    onClick={() => {
                        console.log('New Folder button clicked');
                        setIsCreatingFolder(true);
                    }}
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
                    ) : (
                        <>
                            {/* All Notes header */}
                            <div className="px-2.5 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                All Notes ({notes.length})
                            </div>

                            {/* New Folder Input - Inline at top of folder list */}
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
                                                    onBlur={() => {
                                                        // Small delay to allow button clicks
                                                        setTimeout(() => {
                                                            if (!newFolderName.trim()) {
                                                                handleCancelFolder();
                                                            }
                                                        }, 150);
                                                    }}
                                                    placeholder="Folder name..."
                                                    className="h-6 text-sm bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                                                />
                                            </div>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 shrink-0"
                                                onClick={handleCreateFolder}
                                            >
                                                <CheckIcon className="h-3.5 w-3.5" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="h-7 w-7 shrink-0"
                                                onClick={handleCancelFolder}
                                            >
                                                <XIcon className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Folders with Drag and Drop */}
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={orderedFolderIds}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {orderedFolders.map(folder => (
                                        <SortableFolderItem
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
                            </DndContext>

                            {/* Root level notes */}
                            {rootNotes.length > 0 && (
                                <>
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
                                        />
                                    ))}
                                </>
                            )}

                            {/* Empty state */}
                            {notes.length === 0 && folders.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                    <FileTextIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                    <p>No notes yet</p>
                                    <p className="text-xs">Click "New Note" to get started</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </ScrollArea>

            {/* Footer */}
            <div className="border-t border-sidebar-border/50 p-3">
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 text-muted-foreground h-9 hover:bg-sidebar-accent/50"
                    onClick={() => {
                        console.log('Settings button clicked');
                        onOpenSettings?.();
                    }}
                >
                    <SettingsIcon className="h-4 w-4" />
                    <span className="text-sm">Settings</span>
                </Button>
            </div>
        </motion.aside>
    );
}

interface NoteItemProps {
    note: Note;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    nested?: boolean;
}

function NoteItem({ note, isSelected, onSelect, onDelete, nested }: NoteItemProps) {
    const [showDelete, setShowDelete] = useState(false);

    return (
        <div
            onMouseEnter={() => setShowDelete(true)}
            onMouseLeave={() => setShowDelete(false)}
            className={cn('flex items-center gap-1', nested && 'ml-4')}
        >
            <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={onSelect}
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
            </motion.button>

            <AnimatePresence>
                {showDelete && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this note?')) {
                                onDelete();
                            }
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

interface SortableFolderItemProps {
    folder: Folder;
    notes: Note[];
    expanded: boolean;
    onToggle: () => void;
    selectedNoteId: string | null;
    onSelectNote: (id: string) => void;
    onDeleteNote: (id: string) => void;
    onDeleteFolder: (id: string) => void;
}

function SortableFolderItem({
    folder,
    notes,
    expanded,
    onToggle,
    selectedNoteId,
    onSelectNote,
    onDeleteNote,
    onDeleteFolder,
}: SortableFolderItemProps) {
    const [showDelete, setShowDelete] = useState(false);
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: folder.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div ref={setNodeRef} style={style}>
            <div
                onMouseEnter={() => setShowDelete(true)}
                onMouseLeave={() => setShowDelete(false)}
                className="flex items-center gap-1"
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
                                <NoteItem
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
