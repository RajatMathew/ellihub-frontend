import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { Skeleton } from '@/app/components/ui/skeleton';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { useCostCodesQuery } from '@/modules/catalog/hooks';
import { useGeneratePOMutation, useRFQDetailQuery } from '@/modules/project/hooks/rfq';
import type { CreatePOFromRFQInput, RFQDetail } from '@/modules/project/schemas/rfq';
import { AlertCircle, FileText } from 'lucide-react';

interface RFQCreatePOPreviewDialogProps {
  open: boolean;
  rfqId: string | null;
  projectId: string;
  onOpenChange: (open: boolean) => void;
}

export function RFQCreatePOPreviewDialog({
  open,
  rfqId,
  projectId,
  onOpenChange,
}: RFQCreatePOPreviewDialogProps) {
  const [costCodeOverrides, setCostCodeOverrides] = useState<Record<string, string>>({});
  const { data: rfq, isLoading, isError, refetch } = useRFQDetailQuery(open ? (rfqId ?? '') : '');
  const { data: costCodesData, isLoading: isLoadingCostCodes } = useCostCodesQuery();
  const generatePOMutation = useGeneratePOMutation();

  const costCodeOptions = useMemo(
    () =>
      (costCodesData?.data ?? []).map((costCode) => ({
        value: costCode.id,
        label: `${costCode.code} - ${costCode.name}`,
      })),
    [costCodesData?.data]
  );

  const defaultCostCodeByDeliverable = useMemo(
    () =>
      Object.fromEntries(
        (rfq?.deliverables ?? []).map((deliverable) => [
          deliverable.id,
          deliverable.costCodeId ?? '',
        ])
      ),
    [rfq?.deliverables]
  );
  const costCodeByDeliverable = useMemo(
    () => ({ ...defaultCostCodeByDeliverable, ...costCodeOverrides }),
    [defaultCostCodeByDeliverable, costCodeOverrides]
  );

  const existingPO = useMemo(() => getExistingPurchaseOrder(rfq), [rfq]);
  const deliverables = rfq?.deliverables ?? [];
  const missingCostCodes = deliverables.filter(
    (deliverable) => !costCodeByDeliverable[deliverable.id]
  );
  const canCreate =
    !!rfq &&
    deliverables.length > 0 &&
    missingCostCodes.length === 0 &&
    !isLoadingCostCodes;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setCostCodeOverrides({});
    }
    onOpenChange(nextOpen);
  };

  const handleCreate = () => {
    if (!rfq || !canCreate) return;

    const data: CreatePOFromRFQInput = {
      lineItems: deliverables.map((deliverable) => ({
        rfqDeliverableId: deliverable.id,
        costCodeId: costCodeByDeliverable[deliverable.id],
      })),
    };

    generatePOMutation.mutate(
      { rfqId: rfq.id, data },
      {
        onSuccess: () => handleOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-4xl overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create PO from RFQ</DialogTitle>
          <DialogDescription>
            Review the awarded RFQ and assign cost codes before creating the purchase order.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
          {isLoading ? (
            <RFQCreatePOPreviewSkeleton />
          ) : isError ? (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Unable to load RFQ preview.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
                    Retry
                  </Button>
                </div>
              </div>
            </div>
          ) : rfq ? (
            <>
              <RFQPreviewSummary rfq={rfq} />

              {existingPO ? (
                <div className="rounded-md border border-primary/30 bg-primary/5 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        This awarded RFQ already has a purchase order.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        You can still create another PO from this RFQ.
                      </p>
                    </div>
                    <Button asChild variant="outline" size="sm">
                      <Link to={`/app/project/${projectId}/purchase-orders/${existingPO.id}`}>
                        <FileText className="size-4" />
                        View PO
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : null}

              <div>
                <div className="mb-3">
                  <h3 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
                    Line Items
                  </h3>
                </div>

                {deliverables.length > 0 ? (
                  <div className="space-y-2">
                    {deliverables.map((deliverable, index) => {
                      const missingCostCode = !costCodeByDeliverable[deliverable.id];

                      return (
                        <div
                          key={deliverable.id}
                          className="grid gap-3 rounded-md border border-border p-3 md:grid-cols-[2rem_minmax(0,1fr)_16rem]"
                        >
                          <div className="text-sm font-medium text-muted-foreground">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="break-words text-sm font-medium text-foreground">
                              {deliverable.name ?? deliverable.description ?? `Item ${index + 1}`}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {formatQuantity(deliverable.quantity)} {getDeliverableUnit(deliverable)}
                            </p>
                          </div>
                          <div>
                            <SearchableSelect
                              options={costCodeOptions}
                              value={costCodeByDeliverable[deliverable.id] || null}
                              onValueChange={(value) =>
                                setCostCodeOverrides((current) => ({
                                  ...current,
                                  [deliverable.id]: value ?? '',
                                }))
                              }
                              disabled={isLoadingCostCodes}
                              placeholder="Select cost code"
                              searchPlaceholder="Search cost codes..."
                              emptyMessage="No cost codes found."
                              className={cn(missingCostCode && 'border-destructive')}
                            />
                            {missingCostCode && (
                              <p className="mt-1 text-xs text-destructive">Cost code is required.</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                    RFQ has no deliverables.
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate || generatePOMutation.isPending}
          >
            {generatePOMutation.isPending ? 'Creating...' : 'Create PO'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RFQPreviewSummary({ rfq }: { rfq: RFQDetail }) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <SummaryItem label="RFQ" value={rfq.rfqNumber ?? rfq.title} />
      <SummaryItem label="Project" value={rfq.project?.name ?? '-'} />
      <SummaryItem label="Awarded Vendor" value={rfq.awardedVendor?.name ?? '-'} />
      <SummaryItem label="Awarded Amount" value={formatCurrency(rfq.awardedAmount ?? 0)} />
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

function RFQCreatePOPreviewSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
  );
}

function getExistingPurchaseOrder(rfq: RFQDetail | undefined) {
  if (!rfq?.purchaseOrders?.length) return null;

  return (
    rfq.purchaseOrders.find((po) => po.vendorId === rfq.awardedVendorId) ??
    rfq.purchaseOrders[0] ??
    null
  );
}

function getDeliverableUnit(deliverable: RFQDetail['deliverables'][number]) {
  if (typeof deliverable.unit === 'string') return deliverable.unit;
  return deliverable.unit?.label ?? '';
}

function formatQuantity(quantity: number | null | undefined) {
  if (quantity == null) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(quantity);
}
