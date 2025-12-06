import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';

interface UnsortedDropZoneProps {
    children: React.ReactNode;
}

export function UnsortedDropZone({ children }: UnsortedDropZoneProps) {
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
