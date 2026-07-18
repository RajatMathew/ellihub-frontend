import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
} from 'react';

import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/app/lib/utils';
import type { EmailListItem } from '@/modules/email/components/email-row-card';
import {
  GripVertical,
  Mail,
  Mic,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

export type EmailAgentLayout = {
  open: boolean;
  width: number;
  pushesContent: boolean;
  hidesEmailList: boolean;
};

interface EmailAgentPanelProps {
  email: EmailListItem | null;
  mailboxAddress: string;
  onLayoutChange: (layout: EmailAgentLayout) => void;
  onRequestMailboxCollapse?: () => void;
}

type AgentMessage = {
  id: string;
  role: 'user' | 'agent';
  content: string;
};

const DEFAULT_WIDTH = 392;
const MIN_WIDTH = 340;
const MAX_WIDTH = 720;
const PUSH_CONTENT_WIDTH = 520;
const HIDE_EMAIL_LIST_WIDTH = 640;

export function EmailAgentPanel({
  email,
  mailboxAddress,
  onLayoutChange,
  onRequestMailboxCollapse,
}: EmailAgentPanelProps) {
  const [open, setOpen] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const pushesContent = open && width >= PUSH_CONTENT_WIDTH;
  const hidesEmailList = open && width >= HIDE_EMAIL_LIST_WIDTH;
  const contextLabel = email ? email.subject : 'Mailbox';
  const promptPlaceholder = email
    ? 'Ask Elli about this thread...'
    : 'Ask Elli about this mailbox...';

  const suggestions = useMemo(
    () =>
      email
        ? ['Summarise this email', 'Draft a concise reply', 'Find the main asks in this thread']
        : ['Find recent key emails', 'Summarise unread messages', 'Show emails with attachments'],
    [email]
  );

  useEffect(() => {
    onLayoutChange({ open, width, pushesContent, hidesEmailList });
  }, [hidesEmailList, onLayoutChange, open, pushesContent, width]);

  const handleResizeStart = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const startX = event.clientX;
    const startWidth = width;
    setIsResizing(true);
    event.currentTarget.setPointerCapture(event.pointerId);

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const nextWidth = Math.min(
        MAX_WIDTH,
        Math.max(MIN_WIDTH, startWidth + startX - moveEvent.clientX)
      );
      setWidth(nextWidth);
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextPrompt = prompt.trim();
    if (!nextPrompt) return;

    setMessages((current) => [
      ...current,
      { id: `${Date.now()}-user`, role: 'user', content: nextPrompt },
      {
        id: `${Date.now()}-agent`,
        role: 'agent',
        content: 'Elli can use this workspace context once the mail agent endpoint is connected.',
      },
    ]);
    setPrompt('');
  };

  const handleWorkspaceToggle = () => {
    if (pushesContent) {
      setWidth(DEFAULT_WIDTH);
      return;
    }

    setWidth(HIDE_EMAIL_LIST_WIDTH);
    onRequestMailboxCollapse?.();
  };

  if (!open) {
    return (
      <button
        type="button"
        className="absolute right-4 top-16 z-30 flex size-14 cursor-pointer items-center justify-center rounded-md border border-border bg-background p-2 shadow-md hover:bg-accent focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
        aria-label="Open Elli agent"
        onClick={() => setOpen(true)}
      >
        <img
          src="/favicon/apple-touch-icon.png"
          alt=""
          aria-hidden="true"
          className="size-9 rounded-sm object-contain"
        />
      </button>
    );
  }

  return (
    <aside
      className={cn(
        'absolute right-0 z-30 flex min-h-0 flex-col overflow-hidden border border-border bg-background text-foreground',
        pushesContent ? 'inset-y-0 border-y-0 border-r-0 shadow-none' : 'rounded-md shadow-xl',
        !isResizing &&
          'motion-safe:transition-[width,top,bottom,box-shadow] motion-safe:duration-150 motion-safe:ease-out',
        'motion-reduce:transition-none'
      )}
      style={{
        width,
        top: pushesContent ? 0 : 12,
        bottom: pushesContent ? 0 : 12,
      }}
      aria-label="Elli agent"
    >
      <button
        type="button"
        className="absolute inset-y-0 -left-1.5 z-20 flex w-3 cursor-col-resize touch-none items-center justify-center border-l border-transparent text-muted-foreground hover:border-primary/40 hover:text-primary focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
        aria-label="Resize Elli agent"
        onPointerDown={handleResizeStart}
      >
        <GripVertical aria-hidden="true" className="size-3.5" strokeWidth={1.8} />
      </button>

      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background"
            aria-hidden="true"
          >
            <img
              src="/favicon/apple-touch-icon.png"
              alt=""
              className="size-7 rounded-sm object-contain"
            />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-foreground">Elli agent</h2>
            <p className="truncate text-xs text-muted-foreground">Mail copilot</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <AgentIconButton
            label={pushesContent ? 'Use overlay width' : 'Expand Elli agent workspace'}
            onClick={handleWorkspaceToggle}
          >
            {pushesContent ? (
              <PanelRightClose aria-hidden="true" className="size-4" strokeWidth={1.8} />
            ) : (
              <PanelRightOpen aria-hidden="true" className="size-4" strokeWidth={1.8} />
            )}
          </AgentIconButton>
          <AgentIconButton label="Close Elli agent" onClick={() => setOpen(false)}>
            <X aria-hidden="true" className="size-4" strokeWidth={1.8} />
          </AgentIconButton>
        </div>
      </header>

      <div className="kt-scrollable-y-auto flex min-h-0 flex-1 flex-col px-4 py-5">
        <div className="flex flex-1 flex-col justify-center gap-6">
          <div className="space-y-2 text-center">
            <p className="text-xl font-semibold text-foreground">Find recent key emails</p>
            <p className="mx-auto max-w-80 text-sm leading-6 text-muted-foreground">
              Ask Elli to summarize, draft, or inspect the current mailbox context.
            </p>
          </div>

          <form
            className="rounded-md border border-border bg-background shadow-sm"
            onSubmit={handleSubmit}
          >
            <div className="border-b border-border px-3 py-2">
              <span className="inline-flex max-w-full items-center gap-1.5 rounded-sm bg-muted px-2 py-1 text-xs font-medium text-muted-foreground">
                <Mail aria-hidden="true" className="size-3.5 shrink-0" strokeWidth={1.8} />
                <span className="truncate">{contextLabel}</span>
              </span>
            </div>

            <div className="px-3 py-3">
              <label htmlFor="elli-agent-message" className="text-xs font-medium text-foreground">
                Message Elli
              </label>
              <Textarea
                id="elli-agent-message"
                value={prompt}
                rows={3}
                placeholder={promptPlaceholder}
                className="mt-1 min-h-20 resize-none border-0 bg-transparent px-0 py-0 text-sm leading-6 shadow-none focus-visible:ring-0"
                onChange={(event) => setPrompt(event.target.value)}
              />
            </div>

            <div className="flex items-center justify-between gap-2 px-3 pb-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                aria-label="Add context"
              >
                <Plus aria-hidden="true" className="size-4" strokeWidth={1.8} />
              </Button>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-9 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  aria-label="Use voice input"
                >
                  <Mic aria-hidden="true" className="size-4" strokeWidth={1.8} />
                </Button>
                <Button type="submit" size="icon" className="size-9" disabled={!prompt.trim()}>
                  <Send aria-hidden="true" className="size-4" strokeWidth={1.8} />
                  <span className="sr-only">Send message</span>
                </Button>
              </div>
            </div>
          </form>

          {messages.length > 0 && (
            <div className="space-y-2" aria-live="polite">
              {messages.slice(-2).map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    'rounded-md border px-3 py-2 text-sm leading-6',
                    message.role === 'user'
                      ? 'ml-8 border-primary/20 bg-primary/10 text-foreground'
                      : 'mr-8 border-border bg-muted/50 text-muted-foreground'
                  )}
                >
                  {message.content}
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                className="min-h-28 cursor-pointer rounded-md border border-border bg-background p-3 text-left text-sm font-medium leading-5 text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
                onClick={() => setPrompt(suggestion)}
              >
                <Sparkles
                  aria-hidden="true"
                  className="mb-4 size-4 text-primary"
                  strokeWidth={1.8}
                />
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-muted-foreground">
          Connected to {mailboxAddress}
        </p>
      </div>
    </aside>
  );
}

function AgentIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="flex size-9 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-safe:transition-colors motion-safe:duration-150"
      aria-label={label}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
