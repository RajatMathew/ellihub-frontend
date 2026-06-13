import { useMemo, useState, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
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
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import type {
  FeatureMailDraft,
  FeatureMailDraftPayload,
  MailRecipientGroup,
  MailSignature,
} from '@/modules/mail/schemas/mail.schema';
import { featureMailDraftPayloadSchema } from '@/modules/mail/schemas/mail.schema';
import { FileText, Info, Send } from 'lucide-react';

type EmailComposePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  draft: FeatureMailDraft | null;
  isLoading?: boolean;
  isSending?: boolean;
  recipientsReadOnly?: boolean;
  onSend: (payload: FeatureMailDraftPayload) => Promise<void>;
};

export type EmailComposePreviewFormProps = {
  draft: FeatureMailDraft;
  isSending: boolean;
  recipientsReadOnly: boolean;
  onCancel: () => void;
  onSend: (payload: FeatureMailDraftPayload) => Promise<void>;
  sendLabel?: string;
  sendingLabel?: string;
  footerStart?: ReactNode;
};

type EmailFormState = {
  from: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  signature: MailSignature;
  attachmentIds: string[];
};

export function EmailComposePreviewDialog({
  open,
  onOpenChange,
  title,
  draft,
  isLoading = false,
  isSending = false,
  recipientsReadOnly = false,
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
            isSending={isSending}
            recipientsReadOnly={recipientsReadOnly}
            onCancel={() => onOpenChange(false)}
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

export function EmailComposePreviewForm({
  draft,
  isSending,
  recipientsReadOnly,
  onCancel,
  onSend,
  sendLabel = 'Send Email',
  sendingLabel = 'Sending...',
  footerStart,
}: EmailComposePreviewFormProps) {
  const initialForm = useMemo(() => toFormState(draft), [draft]);
  const [form, setForm] = useState<EmailFormState>(initialForm);
  const senderOptions = draft.senderOptions;
  const recipientGroups = useMemo(() => draft.recipientGroups ?? [], [draft.recipientGroups]);
  const payload = useMemo(() => toPayload(form), [form]);
  const previewPayload = useDebouncedValue(payload, 150);
  const missingRecipientGroups = useMemo(
    () => getMissingRecipientGroupLabels(recipientGroups, payload.to),
    [payload.to, recipientGroups]
  );
  const isPayloadValid = useMemo(
    () => featureMailDraftPayloadSchema.safeParse(payload).success,
    [payload]
  );
  const activePreview = useMemo(
    () => buildLocalPreview(draft, previewPayload),
    [draft, previewPayload]
  );
  const canSend = isPayloadValid && missingRecipientGroups.length === 0;

  async function handleSend() {
    if (!canSend) return;
    await onSend(payload);
  }

  return (
    <>
      <DialogBody className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-2">
        <div className="min-h-0 overflow-auto border-b p-5 lg:border-b-0 lg:border-e">
          <div className="space-y-4">
            <LabeledControl label="Sender">
              <Select
                value={form.from}
                disabled={!senderOptions.length}
                onValueChange={(value) => setForm((current) => ({ ...current, from: value }))}
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
                </SelectContent>
              </Select>
            </LabeledControl>

            {recipientGroups.length > 0 ? (
              <RecipientGroupsSelector
                groups={recipientGroups}
                selectedEmails={parseEmailList(form.to)}
                disabled={isSending}
                onChange={(emails) =>
                  setForm((current) => ({ ...current, to: emails.join(', ') }))
                }
              />
            ) : (
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
            )}

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

            <div className="rounded-md border bg-muted/30 p-3">
              <div className="text-xs font-semibold uppercase text-muted-foreground">Signature</div>
              <div className="mt-1 text-sm font-medium text-foreground">
                {form.signature.name} - {form.signature.role}
              </div>
              <div className="mt-0.5 break-all text-sm text-muted-foreground">
                {form.signature.email}
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-h-0 flex-col bg-muted/30">
          <div className="border-b px-5 py-3">
            <div className="text-xs font-semibold uppercase text-muted-foreground">Preview</div>
            <div className="mt-1 truncate text-sm font-medium">
              {activePreview.subject || 'No preview yet'}
            </div>
          </div>
          <div className="min-h-0 flex-1 p-4">
            {activePreview.html ? (
              <iframe
                title="Email preview"
                srcDoc={activePreview.html}
                className="h-full w-full rounded-md border bg-background"
              />
            ) : (
              <div className="flex h-full items-center justify-center rounded-md border bg-background text-sm text-muted-foreground">
                Preview will appear when the email fields are valid.
              </div>
            )}
          </div>
          <div className="border-t px-5 py-3">
            <div className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
              Attachments
            </div>
            <div className="space-y-2">
              {draft.attachments.length > 0 ? (
                draft.attachments.map((attachment) => {
                  const checked = form.attachmentIds.includes(attachment.id);

                  return (
                    <label
                      key={attachment.id}
                      className="flex cursor-pointer items-center gap-2 rounded-sm px-1 py-1 text-sm hover:bg-background"
                    >
                      <Checkbox
                        checked={checked}
                        disabled={isSending}
                        onCheckedChange={(nextChecked) =>
                          setForm((current) => ({
                            ...current,
                            attachmentIds:
                              nextChecked === true
                                ? Array.from(new Set([...current.attachmentIds, attachment.id]))
                                : current.attachmentIds.filter((id) => id !== attachment.id),
                          }))
                        }
                      />
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                    </label>
                  );
                })
              ) : (
                <div className="text-sm text-muted-foreground">No attachments available.</div>
              )}
            </div>
          </div>
        </div>
      </DialogBody>
      <DialogFooter className="border-t px-5 py-4 pt-4">
        {footerStart}
        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!canSend || isSending} onClick={handleSend}>
            <Send className="size-4" />
            {isSending ? sendingLabel : sendLabel}
          </Button>
        </div>
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

function RecipientGroupsSelector({
  groups,
  selectedEmails,
  disabled,
  onChange,
}: {
  groups: MailRecipientGroup[];
  selectedEmails: string[];
  disabled: boolean;
  onChange: (emails: string[]) => void;
}) {
  const selected = new Set(selectedEmails);
  const selectedSummary = selectedEmails.length
    ? selectedEmails.join(', ')
    : 'No recipients selected';

  function toggleEmail(email: string, checked: boolean) {
    const normalizedEmail = email.trim().toLowerCase();
    const next = new Set(selected);

    if (checked) {
      next.add(normalizedEmail);
    } else {
      next.delete(normalizedEmail);
    }

    onChange(Array.from(next).sort());
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground">Recipients</div>
      <div className="space-y-2 rounded-md border bg-background p-3">
        {groups.map((group) => {
          const groupSelected = group.options.some((option) => selected.has(option.email));
          const groupHasOptions = group.options.length > 0;

          return (
            <div key={group.id} className="rounded-md border bg-muted/20 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm font-medium text-foreground">{group.label}</div>
                {group.missingEntityEmail && (
                  <span className="inline-flex items-center gap-1 rounded-sm bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
                    <Info className="size-3" />
                    Vendor email missing
                  </span>
                )}
              </div>

              <div className="mt-2 space-y-2">
                {groupHasOptions ? (
                  group.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex cursor-pointer items-start gap-2 rounded-sm px-1 py-1 text-sm hover:bg-background"
                    >
                      <Checkbox
                        checked={selected.has(option.email)}
                        disabled={disabled}
                        onCheckedChange={(checked) => toggleEmail(option.email, checked === true)}
                      />
                      <span className="min-w-0">
                        <span className="block font-medium text-foreground">{option.label}</span>
                        <span className="block break-all text-xs text-muted-foreground">
                          {option.email}
                        </span>
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="rounded-sm bg-background px-2 py-1.5 text-sm text-destructive">
                    No vendor or contact email available.
                  </div>
                )}
              </div>

              {groupHasOptions && !groupSelected && (
                <div className="mt-2 text-xs text-destructive">
                  Select at least one recipient for this vendor.
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="rounded-md border bg-muted/30 px-3 py-2 text-sm">
        <div className="text-xs font-medium text-muted-foreground">To</div>
        <div className="mt-1 break-all text-foreground">{selectedSummary}</div>
      </div>
    </div>
  );
}

function getDraftKey(draft: FeatureMailDraft): string {
  return [draft.from, draft.to.join(','), draft.subject, draft.attachmentIds.join(',')].join('|');
}

function buildLocalPreview(
  draft: FeatureMailDraft,
  payload: FeatureMailDraftPayload
): FeatureMailDraft {
  const selectedIds = new Set(payload.attachmentIds);

  return {
    ...draft,
    ...payload,
    html: buildLocalPreviewHtml(payload.body, draft.html, payload.signature),
    attachments: draft.attachments.filter((attachment) => selectedIds.has(attachment.id)),
  };
}

function buildLocalPreviewHtml(
  body: string,
  draftHtml: string,
  signature: MailSignature
): string {
  return [
    '<div style="font-family:Aptos, Arial, sans-serif;font-size:15px;color:#111827;line-height:1.5;">',
    textToHtml(body),
    '</div>',
    getSignatureHtml(draftHtml) || buildFallbackSignatureHtml(signature),
  ].join('');
}

function getSignatureHtml(html: string): string {
  const bodyEnd = html.indexOf('</div>');
  return bodyEnd >= 0 ? html.slice(bodyEnd + '</div>'.length) : '';
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
    attachmentIds: draft.attachmentIds,
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
    attachmentIds: form.attachmentIds,
    saveToSentItems: true,
  };
}

function parseEmailList(value: string): string[] {
  return value
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function getMissingRecipientGroupLabels(groups: MailRecipientGroup[], selectedEmails: string[]) {
  if (groups.length === 0) return [];

  const selected = new Set(selectedEmails);
  return groups
    .filter((group) => !group.options.some((option) => selected.has(option.email)))
    .map((group) => group.label);
}

function textToHtml(value: string): string {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 12px;">${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`
    )
    .join('');
}

function buildFallbackSignatureHtml(signature: MailSignature): string {
  return [
    '<div style="margin-top:20px;font-family:Aptos, Arial, sans-serif;">',
    '<p style="margin:0 0 8px;">Thank you,</p>',
    `<p style="margin:0 0 8px;">${escapeHtml(signature.name)}</p>`,
    `<p style="margin:0 0 8px;">${escapeHtml(signature.role)}</p>`,
    `<p style="margin:0 0 8px;">Email: <a href="mailto:${escapeHtml(signature.email)}">${escapeHtml(
      signature.email
    )}</a></p>`,
    '</div>',
  ].join('');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
