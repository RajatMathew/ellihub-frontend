import { useEffect, useId, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import type { EmailThreadMessage } from '@/modules/email/components/email-row-card';
import { Paperclip, Send, Trash2 } from 'lucide-react';

interface EmailReplyComposerProps {
  message: EmailThreadMessage;
  isSending?: boolean;
  onSend: (body: string) => Promise<void> | void;
  onCancel: () => void;
}

export function EmailReplyComposer({
  message,
  isSending = false,
  onSend,
  onCancel,
}: EmailReplyComposerProps) {
  const [body, setBody] = useState('');
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const canSend = body.trim().length > 0 && !isSending;

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <form
      className="rounded-md border border-border bg-background"
      aria-label={`Reply to ${message.senderName}`}
      onSubmit={async (event) => {
        event.preventDefault();
        if (!canSend) return;
        await onSend(body.trim());
        setBody('');
      }}
    >
      <div className="border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <span className="shrink-0 font-medium text-foreground">To:</span>
          <span className="min-w-0 truncate text-muted-foreground">
            {message.senderName} &lt;{message.senderEmail}&gt;
          </span>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <label htmlFor={textareaId} className="sr-only">
          Reply message
        </label>
        <Textarea
          ref={textareaRef}
          id={textareaId}
          value={body}
          rows={6}
          placeholder="Write your reply..."
          className="min-h-36 resize-y border-0 bg-transparent px-0 py-0 text-sm leading-6 shadow-none focus-visible:ring-0"
          disabled={isSending}
          onChange={(event) => setBody(event.target.value)}
        />

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button type="submit" size="sm" disabled={!canSend}>
            <Send aria-hidden="true" className="size-3.5" />
            {isSending ? 'Sending...' : 'Send'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="bg-muted/50 text-foreground hover:bg-accent hover:text-accent-foreground"
            disabled={isSending}
          >
            <Paperclip aria-hidden="true" className="size-3.5" />
            Attach
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto bg-muted/50 text-foreground hover:bg-accent hover:text-accent-foreground"
            disabled={isSending}
            onClick={onCancel}
          >
            <Trash2 aria-hidden="true" className="size-3.5" />
            Discard
          </Button>
        </div>
      </div>
    </form>
  );
}
