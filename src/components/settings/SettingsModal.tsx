import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    XIcon,
    KeyIcon,
    FolderIcon,
    CheckIcon,
    Loader2Icon,
    EyeIcon,
    EyeOffIcon,
    AlertCircleIcon,
    BrainIcon,
    PaletteIcon,
} from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [hasApiKey, setHasApiKey] = useState(false);
    const [notesDir, setNotesDir] = useState('');
    const [model, setModel] = useState('');
    const [colorTheme, setColorTheme] = useState('blue');
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [modelSaveSuccess, setModelSaveSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadSettings();
        }
    }, [isOpen]);

    const loadSettings = async () => {
        try {
            const hasKey = await window.electronAPI?.apiKey.has();
            setHasApiKey(hasKey || false);

            const dir = await window.electronAPI?.settings.getNotesDir();
            setNotesDir(dir || '');

            const savedModel = await window.electronAPI?.settings.getModel();
            setModel(savedModel || '');

            const savedTheme = await window.electronAPI?.settings.getColorTheme();
            setColorTheme(savedTheme || 'blue');
            applyTheme(savedTheme || 'blue');
        } catch (err) {
            console.error('Failed to load settings:', err);
        }
    };

    const handleSaveApiKey = async () => {
        if (!apiKey.trim()) return;

        setIsSaving(true);
        setError(null);
        setSaveSuccess(false);

        try {
            await window.electronAPI?.apiKey.set(apiKey);
            setHasApiKey(true);
            setApiKey('');
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to save API key');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteApiKey = async () => {
        try {
            await window.electronAPI?.apiKey.delete();
            setHasApiKey(false);
        } catch (err: any) {
            setError(err.message || 'Failed to delete API key');
        }
    };

    const handleSaveModel = async () => {
        if (!model.trim()) return;
        try {
            await window.electronAPI?.settings.setModel(model);
            setModelSaveSuccess(true);
            setTimeout(() => setModelSaveSuccess(false), 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to save model');
        }
    };

    const applyTheme = (theme: string) => {
        const html = document.documentElement;
        html.classList.remove('theme-blue', 'theme-purple', 'theme-green');
        html.classList.add(`theme-${theme}`);
    };

    const handleSetColorTheme = async (theme: string) => {
        setColorTheme(theme);
        applyTheme(theme);
        await window.electronAPI?.settings.setColorTheme(theme);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop with flexbox centering */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        {/* Modal */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            onClick={(e) => e.stopPropagation()}
                            className={cn(
                                'w-full max-w-md max-h-full rounded-xl',
                                'bg-background border border-border shadow-2xl',
                                'flex flex-col overflow-hidden'
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between border-b border-border px-6 py-4 flex-shrink-0">
                                <h2 className="text-lg font-semibold">Settings</h2>
                                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                                    <XIcon className="h-4 w-4" />
                                </Button>
                            </div>

                            {/* Content - scrollable */}
                            <div className="p-6 space-y-6 overflow-y-auto flex-1">
                                {/* API Key Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <KeyIcon className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">OpenRouter API Key</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Required for AI chat. Your key is stored securely in the system keychain.
                                    </p>

                                    {hasApiKey ? (
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-md bg-muted">
                                                <CheckIcon className="h-4 w-4 text-green-500" />
                                                <span className="text-sm">API key configured</span>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleDeleteApiKey}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <div className="relative">
                                                <Input
                                                    type={showApiKey ? 'text' : 'password'}
                                                    value={apiKey}
                                                    onChange={(e) => setApiKey(e.target.value)}
                                                    placeholder="sk-or-..."
                                                    className="pr-10"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowApiKey(!showApiKey)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {showApiKey ? (
                                                        <EyeOffIcon className="h-4 w-4" />
                                                    ) : (
                                                        <EyeIcon className="h-4 w-4" />
                                                    )}
                                                </button>
                                            </div>
                                            <Button
                                                onClick={handleSaveApiKey}
                                                disabled={!apiKey.trim() || isSaving}
                                                className="w-full"
                                            >
                                                {isSaving ? (
                                                    <>
                                                        <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                                                        Saving...
                                                    </>
                                                ) : saveSuccess ? (
                                                    <>
                                                        <CheckIcon className="h-4 w-4 mr-2" />
                                                        Saved!
                                                    </>
                                                ) : (
                                                    'Save API Key'
                                                )}
                                            </Button>
                                        </div>
                                    )}

                                    {error && (
                                        <div className="flex items-center gap-2 text-sm text-destructive">
                                            <AlertCircleIcon className="h-4 w-4" />
                                            {error}
                                        </div>
                                    )}
                                </div>

                                {/* Notes Directory Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <FolderIcon className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">Notes Directory</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Your notes are stored as Markdown files in this location.
                                    </p>
                                    <div className="px-3 py-2 rounded-md bg-muted text-sm font-mono truncate">
                                        {notesDir || 'Loading...'}
                                    </div>
                                </div>

                                {/* AI Model Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <BrainIcon className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">AI Model</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        OpenRouter model ID (e.g., openai/gpt-4o-mini)
                                    </p>
                                    <div className="flex gap-2">
                                        <Input
                                            value={model}
                                            onChange={(e) => setModel(e.target.value)}
                                            placeholder="arcee-ai/trinity-mini:free"
                                            className="flex-1 font-mono text-sm"
                                        />
                                        <Button
                                            onClick={handleSaveModel}
                                            disabled={!model.trim()}
                                            size="sm"
                                        >
                                            {modelSaveSuccess ? <CheckIcon className="h-4 w-4" /> : 'Save'}
                                        </Button>
                                    </div>
                                </div>

                                {/* Color Theme Section */}
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                        <PaletteIcon className="h-4 w-4 text-muted-foreground" />
                                        <h3 className="font-medium">Color Theme</h3>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                        Choose a color scheme for the app.
                                    </p>
                                    <div className="grid grid-cols-3 gap-2">
                                        <button
                                            onClick={() => handleSetColorTheme('blue')}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${colorTheme === 'blue'
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-muted-foreground/50'
                                                }`}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-blue-700" />
                                            <span className="text-xs">Dark Blue</span>
                                        </button>
                                        <button
                                            onClick={() => handleSetColorTheme('purple')}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${colorTheme === 'purple'
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-muted-foreground/50'
                                                }`}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-purple-700" />
                                            <span className="text-xs">Purple</span>
                                        </button>
                                        <button
                                            onClick={() => handleSetColorTheme('green')}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-lg border transition-all ${colorTheme === 'green'
                                                    ? 'border-primary bg-primary/10'
                                                    : 'border-border hover:border-muted-foreground/50'
                                                }`}
                                        >
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700" />
                                            <span className="text-xs">Green</span>
                                        </button>
                                    </div>
                                </div>

                                {/* About Section */}
                                <div className="pt-4 border-t border-border">
                                    <div className="text-center text-sm text-muted-foreground">
                                        <p className="font-medium text-foreground">Synote</p>
                                        <p>A beautiful note-taking app for macOS</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
