import { useState } from 'react';

import { cn } from '@/app/lib/utils';
import type { ConnectedEmailTag } from '@/modules/email/api';
import { Plus } from 'lucide-react';

/** Always offered, whether or not the mailbox has collected them yet. */
const PRESET_TAGS = ['Spam', 'Newsletter', 'Personal'] as const;

/**
 * What a thread that is not project work gets filed under.
 *
 * A row of words, the applied ones filled in — the same shape as the
 * Project/Other switch above it, because it is the same kind of choice. The
 * panel this replaced opened a search box and a list the moment Other was
 * picked, which put a form in front of someone who had just said "this is
 * nothing" (elli-ui#921).
 */
export function MailThreadTags({
  tags,
  appliedNames,
  disabled,
  onToggle,
  onCreate,
}: {
  /** Elli's own tags on this mailbox. Provider categories are read-only. */
  tags: ConnectedEmailTag[];
  appliedNames: string[];
  disabled?: boolean;
  onToggle?: (tag: ConnectedEmailTag, enabled: boolean) => void;
  onCreate?: (name: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState('');

  const applied = new Set(appliedNames.map((name) => name.toLowerCase()));
  const byName = new Map(tags.map((tag) => [tag.name.toLowerCase(), tag]));
  // Presets first and always, then anything else the thread already carries or
  // the mailbox has defined — so the row never reorders under the pointer.
  const extras = tags.filter(
    (tag) => !PRESET_TAGS.some((preset) => preset.toLowerCase() === tag.name.toLowerCase())
  );

  const toggle = (name: string) => {
    const tag = byName.get(name.toLowerCase());
    if (!tag) {
      // A preset the mailbox has never used: creating it is what applies it.
      onCreate?.(name);
      return;
    }
    onToggle?.(tag, !applied.has(name.toLowerCase()));
  };

  const submitDraft = () => {
    const name = draft.replace(/\s+/g, ' ').trim();
    if (name) onCreate?.(name);
    setDraft('');
    setIsAdding(false);
  };

  return (
    <div className="pt-1">
      <p className="mb-2 text-xs font-semibold text-mail-ink">Tags</p>
      <div className="flex flex-wrap items-center gap-1">
        {[...PRESET_TAGS, ...extras.map((tag) => tag.name)].map((name) => (
          <button
            key={name}
            type="button"
            aria-pressed={applied.has(name.toLowerCase())}
            disabled={disabled}
            className={cn(
              'cursor-pointer rounded-md px-3 py-1.5 text-[12.5px] font-medium',
              'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50',
              'motion-safe:transition-colors motion-safe:duration-100',
              applied.has(name.toLowerCase())
                ? 'bg-mail-chip-count font-semibold text-mail-ink'
                : 'text-mail-mid hover:bg-mail-chip hover:text-mail-ink'
            )}
            onClick={() => toggle(name)}
          >
            {name}
          </button>
        ))}

        {isAdding ? (
          <input
            autoFocus
            value={draft}
            placeholder="Tag name…"
            aria-label="New tag name"
            className="w-28 rounded-full border border-mail-line bg-mail-paper px-3 py-1.5 text-[12.5px] text-mail-ink outline-hidden placeholder:text-mail-muted focus:border-mail-accent-edge focus:bg-mail-card"
            onChange={(event) => setDraft(event.target.value)}
            onBlur={submitDraft}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitDraft();
              }
              if (event.key === 'Escape') {
                event.stopPropagation();
                setDraft('');
                setIsAdding(false);
              }
            }}
          />
        ) : (
          onCreate && (
            <button
              type="button"
              disabled={disabled}
              aria-label="Add a tag"
              title="Add a tag"
              className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full border border-dashed border-mail-pane-line text-mail-muted hover:border-mail-row-edge hover:text-mail-ink focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-50"
              onClick={() => setIsAdding(true)}
            >
              <Plus aria-hidden="true" className="size-3.5" />
            </button>
          )
        )}
      </div>
    </div>
  );
}
