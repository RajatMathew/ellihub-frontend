import type { UIMessage } from 'ai';

import { ASK_TOOL_NAME } from './agent-question';

/**
 * Elliot's lookups, as steps the reader can follow (elli-ui#695).
 *
 * Every lookup tool in elli-core (`src/modules/assistant/routes.ts`) runs on its
 * own and answers with one list in an object — `{ projects }`, `{ rfqs }`,
 * `{ attachments }`. These used to render nothing: the reader saw "thinking"
 * and then an answer. Now each call becomes a step that says what it is doing,
 * then what it found.
 *
 * A lookup this file does not know still becomes a step, with a generic label,
 * so a tool added in elli-core shows up rather than vanishing.
 */

export type AgentActivityKind = 'project' | 'record' | 'mail' | 'directory' | 'catalog';

type LookupCopy = {
  running: string;
  singular: string;
  plural: string;
  kind: AgentActivityKind;
};

const LOOKUPS: Record<string, LookupCopy> = {
  lookupProjects: {
    running: 'Searching projects',
    singular: 'project',
    plural: 'projects',
    kind: 'project',
  },
  lookupPrimeChangeOrders: {
    running: 'Searching change orders',
    singular: 'change order',
    plural: 'change orders',
    kind: 'record',
  },
  lookupScheduleEntries: {
    running: 'Checking the schedule',
    singular: 'schedule entry',
    plural: 'schedule entries',
    kind: 'project',
  },
  lookupEmailAttachments: {
    running: 'Reading attachments',
    singular: 'attachment',
    plural: 'attachments',
    kind: 'mail',
  },
  lookupCrossInboxAttachments: {
    running: 'Searching your mailboxes',
    singular: 'attachment',
    plural: 'attachments',
    kind: 'mail',
  },
  lookupRfqs: { running: 'Searching RFQs', singular: 'RFQ', plural: 'RFQs', kind: 'record' },
  lookupRfqVendors: {
    running: 'Checking vendors on the RFQ',
    singular: 'vendor',
    plural: 'vendors',
    kind: 'directory',
  },
  lookupVendors: {
    running: 'Searching vendors',
    singular: 'vendor',
    plural: 'vendors',
    kind: 'directory',
  },
  lookupPurchaseOrders: {
    running: 'Searching purchase orders',
    singular: 'purchase order',
    plural: 'purchase orders',
    kind: 'record',
  },
  lookupSubChangeOrders: {
    running: 'Checking change orders',
    singular: 'change order',
    plural: 'change orders',
    kind: 'record',
  },
  lookupInvoices: {
    running: 'Checking invoices',
    singular: 'invoice',
    plural: 'invoices',
    kind: 'record',
  },
  lookupRfqDeliverables: {
    running: 'Reading the RFQ',
    singular: 'deliverable',
    plural: 'deliverables',
    kind: 'record',
  },
  lookupMailboxMessages: {
    running: 'Reading your mailbox',
    singular: 'email',
    plural: 'emails',
    kind: 'mail',
  },
  lookupCatalog: {
    running: 'Looking up units and cost codes',
    singular: 'option',
    plural: 'options',
    kind: 'catalog',
  },
};

const FALLBACK_COPY: LookupCopy = {
  running: 'Looking things up',
  singular: 'result',
  plural: 'results',
  kind: 'catalog',
};

/** Tools that propose a change: they render as review cards, never as steps. */
export const PROPOSAL_TOOLS: ReadonlySet<string> = new Set([
  'proposeEmailAction',
  'proposeProjectScheduleAction',
  'proposeUploadRfqQuote',
  'proposeRecordAction',
]);

/**
 * Tools that render as their own card — the proposals, and Elliot's mid-task
 * question (agent-question.ts). None of them is a step, and each one ends a
 * run of lookups.
 */
export const CARD_TOOLS: ReadonlySet<string> = new Set([...PROPOSAL_TOOLS, ASK_TOOL_NAME]);

export type AgentActivityStep = {
  id: string;
  tool: string;
  kind: AgentActivityKind;
  status: 'running' | 'done' | 'error';
  title: string;
  /** What the lookup was asked for, when it was narrowed. */
  query: string | null;
  /** Labels of what came back, in order. Empty while running. */
  items: string[];
};

type ToolPartLike = {
  type: string;
  toolCallId?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
};

