import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
    SparklesIcon,
    XIcon,
    SendIcon,
    UserIcon,
    BotIcon,
    Loader2Icon,
    CheckCircleIcon,
    CheckIcon,
    XCircleIcon,
} from 'lucide-react';

interface PendingAction {
    id: string;
    name: string;
    arguments: Record<string, any>;
    description: string;
}

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    actions?: string[];
    pendingActions?: PendingAction[];
}

interface ChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onActionsPerformed?: () => void;
}

export function ChatPanel({ isOpen, onClose, onActionsPerformed }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isExecuting, setIsExecuting] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: 'user',
            content: input.trim(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await window.electronAPI?.ai?.chat(
                messages.map((m) => ({ role: m.role, content: m.content })),
                userMessage.content
            );

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response?.content || 'Sorry, I could not generate a response.',
                pendingActions: response?.pendingActions || undefined,
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error: any) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `Error: ${error.message || 'Failed to get response.'}`,
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleApprove = async (messageId: string, pendingActions: PendingAction[]) => {
        setIsExecuting(true);

        try {
            const result = await window.electronAPI?.ai?.execute(
                pendingActions.map(a => ({ name: a.name, arguments: a.arguments }))
            );

            // Update message to show completed actions
            setMessages(prev => prev.map(m => {
                if (m.id === messageId) {
                    return {
                        ...m,
                        pendingActions: undefined,
                        actions: result?.actions || [],
                    };
                }
                return m;
            }));

            onActionsPerformed?.();
        } catch (error: any) {
            console.error('Failed to execute actions:', error);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleDeny = (messageId: string) => {
        setMessages(prev => prev.map(m => {
            if (m.id === messageId) {
                return {
                    ...m,
                    pendingActions: undefined,
                    content: m.content + ' (Cancelled)',
                };
            }
            return m;
        }));
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed right-0 top-0 z-50 flex h-screen w-[400px] flex-col bg-background border-l border-border shadow-2xl"
            style={{ pointerEvents: 'auto' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <SparklesIcon className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-sm font-semibold">AI Assistant</h2>
                        <p className="text-xs text-muted-foreground">Ask anything about your notes</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-accent transition-colors cursor-pointer"
                    style={{ pointerEvents: 'auto', WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    <XIcon className="h-4 w-4" />
                </button>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
                                <SparklesIcon className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="font-medium mb-1">How can I help?</h3>
                            <p className="text-sm text-muted-foreground max-w-[250px]">
                                Ask me to organize your notes or answer questions.
                            </p>
                        </div>
                    )}

                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={cn(
                                'flex gap-3',
                                message.role === 'user' ? 'flex-row-reverse' : ''
                            )}
                        >
                            <div
                                className={cn(
                                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                                    message.role === 'user' ? 'bg-primary' : 'bg-muted'
                                )}
                            >
                                {message.role === 'user' ? (
                                    <UserIcon className="h-4 w-4 text-primary-foreground" />
                                ) : (
                                    <BotIcon className="h-4 w-4 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2 max-w-[280px]">
                                <div
                                    className={cn(
                                        'rounded-2xl px-4 py-2 text-sm',
                                        message.role === 'user'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                    )}
                                >
                                    {message.content}
                                </div>

                                {/* Pending Actions with Approve/Deny */}
                                {message.pendingActions && message.pendingActions.length > 0 && (
                                    <div className="rounded-xl bg-muted/50 border border-border p-3 space-y-2">
                                        <div className="space-y-1">
                                            {message.pendingActions.map((action, idx) => (
                                                <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                                    <span>{action.description}</span>
                                                </div>
                                            ))}
                                        </div>
                                        {/* Minimalist approve/deny buttons */}
                                        <div className="flex gap-2 pt-1">
                                            <button
                                                onClick={() => handleApprove(message.id, message.pendingActions!)}
                                                disabled={isExecuting}
                                                className="flex-1 h-8 rounded-lg bg-green-500/20 hover:bg-green-500/30 flex items-center justify-center transition-colors disabled:opacity-50"
                                            >
                                                {isExecuting ? (
                                                    <Loader2Icon className="h-4 w-4 text-green-500 animate-spin" />
                                                ) : (
                                                    <CheckIcon className="h-4 w-4 text-green-500" />
                                                )}
                                            </button>
                                            <button
                                                onClick={() => handleDeny(message.id)}
                                                disabled={isExecuting}
                                                className="flex-1 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center transition-colors disabled:opacity-50"
                                            >
                                                <XCircleIcon className="h-4 w-4 text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Completed actions */}
                                {message.actions && message.actions.length > 0 && (
                                    <div className="space-y-1 px-2">
                                        {message.actions.map((action, idx) => (
                                            <div key={idx} className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                                                <CheckCircleIcon className="h-3 w-3" />
                                                <span>{action}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex gap-3">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                                <Loader2Icon className="h-4 w-4 text-muted-foreground animate-spin" />
                            </div>
                            <div className="rounded-2xl bg-muted px-4 py-2 text-sm">
                                Thinking...
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input */}
            <form onSubmit={handleSubmit} className="border-t border-border p-4">
                <div className="flex gap-2">
                    <Input
                        ref={inputRef}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask about your notes..."
                        className="flex-1"
                        disabled={isLoading || isExecuting}
                    />
                    <Button type="submit" size="icon" disabled={isLoading || !input.trim() || isExecuting}>
                        <SendIcon className="h-4 w-4" />
                    </Button>
                </div>
            </form>
        </div>
    );
}
