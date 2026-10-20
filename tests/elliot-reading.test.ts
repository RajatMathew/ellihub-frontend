import { describe, expect, test } from 'bun:test';

import {
  elliotFilingUntouched,
  readingFilledThread,
  readingWorthShowing,
  taskDraftFormValues,
} from '../src/modules/email/lib/elliot-reading';
import {
  emailAiSuggestionSchema,
  type EmailAiSuggestion,
} from '../src/modules/email/schemas/elliot-reading.schema';

/**
 * Elliot's reading of a thread, as the details panel uses it. elli-core has already filed an
 * unfiled thread from it, so what is left here is whether the card still shows that filing, and
 * the New Task form a drafted task fills.
 */

const reading = (overrides: Partial<EmailAiSuggestion> = {}): EmailAiSuggestion => ({
  id: 'r1',
  kind: 'purchasing',
  court: 'open_our_court',
  links: [
    {
      referenceType: 'rfq',
      entityType: 'rfq',
      entityId: 'glAire17',
      label: 'RFQ-2025-1644 - Material & Fabrication for Turkish Airlines',
      confidence: 0.98,
      confident: true,
    },
    {
      referenceType: 'project',
      entityType: 'project',
      entityId: 'mPlGhfkz',
      label: '31700 - JFK NTO Turkish Airlines',
      confidence: 0.72,
      confident: false,
    },
  ],
  task: null,
  ...overrides,
});

describe('whether the panel uses the reading', () => {
  test('when Elliot filed the thread itself', () => {
    expect(readingWorthShowing(reading({ appliedAt: '2026-10-14T04:00:00Z' }))).toBe(true);
  });

  test('when Elliot drafted a task to offer', () => {
    const task = { title: 'Confirm award', priority: 'P2' as const };
    expect(readingWorthShowing(reading({ appliedAt: null, task }))).toBe(true);
  });

  test('not when it only names the kind of email', () => {
    expect(readingWorthShowing(reading({ appliedAt: null, task: null }))).toBe(false);
  });
});

describe("the panel's Elliot tag", () => {
  test('shows on a thread Elliot filled', () => {
    expect(readingFilledThread(reading({ appliedAt: '2026-10-14T04:00:00Z' }))).toBe(true);
  });

  test('not on a thread a person filed, or one Elliot has not read', () => {
    expect(readingFilledThread(reading({ appliedAt: null }))).toBe(false);
    expect(readingFilledThread(null)).toBe(false);
  });
});

describe("the blue border while the card shows Elliot's filing", () => {
  const filled = reading({ appliedAt: '2026-10-14T04:00:00Z', court: 'open_our_court' });
  // Elliot fills in only its confident links: the RFQ, not the 0.72 "maybe" project.
  const asFiled = {
    status: 'open_our_court',
    assignedTo: null,
    references: [{ entityType: 'rfq' as const, entityId: 'glAire17' }],
  };

  test('shows while the court and links are exactly what Elliot filed', () => {
    expect(elliotFilingUntouched(filled, asFiled)).toBe(true);
  });

  test('goes once a person changes the court', () => {
    expect(elliotFilingUntouched(filled, { ...asFiled, status: 'closed' })).toBe(false);
  });

  test('goes once a person assigns the thread', () => {
    expect(elliotFilingUntouched(filled, { ...asFiled, assignedTo: { id: 'u1' } })).toBe(false);
  });

  test('goes once a person removes a link Elliot filed', () => {
    expect(elliotFilingUntouched(filled, { ...asFiled, references: [] })).toBe(false);
  });

  test('goes once a person adds a link of their own', () => {
    const references = [
      ...asFiled.references,
      { entityType: 'project' as const, entityId: 'mPlGhfkz' },
    ];
    expect(elliotFilingUntouched(filled, { ...asFiled, references })).toBe(false);
  });

  test('never shows on a thread Elliot did not file', () => {
    expect(elliotFilingUntouched(reading({ appliedAt: null }), asFiled)).toBe(false);
    expect(elliotFilingUntouched(null, asFiled)).toBe(false);
  });
});

describe("Elliot's drafted task", () => {
  const draft = {
    title: 'Confirm a delivery window for PO 26035',
    description: null,
    priority: 'P2' as const,
    due_date: '2026-10-09',
    due_time: '14:00:00',
  };

  test('fills the form, due time as the wall-clock hour and minute', () => {
    expect(taskDraftFormValues(draft, 'open_our_court')).toEqual({
      title: 'Confirm a delivery window for PO 26035',
      description: '',
      priority: 'P2',
      court: 'OURS',
      dueDate: '2026-10-09',
      dueTime: '14:00',
    });
  });

  test("is theirs when Elliot read the thread as in the other side's court", () => {
    expect(taskDraftFormValues(draft, 'open_their_court').court).toBe('THEIRS');
  });

  test('leaves the due date and time to the form when the email states none', () => {
    const values = taskDraftFormValues({ ...draft, due_date: null, due_time: null }, null);
    expect(values).not.toHaveProperty('dueDate');
    expect(values).not.toHaveProperty('dueTime');
  });
});

describe("the API's answer", () => {
  test('parses what elli-core sends, extra fields and all', () => {
    const parsed = emailAiSuggestionSchema.parse({
      id: 'jEHiQRVB',
      messageId: 'CenmvvCm',
      providerId: 'AAMk',
      kind: 'purchasing',
      court: 'open_our_court',
      readAt: '2026-10-13T12:07:25.221Z',
      links: [
        {
          elliotType: 'rfq',
          entityType: 'rfq',
          referenceType: 'rfq',
          entityId: 'glAire17',
          confidence: 0.98,
          confident: true,
          label: 'RFQ-2025-1644',
          projectId: 'mPlGhfkz',
        },
      ],
      task: null,
    });
    expect(parsed.links[0].entityId).toBe('glAire17');
  });

  test('survives a reading without the optional parts', () => {
    expect(emailAiSuggestionSchema.parse({ id: 'r' }).links).toEqual([]);
  });
});
