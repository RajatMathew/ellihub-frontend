import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import type { EmailAttachment } from '@/modules/email/components/email-row-card';
import { getEmailAddressListError } from '@/modules/email/lib/email-addresses';
import {
  createAttachmentPreparationQueue,
  type AttachmentPreparationQueue,
} from '@/modules/email/lib/email-compose-attachment-queue';
import {
  ATTACHMENT_PREPARATION_FALLBACK,
  fileKey,
  fileToAttachment,
  getAttachmentTransportErrorMessage,
  getNewAttachments,
  getUnpreparedAttachments,
  getUploadPercent,
  MAX_TOTAL_ATTACHMENT_BYTES,
} from '@/modules/email/lib/email-compose-attachments';
import {
  createDraftIdentityGate,
  reconcileComposeAttachments,
  reconcileComposeDraftFields,
  shouldApplyDraftHydration,
  type DraftIdentityGate,
  type DraftIdentityState,
} from '@/modules/email/lib/email-draft-compose';
import { isEmptyEmailHtml } from '@/modules/email/lib/email-rich-text';
import { toast } from 'sonner';

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

/**
 * A draft opened straight from the cache, before the server has answered. It
 * deliberately has no `draftId`: that only exists on the server, and writing
 * without it would create a duplicate draft instead of updating this one.
 */
export type PendingComposeDraft = ComposeForm & {
  /** The message id the hydration request was made for. */
  messageId: string;
  attachments: EmailAttachment[];
};

