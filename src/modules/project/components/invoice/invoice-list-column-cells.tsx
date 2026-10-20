import { RowActions } from '@/app/components/data-table';
import { ImportedBadge } from '@/app/components/import-source';
import { StatusBadge } from '@/app/components/status-badge';
import { Badge } from '@/app/components/ui/badge';
import {
  ListingIdentifierLink,
  ListingIdentifierText,
} from '@/app/components/ui/listing-identifier';
import { formatDateOnly, isBeforeBusinessToday } from '@/app/lib/dates';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import type { InvoiceListItem } from '@/modules/project/schemas/invoice';
import { useParams } from 'react-router-dom';

function formatOptionalDate(value: string | null | undefined) {
  return formatDateOnly(value, undefined, '-');
}

function formatOptionalCurrency(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? formatCurrency(numeric) : '-';
}

function getPaymentLabel(invoice: InvoiceListItem) {
  if (invoice.isPaid) return 'Paid';
  return 'Unpaid';
}

export function InvoiceNumberCell({ invoice }: { invoice: InvoiceListItem }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <ListingIdentifierLink
          to={`${invoice.id}`}
          value={invoice.invoiceNumber}
          className="text-sm"
        />
        <ImportedBadge source={invoice.importSource} />
      </div>
      {invoice.externalInvoiceNumber ? (
        <span className="line-clamp-1 text-2sm text-muted-foreground">
          External: {invoice.externalInvoiceNumber}
        </span>
      ) : invoice.notes ? (
        <span className="line-clamp-1 text-2sm text-muted-foreground">{invoice.notes}</span>
      ) : null}
    </div>
  );
}

export function VendorCell({ invoice }: { invoice: InvoiceListItem }) {
  return <span className="text-sm text-foreground">{invoice.vendor?.name ?? '-'}</span>;
}

export function PurchaseOrderCell({
  invoice,
  projectId,
}: {
  invoice: InvoiceListItem;
  projectId: string;
}) {
  if (invoice.purchaseOrder?.id) {
    return (
      <ListingIdentifierLink
        crossRecord
        to={`/app/project/${projectId}/purchase-orders/${invoice.purchaseOrder.id}`}
        value={invoice.purchaseOrder.poNumber}
        className="text-sm"
      />
    );
  }

  return <ListingIdentifierText value={invoice.purchaseOrderId} className="text-sm" />;
}

export function InvoiceDateCell({ invoice }: { invoice: InvoiceListItem }) {
  return (
    <span className="text-sm text-muted-foreground">{formatOptionalDate(invoice.invoiceDate)}</span>
  );
}

export function DueDateCell({ invoice }: { invoice: InvoiceListItem }) {
  // The API decides on the business calendar; the fallback applies the same rule.
  const isPastDue =
    invoice.isPastDue ?? (!invoice.isPaid && isBeforeBusinessToday(invoice.dueDate));

  return (
    <span
      className={cn(
        'text-sm',
        isPastDue ? 'font-medium text-destructive' : 'text-muted-foreground'
      )}
    >
      {formatOptionalDate(invoice.dueDate)}
    </span>
  );
}

export function TotalAmountCell({ invoice }: { invoice: InvoiceListItem }) {
  const invoiceAmount = Number(invoice.totalAmount ?? 0);
  const taxAmount = Number(invoice.taxAmount ?? 0);
  const grandTotal = invoiceAmount + taxAmount;

  return (
    <div className="flex flex-col gap-0.5 text-right">
      <span className="text-sm font-medium tabular-nums">{formatOptionalCurrency(grandTotal)}</span>
      <span className="text-2sm text-muted-foreground">
        Amount {formatOptionalCurrency(invoiceAmount)}
      </span>
      {taxAmount > 0 && (
        <span className="text-2sm text-muted-foreground">
          Tax {formatOptionalCurrency(taxAmount)}
        </span>
      )}
    </div>
  );
}

export function PaymentCell({ invoice }: { invoice: InvoiceListItem }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge
          label={getPaymentLabel(invoice)}
          status={invoice.isPaid ? 'PAID' : 'PENDING'}
        />
        {invoice.isDisputed && (
          <Badge variant="destructive" appearance="outline" size="sm">
            Disputed
          </Badge>
        )}
      </div>
      {invoice.paidDate && (
        <span className="text-2sm text-muted-foreground">
          Paid {formatDateOnly(invoice.paidDate)}
        </span>
      )}
    </div>
  );
}

export function CreatedAtCell({ invoice }: { invoice: InvoiceListItem }) {
  return (
    <span className="text-sm text-muted-foreground">{formatOptionalDate(invoice.createdAt)}</span>
  );
}

export function InvoiceActionsCell({ invoice }: { invoice: InvoiceListItem }) {
  // Stays a component because the available actions come from a query.
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: project } = useProjectDetailQuery(projectId);

  return (
    <RowActions
      label={invoice.invoiceNumber ?? 'invoice'}
      items={[
        { label: 'View', to: `${invoice.id}` },
        project?.capabilities?.actions?.invoice?.update === true && {
          label: 'Edit',
          to: `${invoice.id}/edit`,
        },
      ]}
    />
  );
}
