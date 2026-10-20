import { useRef, type FormEvent, type KeyboardEvent, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/app/components/ui/dialog';
import { useAutoHeight } from '@/app/hooks/use-auto-height';
import { cn } from '@/app/lib/utils';
import { Command, CornerDownLeft, X } from 'lucide-react';

import { toSingleLine } from './single-line';

/**
 * The create/edit modal tasks and calendar events share (elli-ui#1379): a
 * white sheet with the title and notes written straight into it, a list of
 * labelled properties below, and Cancel / the primary action at the foot.
 * ⌘↵ submits from anywhere in it.
 */
export function RecordModal({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  children,
  footer,
  autoFocusTitle = true,
  titleAside,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What the header calls it: "New task", "Edit event". */
  title: string;
  /** For screen readers; the sheet itself says what it is. */
  description: string;
  onSubmit: () => void;
  children: ReactNode;
  footer: ReactNode;
  /** An existing record opens to be read, so its title gets no caret. */
  autoFocusTitle?: boolean;
  /** Beside the header title, e.g. a tag saying the sheet was prefilled by Elliot. */
  titleAside?: ReactNode;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };
  const onKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(calc(100dvh-2rem),880px)] w-[calc(100vw-2rem)] flex-col gap-0 overflow-hidden rounded-2xl border-0 bg-popover p-0 shadow-2xl sm:max-w-2xl"
        onOpenAutoFocus={(event) => {
          if (autoFocusTitle) return;
          // No caret in the title, but focus still has to move into the sheet: left where it
          // was, it stays on whatever opened it — a board card, whose drag sensor reads ⌘↵ as
          // Enter and picks the card up instead of the form saving.
          event.preventDefault();
          formRef.current?.focus();
        }}
      >
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <form
          ref={formRef}
          tabIndex={-1}
          onSubmit={submit}
          onKeyDown={onKeyDown}
          className="flex min-h-0 flex-1 flex-col outline-none"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 px-5 pt-3.5">
            <div className="flex min-w-0 items-center gap-2">
              <DialogTitle className="font-sans text-sm font-medium tracking-normal text-muted-foreground">
                {title}
              </DialogTitle>
              {titleAside}
            </div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="cursor-pointer disabled:cursor-not-allowed grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>
          {/* Only the body scrolls: the title bar and the actions stay put. */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</div>
          <div className="shrink-0">{footer}</div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** The title and notes, written straight onto the sheet rather than into boxes. */
export function RecordModalCompose({
  title,
  onTitleChange,
  titlePlaceholder,
  notes,
  onNotesChange,
  notesPlaceholder,
  autoFocus = true,
  idPrefix,
}: {
  title: string;
  onTitleChange: (value: string) => void;
  titlePlaceholder: string;
  notes: string;
  onNotesChange: (value: string) => void;
  notesPlaceholder: string;
  autoFocus?: boolean;
  idPrefix: string;
}) {
  const titleRef = useAutoHeight<HTMLTextAreaElement>(title);
  const notesRef = useAutoHeight<HTMLTextAreaElement>(notes);
  return (
    <div className="flex flex-col gap-2 px-5 pb-1.5 pt-3.5">
      <label htmlFor={`${idPrefix}-title`} className="sr-only">
        Title
      </label>
      {/*
        A title wraps rather than scrolling sideways: a long one — an email subject, or a task
        Elliot drafted — opened as a single-line input showed only its tail. It is still one
        line of text: Enter submits instead of breaking, and a pasted break becomes a space.
      */}
      <textarea
        ref={titleRef}
        id={`${idPrefix}-title`}
        autoFocus={autoFocus}
        autoComplete="off"
        rows={1}
        value={title}
        placeholder={titlePlaceholder}
        onKeyDown={(event) => {
          // Enter submits, as it did when this was an <input> in the form; ⌘/Ctrl+Enter is
          // the form's own shortcut and passes through.
          if (event.key !== 'Enter' || event.metaKey || event.ctrlKey || event.shiftKey) return;
          event.preventDefault();
          event.currentTarget.form?.requestSubmit();
        }}
        onChange={(event) => onTitleChange(toSingleLine(event.target.value))}
        className="w-full resize-none overflow-hidden bg-transparent text-2xl font-semibold leading-8 tracking-tight text-foreground outline-none placeholder:text-muted-foreground/60"
      />
      <label htmlFor={`${idPrefix}-notes`} className="sr-only">
        Description
      </label>
      <textarea
        ref={notesRef}
        id={`${idPrefix}-notes`}
        rows={1}
        value={notes}
        placeholder={notesPlaceholder}
        onChange={(event) => onNotesChange(event.target.value)}
        className="w-full resize-none overflow-hidden bg-transparent text-sm leading-6 text-muted-foreground outline-none placeholder:text-muted-foreground/60 focus:text-foreground"
      />
    </div>
  );
}

/** The labelled properties under the compose area, ruled off from it. */
export function RecordModalProps({ children }: { children: ReactNode }) {
  return (
    <div className="mx-5 mt-1.5 border-t border-border/50 pb-3.5 pt-2.5">
      <div className="-ml-2.5 flex flex-col gap-1">{children}</div>
    </div>
  );
}

export function RecordModalSeparator() {
  return <div className="my-1.5 ml-2.5 h-px bg-border/50" />;
}

/** Cancel and the primary action, with whatever a record adds on the left (Delete). */
export function RecordModalFooter({
  submitLabel,
  submitting = false,
  canSubmit = true,
  onCancel,
  leading,
  error,
}: {
  submitLabel: string;
  submitting?: boolean;
  canSubmit?: boolean;
  onCancel: () => void;
  leading?: ReactNode;
  error?: string | null;
}) {
  return (
    <div className="rounded-b-2xl border-t border-border/50 bg-muted/20 px-3.5 py-3">
      {error ? (
        <p
          role="alert"
          className="mb-2.5 rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {leading}
        <div className="ml-auto flex items-center gap-1.5">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={!canSubmit || submitting}
            className={cn('gap-2.5 pr-2')}
          >
            {submitting ? 'Saving…' : submitLabel}
            <kbd
              aria-label="Command Enter"
              className="inline-flex h-5 items-center gap-0.5 rounded-sm bg-primary-foreground/15 px-1"
            >
              <Command className="size-3" aria-hidden="true" />
              <CornerDownLeft className="size-3" aria-hidden="true" />
            </kbd>
          </Button>
        </div>
      </div>
    </div>
  );
}
