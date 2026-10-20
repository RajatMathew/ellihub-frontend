import { useCallback, useEffect, useState, type RefObject } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/app/components/ui/tooltip';
import { cn } from '@/app/lib/utils';
import {
  findBlockquote,
  isSelectionInBlockquote,
  unwrapBlockquote,
} from '@/modules/email/lib/email-blockquote';
import { EMAIL_EDITOR_TOGGLES, toLinkHref } from '@/modules/email/lib/email-editor-commands';
import {
  formattingShortcutLabel,
  IS_APPLE_PLATFORM,
} from '@/modules/email/lib/email-send-shortcut';
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from 'lucide-react';

/**
 * The composer's formatting bar.
 *
 * The buttons are this repo's, not the library's. `react-simple-wysiwyg` ships
 * its own `Toolbar`/`Btn*`, but they carry `rsw-*` class names that its
 * injected stylesheet paints with light-mode literals (#f5f5f5, #222, #eaeaea)
 * — unreadable under the two dark themes, and something we would then be
 * re-stating token by token forever. Rendering our own means those rules match
 * nothing at all, so there is no stylesheet to fight: these are ordinary
 * buttons wearing ordinary Tailwind tokens.
 *
 * What the library is still used for is the hard part — the controlled
 * contenteditable itself. See `email-rich-text-editor.tsx`.
 */
interface EmailRichTextToolbarProps {
  /** The editable region every command acts on. */
  editorRef: RefObject<HTMLElement | null>;
  disabled?: boolean;
  className?: string;
  /** Called after any command, so the editor can push the change to the draft. */
  onCommandApplied: () => void;
}

