import { cn } from '@/app/lib/utils';
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
  Underline,
  type LucideIcon,
} from 'lucide-react';

/**
 * `document.execCommand` is the only formatting API a contenteditable has in
 * every browser we ship to. It is deprecated but not going anywhere, and the
 * alternative — an editor framework with its own schema — is what silently drops
 * pasted tables, which is the thing this composer must never do.
 */
export type EmailRichTextCommand =
  | 'bold'
  | 'italic'
  | 'underline'
  | 'insertUnorderedList'
  | 'insertOrderedList'
  | 'blockquote'
  | 'removeFormat';

type ToolbarAction = {
  command: EmailRichTextCommand;
  label: string;
  icon: LucideIcon;
  /** Commands whose on/off state `queryCommandState` can report. */
  togglable: boolean;
};

const TOOLBAR_ACTIONS: readonly ToolbarAction[] = [
  { command: 'bold', label: 'Bold', icon: Bold, togglable: true },
  { command: 'italic', label: 'Italic', icon: Italic, togglable: true },
  { command: 'underline', label: 'Underline', icon: Underline, togglable: true },
  { command: 'insertUnorderedList', label: 'Bulleted list', icon: List, togglable: true },
  { command: 'insertOrderedList', label: 'Numbered list', icon: ListOrdered, togglable: true },
  { command: 'blockquote', label: 'Quote', icon: Quote, togglable: false },
  { command: 'removeFormat', label: 'Clear formatting', icon: RemoveFormatting, togglable: false },
];

interface EmailRichTextToolbarProps {
  activeCommands: ReadonlySet<EmailRichTextCommand>;
  disabled?: boolean;
  onCommand: (command: EmailRichTextCommand) => void;
}

export function EmailRichTextToolbar({
  activeCommands,
  disabled = false,
  onCommand,
}: EmailRichTextToolbarProps) {
  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      aria-orientation="horizontal"
      className="flex flex-wrap items-center gap-0.5"
    >
      {TOOLBAR_ACTIONS.map((action) => {
        const Icon = action.icon;
        const isActive = action.togglable && activeCommands.has(action.command);
        return (
          <button
            key={action.command}
            type="button"
            title={action.label}
            aria-label={action.label}
            aria-pressed={action.togglable ? isActive : undefined}
            disabled={disabled}
            className={cn(
              'inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground',
              'hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:pointer-events-none disabled:opacity-50 motion-safe:transition-colors motion-safe:duration-150',
              isActive && 'bg-accent text-accent-foreground'
            )}
            // The editor must keep the selection the command is about to act on.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onCommand(action.command)}
          >
            <Icon aria-hidden="true" className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
