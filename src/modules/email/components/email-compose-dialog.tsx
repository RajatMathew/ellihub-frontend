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
import { cn } from '@/app/lib/utils';
import { EmailAddressSuggestionList } from '@/modules/email/components/email-address-suggestions';
import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import { useEmailAddressSuggestions } from '@/modules/email/hooks/use-email-address-suggestions';
import {
  EMAIL_ADDRESS_PATTERN,
  getEmailAddressListError,
  parseEmailAddresses,
} from '@/modules/email/lib/email-addresses';
import { AlertCircle, FileText, Paperclip, Send, Trash2, X } from 'lucide-react';

/**
 * Providers cap the WHOLE message, not each file — Outlook silently drops mail
 * whose combined attachments exceed ~25 MB, so the budget must be enforced
 * across every attached file together, mirroring the check in elli-core.
 */
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;

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
  accountId?: string;
  initialDraft?: EditableComposeDraft | null;
  /** Prefill for a brand-new message (ignored when editing a draft). */
  initialRecipient?: string;
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
  accountId,
  initialDraft,
  initialRecipient,
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
  // Pending local files plus attachments already uploaded to the draft.
  const totalAttachmentBytes =
    attachments.reduce((total, file) => total + file.size, 0) +
    existingAttachments.reduce((total, attachment) => total + (attachment.sizeBytes ?? 0), 0);
  const attachmentsOverBudget = totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES;
  const canSend =
    form.to.trim().length > 0 && form.subject.trim().length > 0 && !attachmentsOverBudget;
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
    const initialKey = initialDraft?.draftId ?? `new:${initialRecipient ?? ''}`;
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
      : { to: initialRecipient ?? '', cc: '', bcc: '', subject: '', body: '' };
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
  }, [initialDraft, initialRecipient, open]);

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
    const uploadedBytes = existingAttachments.reduce(
      (total, attachment) => total + (attachment.sizeBytes ?? 0),
      0
    );
    const addedFiles = getNewAttachments(
      files,
      attachmentsRef.current,
      uploadedBytes,
      setAttachmentError
    );
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
                accountId={accountId}
                id={toId}
                label="To"
                value={form.to}
                required
                placeholder="Add recipients"
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
                  accountId={accountId}
                  id={ccId}
                  label="Cc"
                  value={form.cc}
                  placeholder="Add Cc recipients"
                  error={addressErrors.cc}
                  onChange={(cc) => updateAddressField('cc', cc)}
                  onRemove={() => {
                    setShowCc(false);
                    updateAddressField('cc', '');
                  }}
                />
              )}
              {showBcc && (
                <EmailAddressField
                  accountId={accountId}
                  id={bccId}
                  label="Bcc"
                  value={form.bcc}
                  placeholder="Add Bcc recipients"
                  error={addressErrors.bcc}
                  onChange={(bcc) => updateAddressField('bcc', bcc)}
                  onRemove={() => {
                    setShowBcc(false);
                    updateAddressField('bcc', '');
                  }}
                />
              )}
              <div className="flex items-center gap-3 px-5 py-2.5">
                <label
                  htmlFor={subjectId}
                  className="w-16 shrink-0 text-xs font-medium text-muted-foreground"
                >
                  Subject
                  <span className="text-destructive"> *</span>
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
              totalBytes={totalAttachmentBytes}
              overBudget={attachmentsOverBudget}
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
  totalBytes,
  overBudget,
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
  totalBytes: number;
  overBudget: boolean;
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
              <p
                className={cn(
                  'text-xs',
                  overBudget ? 'font-medium text-destructive' : 'text-muted-foreground'
                )}
              >
                {totalBytes > 0
                  ? `${formatFileSize(totalBytes)} of ${formatFileSize(MAX_TOTAL_ATTACHMENT_BYTES)} used`
                  : `Up to ${formatFileSize(MAX_TOTAL_ATTACHMENT_BYTES)} in total`}
              </p>
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
            <p className="text-destructive/85">{error}</p>
          </div>
        </div>
      )}
      {overBudget && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-md border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-destructive"
        >
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0 text-xs leading-5">
            <p className="font-semibold">Attachments exceed the email limit</p>
            <p className="text-destructive/85">
              This email carries {formatFileSize(totalBytes)} of attachments but only{' '}
              {formatFileSize(MAX_TOTAL_ATTACHMENT_BYTES)} can be delivered. Remove attachments
              until the total fits — sending is disabled until then.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function getNewAttachments(
  files: FileList | null,
  current: File[],
  uploadedBytes: number,
  setError: (error: string | null) => void
): File[] {
  if (!files?.length) return [];
  const existing = new Set(current.map(fileKey));
  const incoming = Array.from(files).filter((file) => !existing.has(fileKey(file)));

  // Accept files in the order they were picked while they fit the message
  // budget; everything that would push the total past the limit stays out.
  let usedBytes = uploadedBytes + current.reduce((total, file) => total + file.size, 0);
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of incoming) {
    if (usedBytes + file.size <= MAX_TOTAL_ATTACHMENT_BYTES) {
      accepted.push(file);
      usedBytes += file.size;
    } else {
      rejected.push(file);
    }
  }

  if (rejected.length > 0) {
    const remaining = Math.max(0, MAX_TOTAL_ATTACHMENT_BYTES - usedBytes);
    const names = rejected.map((file) => `${file.name} (${formatFileSize(file.size)})`).join(', ');
    setError(
      `${names} ${rejected.length === 1 ? 'was' : 'were'} not attached — emails are limited to ` +
        `${formatFileSize(MAX_TOTAL_ATTACHMENT_BYTES)} of attachments in total and ` +
        `${formatFileSize(remaining)} remains. Remove an attachment or send it in a separate email.`
    );
  } else {
    setError(null);
  }
  return accepted;
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
  accountId,
  onChange,
  onRemove,
  children,
}: {
  id: string;
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  error?: string;
  accountId?: string;
  onChange: (value: string) => void;
  /**
   * When provided, renders an X on the right that lets the user drop the whole
   * field. Used by Cc/Bcc so the fields can be added and removed cleanly.
   */
  onRemove?: () => void;
  children?: ReactNode;
}) {
  const errorId = `${id}-error`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [buffer, setBuffer] = useState('');
  const [focused, setFocused] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

  // Chips are derived from the parent-owned value string — nothing about the
  // outer contract changes. `buffer` is only for text the user is typing right
  // now that hasn't been committed to a chip yet.
  const chips = useMemo(() => parseEmailAddresses(value).map((r) => r.address), [value]);

  // Suggestions only once the user starts typing — a bare focus stays quiet.
  const hasTypedQuery = buffer.trim().length > 0;
  const suggestions = useEmailAddressSuggestions(
    accountId,
    buffer,
    chips,
    focused && hasTypedQuery
  );
  const suggestionsOpen =
    focused && hasTypedQuery && !suggestionsDismissed && suggestions.length > 0;

  const selectSuggestion = useCallback(
    (address: string) => {
      setBuffer('');
      setActiveSuggestionIndex(-1);
      if (!chips.includes(address)) onChange([...chips, address].join(', '));
      inputRef.current?.focus();
    },
    [chips, onChange]
  );

  const commitBuffer = useCallback(() => {
    const trimmed = buffer
      .trim()
      .replace(/[,;]+$/, '')
      .trim();
    setBuffer('');
    if (!trimmed) return;
    // Deduplicate — chip already present is a no-op.
    if (chips.includes(trimmed)) return;
    onChange([...chips, trimmed].join(', '));
  }, [buffer, chips, onChange]);

  const removeChip = useCallback(
    (index: number) => {
      const next = chips.filter((_, i) => i !== index);
      onChange(next.join(', '));
    },
    [chips, onChange]
  );

  const handleBufferChange = (event: ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    setSuggestionsDismissed(false);
    setActiveSuggestionIndex(-1);
    // Pastes / typed delimiters split into chips immediately, leaving whatever
    // trails the last delimiter as the still-editable buffer.
    if (/[,;]/.test(raw)) {
      const parts = raw.split(/[,;]/).map((part) => part.trim());
      const nextBuffer = parts.pop() ?? '';
      const seen = new Set(chips);
      const additions = parts.filter((part) => {
        if (!part || seen.has(part)) return false;
        seen.add(part);
        return true;
      });
      setBuffer(nextBuffer);
      if (additions.length) {
        onChange([...chips, ...additions].join(', '));
      }
      return;
    }
    setBuffer(raw);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (suggestionsOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveSuggestionIndex((index) => (index + 1) % suggestions.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveSuggestionIndex((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        setSuggestionsDismissed(true);
        setActiveSuggestionIndex(-1);
        return;
      }
      if (event.key === 'Enter' && activeSuggestionIndex >= 0) {
        event.preventDefault();
        const active = suggestions[activeSuggestionIndex];
        if (active) selectSuggestion(active.address);
        return;
      }
    }
    if ((event.key === 'Enter' || event.key === 'Tab') && buffer.trim()) {
      event.preventDefault();
      commitBuffer();
      return;
    }
    if (event.key === 'Backspace' && buffer === '' && chips.length > 0) {
      event.preventDefault();
      removeChip(chips.length - 1);
    }
  };

  return (
    <div>
      <div className="flex items-start gap-3 px-5 py-2.5">
        <label
          htmlFor={id}
          className="mt-1.5 w-16 shrink-0 text-xs font-medium text-muted-foreground"
        >
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
        {/*
          The whole chip strip is clickable — clicking any dead space focuses
          the inner input so the user can keep typing without hunting for the
          exact input rectangle.
        */}
        <div
          className={cn(
            'relative flex min-h-9 min-w-0 flex-1 flex-wrap items-center gap-1.5 py-1',
            error && 'text-destructive'
          )}
          onClick={(event) => {
            if (event.target === event.currentTarget) inputRef.current?.focus();
          }}
        >
          {chips.map((address, index) => {
            const isValid = EMAIL_ADDRESS_PATTERN.test(address);
            return (
              <span
                key={`${address}-${index}`}
                className={cn(
                  'inline-flex max-w-full items-center gap-1 rounded-md px-2 py-0.5 text-xs',
                  isValid
                    ? 'border border-border bg-muted/40 text-foreground'
                    : 'border border-destructive/40 bg-destructive/10 text-destructive'
                )}
              >
                <span className="min-w-0 truncate">{address}</span>
                <button
                  type="button"
                  className="inline-flex size-4 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 hover:bg-background hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Remove ${address}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    removeChip(index);
                    inputRef.current?.focus();
                  }}
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            );
          })}
          <input
            ref={inputRef}
            id={id}
            type="text"
            inputMode="email"
            value={buffer}
            // Chrome ignores autocomplete="off"/"chrome-off" on fields it
            // heuristically recognizes as an address book entry, and shows
            // its own suggestion popover on top of ours (elli-ui#789). Making
            // the field readOnly until it is actually focused is what
            // reliably stops Chrome from offering to autofill it.
            autoComplete="off"
            readOnly={!focused}
            data-1p-ignore
            data-lpignore="true"
            spellCheck={false}
            placeholder={chips.length === 0 ? placeholder : undefined}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? errorId : undefined}
            className="min-w-24 flex-1 border-0 bg-transparent px-0 py-0.5 text-sm outline-none placeholder:text-muted-foreground/70"
            onChange={handleBufferChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setFocused(true);
              setSuggestionsDismissed(false);
            }}
            onBlur={() => {
              setFocused(false);
              setActiveSuggestionIndex(-1);
              commitBuffer();
            }}
          />
          {suggestionsOpen && (
            <EmailAddressSuggestionList
              accountId={accountId}
              suggestions={suggestions}
              activeIndex={activeSuggestionIndex}
              onSelect={selectSuggestion}
            />
          )}
        </div>
        {children && <div className="mt-1 flex shrink-0 items-center gap-1">{children}</div>}
        {onRemove && (
          <button
            type="button"
            className="mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={`Remove ${label} field`}
            onClick={onRemove}
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
      </div>
      {error && (
        <p id={errorId} className="px-5 pb-2.5 pl-24 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
