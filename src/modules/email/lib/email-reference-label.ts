import type { EntityReferenceKind } from '@/app/components/entity-reference-marker-storage';

/**
 * The kinds of record a thread can be linked to, in the order they are listed,
 * with the short label and dot colour each carries. The mailbox's "Linked items"
 * and a task card's email source both read it, so the two name a job alike.
 */
export const LINKED_ITEM_TYPES: Array<{ type: EntityReferenceKind; label: string; dot: string }> = [
  { type: 'project', label: 'JOB', dot: 'bg-court-ours' },
  { type: 'rfq', label: 'RFQ', dot: 'bg-warning' },
  { type: 'rfi', label: 'RFI', dot: 'bg-caution' },
  { type: 'purchaseOrder', label: 'PO', dot: 'bg-primary' },
  { type: 'primeChangeOrder', label: 'PRIME CO', dot: 'bg-priority-low' },
  { type: 'changeOrder', label: 'SCO', dot: 'bg-priority-low' },
  { type: 'invoice', label: 'INVOICE', dot: 'bg-foreground' },
];

/**
 * A linked record's label arrives from the server as `code – name`
 * (`2026-001 – Testing`, `RFQ-30000-002 – Reception veneer`). Split it so the
 * code can carry the weight in the panel and the name is what truncates — the
 * code is what anyone actually scans a list of records by.
 *
 * The separator is a **spaced** dash. Codes carry their own hyphens, so
 * splitting on the first `-` turned `2026-001 – Testing` into a code of `2026`
 * and a name of `001 - Testing`.
 */
export function splitReferenceLabel(label: string): { code: string; name: string | null } {
  const match = label.match(/^(.+?)\s+[–—-]\s+(.+)$/);
  if (!match) return { code: label.trim(), name: null };
  return { code: match[1].trim(), name: match[2].trim() };
}
