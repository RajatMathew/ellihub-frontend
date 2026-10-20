import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { PanelLeftClose, PanelLeftOpen, Search, SquarePen } from 'lucide-react';

import { groupConversationsByDay, type ContextThread } from './agent-fullscreen-rules';
import { RailActions } from './agent-rail-actions';
import { AgentRailChatItem } from './agent-rail-chat-item';

type Conversation = { id: string; title: string; summary: string | null; updatedAt: string };

const FADE_IN = 'motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-200';

type RailProps = {
  className?: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** The mails in the chat's context: what the actions can work from. */
  threads: ContextThread[];
  canStartNew: boolean;
  onNewChat: () => void;
  onStart: (prompt: string, thread?: ContextThread) => void;
  onAskWhich: (question: { label: string; template: string }) => void;
  /** Why nothing can be sent right now; disables the actions. */
  blockedReason: string | null;
  history: Conversation[];
  historyLoading: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  activeConversationId: string | null;
  loadingConversationId: string | null;
  onSelectConversation: (id: string) => void;
  /** Gives a chat a name of the reader's own (elli-ui#1370). */
  onRenameConversation: (id: string, title: string) => void;
};

/**
 * The left rail of full-screen Elliot: a new chat, the actions it can take on
 * the mail in context, and every past chat under the day it was last touched.
 * The same history the side panel keeps behind its clock button, given a
 * home. Collapses to a strip of icons; the width slides either way.
 */
export function AgentFullscreenRail(props: RailProps) {
  const { collapsed, className } = props;
  return (
    <nav
      aria-label="Elliot"
      className={cn(
        'flex shrink-0 flex-col overflow-hidden border-r border-border bg-muted/40',
        'motion-safe:transition-[width] motion-safe:duration-200 motion-safe:ease-out',
        collapsed ? 'w-14' : 'w-64',
        className
      )}
    >
      {collapsed ? <CollapsedRail {...props} /> : <ExpandedRail {...props} />}
    </nav>
  );
}

function CollapsedRail({
  onToggleCollapsed,
  threads,
  canStartNew,
  onNewChat,
  onStart,
  onAskWhich,
  blockedReason,
}: RailProps) {
  return (
    <div className={cn('flex w-14 shrink-0 flex-col items-center gap-1 py-3', FADE_IN)}>
      <img src="/favicon/apple-touch-icon.png" alt="" className="mb-1 size-7 rounded-sm" />
      <Button variant="ghost" size="icon" aria-label="Show chats" onClick={onToggleCollapsed}>
        <PanelLeftOpen className="size-4" aria-hidden />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="New chat"
        disabled={!canStartNew}
        onClick={onNewChat}
      >
        <SquarePen className="size-4" aria-hidden />
      </Button>
      <RailActions
        threads={threads}
        onStart={onStart}
        onAskWhich={onAskWhich}
        blockedReason={blockedReason}
        compact
      />
    </div>
  );
}

function ExpandedRail({
  onToggleCollapsed,
  threads,
  canStartNew,
  onNewChat,
  onStart,
  onAskWhich,
  blockedReason,
  history,
  historyLoading,
  search,
  onSearchChange,
  activeConversationId,
  loadingConversationId,
  onSelectConversation,
  onRenameConversation,
}: RailProps) {
  const groups = groupConversationsByDay(history);
  return (
    <div className={cn('flex h-full w-64 shrink-0 flex-col', FADE_IN)}>
      <div className="flex items-center gap-2 px-3 pb-2 pt-3">
        <img src="/favicon/apple-touch-icon.png" alt="" className="size-6 rounded-sm" />
        <span className="text-sm font-semibold">Elliot</span>
        <span className="flex-1" />
        <Button variant="ghost" size="icon" aria-label="Hide chats" onClick={onToggleCollapsed}>
          <PanelLeftClose className="size-4" aria-hidden />
        </Button>
      </div>
      <Button
        variant="outline"
        className="mx-3 mb-2 justify-start bg-card font-semibold"
        disabled={!canStartNew}
        onClick={onNewChat}
      >
        <SquarePen className="size-4 text-primary" aria-hidden />
        New chat
      </Button>

      <div className="min-h-0 flex-1 overflow-y-auto pb-3">
        <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Actions
        </p>
        <RailActions
          threads={threads}
          onStart={onStart}
          onAskWhich={onAskWhich}
          blockedReason={blockedReason}
          compact={false}
        />

        <p className="px-4 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Chats
        </p>
        <label className="relative mx-3 mb-1 block">
          <span className="sr-only">Search chats</span>
          <Search
            className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-muted-foreground"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search chats"
            className="h-8 w-full rounded-md border border-input bg-card pl-8 pr-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </label>
        {historyLoading ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">Loading chats…</p>
        ) : groups.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">No saved chats yet.</p>
        ) : (
          groups.map((group) => (
            <div key={group.label} className="px-2">
              <p className="px-2 pb-0.5 pt-2 text-[11px] font-medium text-muted-foreground">
                {group.label}
              </p>
              {group.items.map((item) => (
                <AgentRailChatItem
                  key={item.id}
                  item={item}
                  active={item.id === activeConversationId}
                  loading={loadingConversationId === item.id}
                  onSelect={() => onSelectConversation(item.id)}
                  onRename={(title) => onRenameConversation(item.id, title)}
                />
              ))}
            </div>
          ))
        )}
      </div>
      <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
        Every change needs your approval.
      </p>
    </div>
  );
}
