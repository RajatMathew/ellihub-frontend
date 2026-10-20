import {
  Building2,
  FileDiff,
  FileSearch,
  Receipt,
  ShoppingCart,
  type LucideIcon,
} from 'lucide-react';
import { z } from 'zod';

/**
 * A mail the user pointed at with @ in one message. Carried on that message's
 * metadata, so the sent bubble can show it as a pill and the conversation,
 * reopened later, still shows it. Identified by id, never by subject: two
 * mails can share a subject.
 */
export const mentionRefSchema = z.object({
  id: z.string().min(1),
  messageId: z.string().min(1),
  subject: z.string(),
  senderName: z.string().default(''),
  receivedAt: z.string().nullish(),
});
export type MentionRef = z.infer<typeof mentionRefSchema>;

const metadataSchema = z.object({ mentions: z.array(mentionRefSchema) });

/** The mentions on a message, or none when the metadata is absent or another shape. */
export function readMentions(metadata: unknown): MentionRef[] {
  const parsed = metadataSchema.safeParse(metadata);
  return parsed.success ? parsed.data.mentions : [];
}

/** What a pill's tooltip says, so two mails with one subject can be told apart. */
export function mentionTitle(mention: Pick<MentionRef, 'subject' | 'senderName' | 'receivedAt'>) {
  const date = mention.receivedAt ? new Date(mention.receivedAt) : null;
  const when =
    date && !Number.isNaN(date.getTime())
      ? date.toLocaleString(undefined, { month: 'short', day: 'numeric' })
      : '';
  return [mention.subject || '(No subject)', mention.senderName, when].filter(Boolean).join(' · ');
}

/** A mail the @ menu can offer: one already loaded, or one found by searching the mailbox. */
export type MentionCandidate<TLocal, THit> =
  | {
      kind: 'local';
      key: string;
      subject: string;
      senderName: string;
      preview: string;
      item: TLocal;
    }
  | { kind: 'hit'; key: string; subject: string; senderName: string; preview: string; hit: THit };

type LocalMail = {
  id: string;
  providerId?: string;
  conversationKey?: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  preview: string;
};
type FoundMail = {
  providerId: string;
  conversationKey: string;
  subject: string;
  senderName: string;
  senderEmail: string;
  preview: string;
};

export const MAX_MENTION_RECENT = 20;
export const MAX_MENTION_LOCAL_MATCHES = 8;
export const MAX_MENTION_HITS = 10;

/**
 * What the @ menu lists. With nothing typed, the loaded mail, newest first.
 * With a term, the loaded mail that matches comes first (instant), then what
 * searching the whole mailbox found, minus any thread already listed, so a
 * mail never shows twice.
 */
export function mentionCandidates<TLocal extends LocalMail, THit extends FoundMail>(
  term: string,
  local: TLocal[],
  hits: THit[]
): MentionCandidate<TLocal, THit>[] {
  const query = term.trim().toLowerCase();
  const toLocal = (item: TLocal): MentionCandidate<TLocal, THit> => ({
    kind: 'local',
    key: `local:${item.id}`,
    subject: item.subject,
    senderName: item.senderName,
    preview: item.preview,
    item,
  });
  if (!query) return local.slice(0, MAX_MENTION_RECENT).map(toLocal);
  const matches = local
    .filter((item) =>
      matchesWords(query, `${item.subject} ${item.senderName} ${item.senderEmail} ${item.preview}`)
    )
    .slice(0, MAX_MENTION_LOCAL_MATCHES);
  const seenProvider = new Set(local.map((item) => item.providerId).filter(Boolean));
  const seenThread = new Set(local.map((item) => item.conversationKey).filter(Boolean));
  const found = hits
    .filter((hit) => !seenProvider.has(hit.providerId) && !seenThread.has(hit.conversationKey))
    .slice(0, MAX_MENTION_HITS)
    .map(
      (hit): MentionCandidate<TLocal, THit> => ({
        kind: 'hit',
        key: `hit:${hit.providerId}`,
        subject: hit.subject,
        senderName: hit.senderName,
        preview: hit.preview,
        hit,
      })
    );
  return [...matches.map(toLocal), ...found];
}

