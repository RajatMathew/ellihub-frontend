import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type ReactNode,
} from 'react';

import { cn } from '@/app/lib/utils';
import {
  EmailRichTextToolbar,
  type EmailRichTextCommand,
} from '@/modules/email/components/email-rich-text-toolbar';
import {
  isEmptyEmailHtml,
  normalizePastedEmailHtml,
  plainTextToPastedHtml,
} from '@/modules/email/lib/email-rich-text';

/**
 * The composer body. A plain contenteditable rather than an editor framework:
 * frameworks model documents with a schema and silently discard whatever the
 * schema does not describe, which is exactly how a pasted table disappears. Here
 * the browser keeps the pasted structure and the sanitizer decides what stays.
 */
interface EmailRichTextEditorProps {
  id: string;
  value: string;
  placeholder: string;
  /** Accessible name — the field has no visible label in the composer. */
  label: string;
  disabled?: boolean;
  className?: string;
  /** Applied to the editable region itself — the composers size it differently. */
  editorClassName?: string;
  /**
   * The writing surface's padding. It lands on the editable region **and** on
   * the placeholder, which is absolutely positioned over it: put the padding in
   * `editorClassName` instead and the placeholder starts flush against the edge
   * while the caret starts one indent in.
   */
  contentClassName?: string;
  onChange: (html: string) => void;
  /** Files pasted or dropped onto the body become attachments, not body content. */
  onFilesSelected?: (files: FileList) => void;
  /**
   * Rendered on the toolbar's own row, pushed to the far end. Send and the
   * "where this lands" hint sit here rather than in a third bar of their own —
   * the design gives the composer one footer, not two.
   */
  toolbarTrailing?: ReactNode;
  /** Wraps the toolbar row; the composers give it their own background. */
  toolbarClassName?: string;
}

const TOGGLABLE_COMMANDS: readonly EmailRichTextCommand[] = [
  'bold',
  'italic',
  'underline',
  'insertUnorderedList',
  'insertOrderedList',
];

/**
 * Pasted markup arrives without a stylesheet, so the editor supplies the browser
 * defaults Tailwind's reset removes. Inline styles from the source outrank these,
 * which is what keeps a sender's own table borders and spacing intact.
 */
const PASTED_CONTENT_CLASSES = [
  '[&_p]:my-2 [&_div]:min-w-0',
  '[&_ul]:my-2 [&_ul]:list-disc [&_ul]:ps-6 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:ps-6',
  '[&_li]:my-0.5 [&_ul_ul]:my-0 [&_ol_ol]:my-0',
  '[&_table]:my-2 [&_table]:border-collapse',
  '[&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1',
  '[&_th]:border [&_th]:border-border [&_th]:px-2 [&_th]:py-1 [&_th]:font-medium',
  '[&_blockquote]:my-2 [&_blockquote]:border-s-2 [&_blockquote]:border-border [&_blockquote]:ps-3',
  '[&_blockquote]:text-muted-foreground',
  '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
  '[&_h1]:my-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:my-2 [&_h2]:text-base [&_h2]:font-semibold',
  '[&_h3]:my-2 [&_h3]:text-sm [&_h3]:font-semibold',
  '[&_img]:h-auto [&_img]:max-w-full',
  '[&_pre]:my-2 [&_pre]:whitespace-pre-wrap [&_hr]:my-3 [&_hr]:border-border',
].join(' ');

