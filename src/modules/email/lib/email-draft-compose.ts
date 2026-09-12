import type { EmailAttachment } from '@/modules/email/components/email-row-card';

import { emailDraftBodyToEditorHtml, isEmptyEmailHtml } from './email-rich-text';

/**
 * Opening a draft used to wait on `GET /drafts/:id`, which always goes out to
 * the provider — so the composer only appeared once that round trip finished
 * and the click looked like it had done nothing (elli-ui#925).
 *
 * The composer is now opened synchronously from whatever the query cache
 * already holds for that message, and the authoritative response is merged in
 * when it lands. These are the pure pieces of that: what a cached row can
 * contribute, how the server's answer is reconciled with what the user has
 * typed since, and the gate that keeps a save from running before the draft's
 * identity is known.
 */

export type ComposeDraftFields = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  /** Editor HTML, already sanitized by `emailDraftBodyToEditorHtml`. */
  body: string;
};

export type ComposeDraftAddress = { address: string; name?: string };

/**
 * Anything in the cache that describes the clicked draft: a message-list row, a
 * hydrated message from `emailKeys.message`, a conversation message, or the
 * `getDraft` response's own message. Every field is optional because the list
 * row (`toMessageSummaryDto` in elli-core) carries only the summary.
 */
export type ComposeDraftSource = {
  subject?: string | null;
  to?: readonly ComposeDraftAddress[] | null;
  cc?: readonly ComposeDraftAddress[] | null;
  bcc?: readonly ComposeDraftAddress[] | null;
  body?: readonly string[] | string | null;
  attachments?: readonly EmailAttachment[] | null;
};

export const EMPTY_COMPOSE_DRAFT_FIELDS: ComposeDraftFields = {
  to: '',
  cc: '',
  bcc: '',
  subject: '',
  body: '',
};

/** Providers use this placeholder subject; the composer wants a real empty field. */
const NO_SUBJECT = '(No subject)';

export function formatComposeAddresses(addresses?: readonly ComposeDraftAddress[] | null): string {
  return (addresses ?? [])
    .map((recipient) =>
      recipient.name ? `${recipient.name} <${recipient.address}>` : recipient.address
    )
    .join(', ');
}

/** One cached or fetched message as composer form fields. */
export function toComposeDraftFields(message: ComposeDraftSource): ComposeDraftFields {
  return {
    to: formatComposeAddresses(message.to),
    cc: formatComposeAddresses(message.cc),
    bcc: formatComposeAddresses(message.bcc),
    subject: !message.subject || message.subject === NO_SUBJECT ? '' : message.subject,
    body: emailDraftBodyToEditorHtml(message.body ?? undefined),
  };
}

export type InstantDraftSnapshot = {
  fields: ComposeDraftFields;
  attachments: EmailAttachment[];
  /** False when nothing cached could supply a body, so the shell can say so. */
  hasBody: boolean;
};

/**
 * The best composer state the cache can produce right now, from sources ordered
 * richest first. Every source describes the same message, so a field is taken
 * from the first source that actually has it — a summary row contributes its
 * subject even when only a previously opened copy has the body.
 */
export function buildInstantDraftSnapshot(
  sources: ReadonlyArray<ComposeDraftSource | null | undefined>
): InstantDraftSnapshot {
  const present = sources.filter((source): source is ComposeDraftSource => Boolean(source));
  const candidates = present.map(toComposeDraftFields);

  const firstNonEmpty = (field: keyof ComposeDraftFields) =>
    candidates.find((candidate) => candidate[field].length > 0)?.[field] ?? '';

  const body = candidates.find((candidate) => !isEmptyEmailHtml(candidate.body))?.body ?? '';

  return {
    fields: {
      to: firstNonEmpty('to'),
      cc: firstNonEmpty('cc'),
      bcc: firstNonEmpty('bcc'),
      subject: firstNonEmpty('subject'),
      body,
    },
    attachments: [...(present.find((source) => source.attachments?.length)?.attachments ?? [])],
    hasBody: body.length > 0,
  };
}

