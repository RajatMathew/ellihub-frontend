import { Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Badge } from '@/app/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { ProjectInlineListLoading } from '@/modules/project/components/shared';
import type { InvoiceListItem } from '@/modules/project/schemas/invoice';

interface PurchaseOrderDetailLinkedInvoicesCardProps {
  projectId: string;
  invoices: InvoiceListItem[];
  isLoading: boolean;
  invoiceTotal: number;
}

export function PurchaseOrderDetailLinkedInvoicesCard({
  projectId,
  invoices,
  isLoading,
  invoiceTotal,
}: PurchaseOrderDetailLinkedInvoicesCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Linked Invoices ({invoices.length})
        </CardTitle>
        {invoiceTotal > 0 && (
          <span className="text-xs font-semibold text-muted-foreground">
            {formatCurrency(invoiceTotal)}
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <ProjectInlineListLoading rows={2} rowClassName="h-20" />
        ) : invoices.length > 0 ? (
          <div className="space-y-2">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                to={`/app/project/${projectId}/invoices/${invoice.id}`}
                className="block rounded-lg border p-3 transition-colors hover:bg-muted/40"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-medium">
                        {invoice.invoiceNumber ?? 'Invoice'}
                      </span>
                      {invoice.isDisputed && (
                        <Badge variant="destructive" appearance="light" size="sm">
                          Disputed
                        </Badge>
                      )}
                      <Badge
                        variant={invoice.isPaid ? 'success' : 'warning'}
                        appearance="light"
                        size="sm"
                      >
                        {invoice.isPaid ? 'Paid' : 'Unpaid'}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        Invoice: {invoice.invoiceDate ? formatDate(invoice.invoiceDate) : '-'}
                      </span>
                      <span>Due: {invoice.dueDate ? formatDate(invoice.dueDate) : '-'}</span>
                    </div>
                    {invoice.relatedSCOIds.length > 0 && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {invoice.relatedSCOIds.length} related SCO
                        {invoice.relatedSCOIds.length === 1 ? '' : 's'}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-left sm:text-right">
                    <div className="font-semibold tabular-nums">
                      {formatCurrency(invoice.totalAmount)}
                    </div>
                    {invoice.paidDate && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        Paid {formatDate(invoice.paidDate)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <Receipt className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">
              No invoices linked to this purchase order.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
