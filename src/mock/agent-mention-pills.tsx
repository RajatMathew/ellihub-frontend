import type { ReactNode } from 'react';

import { cn } from '@/app/lib/utils';
import { Mail, X, type LucideIcon } from 'lucide-react';

import {
  mentionTitle,
  RECORD_KIND_ICONS,
  RECORD_KIND_LABELS,
  recordMentionKey,
  recordMentionTitle,
  type MentionRef,
  type RecordMention,
} from './agent-mentions';

/**
 * Mails and records pointed at with @, as pills: above the box while the
 * message is being written (each with a remove button), and under the sent
 * message after.
 */
export function MentionPills({
  mentions,
  records = [],
  onRemove,
  onRemoveRecord,
  layout = 'wrap',
  className,
}: {
  mentions: MentionRef[];
  records?: RecordMention[];
  /** Given while composing: each pill can be taken off before sending. */
  onRemove?: (id: string) => void;
  onRemoveRecord?: (record: RecordMention) => void;
  /** `stack`: one pill per row, right-aligned, under a sent message. */
  layout?: 'wrap' | 'stack';
  className?: string;
}) {
  if (mentions.length === 0 && records.length === 0) return null;
  const composing = Boolean(onRemove ?? onRemoveRecord);
  return (
    <ul
      className={cn(
        'flex min-w-0 gap-1.5',
        layout === 'stack' ? 'flex-col items-end' : 'flex-wrap',
        className
      )}
      aria-label={composing ? 'What this message is about' : 'References'}
    >
      {mentions.map((mention) => (
        <MentionPill
          key={mention.id}
          icon={Mail}
          title={mentionTitle(mention)}
          removeLabel={`Remove ${mention.subject || 'email'}`}
          onRemove={onRemove ? () => onRemove(mention.id) : undefined}
        >
          @{mention.subject || '(No subject)'}
        </MentionPill>
      ))}
      {records.map((record) => (
        <MentionPill
          key={recordMentionKey(record)}
          icon={RECORD_KIND_ICONS[record.kind]}
          title={recordMentionTitle(record)}
          removeLabel={`Remove ${RECORD_KIND_LABELS[record.kind].one} ${record.label}`}
          onRemove={onRemoveRecord ? () => onRemoveRecord(record) : undefined}
        >
          @{record.label}
        </MentionPill>
      ))}
    </ul>
  );
}

function MentionPill({
  icon: Icon,
  title,
  removeLabel,
  onRemove,
  children,
}: {
  icon: LucideIcon;
  title: string;
  removeLabel: string;
  onRemove?: () => void;
  children: ReactNode;
}) {
  return (
    <li
      title={title}
      className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-border bg-background py-1 pl-2.5 pr-2 text-xs text-foreground sm:max-w-72 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-150"
    >
      <Icon className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 truncate">{children}</span>
      {onRemove ? (
        <button
          type="button"
          className="-mr-0.5 grid size-6 shrink-0 place-items-center rounded-full sm:size-4 text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={removeLabel}
          onClick={onRemove}
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      ) : null}
    </li>
  );
}
