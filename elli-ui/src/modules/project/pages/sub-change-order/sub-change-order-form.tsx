import { useEffect, useMemo, useState } from 'react';

import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { FormContent, FormLayout } from '@/app/components/form-layout';
import { FormSectionNav } from '@/app/components/form-section-nav';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import {
  InfiniteSearchSelect,
  type InfiniteSearchSelectOption,
} from '@/app/components/ui/infinite-search-select';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { Separator } from '@/app/components/ui/separator';
import { Switch, SwitchWrapper } from '@/app/components/ui/switch';
import { Textarea } from '@/app/components/ui/textarea';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { formatCurrency } from '@/app/lib/helpers';
import { useCostCodesQuery } from '@/modules/catalog/hooks';
import { filesApi } from '@/modules/files/api/files.api';
import { poApi } from '@/modules/project/api/purchase-order';
import {
  ProjectFormDocumentsCard,
  ProjectFormPageLoading,
  ProjectFormToolbar,
} from '@/modules/project/components/shared';
import { SCO_FORM_SECTIONS } from '@/modules/project/constants/sub-change-order';
import scoMockData from '@/modules/project/constants/sub-change-order/sub-change-order-create.mock.json';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import {
  useAddSCOAttachmentMutation,
  useCreateSCOMutation,
  useSCODetailQuery,
  useUpdateSCOMutation,
} from '@/modules/project/hooks/sub-change-order';
import { useProjectFolderQuery } from '@/modules/project/hooks/use-project-folder';
import type { POListItem } from '@/modules/project/schemas/purchase-order';
import {
  createSCOInputSchema,
  type CreateSCOInput,
  type SCOLineItemInput,
} from '@/modules/project/schemas/sub-change-order';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const defaultLineItem: SCOLineItemInput = {
  description: '',
  quantity: 1,
  unitId: '',
  unitPrice: 0,
  costCodeId: undefined,
  notes: '',
};

function toNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toNonNegativeNumber(value: unknown) {
  return Math.max(0, toNumber(value));
}

