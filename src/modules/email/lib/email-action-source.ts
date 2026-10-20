/**
 * Which email a change is made from, and whether Elliot proposed it — sent on
 * every write while it is set, so the server can record who did what from
 * each email (elli-ui#1309).
 *
 * Two pieces of state, both short-lived:
 * - the open thread, set by the reading pane while a thread is on screen, so
 *   anything done from the mailbox — + Add task, a court change, a move — is
 *   attributed to that email;
 * - an Elliot proposal, set only for the length of one approval, so the
 *   requests that approval makes are recorded as Elliot's, approved by you.
 *   The server checks the proposal is one Elliot made for you; the browser
 *   only names it.
 *
 * Only writes carry them. A read never records anything, and leaving reads
 * alone keeps them identical — and cacheable — whatever is open.
 */

export type EmailActionSource = {
  accountId: string;
  providerId: string | null;
  conversationKey: string;
};

export type ElliotProposalRef = {
  conversationId: string;
  toolCallId: string;
};

let openThread: EmailActionSource | null = null;
let activeProposal: ElliotProposalRef | null = null;

export function setOpenEmailSource(source: EmailActionSource | null): void {
  openThread = source;
}

/** Runs one approval with its proposal named on every write it makes. */
export async function withElliotProposal<T>(
  proposal: ElliotProposalRef | null,
  run: () => Promise<T>
): Promise<T> {
  if (!proposal) return run();
  const previous = activeProposal;
  activeProposal = proposal;
  try {
    return await run();
  } finally {
    activeProposal = previous;
  }
}

const WRITE_METHODS = new Set(['post', 'put', 'patch', 'delete']);

/** The headers a write carries right now — pure, so it is tested alone. */
export function emailActionHeaders(
  method: string | undefined,
  source: EmailActionSource | null = openThread,
  proposal: ElliotProposalRef | null = activeProposal
): Record<string, string> {
  if (!WRITE_METHODS.has((method ?? 'get').toLowerCase())) return {};
  const headers: Record<string, string> = {};
  if (source) {
    headers['X-Elli-Source-Account'] = encodeURIComponent(source.accountId);
    headers['X-Elli-Source-Thread'] = encodeURIComponent(source.conversationKey);
    if (source.providerId) {
      headers['X-Elli-Source-Message'] = encodeURIComponent(source.providerId);
    }
  }
  if (proposal) {
    headers['X-Elliot-Conversation'] = encodeURIComponent(proposal.conversationId);
    headers['X-Elliot-Tool-Call'] = encodeURIComponent(proposal.toolCallId);
  }
  return headers;
}
