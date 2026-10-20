import {
  composeAttachmentBudget,
  composeAttachmentBytes,
  composeAttachmentItems,
} from '@/modules/email/lib/email-compose-attachment-items';
import { fileKey, MAX_TOTAL_ATTACHMENT_BYTES } from '@/modules/email/lib/email-compose-attachments';
import { describe, expect, test } from 'bun:test';

const makeFile = (name: string, bytes: number) =>
  new File([new Uint8Array(bytes)], name, { type: 'text/plain' });

describe('composeAttachmentItems', () => {
  test('gives a reply the same tray rows a new message gets', () => {
    // The whole point of elli-ui#1189: a reply holds nothing but `File`s and
    // has no draft, and used to get a hand-rolled tray because of it. One
    // `pending`-only call has to produce complete rows on its own.
    const items = composeAttachmentItems({ pending: [makeFile('quote.pdf', 2048)] });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      kind: 'pending',
      name: 'quote.pdf',
      sizeBytes: 2048,
      statusLabel: '2 KB',
      hasFailed: false,
      progress: null,
      cancels: false,
    });
  });

  test('keys a pending row by fileKey, so removing it finds the same file', () => {
    const file = makeFile('plans.dwg', 10);
    const [item] = composeAttachmentItems({ pending: [file] });

    // Both surfaces remove by this id. A row whose id did not round-trip back
    // to its file would silently remove the wrong one — or nothing at all.
    expect(item.id).toBe(fileKey(file));
  });

  test('draws stored attachments before pending ones', () => {
    const items = composeAttachmentItems({
      pending: [makeFile('new.pdf', 1)],
      stored: [{ id: 'att_1', name: 'already-up.pdf', sizeBytes: 100 }],
    });

    expect(items.map((item) => item.kind)).toEqual(['stored', 'pending']);
    expect(items[0]).toMatchObject({ id: 'att_1', statusLabel: 'Ready', cancels: false });
  });

  test('a stored attachment with no size counts as zero rather than NaN', () => {
    // `sizeBytes` is optional on the wire, and an undefined here used to reach
    // the budget line as NaN — which reads as a broken total, not a missing one.
    const items = composeAttachmentItems({ stored: [{ id: 'att_1', name: 'unknown.pdf' }] });

    expect(items[0].sizeBytes).toBe(0);
    expect(composeAttachmentBytes(items)).toBe(0);
  });

  test('an upload in flight shows its progress and offers to cancel', () => {
    const items = composeAttachmentItems({
      pending: [makeFile('big.zip', 5_000_000)],
      saveStatus: 'saving',
      progress: 42,
      isPreparing: true,
    });

    expect(items[0]).toMatchObject({
      statusLabel: 'Uploading 42%',
      progress: 42,
      cancels: true,
      hasFailed: false,
    });
  });

  test('a failed upload says so and draws no progress bar', () => {
    const items = composeAttachmentItems({
      pending: [makeFile('big.zip', 5_000_000)],
      saveStatus: 'error',
      progress: 42,
    });

    expect(items[0]).toMatchObject({ statusLabel: 'Failed', hasFailed: true, progress: null });
  });

  test('totals across both kinds', () => {
    const items = composeAttachmentItems({
      pending: [makeFile('a.txt', 300), makeFile('b.txt', 700)],
      stored: [{ id: 'att_1', name: 'c.pdf', sizeBytes: 1000 }],
    });

    expect(composeAttachmentBytes(items)).toBe(2000);
  });
});

describe('composeAttachmentBudget', () => {
  test('invites a first attachment rather than reporting zero bytes used', () => {
    const budget = composeAttachmentBudget(0, MAX_TOTAL_ATTACHMENT_BYTES);

    expect(budget.overBudget).toBe(false);
    expect(budget.label).toBe('or drop them anywhere, up to 25.0 MB');
  });

  test('reports what is spent once something is attached', () => {
    const budget = composeAttachmentBudget(1024 * 1024, MAX_TOTAL_ATTACHMENT_BYTES);

    expect(budget.label).toBe('1.0 MB of 25.0 MB used');
    expect(budget.overBudget).toBe(false);
  });

  test('the budget is exclusive at the cap, matching the provider limit', () => {
    expect(
      composeAttachmentBudget(MAX_TOTAL_ATTACHMENT_BYTES, MAX_TOTAL_ATTACHMENT_BYTES).overBudget
    ).toBe(false);
    expect(
      composeAttachmentBudget(MAX_TOTAL_ATTACHMENT_BYTES + 1, MAX_TOTAL_ATTACHMENT_BYTES).overBudget
    ).toBe(true);
  });
});
