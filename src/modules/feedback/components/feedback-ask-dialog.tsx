import { useEffect, useState, type ReactNode } from 'react';

import { useSession } from '@/app/api/auth-client';
import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/app/lib/utils';
import { FeedbackFileDropZone } from '@/modules/feedback/components/feedback-file-drop-zone';
import { useSubmitFeedbackMutation } from '@/modules/feedback/hooks/use-submit-feedback';
import { clampFeedbackTitle } from '@/modules/feedback/lib/feedback-ask';
import { Loader2, Maximize2, Minimize2, Paperclip, Sparkles, X } from 'lucide-react';

/**
 * The ask that follows a change, rather than the one waiting behind a button.
 *
 * Someone who has just reassigned a thread or handed over the court knows why
 * they did it, and that reason is worth more than anything they would type
 * days later from the feedback form (elli-ui#1050). So it is asked here, once,
 * while the change is still the thing they were thinking about.
 *
 * Everything about it is built to be ignorable. The message is optional, the
 * dialog dismisses on Escape and on a click away like any other, and
 * `Dismiss` is a real answer rather than a way of getting rid of it. An ask
 * that has to be filled in to go away stops being feedback and becomes a toll
 * on the thing the person was actually doing.
 *
 * It submits through the same pipeline the header's form uses; nothing about
 * where feedback goes changes because of where it was asked.
 *
 * **It is docked, not modal.** Asked as a centred dialog behind an overlay, it
 * landed on top of whatever the person was doing — most often the references
 * picker they had just used, which is the very action that triggers it — and
 * demanded an answer before they could carry on. It now sits small in the
 * bottom-right corner, over nothing, and the page stays live behind it.
 * Expanding it is a deliberate second step for anyone who actually wants to
 * write something, and only then does it take the middle of the screen.
 */
export function FeedbackAskDialog({
  open,
  context,
  onOpenChange,
}: {
  open: boolean;
  /**
   * What the person just did, recorded with the feedback so a one-line reply
   * still says what it is about. Not shown to them — they were there.
   */
  context: string;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: session } = useSession();
  const submitFeedback = useSubmitFeedbackMutation();
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showAttach, setShowAttach] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const close = () => {
    onOpenChange(false);
    // Cleared on the way out rather than on the way in, so a dialog that is
    // still animating closed does not visibly empty itself first.
    setMessage('');
    setFiles([]);
    setShowAttach(false);
    setExpanded(false);
  };

  const send = async () => {
    await submitFeedback.mutateAsync({
      title: clampFeedbackTitle(context),
      submitterName: name.trim() || session?.user?.name || '',
      message: message.trim() || `No detail given — ${context}`,
      files,
      currentUrl: typeof window === 'undefined' ? undefined : window.location.href,
      userAgent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
    });
    close();
  };

  // Escape closes the docked panel too. Radix gives the expanded dialog this
  // for free; docked, there is no overlay listening, so it is wired by hand.
  useEffect(() => {
    if (!open || expanded) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      // Not while something else is on top of it. The panel is asked right
      // after a change made in the references picker, and that picker is
      // often still open behind it — one Escape should shut the popover the
      // person is looking at, not quietly take the ask away with it. Radix
      // mounts every popover and dropdown in this wrapper, so its presence is
      // the reliable signal that Escape already has an owner.
      if (document.querySelector('[data-radix-popper-content-wrapper]')) return;
      close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `close` is stable for this dialog's lifetime
  }, [expanded, open]);

  if (!open) return null;

  const controls = (
    <div className="flex shrink-0 items-center gap-0.5">
      <IconAction
        label={expanded ? 'Shrink to the corner' : 'Expand'}
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? (
          <Minimize2 aria-hidden="true" className="size-3.5" />
        ) : (
          <Maximize2 aria-hidden="true" className="size-3.5" />
        )}
      </IconAction>
      <IconAction label="Close" onClick={close}>
        <X aria-hidden="true" className="size-4" />
      </IconAction>
    </div>
  );

  const form = (
    <div className="space-y-3">
      <Textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder={'Optional — e.g. “assign procurement threads to Owen”'}
        className={cn('resize-none', expanded ? 'min-h-24' : 'min-h-16 text-[13px]')}
        disabled={submitFeedback.isPending}
        autoFocus={expanded}
      />

      {/* Only once there is room for it. Docked, the panel is deliberately two
          fields shorter than the thing it used to be. */}
      {expanded && (
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={session?.user?.name ? `Your name (${session.user.name})` : 'Your name'}
          maxLength={120}
          disabled={submitFeedback.isPending}
          aria-label="Your name"
        />
      )}

      {showAttach ? (
        <FeedbackFileDropZone value={files} onChange={setFiles} />
      ) : (
        <button
          type="button"
          className={cn(
            'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-muted-foreground',
            expanded ? 'text-sm' : 'text-[13px]',
            'hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring'
          )}
          onClick={() => setShowAttach(true)}
        >
          <Paperclip aria-hidden="true" className="size-3.5" />
          Attach
        </button>
      )}
    </div>
  );

  const actions = (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size={expanded ? 'md' : 'sm'}
        disabled={submitFeedback.isPending}
        onClick={() => void send()}
      >
        {submitFeedback.isPending && (
          <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
        )}
        Send feedback
      </Button>
      <Button
        type="button"
        variant="outline"
        size={expanded ? 'md' : 'sm'}
        disabled={submitFeedback.isPending}
        onClick={close}
      >
        Dismiss
      </Button>
    </div>
  );

  if (expanded) {
    return (
      <Dialog open onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
        <DialogContent className="sm:max-w-md" showCloseButton={false}>
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <span
                aria-hidden="true"
                className="mb-1 grid size-9 place-items-center rounded-full bg-primary/10 text-primary"
              >
                <Sparkles className="size-4" strokeWidth={2} />
              </span>
              {controls}
            </div>
            <DialogTitle>Help us improve</DialogTitle>
            <DialogDescription>Tell us why you made this change.</DialogDescription>
          </DialogHeader>

          {form}

          <DialogFooter className="gap-2 sm:justify-start">{actions}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    /*
      `fixed`, no overlay, and nothing behind it is inert — the picker that
      triggered this stays usable. Bottom-right and narrow so it sits clear of
      the details panel it is asked from.
    */
    <div
      role="dialog"
      aria-label="Help us improve"
      className={cn(
        'fixed bottom-4 right-4 z-50 w-[19.5rem] max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-3.5 text-popover-foreground shadow-lg',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
          >
            <Sparkles className="size-3.5" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Help us improve</p>
            <p className="text-xs leading-snug text-muted-foreground">
              Tell us why you made this change.
            </p>
          </div>
        </div>
        {controls}
      </div>

      <div className="mt-3">{form}</div>
      <div className="mt-3">{actions}</div>
    </div>
  );
}

function IconAction({
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
      aria-label={label}
      title={label}
      className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-100"
      onClick={onClick}
    >
      {children}
    </button>
  );
}
