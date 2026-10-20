import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import type { EmailTemplate } from '@/modules/email/api';
import { EmailRichTextEditor } from '@/modules/email/components/email-rich-text-editor';
import { useSaveEmailTemplateMutation } from '@/modules/email/hooks/email-templates.hooks';
import { isEmptyEmailHtml } from '@/modules/email/lib/email-rich-text';
import { FileText, Signature } from 'lucide-react';

/**
 * Adding or editing an email template (elli-ui#668), laid out as a small
 * composer: a name and an optional subject on labelled rows, the message in
 * the composer's own editor, so the template looks as it will be sent. No
 * sign-off or signature: the composer adds those from the mailbox.
 *
 * Mounted fresh for each template it opens, so its fields start from that one.
 */
export function EmailTemplateDialog({
  template,
  onClose,
}: {
  /** The template to edit; null to write a new one. */
  template: EmailTemplate | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(template?.name ?? '');
  const [subject, setSubject] = useState(template?.subject ?? '');
  const [body, setBody] = useState(template?.body ?? '');
  const save = useSaveEmailTemplateMutation();
  const canSave = name.trim().length > 0 && !isEmptyEmailHtml(body) && !save.isPending;

  const submit = () => {
    if (!canSave) return;
    save.mutate(
      { id: template?.id, name: name.trim(), subject: subject.trim() || null, body },
      { onSuccess: onClose }
    );
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="gap-0 overflow-hidden p-0 sm:max-w-2xl"
        // Opened from inside the composer's form: keep its keys — Escape,
        // Cmd+Enter — from reaching the form and closing or sending the email.
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3 px-6 pb-4 pt-5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <FileText aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg">
              {template ? 'Edit template' : 'New template'}
            </DialogTitle>
            <DialogDescription className="text-[13px]">
              Use it from Templates in any email you write.
            </DialogDescription>
          </div>
        </div>

        <div className="border-y border-border bg-card">
          <TemplateField id="email-template-name" label="Name">
            <Input
              id="email-template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Request a quote"
              maxLength={120}
              autoFocus
              className="h-9 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
            />
          </TemplateField>
          <TemplateField id="email-template-subject" label="Subject">
            <Input
              id="email-template-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Optional — filled in when a new email has none"
              maxLength={255}
              className="h-9 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
            />
          </TemplateField>
          <EmailRichTextEditor
            id="email-template-body"
            label="Template message"
            value={body}
            placeholder="Write the message…"
            contentClassName="px-6 py-4"
            editorClassName="min-h-48"
            toolbarClassName="border-t border-border bg-muted/40 px-4 py-1.5"
            onChange={setBody}
          />
        </div>

        <div className="flex items-center gap-2 px-6 py-3.5">
          <p className="me-auto flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <Signature aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">Your signature is added when you use it.</span>
          </p>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={!canSave} onClick={submit}>
            {save.isPending ? 'Saving…' : template ? 'Save changes' : 'Add template'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** One labelled row, the way the composer lays out To and Subject. */
function TemplateField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border px-6 py-1">
      <label htmlFor={id} className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
