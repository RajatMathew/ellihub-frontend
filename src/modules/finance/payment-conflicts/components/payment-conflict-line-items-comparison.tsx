import {
  BillableStatus,
  ConflictLineDetailsTable,
  TruncatedLineValue,
} from '@/modules/finance/payment-conflicts/components/payment-conflict-line-details-table';
import {
  CATEGORY_COLUMNS,
  ITEM_COLUMNS,
  LINE_COMPARISON_COPY,
  type LineComparisonKind,
  type LineTableRow,
} from '@/modules/finance/payment-conflicts/components/payment-conflict-line-details-table.constants';
import {
  formatConflictMoney,
  getReferenceLabel,
} from '@/modules/finance/payment-conflicts/lib/payment-conflicts.utils';
import type {
  PaymentConflict,
  PaymentLineDetail,
} from '@/modules/finance/payment-conflicts/schemas/payment-conflicts.schema';

const CATEGORY_DETAIL_TYPE = 'AccountBasedExpenseLineDetail';
const ITEM_DETAIL_TYPE = 'ItemBasedExpenseLineDetail';

interface PaymentConflictLineItemsComparisonProps {
  conflict: PaymentConflict;
  isActive: boolean;
  kind: LineComparisonKind;
}

export function PaymentConflictLineItemsComparison({
  conflict,
  isActive,
  kind,
}: PaymentConflictLineItemsComparisonProps) {
  const currency =
    conflict.latestQuickBooks?.currencyCode ?? conflict.baseline.currencyCode ?? 'USD';
  const copy = LINE_COMPARISON_COPY[kind];
  const elliLines = getLinesForKind(conflict.baseline, kind);
  const quickBooksLines = conflict.latestQuickBooks
    ? getLinesForKind(conflict.latestQuickBooks, kind)
    : [];

  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-foreground">{copy.heading}</h4>
      <div className="mt-3 space-y-4">
        <SourceLineDetails
          sourceLabel="Elli"
          conflict={conflict}
          lines={elliLines}
          kind={kind}
          detailLabel={copy.detailLabel}
          currency={currency}
          isSuperseded={isActive}
        />
        <SourceLineDetails
          sourceLabel="QuickBooks"
          conflict={conflict}
          lines={quickBooksLines}
          kind={kind}
          detailLabel={copy.detailLabel}
          currency={currency}
        />
      </div>
    </div>
  );
}

function SourceLineDetails({
  sourceLabel,
  conflict,
  lines,
  kind,
  detailLabel,
  currency,
  isSuperseded = false,
}: {
  sourceLabel: string;
  conflict: PaymentConflict;
  lines: PaymentLineDetail[];
  kind: LineComparisonKind;
  detailLabel: string;
  currency: string;
  isSuperseded?: boolean;
}) {
  const isCategory = kind === 'CATEGORY_DETAILS';
  const rows = isCategory
    ? buildCategoryRows(conflict, lines, currency)
    : buildItemRows(lines, currency);

  return (
    <section aria-label={`${sourceLabel} ${detailLabel}`}>
      <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {sourceLabel}
      </p>
      {rows.length > 0 ? (
        <ConflictLineDetailsTable
          ariaLabel={`${sourceLabel} ${detailLabel} table`}
          columns={isCategory ? CATEGORY_COLUMNS : ITEM_COLUMNS}
          rows={rows}
          isSuperseded={isSuperseded}
          minWidthClassName={isCategory ? 'min-w-2xl' : 'min-w-4xl'}
        />
      ) : (
        <div className="rounded-md border border-border bg-background px-3 py-4 text-center text-xs text-muted-foreground">
          No {detailLabel} available in {sourceLabel}.
        </div>
      )}
    </section>
  );
}

function buildCategoryRows(
  conflict: PaymentConflict,
  lines: PaymentLineDetail[],
  currency: string
): LineTableRow[] {
  return lines.map((line, index) => ({
    key: getLineKey(line, index),
    cells: [
      getCategoryLabel(conflict, line),
      <TruncatedLineValue value={line.description} />,
      formatConflictMoney(line.amount, currency),
      <BillableStatus status={line.billableStatus} />,
      <TruncatedLineValue value={line.customerName ?? line.customerId} />,
    ],
  }));
}

function buildItemRows(lines: PaymentLineDetail[], currency: string): LineTableRow[] {
  return lines.map((line, index) => ({
    key: getLineKey(line, index),
    cells: [
      line.itemName ?? line.itemId ?? 'Not set',
      <TruncatedLineValue value={line.description} />,
      formatQuantity(line.quantity),
      line.unitPrice ? formatConflictMoney(line.unitPrice, currency) : 'Not set',
      formatConflictMoney(line.amount, currency),
      <BillableStatus status={line.billableStatus} />,
      <TruncatedLineValue value={line.customerName ?? line.customerId} />,
    ],
  }));
}

function getLinesForKind(
  snapshot: PaymentConflict['baseline'],
  kind: LineComparisonKind
): PaymentLineDetail[] {
  return getDisplayLines(snapshot).filter((line) =>
    kind === 'CATEGORY_DETAILS'
      ? line.detailType === CATEGORY_DETAIL_TYPE ||
        (!line.detailType && Boolean(line.categoryAccountId) && !line.itemId)
      : line.detailType === ITEM_DETAIL_TYPE || (!line.detailType && Boolean(line.itemId))
  );
}

function getCategoryLabel(conflict: PaymentConflict, line: PaymentLineDetail) {
  return (
    line.categoryAccountName ??
    getReferenceLabel(conflict, line.categoryAccountId) ??
    line.categoryAccountId ??
    'Not set'
  );
}

function formatQuantity(value: string | null) {
  if (!value) return 'Not set';
  const quantity = Number(value);
  if (!Number.isFinite(quantity)) return value;
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(quantity);
}

function getLineKey(line: PaymentLineDetail, index: number) {
  return line.lineId ?? `${line.detailType ?? 'line'}-${index}`;
}

function getDisplayLines(snapshot: PaymentConflict['baseline']): PaymentLineDetail[] {
  if (snapshot.lineDetails.length > 0) return snapshot.lineDetails;

  return snapshot.lines.map((line) => ({
    ...line,
    detailType: CATEGORY_DETAIL_TYPE,
    categoryAccountName: null,
    itemId: null,
    itemName: null,
    quantity: null,
    unitPrice: null,
    description: null,
    billableStatus: null,
    customerId: null,
    customerName: null,
  }));
}