/** Where the open draft's identity stands. `error` blocks every write. */
export type DraftHydrationStatus = 'idle' | 'pending' | 'error';

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
    draft?: ComposeDraftIdentity,
    options?: {
      signal?: AbortSignal;
      /** Bytes sent so far, so the tray can show a real percentage. */
      onProgress?: (loaded: number, total?: number) => void;
    }
  ) => Promise<ComposeDraftSaveResult>;
  onSendDraft?: (draft: ComposeDraftIdentity) => Promise<void>;
  /** Asks the page to re-run `getDraft` after a failed hydration. */
  onRetryDraftHydration?: (messageId: string) => void;
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
    onRetryDraftHydration,
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
  const [draftHydration, setDraftHydration] = useState<DraftHydrationStatus>('idle');
  /**
   * Bumped every time the composer is opened. Shells key one-shot open effects
   * (autofocus) off this rather than off the form, so hydration arriving later
   * cannot yank focus out from under the user.
   */
  const [openToken, setOpenToken] = useState(0);

  /** Whole percent of the upload in flight; `null` while no total is known. */
  const [attachmentProgress, setAttachmentProgress] = useState<number | null>(null);

  const draftRef = useRef<ComposeDraftIdentity | undefined>(undefined);
  /**
   * Open-before-hydrated state. `hydratingMessageIdRef` is the message the
   * in-flight `getDraft` was made for, so a superseded response can be dropped;
   * `identityGateRef` is what every write waits on so none of them can run
   * without a `draftId` and quietly create a second draft (elli-ui#925).
   */
  const hydratingMessageIdRef = useRef<string | null>(null);
  const identityGateRef = useRef<DraftIdentityGate | null>(null);
  /**
   * The list row the open draft came from. Unlike `hydratingMessageIdRef` it
   * survives hydration, so re-clicking the row that is already open can be a
   * no-op instead of resetting the composer over whatever has been typed.
   */
  const openedDraftSourceIdRef = useRef<string | null>(null);
  /** The form as the composer was opened — the baseline for "did the user edit this?". */
  const openedFormRef = useRef<ComposeForm>(EMPTY_FORM);
  /** The live form, readable synchronously by hydration and by the upload queue. */
  const formRef = useRef<ComposeForm>(EMPTY_FORM);
  const existingAttachmentsRef = useRef<EmailAttachment[]>([]);
  const removedAttachmentIdsRef = useRef<string[]>([]);
  const attachmentsRef = useRef<File[]>([]);
  /**
   * Files the server has already accepted. The draft endpoint *adds*
   * attachments, so re-sending one costs a second full upload of the same bytes
   * and puts the file on the message twice — which is exactly what happened
   * whenever the provider hydration came back without an attachment list and
   * the pending row was therefore never cleared.
   */
  const preparedKeysRef = useRef<Set<string>>(new Set());
  /** Serialises uploads so a new selection never discards one in flight. */
  const preparationQueueRef = useRef<AttachmentPreparationQueue | null>(null);
  /** Kept current every render so the queue's uploader never closes over stale form state. */
  const uploadAttachmentBatchRef = useRef<(files: File[], signal: AbortSignal) => Promise<void>>(
    () => Promise.resolve()
  );
  /**
   * `dragenter`/`dragleave` fire for every descendant the pointer crosses, so
   * the overlay can only be driven by how deep the drag is, never by a single
   * boolean flipped on the first leave (elli-ui#910).
   */
  const dragDepthRef = useRef(0);
  const lastPersistedFormRef = useRef<ComposeForm>(EMPTY_FORM);
  const lastSavedSignatureRef = useRef('');
  /** The control that opened the composer, so closing can hand focus back. */
  const returnFocusRef = useRef<HTMLElement | null>(null);

  // Kept current every render so hydration and the upload queue can read the
  // live form without closing over a stale snapshot.
  formRef.current = form;
  existingAttachmentsRef.current = existingAttachments;
  removedAttachmentIdsRef.current = removedAttachmentIds;

  const isOpen = target !== null;
  const isEditingDraft = target?.kind === 'draft';
  const isHydratingDraft = draftHydration === 'pending';
  const hasDraftHydrationError = draftHydration === 'error';
  /**
   * The cache could not supply a body, so the composer is showing recipients and
   * subject while the real body is still on its way. Typing into it would be
   * typing over a body the user cannot see yet, so the editor waits — visibly —
   * rather than silently replacing the draft's contents.
   */
  const isDraftBodyPending = isHydratingDraft && isEmptyEmailHtml(openedFormRef.current.body);
  // Pending local files plus attachments already uploaded to the draft.
  const totalAttachmentBytes =
    attachments.reduce((total, file) => total + file.size, 0) +
    existingAttachments.reduce((total, attachment) => total + (attachment.sizeBytes ?? 0), 0);
  const attachmentsOverBudget = totalAttachmentBytes > MAX_TOTAL_ATTACHMENT_BYTES;
  const canSend =
    form.to.trim().length > 0 &&
    form.subject.trim().length > 0 &&
    !attachmentsOverBudget &&
    // Sending needs the draft's server identity, and a failed hydration never
    // gets one. Both are visible in `statusText` rather than a dead button.
    draftHydration === 'idle';
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

  const applyTarget = useCallback(
    (
      next: ComposeTarget,
      draft: (ComposeForm & { attachments: EmailAttachment[] }) | null,
      identity?: { draft?: ComposeDraftIdentity; hydratingMessageId?: string }
    ) => {
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
      formRef.current = nextForm;
      openedFormRef.current = nextForm;
      setShowCc(Boolean(draft?.cc));
      setShowBcc(Boolean(draft?.bcc));
      setAttachments([]);
      attachmentsRef.current = [];
      setExistingAttachments(nextAttachments);
      existingAttachmentsRef.current = nextAttachments;
      setRemovedAttachmentIds([]);
      setSaveStatus('idle');
      setAddressErrors({});
      setAttachmentError(null);
      preparationQueueRef.current?.cancel();
      preparedKeysRef.current = new Set();
      setAttachmentProgress(null);
      dragDepthRef.current = 0;
      setIsDragging(false);
      setIsClosing(false);
      setIsSubmitting(false);
      setIsDiscarding(false);
      draftRef.current = identity?.draft;
      // Whatever was waiting on the previous composer's identity is stood down:
      // its draft is no longer the one on screen, so it must not be written to.
      identityGateRef.current?.cancel();
      hydratingMessageIdRef.current = identity?.hydratingMessageId ?? null;
      openedDraftSourceIdRef.current = identity?.hydratingMessageId ?? null;
      identityGateRef.current = identity?.hydratingMessageId ? createDraftIdentityGate() : null;
      setDraftHydration(identity?.hydratingMessageId ? 'pending' : 'idle');
      lastPersistedFormRef.current = nextForm;
      lastSavedSignatureRef.current = JSON.stringify({
        form: nextForm,
        files: [],
        existing: nextAttachments.map((attachment) => attachment.id),
        removed: [],
      });
      setTarget(next);
      setOpenToken((token) => token + 1);
    },
    []
  );

  const openNew = useCallback(
    (recipient?: string) => applyTarget({ kind: 'new', recipient }, null),
    [applyTarget]
  );
  const openDraft = useCallback(
    (draft: EditableComposeDraft) =>
      applyTarget({ kind: 'draft' }, draft, {
        draft: { draftId: draft.draftId, messageId: draft.messageId },
      }),
    [applyTarget]
  );
  /**
   * Opens the composer on the spot from cached data, with the `getDraft`
   * response still in flight. Every write is held by the identity gate until
   * `hydrateDraft` supplies the `draftId` (elli-ui#925).
   */
  const openPendingDraft = useCallback(
    (draft: PendingComposeDraft) =>
      applyTarget({ kind: 'draft' }, draft, { hydratingMessageId: draft.messageId }),
    [applyTarget]
  );
  /** True when this list row is the draft already on screen. */
  const isDraftOpenFor = useCallback(
    (messageId: string) => isOpen && openedDraftSourceIdRef.current === messageId,
    [isOpen]
  );

  /**
   * Merges the authoritative draft into the open composer. Untouched fields take
   * the server's value; anything typed since the composer opened is left alone.
   */
  const hydrateDraft = useCallback((requestedMessageId: string, draft: EditableComposeDraft) => {
    if (!shouldApplyDraftHydration(hydratingMessageIdRef.current, requestedMessageId)) return;

    const incoming: ComposeForm = {
      to: draft.to,
      cc: draft.cc,
      bcc: draft.bcc,
      subject: draft.subject,
      body: draft.body,
    };
    const nextForm = reconcileComposeDraftFields(openedFormRef.current, formRef.current, incoming);
    const nextAttachments = reconcileComposeAttachments({
      current: existingAttachmentsRef.current,
      incoming: draft.attachments,
      hasPendingFiles: attachmentsRef.current.length > 0,
      removedAttachmentIds: removedAttachmentIdsRef.current,
    });

    draftRef.current = { draftId: draft.draftId, messageId: draft.messageId };
    hydratingMessageIdRef.current = null;
    setForm(nextForm);
    formRef.current = nextForm;
    openedFormRef.current = nextForm;
    setExistingAttachments(nextAttachments);
    existingAttachmentsRef.current = nextAttachments;
    if (incoming.cc) setShowCc(true);
    if (incoming.bcc) setShowBcc(true);
    // The signature describes what the server holds, so closing an untouched
    // draft costs no save while an edited one still saves.
    lastPersistedFormRef.current = incoming;
    lastSavedSignatureRef.current = JSON.stringify({
      form: incoming,
      files: [],
      existing: draft.attachments.map((attachment) => attachment.id),
      removed: [],
    });
    setDraftHydration('idle');
    identityGateRef.current?.resolve();
  }, []);

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
    preparationQueueRef.current?.cancel();
    preparedKeysRef.current = new Set();
    setAttachmentProgress(null);
    dragDepthRef.current = 0;
    setIsDragging(false);
    setIsClosing(false);
    setIsSubmitting(false);
    setIsDiscarding(false);
    draftRef.current = undefined;
    identityGateRef.current?.cancel();
    identityGateRef.current = null;
    hydratingMessageIdRef.current = null;
    openedDraftSourceIdRef.current = null;
    setDraftHydration('idle');
    formRef.current = EMPTY_FORM;
    openedFormRef.current = EMPTY_FORM;
    existingAttachmentsRef.current = [];
    removedAttachmentIdsRef.current = [];
    lastPersistedFormRef.current = EMPTY_FORM;
    lastSavedSignatureRef.current = '';

    const returnFocus = returnFocusRef.current;
    returnFocusRef.current = null;
    if (returnFocus?.isConnected) {
      window.requestAnimationFrame(() => returnFocus.focus());
    }
    onClosed?.();
  }, [onClosed]);

  /**
   * `getDraft` failed, or answered without a message. The draft's identity is
   * unknown, so nothing may be saved against it — saving anyway would create a
   * *second* draft next to the one the user clicked. An untouched composer
   * simply closes (the mutation's own toast says why); one that has been typed
   * into stays open, blocked from saving, with the Retry affordance.
   */
  const failDraftHydration = useCallback(
    (requestedMessageId: string) => {
      if (!shouldApplyDraftHydration(hydratingMessageIdRef.current, requestedMessageId)) return;
      identityGateRef.current?.fail();

      const untouched =
        JSON.stringify(formRef.current) === JSON.stringify(openedFormRef.current) &&
        attachmentsRef.current.length === 0 &&
        removedAttachmentIdsRef.current.length === 0;
      if (untouched) {
        finishClose();
        return;
      }
      setDraftHydration('error');
    },
    [finishClose]
  );

  /** Re-arms the gate and asks the page to run `getDraft` again. */
  const retryDraftHydration = useCallback(() => {
    const messageId = hydratingMessageIdRef.current;
    if (!messageId || !onRetryDraftHydration) return;
    identityGateRef.current = createDraftIdentityGate();
    setDraftHydration('pending');
    setSaveStatus('idle');
    onRetryDraftHydration(messageId);
  }, [onRetryDraftHydration]);

  /** Every write waits here first, so none of them runs without a `draftId`. */
  const waitForDraftIdentity = useCallback(async (): Promise<DraftIdentityState> => {
    const gate = identityGateRef.current;
    if (!gate) return 'ready';
    return gate.wait();
  }, []);

  const saveDraft = useCallback(async () => {
    if (!hasContent || !onSaveDraft) return draftRef.current;
    const identity = await waitForDraftIdentity();
    // The composer moved on to another draft — this save belongs to nothing.
    if (identity === 'cancelled') return draftRef.current;
    if (identity === 'unavailable') {
      setSaveStatus('error');
      throw new Error('Draft could not be loaded, so it cannot be saved');
    }
    await preparationQueueRef.current?.settled();
    if (signature === lastSavedSignatureRef.current && draftRef.current) {
      return draftRef.current;
    }

    // Read through the refs, not the closure: waiting on the identity gate and
    // on the upload queue both take real time, and the user keeps typing.
    const currentForm = formRef.current;
    // Anything the preparation queue already delivered stays out of this
    // request: the draft endpoint appends attachments, so re-sending a file
    // costs a second full upload of the same bytes *and* duplicates it on the
    // message.
    const currentFiles = getUnpreparedAttachments(attachmentsRef.current, preparedKeysRef.current);
    const currentRemovedIds = removedAttachmentIdsRef.current;
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
      for (const file of currentFiles) preparedKeysRef.current.add(fileKey(file));
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
  }, [hasContent, onSaveDraft, signature, waitForDraftIdentity]);

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
      await preparationQueueRef.current?.settled();
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
      // Discarding a draft still loading waits for its id, or the server copy
      // would survive the composer that claimed to have thrown it away. A draft
      // whose hydration failed has no id to delete by, so this closes and leaves
      // the server's copy untouched — which is also the escape hatch from that
      // error state.
      const identity = await waitForDraftIdentity();
      const activeDraft = identity === 'ready' ? draftRef.current : undefined;
      if (activeDraft) await onDiscardDraft?.(activeDraft);
      finishClose();
    } catch {
      setIsDiscarding(false);
    }
  }, [finishClose, onDiscardDraft, waitForDraftIdentity]);

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

  /**
   * Uploads one batch of pending files. Reassigned every render so the queue
   * never closes over a stale form snapshot or a stale draft id, and it reports
   * its own failures because the queue must keep draining whatever a batch does.
   */
  uploadAttachmentBatchRef.current = async (files: File[], signal: AbortSignal) => {
    if (!onSaveDraft) return;
    // Attaching to a draft that is still loading would save without a `draftId`
    // and create a duplicate draft, so the upload waits for the identity too.
    const identity = await waitForDraftIdentity();
    if (signal.aborted || identity === 'cancelled') return;
    if (identity === 'unavailable') {
      setSaveStatus('error');
      return;
    }
    const formSnapshot = { ...lastPersistedFormRef.current };
    const removedIdsSnapshot = [...removedAttachmentIds];
    const batchKeys = new Set(files.map(fileKey));
    setAttachmentProgress(null);

    try {
      const encodedAttachments = await Promise.all(files.map(fileToAttachment));
      if (signal.aborted) return;
      const result = await onSaveDraft(
        {
          ...formSnapshot,
          attachments: encodedAttachments,
          removedAttachmentIds: removedIdsSnapshot,
        },
        draftRef.current,
        {
          signal,
          onProgress: (loaded, total) => setAttachmentProgress(getUploadPercent(loaded, total)),
        }
      );
      if (signal.aborted) return;
      // The server has these bytes now. Recording the keys here — rather than
      // relying on the pending rows being cleared — is what keeps a save whose
      // provider hydration came back empty from uploading them all over again.
      for (const key of batchKeys) preparedKeysRef.current.add(key);
      draftRef.current = { draftId: result.draftId, messageId: result.messageId };
      if (result.attachments) {
        setExistingAttachments(result.attachments);
        replacePendingAttachments(
          attachmentsRef.current.filter((file) => !batchKeys.has(fileKey(file)))
        );
      }
    } catch (error: unknown) {
      // A cancelled upload is the user's own doing — `cancelAttachmentPreparation`
      // has already put the composer back to idle.
      if (signal.aborted) return;
      setSaveStatus('error');
      toast.error(
        getAttachmentTransportErrorMessage(error) ??
          getApiErrorMessage(error, ATTACHMENT_PREPARATION_FALLBACK)
      );
    } finally {
      setAttachmentProgress(null);
    }
  };

  function getAttachmentQueue() {
    preparationQueueRef.current ??= createAttachmentPreparationQueue({
      upload: (files, signal) => uploadAttachmentBatchRef.current(files, signal),
      // The queue owns only the saving↔idle transition; a batch that failed
      // keeps its own 'error' so the tray can still say which file failed.
      onBusyChange: (isBusy) =>
        setSaveStatus((current) => (isBusy ? 'saving' : current === 'error' ? 'error' : 'idle')),
    });
    return preparationQueueRef.current;
  }

  /**
   * Abandons the preparation in flight and hands the composer back to the user.
   * Without it, a draft save that never answers leaves the composer stuck on
   * "Preparing attachments…" with every escape hatch disabled (elli-ui#910).
   */
  function cancelAttachmentPreparation() {
    preparationQueueRef.current?.cancel();
    setAttachmentProgress(null);
    setSaveStatus('idle');
  }

  function startAttachmentPreparation(files: File[]) {
    if (!files.length || !onSaveDraft) return;
    // Queued, never raced. This used to abort whatever was in flight, which
    // threw away every byte already uploaded for the previous selection and
    // left that file to be uploaded a second time at send.
    getAttachmentQueue().enqueue(getUnpreparedAttachments(files, preparedKeysRef.current));
  }

  /** Drops pending files, cancelling the upload they are still riding on. */
  function removePendingAttachments(next: File[]) {
    const wasPreparing = preparationQueueRef.current?.isBusy() ?? false;
    cancelAttachmentPreparation();
    replacePendingAttachments(next);
    // Cancelling stops the whole queue, not just the removed file, so whatever
    // the user kept has to go back on it — but only if something really was in
    // flight, so removing a file from an idle tray stays a plain removal.
    if (wasPreparing) startAttachmentPreparation(next);
  }

  function handleDragEnter(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepthRef.current += 1;
    setIsDragging(true);
  }

  function handleDragLeave(event: DragEvent<HTMLElement>) {
    event.preventDefault();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDragging(false);
  }

  /** Takes the overlay down however the drag ended, including a drop a child handled. */
  function endDrag() {
    dragDepthRef.current = 0;
    setIsDragging(false);
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

  const statusText = hasDraftHydrationError
    ? 'This draft couldn’t be loaded, so it can’t be saved yet.'
    : isHydratingDraft
      ? 'Loading draft…'
      : saveStatus === 'saving' || isClosing
        ? attachments.length
          ? 'Preparing attachments…'
          : 'Saving draft…'
        : saveStatus === 'error'
          ? 'Draft wasn’t saved. Your message is still here.'
          : '';

  function retrySave() {
    // A failed hydration has to be retried before anything can be saved.
    if (hasDraftHydrationError) {
      retryDraftHydration();
      return;
    }
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
    isHydratingDraft,
    isDraftBodyPending,
    hasDraftHydrationError,
    openToken,
    canSend,
    openNew,
    openDraft,
    openPendingDraft,
    isDraftOpenFor,
    hydrateDraft,
    failDraftHydration,
    requestClose,
    discard,
    retrySave,
    setShowCc,
    setShowBcc,
    setIsDragging,
    handleDragEnter,
    handleDragLeave,
    endDrag,
    setSubject,
    setBody,
    updateAddressField,
    handleAttachmentSelection,
    replacePendingAttachments,
    removePendingAttachments,
    attachmentProgress,
    cancelAttachmentPreparation,
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
