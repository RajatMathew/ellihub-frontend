import { format, isSameYear } from 'date-fns';

/**
 * What the task and event modals link to (elli-ui#1379): emails, and the
 * records a task or event is about. Shared so a PO reads the same in both.
 */

export type LinkedEmail = {
  accountId: string;
  providerId: string;
  conversationKey?: string | null;
  threadId?: string | null;
  subject?: string | null;
  fromEmail?: string | null;
  fromName?: string | null;
  receivedAt?: string | null;
};

export const RECORD_TYPES = [
  'project',
  'rfq',
  'purchaseOrder',
  'primeChangeOrder',
  'subChangeOrder',
  'invoice',
] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export type LinkedRecord = {
  entityType: RecordType;
  entityId: string;
  /** Null once the record has been deleted. */
  label: string | null;
  /** The record's project, where it belongs to one. */
  meta: string | null;
};

/** The picker's tabs, and the search types each one asks for. */
export const RECORD_TABS = [
  {
    id: 'all',
    label: 'All',
    types: ['project', 'rfq', 'purchaseOrder', 'primeChangeOrder', 'subChangeOrder', 'invoice'],
  },
  { id: 'project', label: 'Projects', types: ['project'] },
  { id: 'rfq', label: 'RFQs', types: ['rfq'] },
  { id: 'purchaseOrder', label: 'POs', types: ['purchaseOrder'] },
  // Prime and sub change orders are different records (elli-ui#1163): one
  // "Change orders" tab listed both against one row limit, so a prime one
  // could be crowded out by newer SCOs.
  { id: 'primeChangeOrder', label: 'Prime COs', types: ['primeChangeOrder'] },
  { id: 'subChangeOrder', label: 'SCOs', types: ['subChangeOrder'] },
  { id: 'invoice', label: 'Invoices', types: ['invoice'] },
] as const;
export type RecordTab = (typeof RECORD_TABS)[number]['id'];
export type RecordSearchType = (typeof RECORD_TABS)[number]['types'][number];

/** How a record type is tagged: a short name, and a soft tone from the theme. */
export const RECORD_TAG: Record<RecordType, { label: string; className: string }> = {
  project: { label: 'Project', className: 'bg-info-soft text-info-soft-foreground' },
  rfq: { label: 'RFQ', className: 'bg-success-soft text-success-soft-foreground' },
  purchaseOrder: { label: 'PO', className: 'bg-warning-soft text-warning-soft-foreground' },
  primeChangeOrder: {
    label: 'Prime CO',
    className: 'bg-primary-soft text-primary-soft-foreground',
  },
  subChangeOrder: { label: 'SCO', className: 'bg-primary-soft text-primary-soft-foreground' },
  invoice: { label: 'Invoice', className: 'bg-accent text-accent-foreground' },
};

export function isRecordType(value: string | null | undefined): value is RecordType {
  return (RECORD_TYPES as readonly string[]).includes(value ?? '');
}

/**
 * "PO-55310 - Halden Steel" as its number and its name, the way the row lays
 * them out. A project reads "30000 - PS 082K": its job number is the code. A
 * label with no " - " is all name; a missing one is a deleted record.
 */
export function splitRecordLabel(label: string | null): { code: string | null; name: string } {
  if (!label) return { code: null, name: 'Deleted record' };
  const at = label.indexOf(' - ');
  return at > 0
    ? { code: label.slice(0, at), name: label.slice(at + 3) }
    : { code: null, name: label };
}

/**
 * What a linked-item row shows. A record named only by its number (an
 * invoice, "25321-INV-001") reads the number as its code and its project as
 * its name, so every row lines up as code, then words.
 */
export function recordRowParts(record: Pick<LinkedRecord, 'label' | 'meta'>): {
  code: string | null;
  name: string;
} {
  const split = splitRecordLabel(record.label);
  if (split.code || !record.label || !record.meta || /\s/.test(record.label)) return split;
  return { code: record.label, name: record.meta };
}

/** "9 Oct", or "9 Oct 2025" for another year — never the time. */
export function emailDateLabel(
  iso: string | null | undefined,
  now: Date = new Date()
): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return format(date, isSameYear(date, now) ? 'd MMM' : 'd MMM yyyy');
}

export const recordKey = (record: Pick<LinkedRecord, 'entityType' | 'entityId'>) =>
  `${record.entityType}:${record.entityId}`;

/** A record linked to a thread, and the thread it was found on. */
export type ThreadRecord = LinkedRecord & {
  accountId: string;
  conversationKey: string;
  threadId: string | null;
};

/** Whether the thread lookup can find an email at all: it needs a key or a thread id. */
export function canLookUpThread(email: LinkedEmail): boolean {
  return Boolean(email.conversationKey || email.threadId);
}

/** One cache entry per thread: the same thread from two messages is one lookup. */
export function threadLookupKey(email: LinkedEmail): string {
  return `${email.accountId}:${email.conversationKey || `thread:${email.threadId}`}`;
}

/** Whether a record found on a thread belongs to this email's thread. */
export function threadRecordOf(email: LinkedEmail, record: ThreadRecord): boolean {
  if (record.accountId !== email.accountId) return false;
  return email.conversationKey
    ? record.conversationKey === email.conversationKey
    : Boolean(email.threadId) && record.threadId === email.threadId;
}

/** The emails in `next` that were not in `previous`. */
export function emailsAdded(next: readonly LinkedEmail[], previous: readonly LinkedEmail[]) {
  const had = new Set(previous.map((email) => `${email.accountId}:${email.providerId}`));
  return next.filter((email) => !had.has(`${email.accountId}:${email.providerId}`));
}

/**
 * The linked items once a linked email's own items have been brought along:
 * what was there, in its order, then each new one once. A record found for an
 * email the reader has unlinked again while the lookup ran is not added.
 */
export function mergeThreadRecords(
  current: readonly LinkedRecord[],
  found: readonly ThreadRecord[],
  linkedEmails: readonly LinkedEmail[]
): LinkedRecord[] {
  const seen = new Set(current.map(recordKey));
  const added: LinkedRecord[] = [];
  for (const record of found) {
    if (seen.has(recordKey(record))) continue;
    if (!linkedEmails.some((email) => threadRecordOf(email, record))) continue;
    seen.add(recordKey(record));
    added.push({
      entityType: record.entityType,
      entityId: record.entityId,
      label: record.label,
      meta: record.meta,
    });
  }
  return added.length ? [...current, ...added] : [...current];
}
