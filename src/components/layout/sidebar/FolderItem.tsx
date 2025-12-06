import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { FolderIcon, ChevronRightIcon, TrashIcon, GripVerticalIcon } from 'lucide-react';
import { NoteItem } from './NoteItem';
import type { Note, Folder } from '@/hooks/useNotes';

interface FolderItemProps {
    folder: Folder;
    notes: Note[];
    expanded: boolean;
    onToggle: () => void;
    selectedNoteId: string | null;
    onSelectNote: (id: string) => void;
    onDeleteNote: (id: string) => void;
    onDeleteFolder: (id: string) => void;
}

export function FolderItem({
    folder,
    notes,
    expanded,
    onToggle,
    selectedNoteId,
    onSelectNote,
    onDeleteNote,
    onDeleteFolder,
}: FolderItemProps) {
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

    // Droppable for receiving notes
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
