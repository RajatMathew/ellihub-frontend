import { useMemo, useState } from 'react';

import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { cn } from '@/app/lib/utils';
import { Check, ChevronDown, Loader2, Search, X } from 'lucide-react';

import { groupConversationsByDay, searchConversations } from './agent-fullscreen-rules';

type Conversation = { id: string; title: string; summary: string | null; updatedAt: string };

/**
 * Earlier chats, from the chevron beside the chat's name (elli-ui#1414): this
 * mailbox's chats by day, the open one ticked, with a search behind the
 * magnifier — the shape Notion's AI panel uses. The name itself renames the
 * chat (elli-ui#1410), so the menu has its own trigger. Reads the history the
 * panel already holds, so opening it costs no request.
 */
export function AgentChatHistoryMenu({
  history,
  liveTitles,
  loading,
  activeConversationId,
  loadingConversationId,
  onSelect,
}: {
  history: readonly Conversation[];
  /** Names streamed or edited this session, newer than `history`'s. */
  liveTitles: Readonly<Record<string, string>>;
  loading: boolean;
  activeConversationId: string | null;
  loadingConversationId: string | null;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const groups = useMemo(() => {
    const named = history.map((item) => ({ ...item, title: liveTitles[item.id] ?? item.title }));
    return groupConversationsByDay(searchConversations(named, query));
  }, [history, liveTitles, query]);

  const close = () => {
    setOpen(false);
    setSearching(false);
    setQuery('');
  };

  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Show earlier chats"
          title="Earlier chats"
          className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-accent data-[state=open]:text-foreground"
        >
          <ChevronDown aria-hidden="true" className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className="w-80 max-w-[calc(100vw-1.5rem)] rounded-xl bg-popover p-1.5"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="flex h-8 items-center gap-1 px-2">
          {searching ? (
            <>
              <Search aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape' && query) {
                    event.preventDefault();
                    event.stopPropagation();
                    setQuery('');
                  }
                }}
                placeholder="Search chats"
                aria-label="Search chats"
                className="min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground/70"
              />
              <button
                type="button"
                aria-label="Close search"
                onClick={() => {
                  setSearching(false);
                  setQuery('');
                }}
                className="grid size-6 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden="true" className="size-3.5" />
              </button>
            </>
          ) : (
            <>
              <span className="flex-1 text-xs font-medium text-muted-foreground">Chats</span>
              <button
                type="button"
                aria-label="Search chats"
                onClick={() => setSearching(true)}
                className="grid size-6 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Search aria-hidden="true" className="size-3.5" />
              </button>
            </>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto overscroll-contain">
          {loading && history.length === 0 ? (
            <p className="flex items-center justify-center gap-2 py-6 text-[13px] text-muted-foreground">
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
              Loading chats
            </p>
          ) : groups.length === 0 ? (
            <p className="px-2 py-6 text-center text-[13px] text-muted-foreground">
              {query.trim() ? `No chats match “${query.trim()}”` : 'No earlier chats yet'}
            </p>
          ) : (
            groups.map((group) => (
              <div key={group.label} className="pb-1">
                <p className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                  {group.label}
                </p>
                {group.items.map((item) => {
                  const active = item.id === activeConversationId;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-current={active ? 'true' : undefined}
                      onClick={() => {
                        if (!active) onSelect(item.id);
                        close();
                      }}
                      className={cn(
                        'flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left text-[13.5px] transition-colors hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
                        active ? 'font-medium text-foreground' : 'text-foreground/85'
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate">{item.title || 'New chat'}</span>
                      {loadingConversationId === item.id ? (
                        <Loader2 aria-hidden="true" className="size-3.5 shrink-0 animate-spin" />
                      ) : active ? (
                        <Check aria-hidden="true" className="size-3.5 shrink-0" />
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
