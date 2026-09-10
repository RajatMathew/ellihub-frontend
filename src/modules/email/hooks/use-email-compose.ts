import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import { getEmailAddressListError } from '@/modules/email/lib/email-addresses';
import {
  fileKey,
  fileToAttachment,
  getNewAttachments,
  MAX_TOTAL_ATTACHMENT_BYTES,
} from '@/modules/email/lib/email-compose-attachments';
import { isEmptyEmailHtml } from '@/modules/email/lib/email-rich-text';

export type ComposeForm = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  /** Rich-text HTML, matching the `bodyType: 'html'` the draft is saved with. */
  body: string;
};

export type AddressField = 'to' | 'cc' | 'bcc';
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

type ComposeTarget = { kind: 'new'; recipient?: string } | { kind: 'draft' };

const EMPTY_FORM: ComposeForm = { to: '', cc: '', bcc: '', subject: '', body: '' };

export interface UseEmailComposeOptions {
  /** True while the page's send mutation is in flight. */
  isSending?: boolean;
  onSaveDraft?: (
    payload: ComposeDraftPayload,
    draft?: ComposeDraftIdentity
  ) => Promise<ComposeDraftSaveResult>;
  onSendDraft?: (draft: ComposeDraftIdentity) => Promise<void>;
  onDiscardDraft?: (draft: ComposeDraftIdentity, options?: { silent?: boolean }) => Promise<void>;
  /** Runs after the composer closes, however it closed. */
  onClosed?: () => void;
  /** Runs when closing persisted the draft, so a shell can say where it went. */
  onDraftSaved?: () => void;
}

/**
 * Owns every piece of compose behaviour — which draft is open, the form,
 * autosave, attachment preparation, send and discard. Both compose shells (the
 * modal and the inline reading-pane composer) render the same fields against
 * this one controller, so neither can drift from the other.
 */
