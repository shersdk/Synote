import { useState, useCallback, useEffect, useRef } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Sidebar } from '@/components/layout/Sidebar';
import { MainContent } from '@/components/layout/MainContent';
import { Editor } from '@/components/editor/Editor';
import { ChatPanel } from '@/components/chat/ChatPanel';
import { SettingsModal } from '@/components/settings/SettingsModal';
import { NotesProvider, useNotes } from '@/hooks/useNotes';
import { FileTextIcon } from 'lucide-react';

function AppContent() {
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const { selectedNote, updateNote, createNote, refreshNotes, refreshFolders } = useNotes();

    const [localTitle, setLocalTitle] = useState('');
    const [localContent, setLocalContent] = useState('');
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Sync local state with selected note
    useEffect(() => {
        if (selectedNote) {
            setLocalTitle(selectedNote.title || '');
            setLocalContent(selectedNote.content || '');
        } else {
            setLocalTitle('');
            setLocalContent('');
        }
    }, [selectedNote?.id]); // Only reset when note ID changes

    // Debounced save for content
    const handleContentChange = useCallback((content: string) => {
        setLocalContent(content);

        if (!selectedNote) return;

        // Clear existing timeout
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }

        // Debounce save by 1 second
        saveTimeoutRef.current = setTimeout(() => {
            updateNote(selectedNote.id, { content });
        }, 1000);
    }, [selectedNote, updateNote]);

    // Save title on blur
    const handleTitleBlur = useCallback(() => {
        if (selectedNote && localTitle !== selectedNote.title) {
            updateNote(selectedNote.id, { title: localTitle });
        }
    }, [selectedNote, localTitle, updateNote]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeoutRef.current) {
                clearTimeout(saveTimeoutRef.current);
            }
        };
    }, []);

    // Load color theme on startup
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await window.electronAPI?.settings.getColorTheme();
                if (savedTheme) {
                    document.documentElement.classList.remove('theme-blue', 'theme-purple', 'theme-green');
                    document.documentElement.classList.add(`theme-${savedTheme}`);
                }
            } catch (err) {
                console.error('Failed to load theme:', err);
            }
        };
        loadTheme();
    }, []);

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-background">
                <Sidebar
                    onOpenChat={() => setIsChatOpen(true)}
                    onOpenSettings={() => setIsSettingsOpen(true)}
                />
                <MainContent>
                    {selectedNote ? (
                        <div className="max-w-3xl mx-auto">
                            {/* Note Title */}
                            <input
                                type="text"
                                placeholder="Untitled"
                                value={localTitle}
                                onChange={(e) => setLocalTitle(e.target.value)}
                                onBlur={handleTitleBlur}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.currentTarget.blur();
                                    }
                                }}
                                className="w-full text-4xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 mb-6"
                            />

                            {/* Editor */}
                            <Editor
                                key={selectedNote.id}
                                content={localContent}
                                onChange={handleContentChange}
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <FileTextIcon className="h-16 w-16 mb-4 opacity-30" />
                            <h2 className="text-xl font-medium mb-2">No note selected</h2>
                            <p className="text-sm mb-4">Select a note from the sidebar or create a new one</p>
                            <button
                                onClick={() => createNote()}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Create New Note
                            </button>
                        </div>
                    )}
                </MainContent>

                {/* AI Chat Panel */}
                <ChatPanel
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    onActionsPerformed={async () => {
                        // Refresh notes and folders when AI performs actions
                        await Promise.all([refreshNotes(), refreshFolders()]);
                    }}
                />

                {/* Settings Modal */}
                <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
            </div>
        </TooltipProvider>
    );
}

function App() {
    return (
        <NotesProvider>
            <AppContent />
        </NotesProvider>
    );
}

export default App;
