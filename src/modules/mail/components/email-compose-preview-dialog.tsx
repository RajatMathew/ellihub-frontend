import { useMemo, useState, type ReactNode } from 'react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Textarea } from '@/app/components/ui/textarea';
import type {
  FeatureMailDraft,
  FeatureMailDraftPayload,
  MailSignature,
} from '@/modules/mail/schemas/mail.schema';
import { Eye, FileText, Send } from 'lucide-react';

const CUSTOM_SENDER_VALUE = '__custom_sender__';

type EmailComposePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  draft: FeatureMailDraft | null;
  preview: FeatureMailDraft | null;
  isLoading?: boolean;
  isPreviewing?: boolean;
  isSending?: boolean;
  recipientsReadOnly?: boolean;
  onPreview: (payload: FeatureMailDraftPayload) => Promise<void>;
  onSend: (payload: FeatureMailDraftPayload) => Promise<void>;
};

type EmailFormState = {
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  signature: MailSignature;
};

export function EmailComposePreviewDialog({
  open,
  onOpenChange,
  title,
  draft,
  preview,
  isLoading = false,
  isPreviewing = false,
  isSending = false,
  recipientsReadOnly = false,
  onPreview,
  onSend,
}: EmailComposePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="fullscreen" className="gap-0 overflow-hidden p-0">
        <DialogHeader className="mb-0 border-b px-5 py-4 pe-14">
          <DialogTitle className="text-base">{title}</DialogTitle>
        </DialogHeader>
        {isLoading || !draft ? (
          <EmailComposeLoading onCancel={() => onOpenChange(false)} />
        ) : (
          <EmailComposePreviewForm
            key={getDraftKey(draft)}
            draft={draft}
            preview={preview}
            isPreviewing={isPreviewing}
            isSending={isSending}
            recipientsReadOnly={recipientsReadOnly}
            onCancel={() => onOpenChange(false)}
            onPreview={onPreview}
            onSend={onSend}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function EmailComposeLoading({ onCancel }: { onCancel: () => void }) {
  return (
    <>
      <DialogBody className="flex min-h-0 flex-1 items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading email draft...</div>
      </DialogBody>
      <DialogFooter className="border-t px-5 py-4 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </DialogFooter>
    </>
  );
}

function EmailComposePreviewForm({
  draft,
  preview,
  isPreviewing,
  isSending,
  recipientsReadOnly,
  onCancel,
  onPreview,
  onSend,
}: {
  draft: FeatureMailDraft;
  preview: FeatureMailDraft | null;
  isPreviewing: boolean;
  isSending: boolean;
  recipientsReadOnly: boolean;
  onCancel: () => void;
  onPreview: (payload: FeatureMailDraftPayload) => Promise<void>;
  onSend: (payload: FeatureMailDraftPayload) => Promise<void>;
}) {
  const initialForm = useMemo(() => toFormState(draft), [draft]);
  const [form, setForm] = useState<EmailFormState>(initialForm);
  const [previewedPayloadKey, setPreviewedPayloadKey] = useState(() =>
    JSON.stringify(toPayload(initialForm))
  );
  const senderOptions = draft.senderOptions;
  const selectedSender = senderOptions.includes(form.from) ? form.from : CUSTOM_SENDER_VALUE;
  const activePreview = preview ?? draft;
  const payload = useMemo(() => toPayload(form), [form]);
  const payloadKey = useMemo(() => JSON.stringify(payload), [payload]);
  const canSend = payloadKey === previewedPayloadKey && payload.to.length > 0 && !!activePreview;

  async function handlePreview() {
    await onPreview(payload);
    setPreviewedPayloadKey(payloadKey);
  }

  async function handleSend() {
    if (!canSend) return;
    await onSend(payload);
  }

  return (
    <>
      <DialogBody className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="min-h-0 overflow-auto border-b p-5 lg:border-b-0 lg:border-e">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <LabeledControl label="Sender">
                <Select
                  value={selectedSender}
                  onValueChange={(value) => {
                    if (value === CUSTOM_SENDER_VALUE) {
                      setForm((current) => ({
                        ...current,
                        from: senderOptions.includes(current.from) ? '' : current.from,
                      }));
                      return;
                    }
                    setForm((current) => ({ ...current, from: value }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select sender" />
                  </SelectTrigger>
                  <SelectContent>
                    {senderOptions.map((sender) => (
                      <SelectItem key={sender} value={sender}>
                        {sender}
                      </SelectItem>
                    ))}
                    <SelectItem value={CUSTOM_SENDER_VALUE}>Custom</SelectItem>
                  </SelectContent>
                </Select>
              </LabeledControl>
              <LabeledControl label="Custom Sender">
                <Input
                  type="email"
                  value={form.from}
                  disabled={selectedSender !== CUSTOM_SENDER_VALUE}
                  placeholder="name@elli.com"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, from: event.target.value }))
                  }
                />
              </LabeledControl>
            </div>

            <LabeledControl label="To">
              <Input
                value={form.to}
                placeholder="vendor@example.com"
                readOnly={recipientsReadOnly}
                onChange={(event) =>
                  setForm((current) => ({ ...current, to: event.target.value }))
                }
              />
            </LabeledControl>

            <div className="grid gap-4 sm:grid-cols-2">
              <LabeledControl label="Cc">
                <Input
                  value={form.cc}
                  placeholder="Optional"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, cc: event.target.value }))
                  }
                />
              </LabeledControl>
              <LabeledControl label="Bcc">
                <Input
                  value={form.bcc}
                  placeholder="Optional"
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bcc: event.target.value }))
                  }
                />
              </LabeledControl>
            </div>

            <LabeledControl label="Subject">
              <Input
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({ ...current, subject: event.target.value }))
                }
              />
            </LabeledControl>

            <LabeledControl label="Body">
              <Textarea
                value={form.body}
                rows={9}
                onChange={(event) =>
                  setForm((current) => ({ ...current, body: event.target.value }))
                }
              />
            </LabeledControl>

            <div className="grid gap-4 sm:grid-cols-3">
              <SignatureInput
                label="Signature Name"
                value={form.signature.name}
                onChange={(name) =>
                  setForm((current) => ({
                    ...current,
                    signature: { ...current.signature, name },
                  }))
                }
              />
              <SignatureInput
                label="Role"
                value={form.signature.role}
                onChange={(role) =>
                  setForm((current) => ({
                    ...current,
                    signature: { ...current.signature, role },
                  }))
                }
              />
              <SignatureInput
                label="Signature Email"
                type="email"
                value={form.signature.email}
                onChange={(email) =>
                  setForm((current) => ({
                    ...current,
                    signature: { ...current.signature, email },
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col bg-muted/30">
          <div className="border-b px-5 py-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Preview</div>
            <div className="mt-1 truncate text-sm font-medium">
              {activePreview?.subject || 'No preview yet'}
            </div>
          </div>
          <div className="min-h-0 flex-1 p-4">
            {activePreview?.html ? (
              <iframe
                title="Email preview"
                srcDoc={activePreview.html}
                className="h-full w-full rounded-md border bg-background"
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-md border bg-background text-sm text-muted-foreground">
                Generate a preview to review the email.
              </div>
            )}
          </div>
          <div className="border-t px-5 py-3">
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Attachments
            </div>
            <div className="space-y-2">
              {(activePreview?.attachments ?? []).map((attachment, index) => (
                <div
                  key={`${attachment.name}-${index}`}
                  className="flex items-center gap-2 text-sm"
                >
                  <FileText className="size-4 text-muted-foreground" />
                  <span className="truncate">{attachment.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogFooter className="border-t px-5 py-4 pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="outline" disabled={isPreviewing} onClick={handlePreview}>
          <Eye className="size-4" />
          {isPreviewing ? 'Previewing...' : 'Preview'}
        </Button>
        <Button disabled={!canSend || isSending || isPreviewing} onClick={handleSend}>
          <Send className="size-4" />
          {isSending ? 'Sending...' : 'Send Email'}
        </Button>
      </DialogFooter>
    </>
  );
}

function LabeledControl({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function SignatureInput({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: 'email' | 'text';
}) {
  return (
    <LabeledControl label={label}>
      <Input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </LabeledControl>
  );
}

function getDraftKey(draft: FeatureMailDraft): string {
  return [draft.from, draft.to.join(','), draft.subject].join('|');
}

function toFormState(draft: FeatureMailDraft): EmailFormState {
  return {
    from: draft.from,
    to: draft.to.join(', '),
    cc: draft.cc.join(', '),
    bcc: draft.bcc.join(', '),
    subject: draft.subject,
    body: draft.body,
    signature: draft.signature,
  };
}

function toPayload(form: EmailFormState): FeatureMailDraftPayload {
  return {
    from: form.from.trim().toLowerCase(),
    to: parseEmailList(form.to),
    cc: parseEmailList(form.cc),
    bcc: parseEmailList(form.bcc),
    subject: form.subject.trim(),
    body: form.body.trim(),
    signature: {
      name: form.signature.name.trim(),
      role: form.signature.role.trim(),
      email: form.signature.email.trim().toLowerCase(),
    },
    saveToSentItems: true,
  };
}

function parseEmailList(value: string): string[] {
  return value
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}
