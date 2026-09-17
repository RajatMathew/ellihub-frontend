/**
 * Presentational pieces for email reference/thread-status marking, split out
 * of `email-reference-marker.tsx` so that file's `useEmailReferenceMarker`
 * hook export doesn't share a module with component declarations — Vite's
 * fast-refresh boundary (`react-refresh/only-export-components`) requires a
 * file to export either only components or only non-components, not both.
 */

import { useId } from 'react';

import { Button } from '@/app/components/ui/button';
import { CommandCheck } from '@/app/components/ui/command';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/app/lib/utils';
import type { ConnectedEmailTag } from '@/modules/email/api';
import {
  EMAIL_THREAD_STATE_LABELS,
  isOpenEmailThreadState,
  type EmailThreadState,
} from '@/modules/email/components/email-reference-marker-storage';
import { CheckCircle2, ChevronDown, CircleDotDashed, Plus, Tag, X } from 'lucide-react';

type EmailThreadStatusMarkerProps = {
  state: EmailThreadState;
  isSaving?: boolean;
  onChange: (state: EmailThreadState) => void;
};

export function OtherTagSummary({
  tags,
  disabled,
  onRemove,
}: {
  tags: ConnectedEmailTag[];
  disabled?: boolean;
  onRemove?: (tag: ConnectedEmailTag) => void;
}) {
  return (
    <span
      className="inline-flex h-9 max-w-full min-w-0 items-center overflow-hidden rounded-md border border-border bg-background px-2.5 text-sm font-medium text-foreground shadow-xs shadow-black/5"
      title={`Tags: ${tags.map((tag) => tag.name).join(', ')}`}
    >
      <span className="flex min-w-0 items-center overflow-hidden">
        {tags.map((tag, index) => (
          <span key={tag.id} className="inline-flex min-w-0 items-center">
            {index > 0 && <span className="mr-1 text-muted-foreground">,</span>}
            <span className="max-w-36 truncate">{tag.name}</span>
            {onRemove && (
              <button
                type="button"
                aria-label={`Remove ${tag.name}`}
                disabled={disabled}
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => onRemove(tag)}
                className="ml-1 flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-25"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            )}
          </span>
        ))}
      </span>
    </span>
  );
}

export function OtherTagPanel({
  tags,
  appliedSet,
  messageId,
  newTagName,
  isUpdatingTags,
  isCreatingTag,
  onNewTagNameChange,
  onSubmitNewTag,
  onToggleTag,
  onCreateTag,
  onDismiss,
}: {
  tags: ConnectedEmailTag[];
  /** Lowercased names of the Elli tags already on this message. */
  appliedSet: Set<string>;
  messageId?: string;
  newTagName: string;
  isUpdatingTags: boolean;
  isCreatingTag: boolean;
  onNewTagNameChange: (value: string) => void;
  onSubmitNewTag: () => void;
  onToggleTag?: (tag: ConnectedEmailTag, enabled: boolean) => void;
  onCreateTag?: (name: string) => void;
  onDismiss: () => void;
}) {
  const createTagInputId = useId();
  const canManageTags = Boolean(messageId && onToggleTag);

  return (
    <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
      <div className="flex items-start gap-2">
        <Tag aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">Organize with tags</p>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Elli tags keep this mail findable while Other stays separate from project references.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Close tag organizer"
          onClick={onDismiss}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {tags.length === 0 ? (
          <span className="text-xs text-muted-foreground">No tags yet.</span>
        ) : (
          tags.map((tag) => {
            const selected = appliedSet.has(tag.name.toLowerCase());

            return (
              <button
                key={tag.id}
                type="button"
                className={cn(
                  'inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/35 hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                  selected && 'border-primary/30 bg-primary/10 text-primary'
                )}
                aria-pressed={selected}
                disabled={!canManageTags || isUpdatingTags}
                onClick={() => onToggleTag?.(tag, !selected)}
              >
                {selected && <CommandCheck aria-hidden="true" className="ms-0 size-3.5" />}
                <span className="max-w-36 truncate">{tag.name}</span>
              </button>
            );
          })
        )}
      </div>

      {onCreateTag && (
        <form
          className="mt-3 flex max-w-sm gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmitNewTag();
          }}
        >
          <label htmlFor={createTagInputId} className="sr-only">
            Create and apply tag
          </label>
          <Input
            id={createTagInputId}
            type="text"
            variant="sm"
            className="h-9"
            value={newTagName}
            placeholder="Create and apply tag"
            disabled={isCreatingTag}
            onChange={(event) => onNewTagNameChange(event.target.value)}
          />
          <Button
            type="submit"
            variant="outline"
            mode="icon"
            size="icon"
            className="size-9 shrink-0"
            disabled={!newTagName.trim() || isCreatingTag || !messageId}
          >
            <Plus aria-hidden="true" className="size-4" />
            <span className="sr-only">Create and apply tag</span>
          </Button>
        </form>
      )}
    </div>
  );
}

