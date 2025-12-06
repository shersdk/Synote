import { cn } from '@/lib/utils';

interface MainContentProps {
    className?: string;
    children?: React.ReactNode;
}

export function MainContent({ className, children }: MainContentProps) {
    return (
        <main
            className={cn(
                'ml-[280px] min-h-screen bg-background flex flex-col',
                className
            )}
        >
            {/* Drag region for window title bar area */}
            <div className="h-[52px] w-full app-drag-region flex-shrink-0" />

            {/* Content */}
            <div className="px-8 py-4 flex-1 flex flex-col">
                {children}
            </div>
        </main>
    );
}
