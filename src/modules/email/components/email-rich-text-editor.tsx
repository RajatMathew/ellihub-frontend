import { useCallback, useEffect, useRef, type ClipboardEvent, type ReactNode } from 'react';
import type { DragEvent } from 'react';

import { cn } from '@/app/lib/utils';
import { EmailRichTextToolbar } from '@/modules/email/components/email-rich-text-toolbar';
import {
  normalizePastedEmailHtml,
  plainTextToPastedHtml,
} from '@/modules/email/lib/email-rich-text';
import { isEmptyEmailBody } from '@/modules/email/lib/email-signature';
import { ContentEditable, type ContentEditableEvent } from 'react-simple-wysiwyg';

/**
 * The composer body.
 *
 * Built on `react-simple-wysiwyg` (elli-ui#929), which is a contenteditable and
 * `document.execCommand` underneath — the same model this editor already used
 * by hand. That matters more than it sounds: an editor with its own document
 * schema (ProseMirror/Tiptap, Lexical, Quill) parses pasted markup into its
 * model and **discards whatever the schema does not describe**, which is how a
 * table pasted out of Outlook or Excel silently loses its rows. Tiptap's own
 * FAQ says so and says it is not configurable. Mail is arbitrary HTML in and
 * arbitrary HTML out, so the editor has to be too; here the browser keeps the
 * pasted structure and `sanitizeEmailHtml` decides what stays.
 *
 * Only `ContentEditable` is used from it — the genuinely fiddly part, which
 * writes `value` into the DOM only when it differs from what it last emitted
 * and restores the caret afterwards. Its `Editor`, `Toolbar` and `Btn*` are
 * deliberately not: they carry `rsw-*` class names that the package's injected
 * stylesheet paints with light-mode literals, and `Editor` adds a wrapper div
 * that breaks the height chain this composer's scroller depends on. The
 * toolbar is ours (`email-rich-text-toolbar.tsx`), so the only rules left to
 * neutralize are the four on `.rsw-ce`.
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
  /**
   * Rendered inside the scrolling surface, directly under the writing area —
   * the reply's quoted original lives here (elli-ui#1176).
   *
   * Inside the scroller rather than after it so the reader scrolls from what
   * they are writing down into the history, the way a mail client reads, and
   * so the toolbar stays pinned regardless of how long the quote is.
   */
  belowContent?: ReactNode;
  /** Wraps the toolbar row; the composers give it their own background. */
  toolbarClassName?: string;
  /**
   * Controls that act on the body rather than format it — the signature menu —
   * after the formatting buttons. They bring their own divider, so one that
   * renders nothing leaves no stray separator behind.
   */
  toolbarExtras?: ReactNode;
}

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

/**
 * The signature block (email-signature.ts), set off from the message above it
 * with a top margin only — no frame of its own.
 */
