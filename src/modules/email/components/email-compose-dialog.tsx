import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';

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
import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import { getEmailAddressListError } from '@/modules/email/lib/email-addresses';
import { AlertCircle, FileText, Paperclip, Send, Trash2, X } from 'lucide-react';

const MAX_ATTACHMENT_SIZE_BYTES = 25 * 1024 * 1024;

type ComposeForm = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
};

type AddressField = 'to' | 'cc' | 'bcc';
type AddressErrors = Partial<Record<AddressField, string>>;

export type ComposeDraftIdentity = {
  draftId: string;
  messageId: string;
};

export type EditableComposeDraft = ComposeDraftIdentity &
  ComposeForm & {
    attachments: EmailAttachment[];
  };

export type ComposeDraftPayload = ComposeForm & {
  attachments?: Array<{ name: string; mimeType?: string; content: string }>;
  removedAttachmentIds?: string[];
};

export type ComposeDraftSaveResult = ComposeDraftIdentity & {
  attachments?: EmailAttachment[];
};

interface EmailComposeDialogProps {
  open: boolean;
  mailboxAddress: string;
  initialDraft?: EditableComposeDraft | null;
  isSending?: boolean;
  onOpenChange: (open: boolean) => void;
  onSaveDraft?: (
    payload: ComposeDraftPayload,
    draft?: ComposeDraftIdentity
  ) => Promise<ComposeDraftSaveResult>;
  onSendDraft?: (draft: ComposeDraftIdentity) => Promise<void>;
  onDiscardDraft?: (draft: ComposeDraftIdentity, options?: { silent?: boolean }) => Promise<void>;
}

