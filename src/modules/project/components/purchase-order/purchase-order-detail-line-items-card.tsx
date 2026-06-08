import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';
import { formatCurrency, formatDecimal } from '@/app/lib/helpers';
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
        <CardTitle className="text-xs font-semibold tracking-normal text-muted-foreground">
          Line Items ({lineItemCount})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {lineItemCount > 0 ? (
          <>
            <div className="space-y-3 md:hidden">
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

            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-max text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="w-8 pb-2 pr-3 text-xs font-semibold tracking-normal text-muted-foreground">
                      #
                    </th>
                    <th className="pb-2 pr-3 text-xs font-semibold tracking-normal text-muted-foreground">
                      Description
                    </th>
                    <th className="w-40 pb-2 pr-3 text-xs font-semibold tracking-normal text-muted-foreground">
                      Cost Code
                    </th>
                    <th className="pb-2 pr-3 text-right text-xs font-semibold tracking-normal text-muted-foreground">
                      Qty
                    </th>
                    <th className="pb-2 pr-3 text-xs font-semibold tracking-normal text-muted-foreground">
                      Unit
                    </th>
                    <th className="pb-2 pr-3 text-right text-xs font-semibold tracking-normal text-muted-foreground">
                      Unit Price
                    </th>
                    <th className="pb-2 text-right text-xs font-semibold tracking-normal text-muted-foreground">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((lineItem) => (
                    <tr key={lineItem.id} className="border-b last:border-0">
                      <td className="py-2.5 pr-3 text-muted-foreground">{lineItem.lineNumber}</td>
                      <td className="py-2.5 pr-3">
                        <div className="font-medium">{lineItem.description}</div>
                        {lineItem.notes && (
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            {lineItem.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-xs text-muted-foreground">
                        {lineItem.costCodeId ? (costCodeMap.get(lineItem.costCodeId) ?? '-') : '-'}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {formatDecimal(lineItem.quantity)}
                      </td>
                      <td className="py-2.5 pr-3">{lineItem.unit}</td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {formatCurrency(parseFloat(lineItem.unitPrice ?? '0'))}
                      </td>
                      <td className="py-2.5 text-right font-medium tabular-nums">
                        {formatCurrency(calculateRoundedLineAmount(lineItem))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6} className="pt-3 text-right text-xs text-muted-foreground">
                      Subtotal
                    </td>
                    <td className="pt-3 text-right text-sm tabular-nums">
                      {formatCurrency(subtotal)}
                    </td>
                  </tr>
                  {discount !== 0 && (
                    <tr>
                      <td colSpan={6} className="pt-1 text-right text-xs text-muted-foreground">
                        Negotiated Discount
                      </td>
                      <td className="pt-1 text-right text-sm tabular-nums">
                        -{formatCurrency(discount)}
                      </td>
                    </tr>
                  )}
                  {shippingHandling !== 0 && (
                    <tr>
                      <td colSpan={6} className="pt-1 text-right text-xs text-muted-foreground">
                        Shipping and Handling Fee
                      </td>
                      <td className="pt-1 text-right text-sm tabular-nums">
                        {formatCurrency(shippingHandling)}
                      </td>
                    </tr>
                  )}
                  {taxAmount !== 0 && (
                    <tr>
                      <td colSpan={6} className="pt-1 text-right text-xs text-muted-foreground">
                        {formatPurchaseOrderTaxLabel(taxPercent)}
                      </td>
                      <td className="pt-1 text-right text-sm tabular-nums">
                        {formatCurrency(taxAmount)}
                      </td>
                    </tr>
                  )}
                  <tr className="border-t">
                    <td
                      colSpan={6}
                      className="pt-2 text-right text-xs font-semibold tracking-normal text-muted-foreground"
                    >
                      Total
                    </td>
                    <td className="pt-2 text-right font-semibold tabular-nums">
                      {formatCurrency(total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
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
