import { useState } from 'react';

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
import { Loader2, Paperclip, Sparkles } from 'lucide-react';

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

  const close = () => {
    onOpenChange(false);
    // Cleared on the way out rather than on the way in, so a dialog that is
    // still animating closed does not visibly empty itself first.
    setMessage('');
    setFiles([]);
    setShowAttach(false);
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

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <span
            aria-hidden="true"
            className="mb-1 grid size-9 place-items-center rounded-full bg-primary/10 text-primary"
          >
            <Sparkles className="size-4" strokeWidth={2} />
          </span>
          <DialogTitle>Help us improve</DialogTitle>
          <DialogDescription>Tell us why you made this change.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={'Optional — e.g. “assign procurement threads to Owen”'}
            className="min-h-24 resize-none"
            disabled={submitFeedback.isPending}
            autoFocus
          />

          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={session?.user?.name ? `Your name (${session.user.name})` : 'Your name'}
            maxLength={120}
            disabled={submitFeedback.isPending}
            aria-label="Your name"
          />

          {showAttach ? (
            <FeedbackFileDropZone value={files} onChange={setFiles} />
          ) : (
            <button
              type="button"
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1 py-1 text-sm text-muted-foreground',
                'hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring'
              )}
              onClick={() => setShowAttach(true)}
            >
              <Paperclip aria-hidden="true" className="size-3.5" />
              Attach
            </button>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-start">
          <Button type="button" disabled={submitFeedback.isPending} onClick={() => void send()}>
            {submitFeedback.isPending && (
              <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
            )}
            Send feedback
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={submitFeedback.isPending}
            onClick={close}
          >
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