export function EmailRichTextToolbar({
  editorRef,
  disabled = false,
  className,
  onCommandApplied,
}: EmailRichTextToolbarProps) {
  const [active, setActive] = useState<ReadonlySet<string>>(() => new Set());

  const refreshActive = useCallback(() => {
    const editor = editorRef.current;
    const selection = document.getSelection();
    if (!editor || !selection?.anchorNode || !editor.contains(selection.anchorNode)) return;

    const next = new Set<string>();
    for (const command of EMAIL_EDITOR_TOGGLES) {
      try {
        if (document.queryCommandState(command)) next.add(command);
      } catch {
        // Older engines throw for commands they do not implement.
      }
    }
    // `blockquote` is not a command, so `queryCommandState` cannot answer for
    // it. Its state comes from the caret's own ancestry instead — which is why
    // the quote button never lit up before (elli-ui#929).
    if (isSelectionInBlockquote(selection, editor)) next.add('blockquote');
    setActive(next);
  }, [editorRef]);

  useEffect(() => {
    document.addEventListener('selectionchange', refreshActive);
    return () => document.removeEventListener('selectionchange', refreshActive);
  }, [refreshActive]);

  /** Focus first: a command with the caret outside the editor does nothing. */
  const withEditor = (run: (editor: HTMLElement) => void) => {
    const editor = editorRef.current;
    if (!editor) return;
    if (!editor.contains(document.activeElement)) editor.focus();
    run(editor);
    onCommandApplied();
    refreshActive();
  };

  const runCommand = (command: string, value?: string) =>
    withEditor(() => document.execCommand(command, false, value));

  /**
   * Quote, and the reason this issue was filed: it now removes one.
   *
   * Applying stays `formatBlock`, which handles a multi-paragraph selection
   * better than anything hand-written. Removing is ours, because `formatBlock`
   * has no value that unwraps — asking for `div` reformats the paragraph
   * inside the quote and leaves the quote standing.
   */
  const toggleQuote = () =>
    withEditor((editor) => {
      const selection = document.getSelection();
      const quote = selection?.anchorNode ? findBlockquote(selection.anchorNode, editor) : null;
      if (quote) unwrapBlockquote(quote);
      else document.execCommand('formatBlock', false, 'blockquote');
    });

  /**
   * A link, with the same URL allowlist the sanitizer enforces — applied here,
   * before the link is created, rather than stripped out of the draft later.
   */
  const insertLink = () =>
    withEditor(() => {
      const typed = window.prompt('Link address');
      if (typed === null) return;
      const href = toLinkHref(typed);
      if (href) document.execCommand('createLink', false, href);
    });

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      aria-orientation="horizontal"
      className={cn('flex min-w-0 flex-nowrap items-center gap-0.5', className)}
    >
      <ToolbarButton
        label="Bold"
        icon={Bold}
        pressed={active.has('bold')}
        disabled={disabled}
        shortcut={formattingShortcutLabel('b', IS_APPLE_PLATFORM)}
        onPress={() => runCommand('bold')}
      />
      <ToolbarButton
        label="Italic"
        icon={Italic}
        pressed={active.has('italic')}
        disabled={disabled}
        shortcut={formattingShortcutLabel('i', IS_APPLE_PLATFORM)}
        onPress={() => runCommand('italic')}
      />
      <ToolbarButton
        label="Underline"
        icon={Underline}
        pressed={active.has('underline')}
        disabled={disabled}
        shortcut={formattingShortcutLabel('u', IS_APPLE_PLATFORM)}
        onPress={() => runCommand('underline')}
      />
      <ToolbarButton
        label="Strikethrough"
        icon={Strikethrough}
        pressed={active.has('strikeThrough')}
        disabled={disabled}
        onPress={() => runCommand('strikeThrough')}
      />
      <ToolbarButton
        label="Bulleted list"
        icon={List}
        pressed={active.has('insertUnorderedList')}
        disabled={disabled}
        onPress={() => runCommand('insertUnorderedList')}
      />
      <ToolbarButton
        label="Numbered list"
        icon={ListOrdered}
        pressed={active.has('insertOrderedList')}
        disabled={disabled}
        onPress={() => runCommand('insertOrderedList')}
      />
      <ToolbarButton
        label="Quote"
        icon={Quote}
        pressed={active.has('blockquote')}
        disabled={disabled}
        onPress={toggleQuote}
      />
      <ToolbarButton label="Insert link" icon={Link2} disabled={disabled} onPress={insertLink} />
      <ToolbarButton
        label="Clear formatting"
        icon={RemoveFormatting}
        disabled={disabled}
        onPress={() => runCommand('removeFormat')}
      />
      <ToolbarButton
        label="Undo"
        icon={Undo2}
        disabled={disabled}
        shortcut={formattingShortcutLabel('z', IS_APPLE_PLATFORM)}
        onPress={() => runCommand('undo')}
      />
      <ToolbarButton
        label="Redo"
        icon={Redo2}
        disabled={disabled}
        shortcut={formattingShortcutLabel('z', IS_APPLE_PLATFORM, { shift: true })}
        onPress={() => runCommand('redo')}
      />
    </div>
  );
}

/**
 * One formatting button, named by the app's own tooltip (elli-ui#1337) rather
 * than the browser's slow, unstyled `title` bubble — with its shortcut, where
 * the editor answers to one.
 */
function ToolbarButton({
  label,
  icon: Icon,
  pressed,
  disabled,
  shortcut,
  onPress,
}: {
  label: string;
  icon: LucideIcon;
  /** Omitted for the commands that do something rather than turn something on. */
  pressed?: boolean;
  disabled: boolean;
  shortcut?: string;
  onPress: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-keyshortcuts={shortcut}
          aria-pressed={pressed}
          disabled={disabled}
          className={cn(
            'inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground',
            'hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:pointer-events-none disabled:opacity-50 motion-safe:transition-colors motion-safe:duration-150',
            pressed && 'bg-accent text-accent-foreground'
          )}
          // The editor must keep the selection the command is about to act on.
          onMouseDown={(event) => event.preventDefault()}
          onClick={onPress}
        >
          <Icon aria-hidden="true" className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="flex items-center gap-2">
        {label}
        {shortcut && <kbd className="font-sans text-[11px] opacity-70">{shortcut}</kbd>}
      </TooltipContent>
    </Tooltip>
  );
}
