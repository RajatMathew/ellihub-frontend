import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useAccess } from '@/app/contexts/access-context';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { MonthlyBillDetails } from '@/modules/monthly-bills/components/monthly-bill-details';
import {
  getSubChangeOrderSubtotal,
  getSubChangeOrderTotalAmount,
  getSubChangeOrderTypeLabel,
} from '@/modules/project/components/sub-change-order';
import { ProjectInlineListLoading } from '@/modules/project/components/shared';
import { useInvoicesByPurchaseOrderQuery } from '@/modules/project/hooks/invoice';
import { useSCOsByPurchaseOrderQuery } from '@/modules/project/hooks/sub-change-order';
import type { InvoiceListItem } from '@/modules/project/schemas/invoice';
import type { SCOListItem } from '@/modules/project/schemas/sub-change-order';
import type { MonthlyBillItem } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { AlertCircle, ExternalLink, FileText, Link2, Receipt, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MonthlyBillExpandedDetailsProps {
  bill: MonthlyBillItem;
  projectId: string;
  toPay?: number;
  ready?: boolean;
}

export function MonthlyBillExpandedDetails({
  bill,
  projectId,
  toPay,
  ready,
}: MonthlyBillExpandedDetailsProps) {
  const { can } = useAccess();
  const canReadInvoices = can('invoice', 'read');
  const canReadSCOs = can('subChangeOrder', 'read');

  return (
    <Tabs defaultValue="summary" className="min-w-0">
      <TabsList variant="line" size="sm" className="max-w-full overflow-x-auto">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        {canReadInvoices && <TabsTrigger value="invoices">Invoices</TabsTrigger>}
        {canReadSCOs && <TabsTrigger value="scos">SCOs</TabsTrigger>}
      </TabsList>

      <TabsContent value="summary" className="min-w-0">
        <MonthlyBillDetails bill={bill} toPay={toPay} ready={ready} />
      </TabsContent>

      {canReadInvoices && (
        <TabsContent value="invoices" className="min-w-0">
          <MonthlyBillInvoicesTab poId={bill.purchaseOrder.id} projectId={projectId} />
        </TabsContent>
      )}

      {canReadSCOs && (
        <TabsContent value="scos" className="min-w-0">
          <MonthlyBillSCOsTab poId={bill.purchaseOrder.id} projectId={projectId} />
        </TabsContent>
      )}
    </Tabs>
  );
}

function MonthlyBillInvoicesTab({ poId, projectId }: { poId: string; projectId: string }) {
  const invoicesQuery = useInvoicesByPurchaseOrderQuery(poId);
  const invoices = invoicesQuery.data ?? [];
  const total = invoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount ?? 0), 0);

  if (invoicesQuery.isLoading) {
    return <ProjectInlineListLoading rows={2} rowClassName="h-18" />;
  }

  if (invoicesQuery.isError) {
    return (
      <MonthlyBillChildError
        title="Failed to load invoices"
        onRetry={() => void invoicesQuery.refetch()}
      />
    );
  }

  if (invoices.length === 0) {
    return (
      <MonthlyBillChildEmpty
        icon={Receipt}
        title="No invoices linked"
        description="Invoices linked to this purchase order will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      <MonthlyBillChildSummary
        label={`${invoices.length} invoice${invoices.length === 1 ? '' : 's'}`}
        value={formatCurrency(total)}
      />
      {invoices.map((invoice) => (
        <MonthlyBillInvoiceItem key={invoice.id} invoice={invoice} projectId={projectId} />
      ))}
    </div>
  );
}