export function EmailRichTextEditor({
  id,
  value,
  placeholder,
  label,
  disabled = false,
  className,
  editorClassName,
  contentClassName,
  onChange,
  onFilesSelected,
  toolbarTrailing,
  toolbarClassName,
}: EmailRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  // What React last received from this editor. Anything else in `value` is an
  // outside change (a draft loading) and has to be written into the DOM.
  const lastEmittedHtmlRef = useRef<string | null>(null);
  const [activeCommands, setActiveCommands] = useState<ReadonlySet<EmailRichTextCommand>>(
    () => new Set()
  );

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;
    lastEmittedHtmlRef.current = editor.innerHTML;
    onChange(editor.innerHTML);
  }, [onChange]);

  const refreshActiveCommands = useCallback(() => {
    const editor = editorRef.current;
    const anchorNode = document.getSelection()?.anchorNode;
    if (!editor || !anchorNode || !editor.contains(anchorNode)) return;

    const next = new Set<EmailRichTextCommand>();
    for (const command of TOGGLABLE_COMMANDS) {
      try {
        if (document.queryCommandState(command)) next.add(command);
      } catch {
        // Older engines throw for commands they do not implement.
      }
    }
    setActiveCommands(next);
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || value === lastEmittedHtmlRef.current) return;
    lastEmittedHtmlRef.current = value;
    editor.innerHTML = value;
  }, [value]);

  useEffect(() => {
    try {
      // Produces <b>/<i> instead of styled spans — far friendlier to mail clients.
      document.execCommand('styleWithCSS', false, 'false');
    } catch {
      // Not supported everywhere; the fallback markup is still valid.
    }
    document.addEventListener('selectionchange', refreshActiveCommands);
    return () => document.removeEventListener('selectionchange', refreshActiveCommands);
  }, [refreshActiveCommands]);

  const insertSanitizedHtml = useCallback(
    (html: string) => {
      if (!html) return;
      document.execCommand('insertHTML', false, html);
      emitChange();
    },
    [emitChange]
  );

  const runCommand = useCallback(
    (command: EmailRichTextCommand) => {
      editorRef.current?.focus();
      if (command === 'blockquote') {
        document.execCommand('formatBlock', false, 'blockquote');
      } else {
        document.execCommand(command);
      }
      emitChange();
      refreshActiveCommands();
    },
    [emitChange, refreshActiveCommands]
  );

  const handlePaste = (event: ClipboardEvent<HTMLDivElement>) => {
    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const html = clipboard.getData('text/html');
    const text = clipboard.getData('text/plain');
    if (!html && !text && clipboard.files.length > 0) {
      event.preventDefault();
      onFilesSelected?.(clipboard.files);
      return;
    }

    // Never let the browser insert clipboard HTML directly — it would carry the
    // source's scripts and handlers straight into the draft we later send.
    event.preventDefault();
    insertSanitizedHtml(html ? normalizePastedEmailHtml(html) : plainTextToPastedHtml(text));
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    const transfer = event.dataTransfer;
    if (!transfer) return;
    // The dialog also listens for drops; a drop handled here is handled once.
    event.preventDefault();
    event.stopPropagation();

    if (transfer.files.length > 0) {
      onFilesSelected?.(transfer.files);
      return;
    }
    const html = transfer.getData('text/html');
    insertSanitizedHtml(
      html ? normalizePastedEmailHtml(html) : plainTextToPastedHtml(transfer.getData('text/plain'))
    );
  };

  return (
    <div className={cn('flex min-h-0 flex-col gap-2', className)}>
      {/* Only the writing surface scrolls; the toolbar below stays put
          however long the message gets (elli-ui#807). */}
      <div className="relative min-h-0 flex-1 overflow-y-auto">
        {isEmptyEmailHtml(value) && (
          <p
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 truncate text-sm leading-6 text-muted-foreground/70',
              contentClassName
            )}
          >
            {placeholder}
          </p>
        )}
        <div
          ref={editorRef}
          id={id}
          role="textbox"
          aria-multiline="true"
          aria-label={label}
          aria-disabled={disabled || undefined}
          tabIndex={0}
          contentEditable={!disabled}
          spellCheck
          className={cn(
            'min-h-full w-full min-w-0 overflow-x-auto text-sm leading-6 text-foreground outline-none',
            'focus-visible:outline-none',
            PASTED_CONTENT_CLASSES,
            contentClassName,
            editorClassName
          )}
          onInput={emitChange}
          onBlur={emitChange}
          onPaste={handlePaste}
          onDrop={handleDrop}
          onKeyUp={refreshActiveCommands}
          onMouseUp={refreshActiveCommands}
        />
      </div>
      <div className={cn('flex min-w-0 shrink-0 flex-nowrap items-center gap-2', toolbarClassName)}>
        <EmailRichTextToolbar
          className="shrink-0 flex-nowrap"
          activeCommands={activeCommands}
          disabled={disabled}
          onCommand={runCommand}
        />
        {toolbarTrailing && (
          <div className="ms-auto flex min-w-0 items-center gap-3">{toolbarTrailing}</div>
        )}
      </div>
    </div>
  );
}
