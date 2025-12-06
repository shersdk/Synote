import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useState,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
    Heading1Icon,
    Heading2Icon,
    Heading3Icon,
    ListIcon,
    ListOrderedIcon,
    CodeIcon,
    QuoteIcon,
    MinusIcon,
} from 'lucide-react';
import type { SlashCommandItem } from './SlashCommands';

const iconMap: Record<string, React.ReactNode> = {
    'Heading 1': <Heading1Icon className="h-4 w-4" />,
    'Heading 2': <Heading2Icon className="h-4 w-4" />,
    'Heading 3': <Heading3Icon className="h-4 w-4" />,
    'Bullet List': <ListIcon className="h-4 w-4" />,
    'Numbered List': <ListOrderedIcon className="h-4 w-4" />,
    'Code Block': <CodeIcon className="h-4 w-4" />,
    'Quote': <QuoteIcon className="h-4 w-4" />,
    'Divider': <MinusIcon className="h-4 w-4" />,
};

export interface SlashCommandListRef {
    onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

interface SlashCommandListProps {
    items: SlashCommandItem[];
    command: (item: SlashCommandItem) => void;
}

export const SlashCommandList = forwardRef<SlashCommandListRef, SlashCommandListProps>(
    ({ items, command }, ref) => {
        const [selectedIndex, setSelectedIndex] = useState(0);

        const selectItem = (index: number) => {
            const item = items[index];
            if (item) {
                command(item);
            }
        };

        const upHandler = () => {
            setSelectedIndex((selectedIndex + items.length - 1) % items.length);
        };

        const downHandler = () => {
            setSelectedIndex((selectedIndex + 1) % items.length);
        };

        const enterHandler = () => {
            selectItem(selectedIndex);
        };

        useEffect(() => setSelectedIndex(0), [items]);

        useImperativeHandle(ref, () => ({
            onKeyDown: ({ event }) => {
                if (event.key === 'ArrowUp') {
                    upHandler();
                    return true;
                }

                if (event.key === 'ArrowDown') {
                    downHandler();
                    return true;
                }

                if (event.key === 'Enter') {
                    enterHandler();
                    return true;
                }

                return false;
            },
        }));

        if (items.length === 0) {
            return null;
        }

        return (
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className={cn(
                    'z-50 min-w-[220px] overflow-hidden rounded-lg border border-border',
                    'bg-popover/95 backdrop-blur-xl p-1 shadow-lg'
                )}
            >
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Basic blocks
                </div>
                <AnimatePresence>
                    {items.map((item, index) => (
                        <motion.button
                            key={item.title}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => selectItem(index)}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm',
                                'transition-colors duration-100',
                                index === selectedIndex
                                    ? 'bg-accent text-accent-foreground'
                                    : 'hover:bg-accent/50'
                            )}
                        >
                            <div
                                className={cn(
                                    'flex h-8 w-8 items-center justify-center rounded-md',
                                    'bg-muted text-muted-foreground'
                                )}
                            >
                                {iconMap[item.title] || <CodeIcon className="h-4 w-4" />}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium">{item.title}</div>
                                <div className="text-xs text-muted-foreground">
                                    {item.description}
                                </div>
                            </div>
                        </motion.button>
                    ))}
                </AnimatePresence>
            </motion.div>
        );
    }
);

SlashCommandList.displayName = 'SlashCommandList';
