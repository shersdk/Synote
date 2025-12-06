import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';
import { SlashCommands, getSuggestionItems, renderSuggestion } from './SlashCommands';

interface EditorProps {
    className?: string;
    content?: string;
    onChange?: (content: string) => void;
    placeholder?: string;
}

export function Editor({
    className,
    content = '',
    onChange,
    placeholder = "Start writing, or type '/' for commands..."
}: EditorProps) {
    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: {
                    levels: [1, 2, 3],
                },
            }),
            Placeholder.configure({
                placeholder,
                emptyEditorClass: 'is-editor-empty',
            }),
            SlashCommands.configure({
                suggestion: {
                    items: getSuggestionItems,
                    render: renderSuggestion,
                },
            }),
        ],
        content,
        editorProps: {
            attributes: {
                class: cn(
                    'prose prose-zinc dark:prose-invert prose-headings:font-semibold',
                    'prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl',
                    'prose-p:leading-relaxed prose-p:my-2',
                    'prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm',
                    'prose-pre:bg-muted prose-pre:rounded-lg prose-pre:p-4',
                    'prose-blockquote:border-l-4 prose-blockquote:border-muted-foreground/30 prose-blockquote:pl-4 prose-blockquote:italic',
                    'prose-ul:list-disc prose-ol:list-decimal',
                    'max-w-none focus:outline-none min-h-[calc(100vh-200px)]'
                ),
            },
        },
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML());
        },
    });

    // Update editor content when prop changes (for loading different notes)
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content);
        }
    }, [content, editor]);

    return (
        <div className={cn('relative', className)}>
            <EditorContent editor={editor} />
        </div>
    );
}
