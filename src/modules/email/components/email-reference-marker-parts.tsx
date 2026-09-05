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
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Input } from '@/app/components/ui/input';
import { cn } from '@/app/lib/utils';
import type { ConnectedEmailTag } from '@/modules/email/api';
import {
  EMAIL_THREAD_STATE_LABELS,
  isOpenEmailThreadState,
  type EmailReferenceMarkerState,
  type EmailThreadState,
} from '@/modules/email/components/email-reference-marker-storage';
import { useEmailReferenceMarker } from '@/modules/email/components/email-reference-marker';
import { CheckCircle2, ChevronDown, CircleDotDashed, Plus, Tag, X } from 'lucide-react';

type EmailReferenceMarkerProps = {
  accountId: string;
  state: EmailReferenceMarkerState;
  messageId?: string;
  tags?: ConnectedEmailTag[];
  keywords?: string[];
  isUpdatingTags?: boolean;
  isCreatingTag?: boolean;
  isSaving?: boolean;
  onToggleTag?: (tag: ConnectedEmailTag, enabled: boolean) => void;
  onCreateTag?: (name: string) => void;
  onChange: (state: EmailReferenceMarkerState) => void;
};

type EmailThreadStatusMarkerProps = {
  state: EmailThreadState;
  isSaving?: boolean;
  onChange: (state: EmailThreadState) => void;
};

/**
 * Chips + Project/Other toggle + (when relevant) the provider-tags panel,
 * for its own section below the subject. Render `useEmailReferenceMarker`'s
 * `trigger` separately, in the thread's action-button row.
 */
export function EmailReferenceMarker(props: EmailReferenceMarkerProps) {
  const { chips, otherTagPanel } = useEmailReferenceMarker(props);

  return (
    <section className="mt-3 min-w-0" aria-label="References">
      {chips}
      {otherTagPanel}
    </section>
  );
}

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
      title={`Categories: ${tags.map((tag) => tag.name).join(', ')}`}
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
  keywordSet,
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
  keywordSet: Set<string>;
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
            Provider tags keep this mail in its tagged folder while Other stays separate from
            project references.
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
          <span className="text-xs text-muted-foreground">No provider tags yet.</span>
        ) : (
          tags.map((tag) => {
            const selected =
              keywordSet.has(tag.name.toLowerCase()) ||
              keywordSet.has(tag.providerId.toLowerCase());

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

export function EmailThreadStatusMarker({
  state,
  isSaving,
  onChange,
}: EmailThreadStatusMarkerProps) {
  const isOpen = isOpenEmailThreadState(state);

  return (
    <div className="shrink-0">
      <div className="inline-flex rounded-full border border-border bg-muted/30 p-0.5">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                'inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
                isOpen && 'bg-destructive/10 text-destructive shadow-xs'
              )}
              aria-pressed={isOpen}
              disabled={isSaving}
            >
              <CircleDotDashed aria-hidden="true" className="size-3" />
              {isOpen ? EMAIL_THREAD_STATE_LABELS[state] : 'Open'}
              <ChevronDown aria-hidden="true" className="size-2.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-40 p-1">
            <DropdownMenuRadioGroup
              value={isOpen ? state : ''}
              onValueChange={(value) => onChange(value as EmailThreadState)}
            >
              {/* Same labels the pill/trigger use (EMAIL_THREAD_STATE_LABELS) —
                  a single source of truth so the two never drift apart. */}
              <DropdownMenuRadioItem value="open" className="min-h-8 text-xs">
                {EMAIL_THREAD_STATE_LABELS.open}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="open_our_court" className="min-h-8 text-xs">
                {EMAIL_THREAD_STATE_LABELS.open_our_court}
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="open_their_court" className="min-h-8 text-xs">
                {EMAIL_THREAD_STATE_LABELS.open_their_court}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <ThreadStateButton
          active={state === 'closed'}
          state="closed"
          label="Closed"
          icon={CheckCircle2}
          disabled={isSaving}
          onClick={() => onChange('closed')}
        />
      </div>
    </div>
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

function ThreadStateButton({
  active,
  state,
  icon: Icon,
  label,
  disabled,
  onClick,
}: {
  active: boolean;
  state: EmailThreadState;
  icon: typeof CircleDotDashed;
  label: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex min-h-7 cursor-pointer items-center gap-1 rounded-full px-2 text-xs font-medium text-muted-foreground transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60',
        active &&
          (state === 'open'
            ? 'bg-destructive/10 text-destructive shadow-xs'
            : 'bg-success-soft text-success-soft-foreground shadow-xs')
      )}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon aria-hidden="true" className="size-3" />
      {label}
    </button>
  );
}