/**
 * Every word of the search starts a word of the text, in any order: "final
 * quote" finds "Final quote Q-2291", "hi" finds "Hi Sarah" but not "this".
 */
export function matchesWords(query: string, text: string): boolean {
  const words = query
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  if (words.length === 0) return true;
  const tokens = text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
  return words.every((word) => tokens.some((token) => token.startsWith(word)));
}

/**
 * A record the user pointed at with @: a project, RFQ, PO, change order or
 * invoice. Found by `GET /mock/agent/mentions`, carried on the message's
 * metadata so the sent bubble keeps its pill, and handed to Elliot by kind and
 * id, so "PO-1042" never has to be searched for — or guessed between two.
 */
export const RECORD_MENTION_KINDS = [
  'project',
  'rfq',
  'purchaseOrder',
  'subChangeOrder',
  'invoice',
] as const;
export type RecordMentionKind = (typeof RECORD_MENTION_KINDS)[number];

export const recordMentionSchema = z.object({
  kind: z.enum(RECORD_MENTION_KINDS),
  id: z.string().min(1),
  label: z.string(),
  detail: z.string().default(''),
  status: z.string().nullish(),
  projectId: z.string().nullish(),
  projectName: z.string().nullish(),
});
export type RecordMention = z.infer<typeof recordMentionSchema>;

/**
 * The search's answer. A row of a kind this client does not know yet is
 * dropped rather than failing the whole list, so the API can add one first.
 */