export function SCOFormPage() {
  const { projectId = '', scoId } = useParams<{ projectId: string; scoId: string }>();
  const navigate = useNavigate();
  const isEdit = !!scoId;

  const { data: scoDetail, isLoading: isLoadingDetail } = useSCODetailQuery(scoId ?? '');
  useBreadcrumbLabel(
    projectId && scoId ? `/app/project/${projectId}/sub-change-order/${scoId}` : undefined,
    scoDetail?.scoNumber ?? undefined
  );

  const { data: costCodesData } = useCostCodesQuery();
  const { data: changeTypes } = useSCOChangeTypesForForm();
  const { data: units } = useLookupsQuery('UNIT');
  const selectedPurchaseOrderOption = scoDetail?.purchaseOrder?.id
    ? {
        value: scoDetail.purchaseOrder.id,
        label: scoDetail.purchaseOrder.poNumber ?? scoDetail.purchaseOrder.id,
      }
    : undefined;
  const purchaseOrderPicker = usePurchaseOrderOptions({
    projectId,
    selectedOption: selectedPurchaseOrderOption,
  });
  const { data: primeCoFolderId } = useProjectFolderQuery(projectId || undefined, 'prime co');
  const { data: legacyScoFolderId } = useProjectFolderQuery(
    projectId || undefined,
    'purchase order co'
  );
  const uploadFolderId = primeCoFolderId ?? legacyScoFolderId;

  const createMutation = useCreateSCOMutation();
  const updateMutation = useUpdateSCOMutation();
  const addAttachmentMutation = useAddSCOAttachmentMutation();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeSection, setActiveSection] = useState<string>('sco-details');
  const [isSaving, setIsSaving] = useState(false);

  const costCodeOptions = (costCodesData?.data ?? []).map((costCode) => ({
    value: costCode.id,
    label: `${costCode.code} - ${costCode.name}`,
  }));
  const unitOptions = (units ?? []).map((unit) => ({
    value: unit.id,
    label: unit.label ?? unit.name ?? unit.id,
  }));
  const changeTypeOptions = (changeTypes ?? []).map((changeType) => ({
    value: changeType.id,
    label: String(changeType.label ?? changeType.name ?? changeType.code ?? changeType.id),
  }));

  const defaultValues: CreateSCOInput = {
    projectId,
    purchaseOrderId: '',
    date: new Date().toISOString().slice(0, 10),
    title: '',
    description: '',
    markupAmount: 0,
    scheduleImpactDays: 0,
    requestedBy: '',
    changeTypeId: '',
    impactsSchedule: false,
    lineItems: [defaultLineItem],
  };

  const { control, handleSubmit, reset, watch, formState } = useForm<CreateSCOInput>({
    resolver: zodResolver(createSCOInputSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  useEffect(() => {
    if (!isEdit || !scoDetail) return;

    reset({
      projectId: scoDetail.projectId ?? projectId,
      purchaseOrderId: scoDetail.purchaseOrderId ?? scoDetail.purchaseOrder?.id ?? '',
      date: scoDetail.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      title: scoDetail.title ?? '',
      description: scoDetail.description ?? '',
      markupAmount: toNonNegativeNumber(scoDetail.markupAmount),
      scheduleImpactDays: toNonNegativeNumber(scoDetail.scheduleImpactDays),
      requestedBy: scoDetail.requestedBy ?? '',
      changeTypeId: scoDetail.changeTypeId ?? scoDetail.changeType?.id ?? '',
      impactsSchedule: !!scoDetail.impactsSchedule,
      lineItems:
        scoDetail.lineItems.length > 0
          ? scoDetail.lineItems.map((item) => ({
              description: item.description,
              quantity: toNonNegativeNumber(item.quantity ?? item.qty),
              unitId: item.unitId ?? '',
              unitPrice: toNonNegativeNumber(item.unitPrice),
              costCodeId: item.costCodeId ?? undefined,
              notes: item.notes ?? undefined,
            }))
          : [defaultLineItem],
    });
  }, [isEdit, projectId, reset, scoDetail]);

  const watchedLineItems = watch('lineItems');
  const lineItemsForTotals = useMemo(() => watchedLineItems ?? [], [watchedLineItems]);
  const watchedMarkup = watch('markupAmount') ?? 0;
  const subtotal = useMemo(
    () =>
      lineItemsForTotals.reduce(
        (sum, item) => sum + toNumber(item.quantity) * toNumber(item.unitPrice),
        0
      ),
    [lineItemsForTotals]
  );
  const total = subtotal + toNumber(watchedMarkup);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  async function uploadFilesAndAttach(targetScoId: string, folderId: string, files: File[]) {
    for (const file of files) {
      try {
        const uploaded = await filesApi.uploadFile(file, {
          name: file.name,
          parentId: folderId,
          mimeType: file.type || undefined,
          size: file.size,
        });
        await addAttachmentMutation.mutateAsync({
          scoId: targetScoId,
          data: { documentId: uploaded.id },
        });
      } catch {
        toast.error(`Failed to upload file: ${file.name}`);
      }
    }
  }

  const onSubmit = async (formData: CreateSCOInput) => {
    const cleaned: CreateSCOInput = {
      ...formData,
      projectId,
      purchaseOrderId: formData.purchaseOrderId,
      description: formData.description || undefined,
      requestedBy: formData.requestedBy || undefined,
      markupAmount: toNonNegativeNumber(formData.markupAmount),
      scheduleImpactDays: formData.impactsSchedule
        ? Math.trunc(toNonNegativeNumber(formData.scheduleImpactDays))
        : 0,
      impactsSchedule: !!formData.impactsSchedule,
      lineItems: formData.lineItems.map((item) => ({
        description: item.description,
        quantity: toNonNegativeNumber(item.quantity),
        unitId: item.unitId,
        unitPrice: toNonNegativeNumber(item.unitPrice),
        costCodeId: item.costCodeId || undefined,
        notes: item.notes || undefined,
      })),
    };

    setIsSaving(true);
    try {
      const saved =
        isEdit && scoId
          ? await updateMutation.mutateAsync({ id: scoId, data: cleaned })
          : await createMutation.mutateAsync(cleaned);

      if (selectedFiles.length > 0) {
        if (uploadFolderId) {
          await uploadFilesAndAttach(saved.id, uploadFolderId, selectedFiles);
        } else {
          toast.error('SCO folder not found - files were not uploaded.');
        }
      }

      navigate(isEdit ? '..' : `../${saved.id}`, { relative: 'path' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isEdit && isLoadingDetail) {
    return <ProjectFormPageLoading sections={SCO_FORM_SECTIONS.length} />;
  }

  return (
    <form
      onSubmit={(event) =>
        void handleSubmit(onSubmit, () => {
          toast.error('Please fix the highlighted sub change order fields.');
        })(event)
      }
      className="container-fluid max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-7.5 lg:py-7.5"
    >
      <ProjectFormToolbar
        backLabel="Sub Change Order"
        title={isEdit ? `Edit ${scoDetail?.scoNumber ?? 'SCO'}` : 'New Sub Change Order'}
        description={
          isEdit ? 'Update the draft sub change order.' : 'Create a project sub change order.'
        }
        submitLabel={isEdit ? 'Save Changes' : 'Create SCO'}
        isSubmitting={isSubmitting}
        extraActions={
          !isEdit ? (
            <MockDataButton
              data={scoMockData}
              onLoad={(entries) => {
                const d = entries[Math.floor(Math.random() * entries.length)];
                const randomPO =
                  purchaseOrderPicker.options[
                    Math.floor(Math.random() * purchaseOrderPicker.options.length)
                  ]?.value ?? '';
                const randomChangeType =
                  changeTypeOptions[Math.floor(Math.random() * changeTypeOptions.length)]?.value ??
                  '';

                reset({
                  projectId,
                  purchaseOrderId: randomPO,
                  date: d.date,
                  title: d.title,
                  description: [d.reasonForChange, d.detailedScope].filter(Boolean).join('\n\n'),
                  markupAmount: 0,
                  scheduleImpactDays: ['HIGH', 'URGENT'].includes(d.priority) ? 3 : 0,
                  requestedBy: d.vendorContactName,
                  changeTypeId: randomChangeType,
                  impactsSchedule: ['HIGH', 'URGENT'].includes(d.priority),
                  lineItems: d.lineItems.map((item) => ({
                    description: item.description,
                    quantity: item.qty,
                    unitId:
                      unitOptions[Math.floor(Math.random() * unitOptions.length)]?.value ?? '',
                    unitPrice: Math.abs(toNumber(item.unitPrice)),
                    costCodeId:
                      costCodeOptions[Math.floor(Math.random() * costCodeOptions.length)]?.value ??
                      undefined,
                    notes: '',
                  })),
                });
              }}
            />
          ) : undefined
        }
      />

      <FormLayout>
        <FormSectionNav
          sections={SCO_FORM_SECTIONS}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <FormContent>
          <Card id="sco-details">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Sub Change Order Details</h2>
                <p className="text-sm text-muted-foreground">
                  Core information for the sub change order.
                </p>
              </div>
              <Separator />

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
                <Controller
                  name="purchaseOrderId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid} className="lg:col-span-3">
                      <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                        Purchase Order
                      </FieldLabel>
                      <InfiniteSearchSelect
                        options={purchaseOrderPicker.options}
                        value={field.value || null}
                        onValueChange={(value) => field.onChange(value ?? '')}
                        search={purchaseOrderPicker.search}
                        onSearchChange={purchaseOrderPicker.setSearch}
                        isLoading={purchaseOrderPicker.isLoading}
                        isFetchingNextPage={purchaseOrderPicker.isFetchingNextPage}
                        hasNextPage={purchaseOrderPicker.hasNextPage}
                        onFetchNextPage={() => purchaseOrderPicker.fetchNextPage()}
                        disabled={!projectId}
                        placeholder="Select purchase order..."
                        searchPlaceholder="Search purchase orders..."
                        emptyMessage="No purchase orders found."
                        loadingMessage="Loading purchase orders..."
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="date"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                        Date
                      </FieldLabel>
                      <InputWrapper>
                        <Input type="date" {...field} aria-invalid={fieldState.invalid} />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="changeTypeId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                        Change Type
                      </FieldLabel>
                      <SearchableSelect
                        options={changeTypeOptions}
                        value={field.value || null}
                        onValueChange={(value) => field.onChange(value ?? '')}
                        placeholder="Select change type..."
                        searchPlaceholder="Search change types..."
                        emptyMessage="No change types found."
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="title"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                      Title
                    </FieldLabel>
                    <InputWrapper>
                      <Input
                        {...field}
                        placeholder="e.g. Added electrical rough-in"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                      Description
                    </FieldLabel>
                    <Textarea {...field} placeholder="Describe the requested change..." rows={3} />
                  </Field>
                )}
              />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Controller
                  name="requestedBy"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                        Requested By
                      </FieldLabel>
                      <InputWrapper>
                        <Input {...field} placeholder="Requester name" autoComplete="off" />
                      </InputWrapper>
                    </Field>
                  )}
                />

                <Controller
                  name="markupAmount"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                        Markup Amount
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={field.value ?? 0}
                          onChange={(event) =>
                            field.onChange(toNonNegativeNumber(event.target.value))
                          }
                          aria-invalid={fieldState.invalid}
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="scheduleImpactDays"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                        Schedule Impact Days
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={field.value ?? 0}
                          onChange={(event) => field.onChange(Number(event.target.value))}
                          aria-invalid={fieldState.invalid}
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="impactsSchedule"
                control={control}
                render={({ field }) => (
                  <Field className="rounded-lg border p-3">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                          Impacts Schedule
                        </FieldLabel>
                        <p className="text-xs text-muted-foreground">
                          Mark this change as having schedule impact.
                        </p>
                      </div>
                      <SwitchWrapper className="shrink-0 self-start sm:self-center">
                        <Switch checked={!!field.value} onCheckedChange={field.onChange} />
                      </SwitchWrapper>
                    </div>
                  </Field>
                )}
              />
            </CardContent>
          </Card>

          <Card id="line-items">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Line Items</h2>
                <p className="text-sm text-muted-foreground">
                  Add one or more priced change order line items.
                </p>
              </div>
              <Separator />

              <div className="space-y-4 md:hidden">
                {fields.map((item, index) => (
                  <div key={item.id} className="rounded-lg border p-3">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold">Line Item {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        mode="icon"
                        aria-label={`Remove line item ${index + 1}`}
                        className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                        disabled={fields.length <= 1}
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <Controller
                        name={`lineItems.${index}.description`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid} className="sm:col-span-2">
                            <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                              Description
                            </FieldLabel>
                            <Input
                              {...field}
                              placeholder="Line item description"
                              aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        name={`lineItems.${index}.costCodeId`}
                        control={control}
                        render={({ field }) => (
                          <Field>
                            <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                              Cost Code
                            </FieldLabel>
                            <SearchableSelect
                              options={costCodeOptions}
                              value={field.value ?? null}
                              onValueChange={(value) => field.onChange(value ?? undefined)}
                              placeholder="Cost code..."
                              searchPlaceholder="Search..."
                              emptyMessage="None found."
                            />
                          </Field>
                        )}
                      />

                      <Controller
                        name={`lineItems.${index}.quantity`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                              Quantity
                            </FieldLabel>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={field.value ?? 0}
                              onChange={(event) =>
                                field.onChange(toNonNegativeNumber(event.target.value))
                              }
                              aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        name={`lineItems.${index}.unitId`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                              Unit
                            </FieldLabel>
                            <SearchableSelect
                              options={unitOptions}
                              value={field.value || null}
                              onValueChange={(value) => field.onChange(value ?? '')}
                              placeholder="Unit..."
                              searchPlaceholder="Search..."
                              emptyMessage="None found."
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <Controller
                        name={`lineItems.${index}.unitPrice`}
                        control={control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                              Unit Price
                            </FieldLabel>
                            <Input
                              type="number"
                              step="0.01"
                              value={field.value ?? 0}
                              onChange={(event) => field.onChange(Number(event.target.value))}
                              aria-invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      <div className="rounded-md bg-muted/30 p-3">
                        <span className="text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                          Amount
                        </span>
                        <div className="mt-1 text-sm font-semibold tabular-nums">
                          {formatCurrency(
                            toNumber(lineItemsForTotals[index]?.quantity) *
                              toNumber(lineItemsForTotals[index]?.unitPrice)
                          )}
                        </div>
                      </div>

                      <Controller
                        name={`lineItems.${index}.notes`}
                        control={control}
                        render={({ field }) => (
                          <Field className="sm:col-span-2">
                            <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                              Notes
                            </FieldLabel>
                            <Textarea {...field} placeholder="Line item notes..." rows={2} />
                          </Field>
                        )}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-max">
                  <thead>
                    <tr className="border-b">
                      <th className="w-8 pb-2 pr-3 text-left text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                        #
                      </th>
                      <th className="pb-2 pr-3 text-left text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                        Description
                      </th>
                      <th className="w-44 pb-2 pr-3 text-left text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                        Cost Code
                      </th>
                      <th className="w-24 pb-2 pr-3 text-right text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                        Quantity
                      </th>
                      <th className="w-28 pb-2 pr-3 text-left text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                        Unit
                      </th>
                      <th className="w-32 pb-2 pr-3 text-right text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                        Unit Price
                      </th>
                      <th className="w-44 pb-2 pr-3 text-left text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                        Notes
                      </th>
                      <th className="w-32 pb-2 text-right text-xs font-semibold tracking-normal text-muted-foreground uppercase">
                        Amount
                      </th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {fields.map((item, index) => (
                      <tr key={item.id} className="border-b last:border-0 align-top">
                        <td className="py-2.5 pr-3 pt-3.5 text-sm text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="py-2.5 pr-3">
                          <Controller
                            name={`lineItems.${index}.description`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <div>
                                <Input
                                  {...field}
                                  placeholder="Line item description"
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                              </div>
                            )}
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <Controller
                            name={`lineItems.${index}.costCodeId`}
                            control={control}
                            render={({ field }) => (
                              <SearchableSelect
                                options={costCodeOptions}
                                value={field.value ?? null}
                                onValueChange={(value) => field.onChange(value ?? undefined)}
                                placeholder="Cost code..."
                                searchPlaceholder="Search..."
                                emptyMessage="None found."
                              />
                            )}
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <Controller
                            name={`lineItems.${index}.quantity`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <div>
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={field.value ?? 0}
                                  onChange={(event) =>
                                    field.onChange(toNonNegativeNumber(event.target.value))
                                  }
                                  className="text-right"
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                              </div>
                            )}
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <Controller
                            name={`lineItems.${index}.unitId`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <div>
                                <SearchableSelect
                                  options={unitOptions}
                                  value={field.value || null}
                                  onValueChange={(value) => field.onChange(value ?? '')}
                                  placeholder="Unit..."
                                  searchPlaceholder="Search..."
                                  emptyMessage="None found."
                                />
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                              </div>
                            )}
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <Controller
                            name={`lineItems.${index}.unitPrice`}
                            control={control}
                            render={({ field, fieldState }) => (
                              <div>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={field.value ?? 0}
                                  onChange={(event) => field.onChange(Number(event.target.value))}
                                  className="text-right"
                                  aria-invalid={fieldState.invalid}
                                />
                                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                              </div>
                            )}
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          <Controller
                            name={`lineItems.${index}.notes`}
                            control={control}
                            render={({ field }) => (
                              <Input {...field} placeholder="Notes" autoComplete="off" />
                            )}
                          />
                        </td>
                        <td className="py-2.5 pt-3.5 text-right text-sm font-medium tabular-nums">
                          {formatCurrency(
                            toNumber(lineItemsForTotals[index]?.quantity) *
                              toNumber(lineItemsForTotals[index]?.unitPrice)
                          )}
                        </td>
                        <td className="py-2.5 pl-1 pt-3">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            mode="icon"
                            aria-label={`Remove line item ${index + 1}`}
                            className="size-8 text-muted-foreground hover:text-destructive"
                            disabled={fields.length <= 1}
                            onClick={() => remove(index)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {formState.errors.lineItems?.root && (
                <p className="text-sm text-destructive">
                  {formState.errors.lineItems.root.message}
                </p>
              )}

              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append(defaultLineItem)}
                >
                  <Plus className="size-4" />
                  Add Line Item
                </Button>
                <div className="w-full space-y-2 rounded-lg border bg-muted/20 p-3 text-sm sm:max-w-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Markup</span>
                    <span className="tabular-nums">{formatCurrency(toNumber(watchedMarkup))}</span>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between font-semibold">
                    <span>Total</span>
                    <span className="tabular-nums">{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <ProjectFormDocumentsCard
            selectedFiles={selectedFiles}
            existingDocuments={isEdit && scoDetail ? scoDetail.attachments : undefined}
            onAddFile={(file) => setSelectedFiles((prev) => [...prev, file])}
            onRemoveFile={(index) =>
              setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index))
            }
          />
        </FormContent>
      </FormLayout>
    </form>
  );
}

function useSCOChangeTypesForForm() {
  return useLookupsQuery('SCO_CHANGE_TYPE');
}

function formatPurchaseOrderOption(po: POListItem): InfiniteSearchSelectOption {
  return {
    value: po.id,
    label: po.poNumber ?? po.id,
    description: [po.vendor?.name, po.total ? formatCurrency(Number(po.total)) : undefined]
      .filter(Boolean)
      .join(' - '),
  };
}

function usePurchaseOrderOptions({
  projectId,
  selectedOption,
}: {
  projectId: string;
  selectedOption?: InfiniteSearchSelectOption;
}) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim(), 250);

  const query = useInfiniteQuery({
    queryKey: ['purchase-orders', 'picker', projectId, debouncedSearch],
    queryFn: ({ pageParam }) =>
      poApi.list({
        projectId,
        search: debouncedSearch || undefined,
        page: pageParam,
        size: 25,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasNextPage ? lastPage.pagination.currentPage + 1 : undefined,
    enabled: !!projectId,
  });

  const options = useMemo(() => {
    const next =
      query.data?.pages.flatMap((page) => page.data.map(formatPurchaseOrderOption)) ?? [];
    if (selectedOption && !next.some((option) => option.value === selectedOption.value)) {
      return [selectedOption, ...next];
    }
    return next;
  }, [query.data?.pages, selectedOption]);

  return {
    search,
    setSearch,
    options,
    isLoading: query.isLoading,
    isFetchingNextPage: query.isFetchingNextPage,
    hasNextPage: !!query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
  };
}
