import { useEffect, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { AlertCircle, ChevronDown, FileText } from 'lucide-react';
import { Controller, useFieldArray, useForm, useWatch, type Control } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

import { LineItems } from '@/app/components/line-items';
import { Button } from '@/app/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/app/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Textarea } from '@/app/components/ui/textarea';
import { formatCurrency } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { useCostCodesQuery } from '@/modules/catalog/hooks';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/project/constants/purchase-order';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import { useGeneratePOMutation, useRFQDetailQuery } from '@/modules/project/hooks/rfq';
import {
  createPOFromRFQInputSchema,
  type CreatePOFromRFQInput,
  type RFQDetail,
} from '@/modules/project/schemas/rfq';

interface RFQCreatePOPreviewDialogProps {
  open: boolean;
  rfqId: string | null;
  projectId: string;
  onOpenChange: (open: boolean) => void;
}

type POFromRFQLineItemInput = CreatePOFromRFQInput['lineItems'][number];

const fieldLabelClassName = 'text-xs font-semibold uppercase tracking-normal';

const defaultLineItem: POFromRFQLineItemInput = {
  description: '',
  quantity: 1,
  unitId: '',
  unitPrice: 0,
  costCodeId: '',
};

const emptyDefaultValues: CreatePOFromRFQInput = {
  description: '',
  leadTime: '',
  expectedDate: '',
  shipToAddress: '',
  address: '',
  markupAmount: 0,
  taxPercent: 0,
  paymentTerms: 'NET_30',
  retainagePercent: 10,
  notes: '',
  lineItems: [],
};

export function RFQCreatePOPreviewDialog({
  open,
  rfqId,
  projectId,
  onOpenChange,
}: RFQCreatePOPreviewDialogProps) {
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const { data: rfq, isLoading, isError, refetch } = useRFQDetailQuery(open ? (rfqId ?? '') : '');
  const { data: costCodesData, isLoading: isLoadingCostCodes } = useCostCodesQuery();
  const { data: unitsData, isLoading: isLoadingUnits } = useLookupsQuery('UNIT');
  const generatePOMutation = useGeneratePOMutation();

  const form = useForm<CreatePOFromRFQInput>({
    resolver: zodResolver(createPOFromRFQInputSchema),
    defaultValues: emptyDefaultValues,
  });
  const { control, formState, handleSubmit, reset } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  useEffect(() => {
    if (!open || !rfq) return;
    reset(buildDefaultPOFromRFQValues(rfq));
  }, [open, reset, rfq]);

  const costCodeOptions = useMemo(
    () =>
      (costCodesData?.data ?? []).map((costCode) => ({
        value: costCode.id,
        label: `${costCode.code} - ${costCode.name}`,
      })),
    [costCodesData?.data]
  );
  const unitOptions = useMemo(
    () =>
      (unitsData ?? []).map((unit) => ({
        value: unit.id,
        label: unit.label ?? unit.name ?? unit.id,
      })),
    [unitsData]
  );

  const existingPO = useMemo(() => getExistingPurchaseOrder(rfq), [rfq]);
  const watchedLineItems = useWatch({ control, name: 'lineItems' }) ?? [];
  const subtotal = watchedLineItems.reduce(
    (sum, item) => sum + (item.quantity ?? 0) * (item.unitPrice ?? 0),
    0
  );
  const markupAmount = useWatch({ control, name: 'markupAmount' }) ?? 0;
  const taxPercent = useWatch({ control, name: 'taxPercent' }) ?? 0;
  const taxAmount = (subtotal * taxPercent) / 100;
  const total = subtotal + markupAmount + taxAmount;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setMoreDetailsOpen(false);
      reset(emptyDefaultValues);
    }
    onOpenChange(nextOpen);
  };

  const handleCreate = (formData: CreatePOFromRFQInput) => {
    if (!rfq) return;

    generatePOMutation.mutate(
      { rfqId: rfq.id, data: cleanPOFromRFQInput(formData) },
      {
        onSuccess: () => handleOpenChange(false),
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-6xl overflow-hidden">
        <form
          className="min-h-0 flex-1 overflow-hidden"
          onSubmit={(event) =>
            void handleSubmit(handleCreate, () =>
              toast.error('Please fix the highlighted purchase order fields.')
            )(event)
          }
        >
          <div className="flex max-h-[calc(90dvh-3rem)] min-h-0 flex-col">
            <DialogHeader>
              <DialogTitle>Create PO from RFQ</DialogTitle>
              <DialogDescription>
                Review the awarded RFQ, adjust PO details, and confirm line items.
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
                      <p className="text-sm font-medium text-foreground">
                        Unable to load RFQ preview.
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void refetch()}
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                </div>
              ) : rfq ? (
                <>
                  <RFQPreviewSummary rfq={rfq} subtotal={subtotal} total={total} />

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

                  <POFinancialFields control={control} />

                  <Collapsible open={moreDetailsOpen} onOpenChange={setMoreDetailsOpen}>
                    <div className="rounded-md border border-border">
                      <CollapsibleTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          className="flex h-auto w-full justify-between rounded-none px-4 py-3"
                        >
                          <span className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
                            More PO Details
                          </span>
                          <ChevronDown
                            className={cn(
                              'size-4 transition-transform',
                              moreDetailsOpen && 'rotate-180'
                            )}
                          />
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <Separator />
                        <PODetailFields control={control} />
                      </CollapsibleContent>
                    </div>
                  </Collapsible>

                  <LineItems
                    control={control}
                    fieldPrefix="lineItems"
                    fields={fields}
                    append={append}
                    remove={remove}
                    costCodeOptions={costCodeOptions}
                    fieldNames={{ unit: 'unitId' }}
                    unitOptions={unitOptions}
                    allowCustomUnit={false}
                    defaultItem={defaultLineItem}
                    rootError={formState.errors.lineItems?.root}
                    title="PO Line Items"
                    subtitle="Confirm quantities, units, prices, and cost codes."
                    addLabel="Add PO Line"
                    showLineTotal
                  >
                    <Separator className="mt-4" />
                    <div className="flex justify-end pt-4">
                      <div className="w-full max-w-sm space-y-3">
                        <AmountRow label="Subtotal" value={subtotal} />
                        <AmountRow label="Markup" value={markupAmount} />
                        <AmountRow label={`Tax (${taxPercent}%)`} value={taxAmount} />
                        <Separator />
                        <AmountRow label="Total" value={total} emphasis />
                      </div>
                    </div>
                  </LineItems>
                </>
              ) : null}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  !rfq || isLoadingCostCodes || isLoadingUnits || generatePOMutation.isPending
                }
              >
                {generatePOMutation.isPending ? 'Creating...' : 'Create PO'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function POFinancialFields({ control }: { control: Control<CreatePOFromRFQInput> }) {
  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-normal text-muted-foreground">
          Financial
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Controller
          name="paymentTerms"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel className={fieldLabelClassName}>Payment Terms</FieldLabel>
              <Select value={field.value ?? 'NET_30'} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TERMS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
        />
        <Controller
          name="taxPercent"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className={fieldLabelClassName}>Tax %</FieldLabel>
              <InputWrapper>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.001}
                  value={field.value ?? 0}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                  aria-invalid={fieldState.invalid}
                />
              </InputWrapper>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="markupAmount"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className={fieldLabelClassName}>Markup</FieldLabel>
              <InputWrapper>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={field.value ?? 0}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                  aria-invalid={fieldState.invalid}
                />
              </InputWrapper>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="retainagePercent"
          control={control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel className={fieldLabelClassName}>Retainage %</FieldLabel>
              <InputWrapper>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={field.value ?? 10}
                  onChange={(event) => field.onChange(Number(event.target.value))}
                  aria-invalid={fieldState.invalid}
                />
              </InputWrapper>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>
    </div>
  );
}

