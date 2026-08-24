import { DetailTable } from '@/app/components/detail-table';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { formatCurrency, formatDecimal } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import {
  calculateRoundedLineAmount,
  formatPurchaseOrderTaxLabel,
} from '@/modules/project/components/purchase-order/purchase-order-totals';
import { InfoRow } from '@/modules/project/components/shared';
import type { PODetail } from '@/modules/project/schemas/purchase-order';
import { FileText } from 'lucide-react';

interface PurchaseOrderDetailLineItemsCardProps {
  lineItems: PODetail['lineItems'];
  costCodeMap: Map<string, string>;
  subtotal: number;
  negotiatedDiscount: string | null | undefined;
  shippingHandlingFee: string | number | null | undefined;
  taxAmount: number;
  taxPercent: string | null | undefined;
  total: number;
}

export function PurchaseOrderDetailLineItemsCard({
  lineItems,
  costCodeMap,
  subtotal,
  negotiatedDiscount,
  shippingHandlingFee,
  taxAmount,
  taxPercent,
  total,
}: PurchaseOrderDetailLineItemsCardProps) {
  const lineItemCount = lineItems.length;
  const discount = Number(negotiatedDiscount ?? 0);
  const shippingHandling = Number(shippingHandlingFee ?? 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Line Items ({lineItemCount})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lineItemCount > 0 ? (
          <>
            <div className="space-y-3 lg:hidden">
              {lineItems.map((lineItem) => (
                <div key={lineItem.id} className="rounded-lg border p-3">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold tracking-normal text-muted-foreground">
                        Line {lineItem.lineNumber}
                      </div>
                      <div className="mt-1 break-words text-sm font-semibold text-foreground">
                        {lineItem.description}
                      </div>
                      {lineItem.notes && (
                        <div className="mt-1 break-words text-xs text-muted-foreground">
                          {lineItem.notes}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                      {formatCurrency(calculateRoundedLineAmount(lineItem))}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Qty</div>
                      <div className="font-medium tabular-nums">
                        {formatDecimal(lineItem.quantity)}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Unit</div>
                      <div className="font-medium">{lineItem.unit ?? '-'}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Unit Price</div>
                      <div className="font-medium tabular-nums">
                        {formatCurrency(parseFloat(lineItem.unitPrice ?? '0'))}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Cost Code</div>
                      <div className="break-words font-medium">
                        {lineItem.costCodeId ? (costCodeMap.get(lineItem.costCodeId) ?? '-') : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <InfoRow label="Subtotal">{formatCurrency(subtotal)}</InfoRow>
                {discount !== 0 && (
                  <InfoRow label="Negotiated Discount">-{formatCurrency(discount)}</InfoRow>
                )}
                {shippingHandling !== 0 && (
                  <InfoRow label="Shipping and Handling Fee">
                    {formatCurrency(shippingHandling)}
                  </InfoRow>
                )}
                {taxAmount !== 0 && (
                  <InfoRow label={formatPurchaseOrderTaxLabel(taxPercent)}>
                    {formatCurrency(taxAmount)}
                  </InfoRow>
                )}
                <Separator className="my-2" />
                <InfoRow label="Total">
                  <span className="font-semibold">{formatCurrency(total)}</span>
                </InfoRow>
              </div>
            </div>

            <DetailTable
              ariaLabel="Line items"
              className="hidden lg:block"
              columns={[
                { key: 'lineNumber', header: '#', width: 'w-8' },
                { key: 'description', header: 'Description' },
                { key: 'costCode', header: 'Cost Code', width: 'w-40' },
                { align: 'end', key: 'quantity', header: 'Qty' },
                { key: 'unit', header: 'Unit' },
                { align: 'end', key: 'unitPrice', header: 'Unit Price' },
                { align: 'end', key: 'amount', header: 'Amount' },
              ]}
              rows={lineItems}
              getRowId={(lineItem) => lineItem.id}
              renderCell={(lineItem, key) => {
                switch (key) {
                  case 'lineNumber':
                    return <span className="text-muted-foreground">{lineItem.lineNumber}</span>;
                  case 'description':
                    return (
                      <>
                        <div className="font-medium">{lineItem.description}</div>
                        {lineItem.notes && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {lineItem.notes}
                          </div>
                        )}
                      </>
                    );
                  case 'costCode':
                    return (
                      <span className="text-xs text-muted-foreground">
                        {lineItem.costCodeId ? (costCodeMap.get(lineItem.costCodeId) ?? '-') : '-'}
                      </span>
                    );
                  case 'quantity':
                    return <span className="tabular-nums">{formatDecimal(lineItem.quantity)}</span>;
                  case 'unit':
                    return lineItem.unit;
                  case 'unitPrice':
                    return (
                      <span className="tabular-nums">
                        {formatCurrency(parseFloat(lineItem.unitPrice ?? '0'))}
                      </span>
                    );
                  default:
                    return (
                      <span className="font-medium tabular-nums">
                        {formatCurrency(calculateRoundedLineAmount(lineItem))}
                      </span>
                    );
                }
              }}
              footer={
                <>
                  <PurchaseOrderTotalRow label="Subtotal" value={formatCurrency(subtotal)} />
                  {discount !== 0 && (
                    <PurchaseOrderTotalRow
                      label="Negotiated Discount"
                      value={`-${formatCurrency(discount)}`}
                    />
                  )}
                  {shippingHandling !== 0 && (
                    <PurchaseOrderTotalRow
                      label="Shipping and Handling Fee"
                      value={formatCurrency(shippingHandling)}
                    />
                  )}
                  {taxAmount !== 0 && (
                    <PurchaseOrderTotalRow
                      label={formatPurchaseOrderTaxLabel(taxPercent)}
                      value={formatCurrency(taxAmount)}
                    />
                  )}
                  <PurchaseOrderTotalRow emphasis label="Total" value={formatCurrency(total)} />
                </>
              }
            />
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No line items.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** A totals row under the line items. Spans every column but the last. */
function PurchaseOrderTotalRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <tr>
      <td
        colSpan={6}
        className={cn(
          'px-4 py-1.5 text-end text-xs text-muted-foreground',
          emphasis && 'font-semibold'
        )}
      >
        {label}
      </td>
      <td className={cn('px-4 py-1.5 text-end text-sm tabular-nums', emphasis && 'font-semibold')}>
        {value}
      </td>
    </tr>
  );
}
