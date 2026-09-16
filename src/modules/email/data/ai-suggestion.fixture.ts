import type { EmailAiSuggestion } from '@/modules/email/api/email-ai-suggestion.api';

/**
 * Canned AI suggestions, standing in for the endpoint elli-ui#921 says will
 * arrive later.
 *
 * Deliberately deterministic rather than random: the same conversation gets the
 * same suggestion every time it is opened, so the panel can be reasoned about
 * while reviewing, and a screenshot taken twice looks the same twice. The
 * conversation key is hashed to pick one of the shapes below, which between
 * them cover every branch the panel has to draw — a project thread with
 * references, a project thread with an assignee but nothing linked, an
 * explicitly non-project thread, and no suggestion at all.
 *
 * Lazily imported by `email-ai-suggestion.api.ts` so none of it reaches the
 * production bundle's main chunk, and deleted outright when the real endpoint
 * lands.
 */
const SHAPES: Array<(conversationKey: string) => EmailAiSuggestion | null> = [
  (conversationKey) => ({
    conversationKey,
    classification: 'project',
    confidence: 0.86,
    assignee: null,
    references: [
      {
        type: 'project',
        code: '30000',
        label: '30000 – Tidewater Press',
        entityId: null,
      },
      {
        type: 'rfq',
        code: 'RFQ-30000-002',
        label: 'RFQ-30000-002 – Reception desk, book-matched walnut',
        entityId: null,
      },
    ],
    rationale:
      'The subject and the attached drawings both name the Tidewater Press reception desk.',
  }),
  (conversationKey) => ({
    conversationKey,
    classification: 'project',
    confidence: 0.64,
    assignee: null,
    references: [],
    rationale: 'Reads like project correspondence, but no record matched closely enough to link.',
  }),
  (conversationKey) => ({
    conversationKey,
    classification: 'other',
    confidence: 0.91,
    assignee: null,
    references: [],
    rationale: 'A newsletter — no project, no record, nothing to action.',
  }),
  () => null,
];

/** Stable, order-independent hash. Same key in, same shape out, every time. */
function hashKey(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash);
}

export function suggestionFixture(conversationKey: string): EmailAiSuggestion | null {
  if (!conversationKey) return null;
  const shape = SHAPES[hashKey(conversationKey) % SHAPES.length];
  return shape ? shape(conversationKey) : null;
}