function MonthlyBillInvoiceItem({
  invoice,
  projectId,
}: {
  invoice: InvoiceListItem;
  projectId: string;
}) {
  return (
    <div className="rounded-md border bg-background px-3 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <FileText className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {invoice.invoiceNumber ?? 'Invoice'}
            </span>
            {invoice.isDisputed && (
              <Badge variant="destructive" appearance="light" size="sm">
                Disputed
              </Badge>
            )}
            <Badge variant={invoice.isPaid ? 'success' : 'warning'} appearance="light" size="sm">
              {invoice.isPaid ? 'Paid' : 'Unpaid'}
            </Badge>
          </div>

          {invoice.externalInvoiceNumber && (
            <div className="mt-1 text-xs text-muted-foreground">
              External: {invoice.externalInvoiceNumber}
            </div>
          )}

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Invoice: {invoice.invoiceDate ? formatDate(invoice.invoiceDate) : '-'}</span>
            <span>Due: {invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</span>
            {invoice.relatedSCOIds.length > 0 && (
              <span>
                {invoice.relatedSCOIds.length} related SCO
                {invoice.relatedSCOIds.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
          <div className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(invoice.totalAmount)}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/app/project/${projectId}/invoices/${invoice.id}`}>
              <ExternalLink className="size-3.5" />
              View
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function MonthlyBillSCOsTab({ poId, projectId }: { poId: string; projectId: string }) {
  const scosQuery = useSCOsByPurchaseOrderQuery(poId);
  const scos = scosQuery.data ?? [];
  const approvedTotal = scos
    .filter((sco) => sco.status === 'APPROVED')
    .reduce((sum, sco) => sum + getSubChangeOrderTotalAmount(sco), 0);

  if (scosQuery.isLoading) {
    return <ProjectInlineListLoading rows={2} rowClassName="h-18" />;
  }

  if (scosQuery.isError) {
    return (
      <MonthlyBillChildError title="Failed to load SCOs" onRetry={() => void scosQuery.refetch()} />
    );
  }

  if (scos.length === 0) {
    return (
      <MonthlyBillChildEmpty
        icon={Link2}
        title="No SCOs linked"
        description="Sub change orders linked to this purchase order will appear here."
      />
    );
  }

  return (
    <div className="space-y-2">
      <MonthlyBillChildSummary
        label={`${scos.length} SCO${scos.length === 1 ? '' : 's'}`}
        value={`Approved ${formatCurrency(approvedTotal)}`}
      />
      {scos.map((sco) => (
        <MonthlyBillSCOItem key={sco.id} sco={sco} projectId={projectId} />
      ))}
    </div>
  );
}

function MonthlyBillSCOItem({ sco, projectId }: { sco: SCOListItem; projectId: string }) {
  const total = getSubChangeOrderTotalAmount(sco);
  const subtotal = getSubChangeOrderSubtotal(sco);

  return (
    <div className="rounded-md border bg-background px-3 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link2 className="size-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-foreground">
              {sco.scoNumber ?? sco.title ?? 'Sub Change Order'}
            </span>
            <Badge variant={sco.status === 'APPROVED' ? 'success' : 'primary'} appearance="light" size="sm">
              {sco.status}
            </Badge>
          </div>

          {sco.title && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{sco.title}</p>
          )}

          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{sco.date ? formatDate(sco.date) : '-'}</span>
            <span>{getSubChangeOrderTypeLabel(sco)}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
          <div className="text-left sm:text-right">
            <div className="text-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(total)}
            </div>
            {subtotal !== total && (
              <div className="mt-1 text-xs text-muted-foreground">
                Subtotal {formatCurrency(subtotal)}
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/app/project/${projectId}/sub-change-order/${sco.id}`}>
              <ExternalLink className="size-3.5" />
              View
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function MonthlyBillChildSummary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-dashed bg-muted/20 px-3 py-2 text-xs sm:flex-row sm:items-center sm:justify-between">
      <span className="font-medium text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function MonthlyBillChildEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Receipt;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed bg-background px-4 py-8 text-center">
      <Icon className="size-8 text-muted-foreground/40" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

function MonthlyBillChildError({
  title,
  onRetry,
}: {
  title: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-md border border-dashed bg-background px-4 py-8 text-center">
      <AlertCircle className="size-8 text-destructive/60" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">Something went wrong. Please try again.</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RefreshCcw className="size-3.5" />
        Retry
      </Button>
    </div>
  );
}