export function useEmailCompose(options: UseEmailComposeOptions) {
  const {
    isSending = false,
    onSaveDraft,
    onSendDraft,
    onDiscardDraft,
    onClosed,
    onDraftSaved,
  } = options;
  const toId = useId();
  const ccId = useId();
  const bccId = useId();
  const subjectId = useId();
  const bodyId = useId();
  const attachmentInputId = useId();

  const [target, setTarget] = useState<ComposeTarget | null>(null);
  const [form, setForm] = useState<ComposeForm>(EMPTY_FORM);
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

  const draftRef = useRef<ComposeDraftIdentity | undefined>(undefined);
  const attachmentsRef = useRef<File[]>([]);
  const attachmentPreparationRef = useRef<Promise<void>>(Promise.resolve());
  const lastPersistedFormRef = useRef<ComposeForm>(EMPTY_FORM);
  const lastSavedSignatureRef = useRef('');
  /** The control that opened the composer, so closing can hand focus back. */
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const isOpen = target !== null;
  const isEditingDraft = target?.kind === 'draft';
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
    !isEmptyEmailHtml(form.body) ||
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

  const applyTarget = useCallback((next: ComposeTarget, draft: EditableComposeDraft | null) => {
    const nextForm: ComposeForm = draft
      ? {
          to: draft.to,
          cc: draft.cc,
          bcc: draft.bcc,
          subject: draft.subject,
          body: draft.body,
        }
      : { ...EMPTY_FORM, to: next.kind === 'new' ? (next.recipient ?? '') : '' };
    const nextAttachments = draft?.attachments ?? [];

    // Captured before the composer takes focus so closing can restore it.
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setForm(nextForm);
    setShowCc(Boolean(draft?.cc));
    setShowBcc(Boolean(draft?.bcc));
    setAttachments([]);
    attachmentsRef.current = [];
    setExistingAttachments(nextAttachments);
    setRemovedAttachmentIds([]);
    setSaveStatus('idle');
    setAddressErrors({});
    setAttachmentError(null);
    setIsDragging(false);
    setIsClosing(false);
    setIsSubmitting(false);
    setIsDiscarding(false);
    draftRef.current = draft ? { draftId: draft.draftId, messageId: draft.messageId } : undefined;
    lastPersistedFormRef.current = nextForm;
    lastSavedSignatureRef.current = JSON.stringify({
      form: nextForm,
      files: [],
      existing: nextAttachments.map((attachment) => attachment.id),
      removed: [],
    });
    setTarget(next);
  }, []);

  const openNew = useCallback(
    (recipient?: string) => applyTarget({ kind: 'new', recipient }, null),
    [applyTarget]
  );
  const openDraft = useCallback(
    (draft: EditableComposeDraft) => applyTarget({ kind: 'draft' }, draft),
    [applyTarget]
  );

  const finishClose = useCallback(() => {
    setTarget(null);
    setForm(EMPTY_FORM);
    setShowCc(false);
    setShowBcc(false);
    setAttachments([]);
    attachmentsRef.current = [];
    setExistingAttachments([]);
    setRemovedAttachmentIds([]);
    setSaveStatus('idle');
    setAddressErrors({});
    setAttachmentError(null);
    setIsDragging(false);
    setIsClosing(false);
    setIsSubmitting(false);
    setIsDiscarding(false);
    draftRef.current = undefined;
    lastPersistedFormRef.current = EMPTY_FORM;
    lastSavedSignatureRef.current = '';

    const returnFocus = returnFocusRef.current;
    returnFocusRef.current = null;
    if (returnFocus?.isConnected) {
      window.requestAnimationFrame(() => returnFocus.focus());
    }
    onClosed?.();
  }, [onClosed]);

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

  /**
   * Closes the composer, saving whatever was typed first. Resolves `false` when
   * the composer had to stay open (busy, or the draft could not be saved) so
   * callers that wanted to navigate away can stand down instead of dropping
   * the user's message on the floor.
   */
  const requestClose = useCallback(async () => {
    if (!isOpen) return true;
    if (isBusy) return false;
    if (!hasContent) {
      finishClose();
      return true;
    }
    if (hasInvalidRecipients(form)) {
      // Nothing addressable to save. A draft auto-created while attaching a file
      // is cleaned up so a half-typed address does not litter the Drafts folder.
      setIsClosing(true);
      await attachmentPreparationRef.current;
      const preparedNewDraft = isEditingDraft ? undefined : draftRef.current;
      finishClose();
      if (preparedNewDraft) {
        void onDiscardDraft?.(preparedNewDraft, { silent: true });
      }
      return true;
    }
    setIsClosing(true);
    try {
      await saveDraft();
      finishClose();
      onDraftSaved?.();
      return true;
    } catch {
      setIsClosing(false);
      return false;
    }
  }, [
    finishClose,
    form,
    hasContent,
    isBusy,
    isEditingDraft,
    isOpen,
    onDiscardDraft,
    onDraftSaved,
    saveDraft,
  ]);

  const discard = useCallback(async () => {
    setIsDiscarding(true);
    try {
      const activeDraft = draftRef.current;
      if (activeDraft) await onDiscardDraft?.(activeDraft);
      finishClose();
    } catch {
      setIsDiscarding(false);
    }
  }, [finishClose, onDiscardDraft]);

  const fieldIds = useMemo(
    () => ({ to: toId, cc: ccId, bcc: bccId, subject: subjectId, body: bodyId }),
    [bccId, bodyId, ccId, subjectId, toId]
  );

  function validateAddresses(requireTo: boolean) {
    const nextErrors: AddressErrors = {
      to: getEmailAddressListError(form.to, 'To', requireTo) ?? undefined,
      cc: getEmailAddressListError(form.cc, 'Cc') ?? undefined,
      bcc: getEmailAddressListError(form.bcc, 'Bcc') ?? undefined,
    };
    setAddressErrors(nextErrors);

    const firstInvalidField = (['to', 'cc', 'bcc'] as const).find((field) => nextErrors[field]);
    if (!firstInvalidField) return true;

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

  function setSubject(subject: string) {
    setForm((current) => ({ ...current, subject }));
    if (saveStatus === 'error') setSaveStatus('idle');
  }

  function setBody(body: string) {
    setForm((current) => ({ ...current, body }));
    if (saveStatus === 'error') setSaveStatus('idle');
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

  async function submit() {
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
  }

  const formProps = {
    onKeyDown: (event: KeyboardEvent<HTMLFormElement>) => {
      // Cmd/Ctrl + Enter sends from anywhere in the composer, including the
      // body, where a bare Enter has to keep inserting a new line.
      if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      if (!canSend || isBusy || isPreparingAttachments) return;
      event.currentTarget.requestSubmit();
    },
    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void submit();
    },
  };

  const statusText =
    saveStatus === 'saving' || isClosing
      ? attachments.length
        ? 'Preparing attachments…'
        : 'Saving draft…'
      : saveStatus === 'error'
        ? 'Draft wasn’t saved. Your message is still here.'
        : '';

  function retrySave() {
    if (attachmentsRef.current.length) {
      startAttachmentPreparation(attachmentsRef.current);
      return;
    }
    void requestClose();
  }

  return {
    isOpen,
    isEditingDraft,
    title: isEditingDraft ? 'Edit draft' : 'New email',
    fieldIds,
    attachmentInputId,
    form,
    showCc,
    showBcc,
    attachments,
    existingAttachments,
    attachmentError,
    totalAttachmentBytes,
    attachmentsOverBudget,
    addressErrors,
    saveStatus,
    statusText,
    isDragging,
    isBusy,
    isSubmitting,
    isSending,
    isDiscarding,
    isPreparingAttachments,
    canSend,
    openNew,
    openDraft,
    requestClose,
    discard,
    retrySave,
    setShowCc,
    setShowBcc,
    setIsDragging,
    setSubject,
    setBody,
    updateAddressField,
    handleAttachmentSelection,
    replacePendingAttachments,
    setExistingAttachments,
    setRemovedAttachmentIds,
    formProps,
  };
}

export type EmailComposeController = ReturnType<typeof useEmailCompose>;

function hasInvalidRecipients(form: ComposeForm) {
  return Boolean(
    getEmailAddressListError(form.to, 'To') ||
    getEmailAddressListError(form.cc, 'Cc') ||
    getEmailAddressListError(form.bcc, 'Bcc')
  );
}