function PODetailFields({ control }: { control: Control<CreatePOFromRFQInput> }) {
  return (
    <div className="space-y-4 p-4">
      <Controller
        name="description"
        control={control}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel className={fieldLabelClassName}>Description</FieldLabel>
            <Textarea
              {...field}
              value={field.value ?? ''}
              placeholder="Describe the purchase order..."
              rows={3}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          name="expectedDate"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel className={fieldLabelClassName}>Expected Delivery Date</FieldLabel>
              <InputWrapper>
                <Input type="date" {...field} value={field.value ?? ''} />
              </InputWrapper>
            </Field>
          )}
        />
        <Controller
          name="leadTime"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel className={fieldLabelClassName}>Lead Time (Days)</FieldLabel>
              <InputWrapper>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  placeholder="e.g. 30"
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(event.target.value.replace(/[^0-9]/g, ''))}
                  onKeyDown={(event) => {
                    if (['e', 'E', '+', '-', '.'].includes(event.key)) {
                      event.preventDefault();
                    }
                  }}
                  autoComplete="off"
                />
              </InputWrapper>
            </Field>
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Controller
          name="address"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel className={fieldLabelClassName}>Address</FieldLabel>
              <InputWrapper>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  placeholder="Vendor or billing address"
                  autoComplete="off"
                />
              </InputWrapper>
            </Field>
          )}
        />
        <Controller
          name="shipToAddress"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel className={fieldLabelClassName}>Ship To Address</FieldLabel>
              <InputWrapper>
                <Input
                  {...field}
                  value={field.value ?? ''}
                  placeholder="123 Job Site Rd, City ST 00000"
                  autoComplete="off"
                />
              </InputWrapper>
            </Field>
          )}
        />
      </div>

      <Controller
        name="notes"
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel className={fieldLabelClassName}>Internal Notes</FieldLabel>
            <Textarea
              {...field}
              value={field.value ?? ''}
              placeholder="Internal notes..."
              rows={2}
            />
          </Field>
        )}
      />
    </div>
  );
}

