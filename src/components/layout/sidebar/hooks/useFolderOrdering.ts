import { useState, useEffect } from 'react';
import { arrayMove } from '@dnd-kit/sortable';
import type { Folder } from '@/hooks/useNotes';

export function useFolderOrdering(folders: Folder[]) {
    const [orderedFolderIds, setOrderedFolderIds] = useState<string[]>([]);

    // Sync ordered folder IDs when folders change
    useEffect(() => {
        const currentIds = folders.map(f => f.id);
        const orderedIds = orderedFolderIds.filter(id => currentIds.includes(id));
        const newIds = currentIds.filter(id => !orderedFolderIds.includes(id));
        setOrderedFolderIds([...newIds, ...orderedIds]);
    }, [folders]);

    const reorderFolders = (activeId: string, overId: string) => {
        setOrderedFolderIds(items => {
            const oldIndex = items.indexOf(activeId);
            const newIndex = items.indexOf(overId);
            if (oldIndex !== -1 && newIndex !== -1) {
                return arrayMove(items, oldIndex, newIndex);
            }
            return items;
        });
    };

    const orderedFolders = orderedFolderIds
        .map(id => folders.find(f => f.id === id))
        .filter((f): f is Folder => f !== undefined);

    return {
        orderedFolderIds,
        orderedFolders,
        reorderFolders,
    };
}
