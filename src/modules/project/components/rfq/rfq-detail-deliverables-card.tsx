import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { formatDecimal } from '@/app/lib/helpers';
import type { RFQDeliverable } from '@/modules/project/schemas/rfq';
import { FileText } from 'lucide-react';

interface RFQDetailDeliverablesCardProps {
  deliverables: RFQDeliverable[];
}

function getUnitLabel(unit: RFQDeliverable['unit']) {
  if (!unit) return '-';
  if (typeof unit === 'string') return unit;
  return unit.label;
}

function getDeliverableName(deliverable: RFQDeliverable) {
  return deliverable.name || deliverable.description || '-';
}

export function RFQDetailDeliverablesCard({ deliverables }: RFQDetailDeliverablesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
          Required Deliverables ({deliverables.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        {deliverables.length > 0 ? (
          <>
            <div className="space-y-3 md:hidden">
              {deliverables.map((deliverable, index) => (
                <div key={deliverable.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-muted-foreground">
                        #{deliverable.sequenceNumber ?? index + 1}
                      </div>
                      <div className="mt-1 break-words text-sm font-semibold">
                        {getDeliverableName(deliverable)}
                      </div>
                      {deliverable.specifications && (
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {deliverable.specifications}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="text-muted-foreground">Qty</div>
                      <div className="font-medium tabular-nums">
                        {deliverable.quantity != null ? formatDecimal(deliverable.quantity) : '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Unit</div>
                      <div className="font-medium">{getUnitLabel(deliverable.unit)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden overflow-x-auto md:block">
              <table className="min-w-max w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="w-8 pb-2 pr-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      #
                    </th>
                    <th className="pb-2 pr-3 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      Description
                    </th>
                    <th className="pb-2 pr-3 text-right text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      Qty
                    </th>
                    <th className="pb-2 text-xs font-semibold uppercase tracking-normal text-muted-foreground">
                      Unit
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deliverables.map((deliverable, index) => (
                    <tr key={deliverable.id} className="border-b border-muted/20 last:border-0">
                      <td className="w-8 py-2.5 pr-3 text-xs font-medium text-muted-foreground">
                        {deliverable.sequenceNumber ?? index + 1}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="text-sm font-medium">{getDeliverableName(deliverable)}</div>
                        {deliverable.specifications && (
                          <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                            {deliverable.specifications}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">
                        {deliverable.quantity != null ? formatDecimal(deliverable.quantity) : '-'}
                      </td>
                      <td className="py-2.5">{getUnitLabel(deliverable.unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileText className="size-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No deliverables.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
