import { useCallback, useEffect, useState } from 'react';

import { api } from '@/app/api';
import { FileFormatBadge } from '@/app/components/file-format-badge';
import { Button } from '@/app/components/ui/button';
import { downloadBlob } from '@/app/lib/generated-pdf';
import { SenderAvatar } from '@/modules/email/components/email-sender-avatar';
import { EmailShadowBody } from '@/modules/email/components/email-shadow-body';
import {
  attachedEmailFilePreviewItem,
  attachedEmailPersonLabel,
  formatAttachedEmailDate,
  parseAttachedEmail,
  type AttachedEmail,
  type AttachedEmailFile,
  type AttachedEmailPerson,
} from '@/modules/email/lib/email-attachment-preview';
import { emailAttachmentDisplayName } from '@/modules/email/lib/email-attachments';
import { FilePreviewDialog } from '@/modules/files/components/file-preview-dialog';
import { formatFileSize } from '@/modules/files/constants/files.constants';
import { AlertCircle, Download, Loader2 } from 'lucide-react';

type ParseResult =
  | { source: Blob | string; state: 'ready'; email: AttachedEmail }
  | { source: Blob | string; state: 'error' };

/**
 * An attached email, laid out the way Outlook opens it (elli-ui#1499). `source`
 * is the blob the dialog already loaded, or a Files read URL for a saved `.eml`.
 */
export function AttachedEmailPreview({ source }: { source: Blob | string }) {
  const [result, setResult] = useState<ParseResult | null>(null);
  const current = result?.source === source ? result : null;

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const blob =
          typeof source === 'string'
            ? (await api.get<Blob>(source, { responseType: 'blob' })).data
            : source;
        const email = await parseAttachedEmail(blob);
        if (active) setResult({ source, state: 'ready', email });
      } catch (error: unknown) {
        console.warn('Could not read the attached email', error);
        if (active) setResult({ source, state: 'error' });
      }
    })();
    return () => {
      active = false;
    };
  }, [source]);

  if (current?.state !== 'ready') {
    const failed = current?.state === 'error';
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        {failed ? (
          <AlertCircle aria-hidden="true" className="size-8 text-muted-foreground" />
        ) : (
          <Loader2 aria-hidden="true" className="size-8 animate-spin text-muted-foreground" />
        )}
        <p className="text-sm text-muted-foreground" role="status">
          {failed
            ? 'Couldn’t open this email. Download it to open it in your mail app.'
            : 'Opening email…'}
        </p>
      </div>
    );
  }

  const { email } = current;
  const sender = email.from;
  const senderLabel = sender ? attachedEmailPersonLabel(sender) : 'Unknown sender';
  const sentAt = formatAttachedEmailDate(email.date);

  return (
    <div className="mx-auto w-full max-w-5xl p-3 sm:p-6">
      <article className="@container overflow-hidden rounded-md border border-border bg-background">
        <header className="border-b border-border px-4 py-4 sm:px-6">
          <h2 className="break-words text-lg font-semibold leading-snug text-foreground">
            {email.subject || '(No subject)'}
          </h2>
          <div className="mt-4 flex items-start gap-3">
            <SenderAvatar name={senderLabel} email={sender?.address} className="size-10 text-sm" />
            <div className="min-w-0 flex-1 text-sm">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="min-w-0 break-words font-semibold" title={sender?.address}>
                  {senderLabel}
                </p>
                {sentAt && (
                  <time
                    className="shrink-0 text-xs text-muted-foreground"
                    dateTime={email.date ?? ''}
                  >
                    {sentAt}
                  </time>
                )}
              </div>
              <RecipientLine label="To" people={email.to} />
              <RecipientLine label="Cc" people={email.cc} />
            </div>
          </div>
        </header>
        {email.attachments.length > 0 && <AttachedEmailFiles files={email.attachments} />}
        <div className="px-4 py-4 sm:px-6">
          {email.html ? (
            <EmailShadowBody html={email.html} />
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
              {email.text ?? 'This email has no message body.'}
            </p>
          )}
        </div>
      </article>
    </div>
  );
}

function RecipientLine({ label, people }: { label: string; people: AttachedEmailPerson[] }) {
  if (people.length === 0) return null;
  return (
    <p className="mt-1 break-words text-muted-foreground">
      {label}:{' '}
      {people.map((person, index) => (
        <span key={`${person.address}:${index}`} title={person.address || undefined}>
          <span className="text-foreground">{attachedEmailPersonLabel(person)}</span>
          {index < people.length - 1 && '; '}
        </span>
      ))}
    </p>
  );
}

/** The files it carried; each opens in its own preview over this one. */
function AttachedEmailFiles({ files }: { files: AttachedEmailFile[] }) {
  const [openFile, setOpenFile] = useState<AttachedEmailFile | null>(null);
  // Stable per file: the dialog keys its load on this.
  const loadFile = useCallback(
    () => (openFile ? Promise.resolve(openFile.blob) : Promise.reject(new Error('No file'))),
    [openFile]
  );
  const totalSize = files.reduce((total, file) => total + file.size, 0);

  return (
    <section aria-label="Attachments" className="border-b border-border px-4 py-3 sm:px-6">
      <p className="mb-2 text-xs text-muted-foreground">
        {files.length === 1 ? '1 attachment' : `${files.length} attachments`} (
        {formatFileSize(totalSize)})
      </p>
      <ul className="grid grid-cols-1 gap-2 @md:grid-cols-2 @3xl:grid-cols-3">
        {files.map((file) => {
          const name = emailAttachmentDisplayName(file);
          return (
            <li
              key={file.id}
              className="flex min-w-0 items-center gap-1 rounded-md border border-border py-1 pe-1 ps-2"
            >
              <button
                type="button"
                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-sm py-1 text-left focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Open ${name}`}
                onClick={() => setOpenFile(file)}
              >
                <FileFormatBadge fileName={name} mimeType={file.mimeType} className="size-8" />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium text-foreground" title={name}>
                    {name}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                </span>
              </button>
              <Button
                type="button"
                variant="ghost"
                mode="icon"
                size="sm"
                className="size-8 shrink-0 text-muted-foreground"
                aria-label={`Download ${name}`}
                onClick={() => downloadBlob(file.blob, name)}
              >
                <Download aria-hidden="true" className="size-4" />
              </Button>
            </li>
          );
        })}
      </ul>
      <FilePreviewDialog
        open={openFile !== null}
        onOpenChange={(open) => !open && setOpenFile(null)}
        file={openFile && attachedEmailFilePreviewItem(openFile)}
        loadFile={loadFile}
      />
    </section>
  );
}