function RFQPreviewSummary({
  rfq,
  subtotal,
  total,
}: {
  rfq: RFQDetail;
  subtotal: number;
  total: number;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <SummaryItem label="RFQ" value={rfq.rfqNumber ?? rfq.title} />
      <SummaryItem label="Project" value={rfq.project?.name ?? '-'} />
      <SummaryItem label="Awarded Vendor" value={rfq.awardedVendor?.name ?? '-'} />
      <SummaryItem label="Awarded Amount" value={formatCurrency(rfq.awardedAmount ?? 0)} />
      <SummaryItem label="PO Total" value={formatCurrency(total || subtotal)} />
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
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function AmountRow({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: number;
  emphasis?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between text-sm',
        emphasis && 'font-semibold text-foreground'
      )}
    >
      <span className={cn(!emphasis && 'text-muted-foreground')}>{label}</span>
      <span className="tabular-nums">{formatCurrency(value)}</span>
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

function buildDefaultPOFromRFQValues(rfq: RFQDetail): CreatePOFromRFQInput {
  return {
    ...emptyDefaultValues,
    description: rfq.description ?? rfq.title,
    leadTime: getAwardedQuoteLeadTime(rfq),
    paymentTerms: getAwardedVendorPaymentTerms(rfq) ?? 'NET_30',
    lineItems: buildDefaultLineItems(rfq),
  };
}

function buildDefaultLineItems(rfq: RFQDetail): POFromRFQLineItemInput[] {
  return (rfq.deliverables ?? []).map((deliverable, index) => {
    const quantity = deliverable.quantity && deliverable.quantity > 0 ? deliverable.quantity : 1;

    return {
      rfqDeliverableId: deliverable.id,
      description: deliverable.name ?? deliverable.description ?? `Item ${index + 1}`,
      quantity,
      unitId: getDeliverableUnitId(deliverable),
      unitPrice: 0,
      costCodeId: deliverable.costCodeId ?? '',
    };
  });
}

function cleanPOFromRFQInput(formData: CreatePOFromRFQInput): CreatePOFromRFQInput {
  return {
    ...formData,
    description: formData.description || undefined,
    leadTime: formData.leadTime || undefined,
    expectedDate: formData.expectedDate || undefined,
    shipToAddress: formData.shipToAddress || undefined,
    address: formData.address || undefined,
    notes: formData.notes || undefined,
    markupAmount: formData.markupAmount ?? undefined,
    taxPercent: formData.taxPercent ?? undefined,
    retainagePercent: formData.retainagePercent ?? undefined,
    lineItems: formData.lineItems.map((lineItem) => ({
      ...lineItem,
      rfqDeliverableId: lineItem.rfqDeliverableId || undefined,
      notes: lineItem.notes || undefined,
    })),
  };
}

function getDeliverableUnitId(deliverable: RFQDetail['deliverables'][number]) {
  if (deliverable.unitId) return deliverable.unitId;
  if (typeof deliverable.unit === 'object' && deliverable.unit?.id) return deliverable.unit.id;
  return '';
}

function getAwardedQuoteLeadTime(rfq: RFQDetail) {
  const quote = rfq.quotes.find((item) => item.isAwarded || item.vendorId === rfq.awardedVendorId);
  const rawLeadTime = (quote as { leadTime?: unknown } | undefined)?.leadTime ?? quote?.leadTimeDays;
  return rawLeadTime == null ? '' : String(rawLeadTime);
}

function getAwardedVendorPaymentTerms(rfq: RFQDetail): CreatePOFromRFQInput['paymentTerms'] {
  const vendor = rfq.awardedVendor as {
    paymentTerms?: CreatePOFromRFQInput['paymentTerms'] | null;
  } | null;
  return vendor?.paymentTerms ?? undefined;
}
