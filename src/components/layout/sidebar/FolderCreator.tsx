import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FolderIcon, CheckIcon, XIcon } from 'lucide-react';

interface FolderCreatorProps {
    isCreating: boolean;
    folderName: string;
    onFolderNameChange: (name: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export function FolderCreator({
    isCreating,
    folderName,
    onFolderNameChange,
    onConfirm,
    onCancel,
}: FolderCreatorProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isCreating && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isCreating]);

    if (!isCreating) return null;

    return (
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
                        ref={inputRef}
                        value={folderName}
                        onChange={(e) => onFolderNameChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onConfirm();
                            if (e.key === 'Escape') onCancel();
                        }}
                        placeholder="Folder name..."
                        className="h-6 text-sm bg-transparent border-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0"
                    />
                </div>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onConfirm}>
                    <CheckIcon className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={onCancel}>
                    <XIcon className="h-3.5 w-3.5" />
                </Button>
            </div>
        </motion.div>
    );
}
