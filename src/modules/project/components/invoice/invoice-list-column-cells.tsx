import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import type { InvoiceListItem } from '@/modules/project/schemas/invoice';
import { MoreHorizontal } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';

function formatOptionalDate(value: string | null | undefined) {
  return value ? formatDate(value) : '-';
}

function formatOptionalCurrency(value: string | number | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? formatCurrency(numeric) : '-';
}

function getPaymentLabel(invoice: InvoiceListItem) {
  if (invoice.isPaid) return 'Paid';
  if (invoice.isDisputed) return 'Disputed';
  return 'Unpaid';
}

export function InvoiceNumberCell({ invoice }: { invoice: InvoiceListItem }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <Link
        to={`${invoice.id}`}
        className="text-sm font-semibold text-foreground hover:text-primary"
      >
        {invoice.invoiceNumber ?? '-'}
      </Link>
      {invoice.notes && (
        <span className="line-clamp-1 text-2sm text-muted-foreground">{invoice.notes}</span>
      )}
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
      <Link
        to={`/app/project/${projectId}/purchase-orders/${invoice.purchaseOrder.id}`}
        className="text-sm font-medium text-foreground hover:text-primary"
      >
        {invoice.purchaseOrder.poNumber}
      </Link>
    );
  }

  return <span className="text-sm text-muted-foreground">{invoice.purchaseOrderId ?? '-'}</span>;
}

export function InvoiceDateCell({ invoice }: { invoice: InvoiceListItem }) {
  return (
    <span className="text-sm text-muted-foreground">{formatOptionalDate(invoice.invoiceDate)}</span>
  );
}

export function DueDateCell({ invoice }: { invoice: InvoiceListItem }) {
  const isPastDue = !invoice.isPaid && !!invoice.dueDate && new Date(invoice.dueDate) < new Date();

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
      <span className="text-sm font-medium tabular-nums">
        {formatOptionalCurrency(grandTotal)}
      </span>
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
        <Badge variant={invoice.isPaid ? 'success' : 'warning'} appearance="outline" size="sm">
          {getPaymentLabel(invoice)}
        </Badge>
        {invoice.isDisputed && (
          <Badge variant="destructive" appearance="outline" size="sm">
            Disputed
          </Badge>
        )}
      </div>
      {invoice.paidDate && (
        <span className="text-2sm text-muted-foreground">Paid {formatDate(invoice.paidDate)}</span>
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
  const { projectId = '' } = useParams<{ projectId: string }>();
  const { data: project } = useProjectDetailQuery(projectId);
  const canEdit = project?.capabilities?.actions?.invoice?.update === true && !invoice.isPaid;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          mode="icon"
          size="sm"
          className="size-7"
          onClick={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
          <span className="sr-only">Actions</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem asChild>
          <Link to={`${invoice.id}`}>View</Link>
        </DropdownMenuItem>
        {canEdit && (
          <DropdownMenuItem asChild>
            <Link to={`${invoice.id}/edit`}>Edit</Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