const NUMBER_FIELDS = ['rfqNumber', 'poNumber', 'scoNumber', 'invoiceNumber', 'jobNumber'];
const NAME_FIELDS = ['title', 'name', 'label', 'attachmentName', 'fileName', 'subject'];

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const firstString = (record: Record<string, unknown>, fields: string[]) => {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
};

/** One readable line per row a lookup returned: "RFQ-104 · Drywall package". */
export function labelLookupItem(item: unknown): string | null {
  if (typeof item === 'string') return item.trim() || null;
  const record = asRecord(item);
  if (!record) return null;
  const name = firstString(record, NAME_FIELDS);
  const number = firstString(record, NUMBER_FIELDS);
  if (number && name && number !== name) return `${number} · ${name}`;
  return name ?? number;
}

/** The list a lookup answered with — the first array in its result object. */
export function lookupResultItems(output: unknown): unknown[] {
  if (Array.isArray(output)) return output;
  const record = asRecord(output);
  if (!record) return [];
  for (const value of Object.values(record)) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

const countLabel = (count: number, copy: LookupCopy) =>
  count === 0
    ? `No ${copy.plural} found`
    : `Found ${count} ${count === 1 ? copy.singular : copy.plural}`;

export function toActivityStep(part: ToolPartLike): AgentActivityStep | null {
  if (!part.type.startsWith('tool-')) return null;
  const tool = part.type.slice('tool-'.length);
  if (CARD_TOOLS.has(tool)) return null;

  const copy = LOOKUPS[tool] ?? FALLBACK_COPY;
  const query = asRecord(part.input)?.query;
  const base = {
    id: part.toolCallId ?? `${tool}-${part.state ?? 'pending'}`,
    tool,
    kind: copy.kind,
    query: typeof query === 'string' && query.trim() ? query.trim() : null,
  };

  if (part.state === 'output-error') {
    return { ...base, status: 'error', title: `${copy.running} failed`, items: [] };
  }
  if (part.state !== 'output-available') {
    return { ...base, status: 'running', title: copy.running, items: [] };
  }

  const rows = lookupResultItems(part.output);
  const items = rows.map(labelLookupItem).filter((label): label is string => !!label);
  return { ...base, status: 'done', title: countLabel(rows.length, copy), items };
}

export function getActivitySteps(message: UIMessage): AgentActivityStep[] {
  if (message.role !== 'assistant') return [];
  return message.parts.flatMap((part) => {
    const step = toActivityStep(part as ToolPartLike);
    return step ? [step] : [];
  });
}

export type AgentActivityGroup = {
  steps: AgentActivityStep[];
  /** Nothing the reader can see comes after it yet — it is where the turn is. */
  trailing: boolean;
};

/**
 * A turn's lookups, split wherever Elliot says something or proposes something
 * in between (elli-ui#1368). One timeline for the whole turn used to sit where
 * the first lookup happened, so a turn that looked, explained, and looked again
 * read as fourteen steps in a row with all the talking after them. Each run of
 * lookups now gets its own timeline, in the order it happened.
 *
 * `hiddenText` names text parts the panel does not show (agent-follow-up.ts):
 * they are not on screen, so they do not split a run.
 */
export function groupActivitySteps(
  message: UIMessage,
  hiddenText: ReadonlySet<number> = new Set()
): AgentActivityGroup[] {
  if (message.role !== 'assistant') return [];
  const groups: AgentActivityGroup[] = [];
  let current: AgentActivityGroup | null = null;
  message.parts.forEach((part, index) => {
    const step = toActivityStep(part as ToolPartLike);
    if (step) {
      if (!current) {
        current = { steps: [], trailing: true };
        groups.push(current);
      }
      current.steps.push(step);
      return;
    }
    const visibleText = part.type === 'text' && !hiddenText.has(index) && !!part.text.trim();
    const card = part.type.startsWith('tool-') && CARD_TOOLS.has(part.type.slice(5));
    if (!visibleText && !card) return;
    for (const group of groups) group.trailing = false;
    current = null;
  });
  return groups;
}

/** The collapsed line under a finished turn: "3 steps · 12 results". */
export function summarizeActivity(steps: AgentActivityStep[]): string {
  const results = steps.reduce((total, step) => total + step.items.length, 0);
  const stepText = `${steps.length} ${steps.length === 1 ? 'step' : 'steps'}`;
  return results > 0
    ? `${stepText} · ${results} ${results === 1 ? 'result' : 'results'}`
    : stepText;
}
