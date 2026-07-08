import { useId, useState, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Textarea } from '@/app/components/ui/textarea';
import { Paperclip, Send, Trash2 } from 'lucide-react';

interface EmailComposeDialogProps {
  open: boolean;
  mailboxAddress: string;
  onOpenChange: (open: boolean) => void;
}

export function EmailComposeDialog({
  open,
  mailboxAddress,
  onOpenChange,
}: EmailComposeDialogProps) {
  const toId = useId();
  const ccId = useId();
  const bccId = useId();
  const subjectId = useId();
  const bodyId = useId();
  const [form, setForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const canSend = form.to.trim().length > 0 && form.subject.trim().length > 0;

  function resetForm() {
    setForm({ to: '', cc: '', bcc: '', subject: '', body: '' });
    setShowCc(false);
    setShowBcc(false);
  }

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) resetForm();
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(760px,calc(100dvh-3rem))] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="mb-0 border-b border-border px-5 py-4 pe-14">
          <DialogTitle className="text-base">New email</DialogTitle>
          <p className="text-xs text-muted-foreground">From {mailboxAddress}</p>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={(event) => {
            event.preventDefault();
            if (!canSend) return;
            handleOpenChange(false);
          }}
        >
          <DialogBody className="min-h-0 flex-1 overflow-auto">
            <div className="divide-y divide-border">
              <EmailAddressField
                id={toId}
                label="To"
                value={form.to}
                required
                placeholder="recipient@example.com"
                onChange={(to) => setForm((current) => ({ ...current, to }))}
              >
                {!showCc && (
                  <button
                    type="button"
                    className="rounded-sm px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-150"
                    onClick={() => setShowCc(true)}
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    className="rounded-sm px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-150"
                    onClick={() => setShowBcc(true)}
                  >
                    Bcc
                  </button>
                )}
              </EmailAddressField>
              {showCc && (
                <EmailAddressField
                  id={ccId}
                  label="Cc"
                  value={form.cc}
                  placeholder="Optional"
                  onChange={(cc) => setForm((current) => ({ ...current, cc }))}
                />
              )}
              {showBcc && (
                <EmailAddressField
                  id={bccId}
                  label="Bcc"
                  value={form.bcc}
                  placeholder="Optional"
                  onChange={(bcc) => setForm((current) => ({ ...current, bcc }))}
                />
              )}
              <div className="flex items-center gap-3 px-5 py-2.5">
                <label
                  htmlFor={subjectId}
                  className="w-16 shrink-0 text-xs font-medium text-muted-foreground"
                >
                  Subject
                </label>
                <Input
                  id={subjectId}
                  value={form.subject}
                  required
                  placeholder="Add a subject"
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, subject: event.target.value }))
                  }
                />
              </div>
            </div>

            <div className="px-5 py-4">
              <label htmlFor={bodyId} className="sr-only">
                Email body
              </label>
              <Textarea
                id={bodyId}
                value={form.body}
                rows={14}
                placeholder="Write your message..."
                className="min-h-72 resize-y border-0 bg-transparent px-0 py-0 text-sm leading-6 shadow-none focus-visible:ring-0"
                onChange={(event) =>
                  setForm((current) => ({ ...current, body: event.target.value }))
                }
              />
            </div>
          </DialogBody>

          <DialogFooter className="border-t border-border px-5 py-3 pt-3">
            <div className="flex w-full flex-wrap items-center gap-2">
              <Button type="submit" size="sm" disabled={!canSend}>
                <Send aria-hidden="true" className="size-3.5" />
                Send
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="bg-muted/50 text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <Paperclip aria-hidden="true" className="size-3.5" />
                Attach
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto bg-muted/50 text-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={() => handleOpenChange(false)}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                Discard
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EmailAddressField({
  id,
  label,
  value,
  placeholder,
  required,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  onChange: (value: string) => void;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-2.5">
      <label htmlFor={id} className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </label>
      <Input
        id={id}
        type="email"
        value={value}
        required={required}
        autoComplete="email"
        spellCheck={false}
        placeholder={placeholder}
        className="min-w-0 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
        onChange={(event) => onChange(event.target.value)}
      />
      {children && <div className="flex shrink-0 items-center gap-1">{children}</div>}
    </div>
  );
}
