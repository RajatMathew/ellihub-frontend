import { z } from 'zod';

import { formatDateOnly } from './dates';
import { formatCurrency, formatDecimal, formatPercent } from './helpers';

/**
 * Where a record loaded from a legacy migration workbook came from.
 *
 * elli-core's scripts/migration-import loads cleaned project data from the
 * migration helper and records, for every record it creates, the workbook,
 * sheet and row behind it. Responses carry that as `importSource` - null for a
 * record that was not imported - so a page can label the record as imported and
 * say where it came from.
 */

export const IMPORTED_FIELD_KINDS = ['text', 'number', 'money', 'percent', 'date', 'link'] as const;

/**
 * One labelled value the import kept with a record: a cell of its workbook row
 * (labelled by the column header), or a detail ElliHub has no field for - a
 * payment's method, a change order's markup. A kind this client does not know
 * yet reads as plain text rather than failing the page.
 */
export const importedFieldSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]).nullable(),
  kind: z.enum(IMPORTED_FIELD_KINDS).catch('text'),
});

export type ImportedField = z.infer<typeof importedFieldSchema>;

export const importSourceSchema = z.object({
  fileName: z.string(),
  /** The workbook as kept in Files, once the import has stored it. */
  fileId: z.string().nullable(),
  sheet: z.string().nullable(),
  /** 1-based row in that sheet. */
  row: z.number().int().nullable(),
  /** The business number exactly as the workbook wrote it. */
  legacyNumber: z.string().nullable(),
  importedAt: z.string(),
  importedBy: z.object({ id: z.string(), name: z.string() }),
  /** What the import kept that ElliHub has no field for; none from an older API. */
  details: z.array(importedFieldSchema).catch([]),
  /** The workbook row, column by column: on a record's own page, not in lists. */
  workbookRow: z.array(importedFieldSchema).optional().catch(undefined),
});

export type ImportSource = z.infer<typeof importSourceSchema>;

/** A record's import source in a response: null when it was not imported. */
export const optionalImportSourceSchema = importSourceSchema.nullable().optional();

/**
 * Where a PO payment came from. IMPORT: loaded from a migration workbook;
 * MANUAL: recorded by hand in Monthly Bills (a check, wire or card paid outside
 * QuickBooks). Neither has a QuickBooks transaction behind it.
 */
export const paymentSourceSchema = z.enum(['QUICKBOOKS', 'IMPORT', 'MANUAL']);

export type PaymentSource = z.infer<typeof paymentSourceSchema>;

/** "PS 676KElliHub_Migration.xlsx · PO_PAYMENTS row 36" */
export function describeImportSource(
  source: Pick<ImportSource, 'fileName' | 'sheet' | 'row'>
): string {
  const place = source.sheet
    ? source.row
      ? `${source.sheet} row ${source.row}`
      : source.sheet
    : null;
  return place ? `${source.fileName} · ${place}` : source.fileName;
}

/**
 * A payment loaded from a migration workbook. It has no QuickBooks transaction
 * to open, so it is shown with where it came from instead.
 */
export function isImportedPayment(payment: { source?: PaymentSource | null }): boolean {
  return payment.source === 'IMPORT';
}

/** A payment recorded by hand in Monthly Bills, with no QuickBooks transaction. */
export function isManualPayment(payment: { source?: PaymentSource | null }): boolean {
  return payment.source === 'MANUAL';
}

/** An imported value as a person reads it: money as dollars, a date as the day. */
export function formatImportedValue(field: ImportedField): string {
  const { value, kind } = field;
  if (value === null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  switch (kind) {
    case 'money':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'number':
      return typeof value === 'number' && Number.isInteger(value)
        ? String(value)
        : formatDecimal(value, 3).replace(/\.?0+$/, '');
    case 'date':
      // A date column can hold a note ("TBD"): that shows as written.
      return formatDateOnly(String(value), undefined, String(value));
    default:
      return String(value);
  }
}

/** A link worth rendering as one: http(s) only, never `javascript:` or the like. */
export function importedLinkHref(field: ImportedField): string | null {
  if (field.kind !== 'link' || typeof field.value !== 'string') return null;
  try {
    const url = new URL(field.value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}