const THREAD_STATES: EmailThreadState[] = ['open', 'open_our_court', 'open_their_court', 'closed'];

/**
 * Spelled out in the menu, short on the pill.
 *
 * On a pill beside a row of other pills, "Our court" is unambiguous — it is
 * next to the thread it describes. Read down a list of four, "Our court" and
 * "Their court" do not say that they are both still open, which is the thing
 * that separates them from Closed.
 */
const COURT_MENU_LABELS: Record<EmailThreadState, string> = {
  open: 'Open',
  open_our_court: 'Open, our court',
  open_their_court: 'Open, their court',
  closed: 'Closed',
};

/**
 * Whose court the thread is in.
 *
 * One pill and a plain list of the four states, rather than the split control
 * this used to be — a dropdown for the three open states glued to a separate
 * Closed button. That shape asked the reader to notice that closing was a
 * different kind of action from the others, which it is not: they are four
 * values of one field (elli-ui#921).
 *
 * The pill carries the state's own colour, because it is the one thing in the
 * card you want to read from across the room.
 */
export function EmailThreadStatusMarker({
  state,
  isSaving,
  onChange,
}: EmailThreadStatusMarkerProps) {
  const isOpen = isOpenEmailThreadState(state);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex min-h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1 text-[12.5px] font-medium',
            'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60',
            'motion-safe:transition-colors motion-safe:duration-100',
            isOpen
              ? 'bg-destructive-soft text-destructive-soft-foreground hover:bg-destructive/15'
              : 'bg-success-soft text-success-soft-foreground hover:bg-success/15'
          )}
          aria-label={`Court: ${EMAIL_THREAD_STATE_LABELS[state]}. Change`}
          disabled={isSaving}
        >
          {isOpen ? (
            <CircleDotDashed aria-hidden="true" className="size-3.5" />
          ) : (
            <CheckCircle2 aria-hidden="true" className="size-3.5" />
          )}
          {EMAIL_THREAD_STATE_LABELS[state]}
          <ChevronDown aria-hidden="true" className="size-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={6} className="w-48 rounded-xl p-1.5">
        {/* A dot rather than a tick: four values of one field, one of which is
            currently true. Labels come from EMAIL_THREAD_STATE_LABELS so the
            pill and the list can never drift. */}
        {THREAD_STATES.map((value) => (
          <button
            key={value}
            type="button"
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13.5px] text-foreground hover:bg-accent focus-visible:outline-hidden focus-visible:bg-accent"
            aria-current={state === value}
            onClick={() => onChange(value)}
          >
            <span
              aria-hidden="true"
              className={cn(
                'size-2 shrink-0 rounded-full',
                state === value ? 'bg-foreground' : 'bg-transparent'
              )}
            />
            {COURT_MENU_LABELS[value]}
          </button>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EmailThreadStatusPill({ state }: { state: EmailThreadState }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[0.6875rem] font-semibold',
        isOpenEmailThreadState(state)
          ? 'bg-destructive/10 text-destructive'
          : 'bg-success-soft text-success-soft-foreground'
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 rounded-full',
          isOpenEmailThreadState(state) ? 'bg-destructive' : 'bg-success-accent'
        )}
      />
      {EMAIL_THREAD_STATE_LABELS[state]}
    </span>
  );
}
