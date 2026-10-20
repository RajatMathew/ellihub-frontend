import type { UIMessage } from 'ai';

import type { AgentCardStatus } from './agent-card-status';

/**
 * Several mail proposals from one turn, reviewed together (elli-ui#650).
 *
 * "Classify the unread emails" comes back as one proposal per destination —
 * move these four to Junk, archive those six, tag the rest. Rendered one card
 * after another that was a wall of identical frames, each with its own two
 * buttons. A run of them is now one batch: a line per change, approve or
 * reject them all at once, or open any one to review it alone.
 *
 * A batch is the mail proposals of one model step, with nothing the reader
 * would see between them. A new step starts a new run: a card proposed after
 * an earlier one was decided is a follow-up, not part of the same plan.
 */

const MAIL_PROPOSAL = 'tool-proposeEmailAction';
/** Parts that render nothing, so they do not split a run. */
const INVISIBLE = new Set(['reasoning', 'source-url', 'source-document', 'file']);

type PartLike = { type: string; toolCallId?: string; text?: string };

/** Tool call ids of every run of two or more mail proposals, in order. */
export function findMailProposalBatches(message: UIMessage): string[][] {
  if (message.role !== 'assistant') return [];
  const batches: string[][] = [];
  let run: string[] = [];
  const close = () => {
    if (run.length >= 2) batches.push(run);
    run = [];
  };

  for (const rawPart of message.parts) {
    const part = rawPart as PartLike;
    if (part.type === MAIL_PROPOSAL && part.toolCallId) {
      run.push(part.toolCallId);
      continue;
    }
    if (INVISIBLE.has(part.type)) continue;
    if (part.type === 'text' && !part.text?.trim()) continue;
    // A new step, text, a lookup or any other card ends the run.
    close();
  }
  close();
  return batches;
}

export type BatchItemSummary = {
  status: AgentCardStatus;
  messageIds: readonly string[];
};

export type BatchSummary = {
  total: number;
  /** Distinct emails across the batch. */
  emails: number;
  pending: number;
  working: number;
  approved: number;
  rejected: number;
  failed: number;
  /** Nothing left to decide. */
  settled: boolean;
};

export function summarizeBatch(items: BatchItemSummary[]): BatchSummary {
  const count = (status: AgentCardStatus) => items.filter((item) => item.status === status).length;
  const pending = count('pending');
  const working = count('working');
  return {
    total: items.length,
    emails: new Set(items.flatMap((item) => item.messageIds)).size,
    pending,
    working,
    approved: count('approved'),
    rejected: count('rejected'),
    failed: count('failed'),
    settled: pending === 0 && working === 0,
  };
}

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/** The batch header: "3 changes · 18 emails". */
export function batchTitle(summary: BatchSummary): string {
  return `${plural(summary.total, 'change', 'changes')} · ${plural(summary.emails, 'email', 'emails')}`;
}

/** The batch's progress, shown beside its title. */
export function batchProgress(summary: BatchSummary): string {
  if (summary.working > 0) return 'Applying…';
  if (!summary.settled) {
    const decided = summary.total - summary.pending;
    return decided === 0 ? 'Waiting for review' : `${decided} of ${summary.total} decided`;
  }
  if (summary.approved === summary.total) return 'All applied';
  if (summary.rejected === summary.total) return 'All rejected';
  const parts = [
    summary.approved ? `${summary.approved} applied` : null,
    summary.rejected ? `${summary.rejected} rejected` : null,
    summary.failed ? `${summary.failed} failed` : null,
  ];
  return parts.filter(Boolean).join(' · ');
}