/**
 * True when the field still holds exactly what the composer was opened with, so
 * the server's value may replace it. The body gets an extra escape hatch: a
 * contenteditable the user typed into and emptied again leaves `<div><br></div>`
 * behind, which is not equal to `''` but is not an edit either.
 */
function isUnedited(field: keyof ComposeDraftFields, opened: string, current: string): boolean {
  if (current === opened) return true;
  return field === 'body' && isEmptyEmailHtml(current) && isEmptyEmailHtml(opened);
}

/**
 * Merges the authoritative draft into the open composer. Fields the user has
 * not touched take the server value — the instant snapshot may be stale or may
 * have had no body at all — and fields they have edited are left alone, because
 * hydration can land mid-keystroke.
 */
export function reconcileComposeDraftFields(
  opened: ComposeDraftFields,
  current: ComposeDraftFields,
  incoming: ComposeDraftFields
): ComposeDraftFields {
  const merge = (field: keyof ComposeDraftFields) =>
    isUnedited(field, opened[field], current[field]) ? incoming[field] : current[field];

  return {
    to: merge('to'),
    cc: merge('cc'),
    bcc: merge('bcc'),
    subject: merge('subject'),
    body: merge('body'),
  };
}

/**
 * Same rule for the attachment tray: the server list wins unless the user has
 * already added or removed something, in which case replacing the list would
 * resurrect a removed file or drop a pending upload.
 */
export function reconcileComposeAttachments(options: {
  current: readonly EmailAttachment[];
  incoming: readonly EmailAttachment[];
  hasPendingFiles: boolean;
  removedAttachmentIds: readonly string[];
}): EmailAttachment[] {
  const { current, incoming, hasPendingFiles, removedAttachmentIds } = options;
  if (hasPendingFiles || removedAttachmentIds.length > 0) return [...current];
  return [...incoming];
}

/**
 * Two quick clicks start two `getDraft` requests and the slower one can answer
 * last. Only the response for the draft that is actually open may be applied.
 */
export function shouldApplyDraftHydration(
  openMessageId: string | null,
  respondedMessageId: string
): boolean {
  return openMessageId !== null && openMessageId === respondedMessageId;
}

export type DraftIdentityState = 'pending' | 'ready' | 'unavailable' | 'cancelled';

/**
 * `draftId` only exists on the server, so a save that runs before hydration
 * lands would create a *second* draft instead of updating the one on screen.
 * Anything that writes waits on this gate first, and gets told which way the
 * hydration went.
 */
export type DraftIdentityGate = {
  readonly state: DraftIdentityState;
  /** Resolves once the gate settles; already-settled gates resolve immediately. */
  wait: () => Promise<Exclude<DraftIdentityState, 'pending'>>;
  /** The draft identity arrived. */
  resolve: () => void;
  /** Hydration failed; nothing may be written against this draft. */
  fail: () => void;
  /** The composer moved on (another draft opened, or it closed). */
  cancel: () => void;
};

export function createDraftIdentityGate(): DraftIdentityGate {
  let state: DraftIdentityState = 'pending';
  const waiting: Array<(settled: Exclude<DraftIdentityState, 'pending'>) => void> = [];

  const settle = (next: Exclude<DraftIdentityState, 'pending'>) => {
    if (state !== 'pending') return;
    state = next;
    const pending = waiting.splice(0, waiting.length);
    for (const resolveWaiter of pending) resolveWaiter(next);
  };

  return {
    get state() {
      return state;
    },
    wait() {
      if (state !== 'pending') return Promise.resolve(state);
      return new Promise<Exclude<DraftIdentityState, 'pending'>>((resolveWaiter) => {
        waiting.push(resolveWaiter);
      });
    },
    resolve: () => settle('ready'),
    fail: () => settle('unavailable'),
    cancel: () => settle('cancelled'),
  };
}
