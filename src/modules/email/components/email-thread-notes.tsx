import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import type { EmailActivity } from '@/modules/email/api';
import {
  useAddThreadNoteMutation,
  useDeleteThreadNoteMutation,
  useEditThreadNoteMutation,
} from '@/modules/email/hooks/email-activity.hooks';
import { MessageSquarePlus, Pencil, Trash2 } from 'lucide-react';

import { EmailActivityRow, PersonAvatar, TimelineRailRow } from './email-thread-timeline-entry';

/**
 * The top of a thread's timeline (elli-ui#1309): "Add a note…", the notes
 * people left, and anything done to the thread as a whole rather than to one
 * email. Notes are saved and shared with everyone who can open the thread;
 * only their author can edit or delete one.
 */
export function EmailThreadNotes({
  accountId,
  conversationKey,
  providerId,
  items,
}: {
  accountId: string;
  conversationKey: string;
  providerId: string | null;
  items: readonly EmailActivity[];
}) {
  const [isComposing, setIsComposing] = useState(false);
  const [draft, setDraft] = useState('');
  const addNote = useAddThreadNoteMutation();

  const close = () => {
    setIsComposing(false);
    setDraft('');
  };
  const submit = () => {
    const note = draft.trim();
    if (!note) return close();
    addNote.mutate({ accountId, conversationKey, providerId, note }, { onSuccess: close });
  };

  return (
    <ol className="min-w-0 pl-2 pr-4">
      <TimelineRailRow
        tight={isComposing}
        avatar={
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MessageSquarePlus aria-hidden="true" className="size-3" />
          </span>
        }
      >
        {isComposing ? (
          <NoteEditor
            value={draft}
            onChange={setDraft}
            onCancel={close}
            onSubmit={submit}
            submitting={addNote.isPending}
            submitLabel="Add note"
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsComposing(true)}
            className="cursor-pointer text-[13px] leading-5 text-muted-foreground hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          >
            Add a note…
          </button>
        )}
      </TimelineRailRow>

      {items.map((item) =>
        item.kind === 'note' ? (
          <NoteRow key={item.id} item={item} />
        ) : (
          <EmailActivityRow key={item.id} item={item} />
        )
      )}
    </ol>
  );
}

function NoteRow({ item }: { item: EmailActivity }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(item.note ?? '');
  const editNote = useEditThreadNoteMutation();
  const deleteNote = useDeleteThreadNoteMutation();

  return (
    <TimelineRailRow avatar={<PersonAvatar name={item.actor.name} />} time={item.createdAt}>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <p className="min-w-0 text-[13px] leading-5 text-muted-foreground">
          <span className="font-medium text-foreground">{item.actor.name}</span> added a note
          {item.editedAt && <span className="text-xs text-muted-foreground/80"> · edited</span>}
        </p>
        {item.canEdit && !isEditing && (
          <span className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <NoteAction label="Edit note" onClick={() => setIsEditing(true)}>
              <Pencil className="size-3" aria-hidden="true" />
            </NoteAction>
            <NoteAction
              label="Delete note"
              disabled={deleteNote.isPending}
              onClick={() => deleteNote.mutate(item.id)}
            >
              <Trash2 className="size-3" aria-hidden="true" />
            </NoteAction>
          </span>
        )}
      </div>
      {isEditing ? (
        <div className="mt-1.5">
          <NoteEditor
            value={draft}
            onChange={setDraft}
            onCancel={() => {
              setIsEditing(false);
              setDraft(item.note ?? '');
            }}
            onSubmit={() =>
              draft.trim() &&
              editNote.mutate(
                { id: item.id, note: draft.trim() },
                { onSuccess: () => setIsEditing(false) }
              )
            }
            submitting={editNote.isPending}
            submitLabel="Save"
          />
        </div>
      ) : (
        <div className="mt-1.5 min-w-0 rounded-lg border border-border bg-mail-card px-3 py-2">
          <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-foreground">
            {item.note}
          </p>
        </div>
      )}
    </TimelineRailRow>
  );
}

function NoteEditor({
  value,
  onChange,
  onCancel,
  onSubmit,
  submitting,
  submitLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitting: boolean;
  submitLabel: string;
}) {
  return (
    <div className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-150 space-y-1">
      <textarea
        autoFocus
        rows={2}
        value={value}
        aria-label="Note"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            onSubmit();
          }
          if (event.key === 'Escape') onCancel();
        }}
        placeholder="Add a note…"
        className="w-full resize-none rounded-md border border-border bg-mail-card px-2.5 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-hidden"
      />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={onSubmit} disabled={!value.trim() || submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function NoteAction({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-6 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-mail-chip hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      {children}
    </button>
  );
}