export function parseRecordMentions(data: unknown): RecordMention[] {
  const rows = z.object({ records: z.array(z.unknown()) }).safeParse(data);
  if (!rows.success) return [];
  return rows.data.records.flatMap((row) => {
    const parsed = recordMentionSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
}

export const RECORD_KIND_LABELS: Record<RecordMentionKind, { one: string; many: string }> = {
  project: { one: 'Project', many: 'Projects' },
  rfq: { one: 'RFQ', many: 'RFQs' },
  purchaseOrder: { one: 'Purchase order', many: 'Purchase orders' },
  subChangeOrder: { one: 'Change order', many: 'Change orders' },
  invoice: { one: 'Invoice', many: 'Invoices' },
};

/** Two records can share a number across kinds; the kind keeps them apart. */
export function recordMentionKey(record: Pick<RecordMention, 'kind' | 'id'>): string {
  return `${record.kind}:${record.id}`;
}

/** What a record pill's tooltip says. */
export function recordMentionTitle(record: Pick<RecordMention, 'kind' | 'label' | 'detail'>) {
  return [RECORD_KIND_LABELS[record.kind].one, record.label, record.detail]
    .filter(Boolean)
    .join(' · ');
}

/** Adds a record to the message being written, once. */
export function withRecordMention(current: RecordMention[], record: RecordMention) {
  const key = recordMentionKey(record);
  return current.some((item) => recordMentionKey(item) === key) ? current : [...current, record];
}

/** What the model is handed for each tagged record: enough to act, nothing to re-derive. */
export function recordMentionsForAgent(records: RecordMention[]) {
  return records.map(({ kind, id, label, detail, projectId, projectName }) => ({
    kind,
    id,
    label,
    ...(detail ? { detail } : {}),
    ...(projectId ? { projectId } : {}),
    ...(projectName ? { projectName } : {}),
  }));
}

/** A row of the @ menu: a mail (loaded or found), or a record. */
export type MentionMenuRow<TLocal, THit> =
  | { kind: 'mail'; key: string; candidate: MentionCandidate<TLocal, THit> }
  | { kind: 'record'; key: string; record: RecordMention };

/**
 * The @ menu's rows, in the order they are listed: the loaded mail first
 * (instant), then records, then what searching the whole mailbox found. Both
 * searches are slow; records come before the mailbox hits because the
 * mailbox's answer is the slower of the two, so the list grows at the end
 * rather than shifting under the pointer. A record already tagged is left out.
 */
export function mentionMenuRows<TLocal, THit>(
  mail: MentionCandidate<TLocal, THit>[],
  records: RecordMention[],
  taggedKeys: ReadonlySet<string> = new Set()
): MentionMenuRow<TLocal, THit>[] {
  const toMail = (candidate: MentionCandidate<TLocal, THit>): MentionMenuRow<TLocal, THit> => ({
    kind: 'mail',
    key: candidate.key,
    candidate,
  });
  const recordRows = records
    .filter((record) => !taggedKeys.has(recordMentionKey(record)))
    .map(
      (record): MentionMenuRow<TLocal, THit> => ({
        kind: 'record',
        key: `record:${recordMentionKey(record)}`,
        record,
      })
    );
  return [
    ...mail.filter((candidate) => candidate.kind === 'local').map(toMail),
    ...recordRows,
    ...mail.filter((candidate) => candidate.kind === 'hit').map(toMail),
  ];
}

/**
 * The heading a row starts, or null when it continues the group above it.
 * A tab of one record kind needs none: the tab already says what it lists.
 */
export function mentionMenuHeading<TLocal, THit>(
  rows: MentionMenuRow<TLocal, THit>[],
  index: number,
  tab: MentionTab = 'mail'
): string | null {
  const row = rows[index];
  if (!row || tab !== 'mail') return null;
  const group = (item: MentionMenuRow<TLocal, THit>) =>
    item.kind === 'record' ? item.record.kind : item.candidate.kind;
  const previous = rows[index - 1];
  if (previous && group(previous) === group(row)) return null;
  if (row.kind === 'record') return RECORD_KIND_LABELS[row.record.kind].many;
  return row.candidate.kind === 'hit' ? 'From your mailbox' : 'Emails';
}

const recordMetadataSchema = z.object({ records: z.array(recordMentionSchema) });

/** The records tagged on a sent message, or none when its metadata has none. */
export function readRecordMentions(metadata: unknown): RecordMention[] {
  const parsed = recordMetadataSchema.safeParse(metadata);
  return parsed.success ? parsed.data.records : [];
}

/**
 * The chat request's context with the latest message's records put first, so
 * they survive when a long context is cut at the end. Unchanged when none.
 */
export function withMentionedRecords<TContext>(
  records: RecordMention[],
  context: TContext
): TContext | (Record<string, unknown> & { mentionedRecordsInLatestMessage: unknown[] }) {
  if (records.length === 0) return context;
  return {
    mentionedRecordsInLatestMessage: recordMentionsForAgent(records),
    ...(context && typeof context === 'object' ? context : {}),
  };
}

/** The @ menu's tabs: mail, or one kind of record. The menu opens on mail. */
export type MentionTab = 'mail' | RecordMentionKind;

export const MENTION_TABS: { id: MentionTab; label: string }[] = [
  { id: 'mail', label: 'Emails' },
  { id: 'project', label: 'Projects' },
  { id: 'rfq', label: 'RFQs' },
  { id: 'purchaseOrder', label: 'POs' },
  { id: 'subChangeOrder', label: 'COs' },
  { id: 'invoice', label: 'Invoices' },
];

/** The tab `step` places along, wrapping at either end: Tab and Shift+Tab in the search box. */
export function nextMentionTab(tab: MentionTab, step: 1 | -1): MentionTab {
  const index = MENTION_TABS.findIndex((item) => item.id === tab);
  return MENTION_TABS[(index + step + MENTION_TABS.length) % MENTION_TABS.length]!.id;
}

/** What the open tab searches: the mailbox, or one kind of record. */
export function mentionTabSearches(
  tab: MentionTab
): { mail: true; recordKind: undefined } | { mail: false; recordKind: RecordMentionKind } {
  return tab === 'mail' ? { mail: true, recordKind: undefined } : { mail: false, recordKind: tab };
}

/** One icon per record kind, shared by the @ menu and the pills. */
export const RECORD_KIND_ICONS: Record<RecordMentionKind, LucideIcon> = {
  project: Building2,
  rfq: FileSearch,
  purchaseOrder: ShoppingCart,
  subChangeOrder: FileDiff,
  invoice: Receipt,
};
