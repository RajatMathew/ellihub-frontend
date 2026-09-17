export type MailThreadActionKind = 'log' | 'link' | 'file' | 'notify' | 'schedule' | 'close';

export type MailThreadAction = {
  id: string;
  kind: MailThreadActionKind;
  /** The sentence, with the record it names marked for emphasis. */
  text: string;
  emphasis: string | null;
  /** Hours before "now" — turned into a label by the component. */
  hoursAgo: number;
  by: string;
};

/**
 * Canned action histories, standing in for an endpoint that does not exist.
 *
 * elli-core logs email activity against the *project* (`logProjectReferenceChanges`),
 * never against the thread, so there is nothing per-thread to read. These are
 * here so the panel's Actions section can be designed and reviewed against
 * something that looks like real traffic, and they are deleted the day a
 * `GET /email/.../actions` exists.
 *
 * Deterministic per conversation, like the AI suggestion fixture beside it: the
 * same thread shows the same history every time it is opened, so a screenshot
 * taken twice looks the same twice and nothing shuffles under the reader.
 */
const HISTORIES: MailThreadAction[][] = [
  [
    {
      id: 'a1',
      kind: 'notify',
      text: 'Notified {} the shop drawing is approved',
      emphasis: 'Emily',
      hoursAgo: 3,
      by: 'You',
    },
    {
      id: 'a2',
      kind: 'log',
      text: 'Logged RFI as {} — veneer grade confirmation',
      emphasis: 'RFI-30000-003',
      hoursAgo: 28,
      by: 'Elliot Agent',
    },
    {
      id: 'a3',
      kind: 'log',
      text: 'Updated {} spec to book-matched veneer at the reception desk',
      emphasis: 'RFQ-30000-002',
      hoursAgo: 49,
      by: 'You',
    },
    {
      id: 'a4',
      kind: 'close',
      text: 'Marked the thread {}',
      emphasis: 'our court',
      hoursAgo: 73,
      by: 'Alejandra C.',
    },
  ],
  [
    {
      id: 'b1',
      kind: 'schedule',
      text: 'Logged appeal deadline as {}',
      emphasis: 'Oct 2, 2026',
      hoursAgo: 14,
      by: 'Alejandra C.',
    },
    {
      id: 'b2',
      kind: 'link',
      text: 'Linked email to project {}',
      emphasis: '28100-25',
      hoursAgo: 40,
      by: 'Elliot Agent',
    },
    {
      id: 'b3',
      kind: 'file',
      text: 'Saved compliance document {} to files',
      emphasis: '28100-25_response.pdf',
      hoursAgo: 42,
      by: 'Alejandra C.',
    },
  ],
  [
    {
      id: 'c1',
      kind: 'link',
      text: 'Linked this thread to {}',
      emphasis: 'PO-23108',
      hoursAgo: 6,
      by: 'Elliot Agent',
    },
    {
      id: 'c2',
      kind: 'notify',
      text: 'Chased {} for the revised quote',
      emphasis: 'Casey Fuller',
      hoursAgo: 30,
      by: 'You',
    },
  ],
  [],
];

/** Stable, order-independent hash. Same key in, same history out, every time. */
function hashKey(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function threadActionsFixture(conversationKey: string): MailThreadAction[] {
  if (!conversationKey) return [];
  return HISTORIES[hashKey(conversationKey) % HISTORIES.length] ?? [];
}
