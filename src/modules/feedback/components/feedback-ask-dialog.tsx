import { useEffect, useState, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/app/lib/utils';
import { FeedbackFileDropZone } from '@/modules/feedback/components/feedback-file-drop-zone';
import { useSubmitFeedbackMutation } from '@/modules/feedback/hooks/use-submit-feedback';
import { clampFeedbackTitle } from '@/modules/feedback/lib/feedback-ask';
import {
  Loader2,
  Maximize2,
  MessageSquareText,
  Minimize2,
  Paperclip,
  SquarePen,
  X,
} from 'lucide-react';

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
 *
 * **It does not ask who you are.** The panel briefly carried a name field,
 * prefilled from the session and editable, on the theory that a shared login
 * or someone reporting for a colleague makes the account the wrong answer.
 * In an app nobody reaches without signing in, that is a box almost everyone
 * retypes their own name into — a second question in front of a one-line
 * answer, on the ask that exists precisely because it is cheap to answer
 * (elli-ui#1050). Feedback is now filed against the signed-in account, which
 * is also what lets the board group it by person at all.
 *
 * **And when it is not asking, it waits as a bubble.** The ask fires once a
 * session, which is the right frequency for an interruption and the wrong one
 * for a door: someone who dismissed it, or who thought of something an hour
 * later, had nowhere to say it. The same panel is therefore always one click
 * away in the same corner — the ask simply opens it for you, once, at the
 * moment it is most likely to be worth answering.
 */
export function FeedbackAskDialog({
  open,
  context,
  idleContext = 'Feedback from the mailbox',
  onOpenChange,
}: {
  /** The ask fired: open the panel and title the feedback after the change. */
  open: boolean;
  /**
   * What the person just did, recorded with the feedback so a one-line reply
   * still says what it is about. Not shown to them — they were there.
   */
  context: string;
  /**
   * The title to file under when the panel was opened from the bubble rather
   * than by a change. Nobody edited anything, so `context` would be a lie.
   */
  idleContext?: string;
  onOpenChange: (open: boolean) => void;
}) {
  const submitFeedback = useSubmitFeedbackMutation();
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showAttach, setShowAttach] = useState(false);
  const [expanded, setExpanded] = useState(false);
  /**
   * Opened from the bubble, which the parent knows nothing about — it owns
   * only the ask. Either source shows the same panel.
   */
  const [openedFromBubble, setOpenedFromBubble] = useState(false);
  const panelOpen = open || openedFromBubble;
  /** An ask beats a bubble: if both are true, this was a change. */
  const askedByChange = open;

  const close = () => {
    setOpenedFromBubble(false);
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
      title: clampFeedbackTitle(askedByChange ? context : idleContext),
      message: message.trim() || `No detail given — ${askedByChange ? context : idleContext}`,
      files,
      currentUrl: typeof window === 'undefined' ? undefined : window.location.href,
      userAgent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
    });
    close();
  };

  // Escape closes the docked panel too. Radix gives the expanded dialog this
  // for free; docked, there is no overlay listening, so it is wired by hand.
  useEffect(() => {
    if (!panelOpen || expanded) return;

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
  }, [expanded, panelOpen]);

  const title = askedByChange ? 'Help us improve' : 'Send feedback';
  const description = askedByChange
    ? 'Tell us why you made this change.'
    : 'Tell us what is working, or what is not.';

  if (!panelOpen) {
    return (
      <button
        type="button"
        aria-label="Send feedback"
        title="Send feedback"
        className={cn(
          'fixed bottom-4 right-4 z-40 grid size-11 cursor-pointer place-items-center rounded-xl',
          'bg-primary text-primary-foreground shadow-lg hover:bg-primary/90',
          'focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'motion-safe:transition-colors motion-safe:duration-100'
        )}
        onClick={() => setOpenedFromBubble(true)}
      >
        <MessageSquareText aria-hidden="true" className="size-5" strokeWidth={1.75} />
      </button>
    );
  }

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
        placeholder={'Optional. e.g. “assign procurement threads to Owen”'}
        className={cn('resize-none', expanded ? 'min-h-24' : 'min-h-20 text-[13px]')}
        disabled={submitFeedback.isPending}
        autoFocus={expanded}
      />

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
                <SquarePen className="size-4" strokeWidth={1.75} />
              </span>
              {controls}
            </div>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
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
      aria-label={title}
      className={cn(
        'fixed bottom-4 right-4 z-50 w-[22.5rem] max-w-[calc(100vw-2rem)] rounded-xl border bg-popover p-4 text-popover-foreground shadow-lg',
        'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-200'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden="true"
            className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/10 text-primary"
          >
            <SquarePen className="size-3.5" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="text-xs leading-snug text-muted-foreground">{description}</p>
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
