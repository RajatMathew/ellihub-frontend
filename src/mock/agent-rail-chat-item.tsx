import { useState } from 'react';

import { cn } from '@/app/lib/utils';

import { MAX_CHAT_TITLE_CHARS, renamedTitle } from './agent-chat-titles';

type Chat = { id: string; title: string; summary: string | null };

/**
 * One chat in Elliot's chats list, renamable in place (elli-ui#1370): a double
 * click turns the name into a field — the open chat is also renamed by clicking
 * its title in the header. Enter or leaving the field saves; Escape puts the
 * old name back.
 */
export function AgentRailChatItem({
  item,
  active,
  loading,
  onSelect,
  onRename,
}: {
  item: Chat;
  active: boolean;
  loading: boolean;
  onSelect: () => void;
  onRename: (title: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = () => {
    if (draft === null) return;
    const title = renamedTitle(draft, item.title);
    setDraft(null);
    if (title) onRename(title);
  };

  if (draft !== null) {
    return (
      <div className="rounded-md bg-card px-2 py-1.5 shadow-[inset_0_0_0_1px_var(--border)]">
        <input
          autoFocus
          value={draft}
          maxLength={MAX_CHAT_TITLE_CHARS}
          aria-label="Chat name"
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              commit();
            } else if (event.key === 'Escape') {
              // Not the panel's Escape (leaving full screen): this one only cancels.
              event.preventDefault();
              event.stopPropagation();
              setDraft(null);
            }
          }}
          className="block w-full bg-transparent text-sm outline-none"
        />
        <span className="block truncate text-[11px] text-muted-foreground">
          Enter to save · Esc to cancel
        </span>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={loading}
        onClick={onSelect}
        onDoubleClick={() => setDraft(item.title)}
        className={cn(
          'block w-full rounded-md px-2 py-1.5 text-left transition-colors disabled:opacity-50 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
          // Hover takes the warm surface tint so it never reads as the selection.
          active ? 'bg-accent font-medium text-accent-foreground' : 'hover:bg-surface-hover'
        )}
      >
        <span className="block truncate text-sm">{item.title}</span>
        <span className="block truncate text-[11px] font-normal text-muted-foreground">
          {item.summary ?? 'No summary yet'}
        </span>
      </button>
    </div>
  );
}
