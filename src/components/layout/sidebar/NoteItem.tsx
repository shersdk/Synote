import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { FileTextIcon, TrashIcon } from 'lucide-react';
import type { Note } from '@/hooks/useNotes';

interface NoteItemProps {
    note: Note;
    isSelected: boolean;
    onSelect: () => void;
    onDelete: () => void;
    showIndicator?: boolean;
    nested?: boolean;
}

export function NoteItem({ note, isSelected, onSelect, onDelete, showIndicator, nested }: NoteItemProps) {
    const [showDelete, setShowDelete] = useState(false);
    const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({
        id: `note:${note.id}`,
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
    } : undefined;

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