export function EmailComposeDialog({
  open,
  mailboxAddress,
  initialDraft,
  isSending = false,
  onOpenChange,
  onSaveDraft,
  onSendDraft,
  onDiscardDraft,
}: EmailComposeDialogProps) {
  const toId = useId();
  const ccId = useId();
  const bccId = useId();
  const subjectId = useId();
  const bodyId = useId();
  const attachmentInputId = useId();
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<ComposeForm>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
  });
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<EmailAttachment[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<string[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'error'>('idle');
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const initializedDraftRef = useRef<string | null>(null);
  const draftRef = useRef<ComposeDraftIdentity | undefined>(undefined);
  const attachmentsRef = useRef<File[]>([]);
  const attachmentPreparationRef = useRef<Promise<void>>(Promise.resolve());
  const lastPersistedFormRef = useRef<ComposeForm>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: '',
  });
  const lastSavedSignatureRef = useRef('');
  const canSend = form.to.trim().length > 0 && form.subject.trim().length > 0;
  const isBusy = isClosing || isSubmitting || isDiscarding || isSending;
  const isPreparingAttachments = saveStatus === 'saving' && attachments.length > 0;
  const hasContent = Boolean(
    form.to.trim() ||
    form.cc.trim() ||
    form.bcc.trim() ||
    form.subject.trim() ||
    form.body.trim() ||
    attachments.length ||
    existingAttachments.length
  );
  const signature = useMemo(
    () =>
      JSON.stringify({
        form,
        files: attachments.map(fileKey),
        existing: existingAttachments.map((attachment) => attachment.id),
        removed: removedAttachmentIds,
      }),
    [attachments, existingAttachments, form, removedAttachmentIds]
  );
  function resetForm() {
    setForm({ to: '', cc: '', bcc: '', subject: '', body: '' });
    setShowCc(false);
    setShowBcc(false);
    setAttachments([]);
    attachmentsRef.current = [];
    setExistingAttachments([]);
    setRemovedAttachmentIds([]);
    draftRef.current = undefined;
    setSaveStatus('idle');
    setAddressErrors({});
    setAttachmentError(null);
    setIsDragging(false);
    setIsClosing(false);
    setIsSubmitting(false);
    setIsDiscarding(false);
    initializedDraftRef.current = null;
    lastPersistedFormRef.current = { to: '', cc: '', bcc: '', subject: '', body: '' };
    lastSavedSignatureRef.current = '';
  }

  function finishClose() {
    onOpenChange(false);
    resetForm();
  }

  const saveDraft = useCallback(async () => {
    if (!hasContent || !onSaveDraft) return draftRef.current;
    await attachmentPreparationRef.current;
    if (signature === lastSavedSignatureRef.current && draftRef.current) {
      return draftRef.current;
    }

    const currentForm = form;
    const currentFiles = attachmentsRef.current;
    const currentRemovedIds = removedAttachmentIds;
    setSaveStatus('saving');

    try {
      const encodedAttachments = currentFiles.length
        ? await Promise.all(currentFiles.map(fileToAttachment))
        : undefined;
      const result = await onSaveDraft(
        {
          ...currentForm,
          attachments: encodedAttachments,
          removedAttachmentIds: currentRemovedIds,
        },
        draftRef.current
      );
      const nextDraft = { draftId: result.draftId, messageId: result.messageId };
      draftRef.current = nextDraft;
      lastPersistedFormRef.current = currentForm;
      if (result.attachments) {
        setExistingAttachments(result.attachments);
        attachmentsRef.current = [];
        setAttachments([]);
      }
      lastSavedSignatureRef.current = signature;
      setSaveStatus('idle');
      return nextDraft;
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  }, [form, hasContent, onSaveDraft, removedAttachmentIds, signature]);

  useEffect(() => {
    if (!open) return;
    const initialKey = initialDraft?.draftId ?? 'new';
    if (initializedDraftRef.current === initialKey) return;
    initializedDraftRef.current = initialKey;

    const nextForm = initialDraft
      ? {
          to: initialDraft.to,
          cc: initialDraft.cc,
          bcc: initialDraft.bcc,
          subject: initialDraft.subject,
          body: initialDraft.body,
        }
      : { to: '', cc: '', bcc: '', subject: '', body: '' };
    const nextAttachments = initialDraft?.attachments ?? [];
    setForm(nextForm);
    setShowCc(Boolean(initialDraft?.cc));
    setShowBcc(Boolean(initialDraft?.bcc));
    setAttachments([]);
    attachmentsRef.current = [];
    setExistingAttachments(nextAttachments);
    setRemovedAttachmentIds([]);
    draftRef.current = initialDraft
      ? { draftId: initialDraft.draftId, messageId: initialDraft.messageId }
      : undefined;
    lastPersistedFormRef.current = nextForm;
    setSaveStatus('idle');
    setAddressErrors({});
    lastSavedSignatureRef.current = JSON.stringify({
      form: nextForm,
      files: [],
      existing: nextAttachments.map((attachment) => attachment.id),
      removed: [],
    });
  }, [initialDraft, open]);

  async function handleRequestClose() {
    if (isBusy) return;
    if (!hasContent) {
      finishClose();
      return;
    }
    if (hasInvalidRecipients(form)) {
      setIsClosing(true);
      await attachmentPreparationRef.current;
      const preparedNewDraft = initialDraft ? undefined : draftRef.current;
      finishClose();
      if (preparedNewDraft) {
        void onDiscardDraft?.(preparedNewDraft, { silent: true });
      }
      return;
    }
    setIsClosing(true);
    try {
      await saveDraft();
      finishClose();
    } catch {
      setIsClosing(false);
    }
  }

  function validateAddresses(requireTo: boolean) {
    const nextErrors: AddressErrors = {
      to: getEmailAddressListError(form.to, 'To', requireTo) ?? undefined,
      cc: getEmailAddressListError(form.cc, 'Cc') ?? undefined,
      bcc: getEmailAddressListError(form.bcc, 'Bcc') ?? undefined,
    };
    setAddressErrors(nextErrors);

    const firstInvalidField = (['to', 'cc', 'bcc'] as const).find((field) => nextErrors[field]);
    if (!firstInvalidField) return true;

    const fieldIds = { to: toId, cc: ccId, bcc: bccId };
    window.requestAnimationFrame(() =>
      document.getElementById(fieldIds[firstInvalidField])?.focus()
    );
    return false;
  }

  function updateAddressField(field: AddressField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (saveStatus === 'error') setSaveStatus('idle');
    setAddressErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function replacePendingAttachments(next: File[]) {
    attachmentsRef.current = next;
    setAttachments(next);
  }

  function startAttachmentPreparation(files: File[]) {
    if (!files.length || !onSaveDraft) return;

    const formSnapshot = { ...lastPersistedFormRef.current };
    const removedIdsSnapshot = [...removedAttachmentIds];
    const uploadedKeys = new Set(files.map(fileKey));
    setSaveStatus('saving');

    const preparation = (async () => {
      try {
        const encodedAttachments = await Promise.all(files.map(fileToAttachment));
        const result = await onSaveDraft(
          {
            ...formSnapshot,
            attachments: encodedAttachments,
            removedAttachmentIds: removedIdsSnapshot,
          },
          draftRef.current
        );
        draftRef.current = { draftId: result.draftId, messageId: result.messageId };
        if (result.attachments) {
          setExistingAttachments(result.attachments);
          replacePendingAttachments(
            attachmentsRef.current.filter((file) => !uploadedKeys.has(fileKey(file)))
          );
        }
        setSaveStatus('idle');
      } catch {
        setSaveStatus('error');
      }
    })();

    attachmentPreparationRef.current = preparation;
  }

  function handleAttachmentSelection(files: FileList | null) {
    const addedFiles = getNewAttachments(files, attachmentsRef.current, setAttachmentError);
    if (!addedFiles.length) return;

    replacePendingAttachments([...attachmentsRef.current, ...addedFiles]);
    startAttachmentPreparation(addedFiles);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) void handleRequestClose();
      }}
    >
      <DialogContent className="max-h-[min(760px,calc(100dvh-3rem))] max-w-3xl gap-0 overflow-hidden p-0">
        <DialogHeader className="mb-0 border-b border-border px-5 py-4 pe-14">
          <DialogTitle className="text-base">
            {initialDraft ? 'Edit draft' : 'New email'}
          </DialogTitle>
          <div className="flex items-center justify-between gap-3">
            <p className="truncate text-xs text-muted-foreground">From {mailboxAddress}</p>
            <div className="flex shrink-0 items-center gap-2">
              <p
                className={`text-xs ${
                  saveStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'
                }`}
                role={saveStatus === 'error' ? 'alert' : 'status'}
              >
                {saveStatus === 'saving' || isClosing
                  ? attachments.length
                    ? 'Preparing attachments…'
                    : 'Saving draft…'
                  : saveStatus === 'error'
                    ? 'Draft wasn’t saved. Your message is still here.'
                    : ''}
              </p>
              {saveStatus === 'error' && (
                <button
                  type="button"
                  className="inline-flex min-h-10 cursor-pointer items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => {
                    if (attachmentsRef.current.length) {
                      startAttachmentPreparation(attachmentsRef.current);
                      return;
                    }
                    void handleRequestClose();
                  }}
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canSend || isBusy || !validateAddresses(true)) return;
            setIsSubmitting(true);
            try {
              const activeDraft = await saveDraft();
              if (!activeDraft) throw new Error('Draft could not be prepared before sending');
              if (!onSendDraft) throw new Error('Email sending is unavailable');
              await onSendDraft(activeDraft);
              finishClose();
            } catch {
              // Mutations provide the user-facing error and the prepared draft remains open.
            } finally {
              setIsSubmitting(false);
            }
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
              if (!isPreparingAttachments) {
                handleAttachmentSelection(event.dataTransfer.files);
              }
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
                error={addressErrors.to}
                onChange={(to) => updateAddressField('to', to)}
              >
                {!showCc && (
                  <button
                    type="button"
                    className="cursor-pointer rounded-sm px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-150"
                    onClick={() => setShowCc(true)}
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    className="cursor-pointer rounded-sm px-1.5 py-1 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring motion-safe:transition-colors motion-safe:duration-150"
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
                  error={addressErrors.cc}
                  onChange={(cc) => updateAddressField('cc', cc)}
                />
              )}
              {showBcc && (
                <EmailAddressField
                  id={bccId}
                  label="Bcc"
                  value={form.bcc}
                  placeholder="Optional"
                  error={addressErrors.bcc}
                  onChange={(bcc) => updateAddressField('bcc', bcc)}
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
                  onChange={(event) => {
                    setForm((current) => ({ ...current, subject: event.target.value }));
                    if (saveStatus === 'error') setSaveStatus('idle');
                  }}
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
                onChange={(event) => {
                  setForm((current) => ({ ...current, body: event.target.value }));
                  if (saveStatus === 'error') setSaveStatus('idle');
                }}
              />
            </div>

            <AttachmentDropzone
              inputId={attachmentInputId}
              inputRef={attachmentInputRef}
              attachments={attachments}
              existingAttachments={existingAttachments}
              pendingStatus={saveStatus}
              error={attachmentError}
              disabled={isPreparingAttachments}
              onClear={() => {
                replacePendingAttachments([]);
                setRemovedAttachmentIds((current) => [
                  ...new Set([
                    ...current,
                    ...existingAttachments.map((attachment) => attachment.id),
                  ]),
                ]);
                setExistingAttachments([]);
              }}
              onSelect={(event) => {
                handleAttachmentSelection(event.target.files);
                event.target.value = '';
              }}
              onRemove={(file) =>
                replacePendingAttachments(attachmentsRef.current.filter((item) => item !== file))
              }
              onRemoveExisting={(attachment) => {
                setExistingAttachments((current) =>
                  current.filter((item) => item.id !== attachment.id)
                );
                setRemovedAttachmentIds((current) => [...current, attachment.id]);
              }}
            />
          </DialogBody>

          <DialogFooter className="border-t border-border px-5 py-3 pt-3">
            <div className="flex w-full flex-wrap items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={!canSend || isBusy || isPreparingAttachments}
                aria-busy={isSubmitting || isSending}
              >
                <Send aria-hidden="true" className="size-3.5" />
                {isSubmitting || isSending ? 'Sending' : 'Send'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto bg-muted/50 text-foreground hover:bg-accent hover:text-accent-foreground"
                disabled={isBusy || isPreparingAttachments}
                onClick={async () => {
                  setIsDiscarding(true);
                  try {
                    const activeDraft = draftRef.current;
                    if (activeDraft) await onDiscardDraft?.(activeDraft);
                    finishClose();
                  } catch {
                    setIsDiscarding(false);
                  }
                }}
              >
                <Trash2 aria-hidden="true" className="size-3.5" />
                {isDiscarding ? 'Discarding' : 'Discard'}
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
  existingAttachments,
  pendingStatus,
  error,
  disabled,
  onClear,
  onSelect,
  onRemove,
  onRemoveExisting,
}: {
  inputId: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  attachments: File[];
  existingAttachments: EmailAttachment[];
  pendingStatus: 'idle' | 'saving' | 'error';
  error: string | null;
  disabled: boolean;
  onClear: () => void;
  onSelect: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (file: File) => void;
  onRemoveExisting: (attachment: EmailAttachment) => void;
}) {
  const attachmentCount = attachments.length + existingAttachments.length;

  return (
    <div className="px-5 pb-5" aria-busy={disabled}>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        disabled={disabled}
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
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Paperclip className="size-3.5" aria-hidden="true" />
            Choose files
          </Button>
        </div>

        {attachmentCount > 0 && (
          <div className="mt-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-medium text-muted-foreground">
                {attachmentCount} {attachmentCount === 1 ? 'attachment' : 'attachments'}
              </p>
              <button
                type="button"
                className="inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                disabled={disabled}
                onClick={onClear}
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
                Remove all
              </button>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2" aria-label="Selected attachments">
              {existingAttachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                    {attachment.name}
                  </span>
                  <span className="shrink-0 text-[11px] font-medium text-emerald-600">Ready</span>
                  <button
                    type="button"
                    className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Remove ${attachment.name}`}
                    disabled={disabled}
                    onClick={() => onRemoveExisting(attachment)}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </li>
              ))}
              {attachments.map((file) => (
                <li
                  key={`${file.name}-${file.lastModified}`}
                  className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2"
                >
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate text-xs text-foreground">
                    {file.name}
                  </span>
                  <span
                    className={`shrink-0 text-[11px] font-medium ${
                      pendingStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'
                    }`}
                  >
                    {pendingStatus === 'saving'
                      ? 'Preparing…'
                      : pendingStatus === 'error'
                        ? 'Failed'
                        : formatFileSize(file.size)}
                  </span>
                  <button
                    type="button"
                    className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Remove ${file.name}`}
                    disabled={disabled}
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

function getNewAttachments(
  files: FileList | null,
  current: File[],
  setError: (error: string | null) => void
): File[] {
  if (!files?.length) return [];
  const incoming = Array.from(files);
  const tooLarge = incoming.find((file) => file.size > MAX_ATTACHMENT_SIZE_BYTES);
  if (tooLarge) {
    setError(`${tooLarge.name} is larger than 25 MB.`);
    return [];
  }
  const existing = new Set(current.map((file) => `${file.name}:${file.size}:${file.lastModified}`));
  const next = incoming.filter(
    (file) => !existing.has(`${file.name}:${file.size}:${file.lastModified}`)
  );
  setError(null);
  return next;
}

function fileKey(file: File) {
  return `${file.name}:${file.size}:${file.lastModified}`;
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

function hasInvalidRecipients(form: ComposeForm) {
  return Boolean(
    getEmailAddressListError(form.to, 'To') ||
    getEmailAddressListError(form.cc, 'Cc') ||
    getEmailAddressListError(form.bcc, 'Bcc')
  );
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
  error,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  error?: string;
  onChange: (value: string) => void;
  children?: ReactNode;
}) {
  const errorId = `${id}-error`;

  return (
    <div>
      <div className="flex items-center gap-3 px-5 py-2.5">
        <label htmlFor={id} className="w-16 shrink-0 text-xs font-medium text-muted-foreground">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
        <Input
          id={id}
          type="text"
          inputMode="email"
          value={value}
          required={required}
          autoComplete="email"
          spellCheck={false}
          placeholder={placeholder}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? errorId : undefined}
          className="min-w-0 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
          onChange={(event) => onChange(event.target.value)}
        />
        {children && <div className="flex shrink-0 items-center gap-1">{children}</div>}
      </div>
      {error && (
        <p id={errorId} className="px-5 pb-2.5 pl-24 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
