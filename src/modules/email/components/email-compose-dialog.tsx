import { useId, useRef, useState, type ChangeEvent, type ReactNode } from 'react';

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
import { AlertCircle, FileText, Paperclip, Send, Trash2, X } from 'lucide-react';

const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

interface EmailComposeDialogProps {
  open: boolean;
  mailboxAddress: string;
  isSending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSend?: (payload: {
    to: string;
    cc: string;
    bcc: string;
    subject: string;
    body: string;
    attachments: Array<{ name: string; mimeType?: string; content: string }>;
  }) => Promise<void> | void;
}

export function EmailComposeDialog({
  open,
  mailboxAddress,
  isSending = false,
  onOpenChange,
  onSend,
}: EmailComposeDialogProps) {
  const toId = useId();
  const ccId = useId();
  const bccId = useId();
  const subjectId = useId();
  const bodyId = useId();
  const attachmentInputId = useId();
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isPreparingAttachments, setIsPreparingAttachments] = useState(false);
  const canSend =
    form.to.trim().length > 0 && form.subject.trim().length > 0 && form.body.trim().length > 0;

  function resetForm() {
    setForm({ to: '', cc: '', bcc: '', subject: '', body: '' });
    setShowCc(false);
    setShowBcc(false);
    setAttachments([]);
    setAttachmentError(null);
    setIsDragging(false);
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
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canSend || isSending) return;
            setIsPreparingAttachments(true);
            try {
              const encodedAttachments = await Promise.all(attachments.map(fileToAttachment));
              await onSend?.({ ...form, attachments: encodedAttachments });
            } finally {
              setIsPreparingAttachments(false);
            }
            handleOpenChange(false);
          }}
        >
          <DialogBody
            className={`relative min-h-0 flex-1 overflow-auto ${
              isDragging ? 'bg-primary/5 ring-2 ring-inset ring-primary/40' : ''
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setIsDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              addAttachments(
                event.dataTransfer.files,
                attachments,
                setAttachments,
                setAttachmentError
              );
            }}
          >
            {isDragging && (
              <div className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-background/85 text-sm font-medium text-primary">
                Drop files to attach
              </div>
            )}
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

            <AttachmentDropzone
              inputId={attachmentInputId}
              inputRef={attachmentInputRef}
              attachments={attachments}
              error={attachmentError}
              onClear={() => setAttachments([])}
              onSelect={(event) => {
                addAttachments(event.target.files, attachments, setAttachments, setAttachmentError);
                event.target.value = '';
              }}
              onRemove={(file) =>
                setAttachments((current) => current.filter((item) => item !== file))
              }
            />
          </DialogBody>

          <DialogFooter className="border-t border-border px-5 py-3 pt-3">
            <div className="flex w-full flex-wrap items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={!canSend || isSending || isPreparingAttachments}
              >
                <Send aria-hidden="true" className="size-3.5" />
                {isPreparingAttachments ? 'Preparing' : isSending ? 'Sending' : 'Send'}
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

function AttachmentDropzone({
  inputId,
  inputRef,
  attachments,
  error,
  onClear,
  onSelect,
  onRemove,
}: {
  inputId: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  attachments: File[];
  error: string | null;
  onClear: () => void;
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (file: File) => void;
}) {
  return (
    <div className="px-5 pb-5">
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        className="sr-only"
        onChange={onSelect}
      />
      <div className="rounded-lg border border-border bg-muted/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-background text-muted-foreground">
              <Paperclip className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">Drop files here</p>
              <p className="text-xs text-muted-foreground">Up to 25 MB per file</p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip className="size-3.5" aria-hidden="true" />
            Choose files
          </Button>
        </div>

        {attachments.length > 0 && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">
                {attachments.length} {attachments.length === 1 ? 'attachment' : 'attachments'}
              </p>
              <button
                type="button"
                className="inline-flex min-h-8 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                onClick={onClear}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Remove all
              </button>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2" aria-label="Selected attachments">
              {attachments.map((file) => (
                <li
                  key={`${file.name}-${file.lastModified}`}
                  className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                    {file.name}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    className="flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => onRemove(file)}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 text-xs leading-5">
            <p className="font-semibold">Attachment wasn’t added</p>
            <p className="text-destructive/85">{error} Choose a smaller file and try again.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function addAttachments(
  files: FileList | null,
  current: File[],
  setFiles: (files: File[]) => void,
  setError: (error: string | null) => void
) {
  if (!files?.length) return;
  const incoming = Array.from(files);
  const tooLarge = incoming.find((file) => file.size > MAX_ATTACHMENT_SIZE_BYTES);
  if (tooLarge) {
    setError(`${tooLarge.name} is larger than 25 MB.`);
    return;
  }
  const existing = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
  const next = incoming.filter(
    (file) => !existing.has(`${file.name}:${file.size}:${file.lastModified}`)
  );
  setFiles([...current, ...next]);
  setError(null);
}

function fileToAttachment(file: File) {
  return new Promise<{ name: string; mimeType?: string; content: string }>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve({
        name: file.name,
        mimeType: file.type || undefined,
        content: result.split(',')[1] || result,
      });
    };
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
