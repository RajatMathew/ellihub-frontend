import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { Mail, MessageCircleQuestion, X } from 'lucide-react';

import type { ContextThread } from './agent-fullscreen-rules';

export type WhichEmailQuestion = {
  label: string;
  template: string;
  /** Archive, reply, summarize: any number of threads, done one at a time. */
  multi?: boolean;
  /** A typed message: it may also go out as is, about nothing in particular. */
  raw?: string;
};

/**
 * Elliot asking, in the chat, which of the threads in context an action is
 * for. Answered on the client: the pick fills the prompt and sends it, so the
 * model never has to guess. A bulk-friendly action takes a checklist; a
 * record action takes one thread.
 */
export function AgentWhichEmail({
  question,
  threads,
  onPick,
  onGeneral,
  onCancel,
}: {
  question: WhichEmailQuestion;
  threads: ContextThread[];
  /** One thread, or several to work through one at a time. */
  onPick: (threads: ContextThread[]) => void;
  onGeneral?: () => void;
  onCancel: () => void;
}) {
  const [checked, setChecked] = useState<Set<string>>(() => new Set());
  const multi = question.multi === true;
  const picked = threads.filter((thread) => checked.has(thread.id));
  const toggle = (id: string) =>
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div
      className="flex gap-3 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-200"
      role="group"
      aria-label={`${question.label}: which email?`}
    >
      <img
        src="/favicon/apple-touch-icon.png"
        alt=""
        className="mt-0.5 size-6 shrink-0 rounded-sm"
      />
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <p className="text-sm leading-6">
          <span className="font-semibold">{question.label}</span>
          {multi
            ? ': which emails? Pick as many as you like.'
            : question.raw
              ? ' — which email do you mean?'
              : ': which email is this for?'}
        </p>
        <div className="flex flex-col gap-1.5">
          {threads.map((thread) =>
            multi ? (
              <label
                key={thread.id}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-lg border bg-card px-3 py-2 text-sm transition-colors hover:bg-accent/60',
                  checked.has(thread.id) ? 'border-primary/50' : 'border-border'
                )}
              >
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={checked.has(thread.id)}
                  onChange={() => toggle(thread.id)}
                />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {thread.subject || '(No subject)'}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{thread.senderName}</span>
              </label>
            ) : (
              <button
                key={thread.id}
                type="button"
                onClick={() => onPick([thread])}
                className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-3 py-2 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent/60 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Mail className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-medium">
                  {thread.subject || '(No subject)'}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{thread.senderName}</span>
              </button>
            )
          )}
          {onGeneral ? (
            <button
              type="button"
              onClick={onGeneral}
              className="flex items-center gap-2.5 rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-accent/60 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <MessageCircleQuestion className="size-4 shrink-0" aria-hidden />
              None in particular, it is a general question
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {multi ? (
            <>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={picked.length === 0}
                onClick={() => onPick(picked)}
              >
                {picked.length <= 1 ? 'Continue' : `Continue with ${picked.length}, one at a time`}
              </Button>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() =>
                  setChecked(
                    picked.length === threads.length
                      ? new Set()
                      : new Set(threads.map((thread) => thread.id))
                  )
                }
              >
                {picked.length === threads.length ? 'Clear' : `Select all ${threads.length}`}
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="size-3" aria-hidden />
            Never mind
          </button>
        </div>
      </div>
    </div>
  );
}