const SIGNATURE_BLOCK_CLASSES = '[&_.elli-signature]:mt-3';

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
  belowContent,
  toolbarClassName,
  toolbarExtras,
}: EmailRichTextEditorProps) {
  /**
   * Every callback the clipboard handlers need, read at event time.
   *
   * `ContentEditable` memoises its rendered element on
   * `[className, disabled, placeholder, tagName]` only, so `onPaste` and
   * `onDrop` are captured on first render and never refreshed — a handler that
   * closed over `onFilesSelected` directly would still be calling the first
   * one it ever saw. Routing through a ref makes the captured handler
   * permanently correct instead of permanently stale.
   */
  const callbacksRef = useRef({ onChange, onFilesSelected });
  useEffect(() => {
    callbacksRef.current = { onChange, onFilesSelected };
  });

  const editorRef = useRef<HTMLDivElement>(null);

  /**
   * Pushes a toolbar-driven change into the draft.
   *
   * `execCommand` raises its own `input` event, but unwrapping a blockquote is
   * plain DOM surgery and raises nothing — so without this the quote would
   * disappear on screen and the draft would still be sent with it. Dispatching
   * the event rather than calling `onChange` directly keeps `ContentEditable`'s
   * own bookkeeping in step: it records the HTML it last emitted, and a value
   * arriving that it has not seen makes it rewrite the DOM and move the caret.
   */
  const emitFromDom = useCallback(() => {
    editorRef.current?.dispatchEvent(new Event('input', { bubbles: true }));
  }, []);

  const insertSanitizedHtml = useCallback((html: string) => {
    if (!html) return;
    document.execCommand('insertHTML', false, html);
  }, []);

  const handlePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>) => {
      const clipboard = event.clipboardData;
      if (!clipboard) return;

      const html = clipboard.getData('text/html');
      const text = clipboard.getData('text/plain');
      if (!html && !text && clipboard.files.length > 0) {
        event.preventDefault();
        callbacksRef.current.onFilesSelected?.(clipboard.files);
        return;
      }

      // Never let the browser insert clipboard HTML directly — it would carry
      // the source's scripts and handlers straight into the draft we later
      // send. This is the composer's XSS boundary and does not move.
      event.preventDefault();
      insertSanitizedHtml(html ? normalizePastedEmailHtml(html) : plainTextToPastedHtml(text));
    },
    [insertSanitizedHtml]
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      const transfer = event.dataTransfer;
      if (!transfer) return;
      // The dialog also listens for drops; a drop handled here is handled once.
      event.preventDefault();
      event.stopPropagation();

      if (transfer.files.length > 0) {
        callbacksRef.current.onFilesSelected?.(transfer.files);
        return;
      }
      const html = transfer.getData('text/html');
      insertSanitizedHtml(
        html
          ? normalizePastedEmailHtml(html)
          : plainTextToPastedHtml(transfer.getData('text/plain'))
      );
    },
    [insertSanitizedHtml]
  );

  return (
    <div className={cn('flex min-h-0 flex-col gap-2', className)}>
      {/* Only the writing surface scrolls; the toolbar below stays put
            however long the message gets (elli-ui#807). */}
      <div className="relative min-h-0 flex-1 overflow-y-auto bg-card">
        {/* A body holding only its signature still shows the prompt, above it. */}
        {isEmptyEmailBody(value) && (
          <p
            className={cn(
              'pointer-events-none absolute inset-x-0 top-0 truncate text-sm leading-6 text-muted-foreground/70',
              contentClassName
            )}
          >
            {placeholder}
          </p>
        )}
        {/*
          The writing surface's padding lives on this wrapper, not on the
          editable element.

          `ContentEditable` hard-codes `rsw-ce`, and the package's injected
          stylesheet gives that class `padding: .5rem`. That stylesheet is
          unlayered, so it beats any Tailwind utility — which sits in a layer —
          no matter how the classes are ordered. Left on the editable element
          the composer's own padding lost, and the caret started 12px to the
          left of the placeholder that is drawn over it, so the text jumped
          sideways the moment anyone typed. On a wrapper there is nothing for
          the library's rule to win.
        */}
        <div className={cn('flex flex-col', contentClassName, editorClassName)}>
          <ContentEditable
            ref={editorRef}
            id={id}
            value={value}
            disabled={disabled}
            role="textbox"
            aria-multiline="true"
            aria-label={label}
            aria-disabled={disabled || undefined}
            spellCheck
            className={cn(
              'w-full min-w-0 overflow-x-auto text-sm leading-6 text-foreground outline-none',
              PASTED_CONTENT_CLASSES,
              SIGNATURE_BLOCK_CLASSES
            )}
            onChange={(event: ContentEditableEvent) =>
              callbacksRef.current.onChange(event.target.value)
            }
            onPaste={handlePaste}
            onDrop={handleDrop}
          />
          {belowContent}
        </div>
      </div>
      <div className={cn('flex min-w-0 shrink-0 flex-nowrap items-center gap-2', toolbarClassName)}>
        {/* The formatting buttons give way, scrolling within themselves, when
            the row is short of room — before, they could not shrink, so a
            narrow reply card overflowed and scrolled sideways instead. */}
        <EmailRichTextToolbar
          className="min-w-0 shrink overflow-x-auto scrollbar-hover"
          editorRef={editorRef}
          disabled={disabled}
          onCommandApplied={emitFromDom}
        />
        {toolbarExtras}
        {toolbarTrailing && (
          <div className="ms-auto flex min-w-0 items-center gap-3">{toolbarTrailing}</div>
        )}
      </div>
    </div>
  );
}
