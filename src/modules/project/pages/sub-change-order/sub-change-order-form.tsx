import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { Forbidden } from '@/app/components/error/forbidden';
import {
  FormFieldLabel,
  formFieldLabelClassName,
  formInvalidControlClassName,
} from '@/app/components/form-field-label';
import { FormContent, FormLayout } from '@/app/components/form-layout';
import { LineItems } from '@/app/components/line-items';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import {
  InfiniteSearchSelect,
  type InfiniteSearchSelectOption,
} from '@/app/components/ui/infinite-search-select';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import { useBreadcrumbLabel } from '@/app/hooks/use-breadcrumb-label';
import { useDebouncedValue } from '@/app/hooks/use-debounced-value';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { formatCurrency } from '@/app/lib/helpers';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import { filesApi } from '@/modules/files/api/files.api';
import { poApi } from '@/modules/project/api/purchase-order';
import {
  ProjectFormDocumentsCard,
  ProjectFormPageLoading,
  ProjectFormShell,
} from '@/modules/project/components/shared';
import { calculatePurchaseOrderTotals } from '@/modules/project/components/purchase-order/purchase-order-totals';
import { PurchaseOrderFormTotalsFooter } from '@/modules/project/components/purchase-order/purchase-order-form-totals-footer';
import { SCO_FORM_SECTIONS } from '@/modules/project/constants/sub-change-order';
import scoMockData from '@/modules/project/constants/sub-change-order/sub-change-order-create.mock.json';
import { useProjectCostCodesQuery, useProjectDetailQuery } from '@/modules/project/hooks';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import { usePODetailQuery } from '@/modules/project/hooks/purchase-order';
import {
  useAddSCOAttachmentMutation,
  useCreateSCOMutation,
  useSCODetailQuery,
  useUpdateSCOMutation,
} from '@/modules/project/hooks/sub-change-order';
import {
  resolveProjectEntityFolder,
  useProjectFolderQuery,
} from '@/modules/project/hooks/use-project-folder';
import type { POListItem } from '@/modules/project/schemas/purchase-order';
import {
  createSCOInputSchema,
  type CreateSCOInput,
  type SCOLineItemInput,
} from '@/modules/project/schemas/sub-change-order';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';

const defaultLineItem: SCOLineItemInput = {
  description: '',
  quantity: 1,
  unitId: '',
  unitPrice: 0,
  costCodeId: undefined,
  notes: '',
};

const scoFieldLabelClassName = formFieldLabelClassName;

const scoInvalidControlClassName = formInvalidControlClassName;

function toNumber(value: unknown) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toNonNegativeNumber(value: unknown) {
  return Math.max(0, toNumber(value));
}

export function SCOFormPage() {
  const { projectId = '', scoId } = useParams<{ projectId: string; scoId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isEdit = !!scoId;
  const sourcePurchaseOrderId = !isEdit ? (searchParams.get('purchaseOrderId') ?? '') : '';

  const { data: scoDetail, isLoading: isLoadingDetail } = useSCODetailQuery(scoId ?? '');
  const { data: sourcePurchaseOrder } = usePODetailQuery(sourcePurchaseOrderId);
  const { data: project, isLoading: isLoadingProject } = useProjectDetailQuery(projectId);
  useBreadcrumbLabel(
    projectId && scoId ? `/app/project/${projectId}/sub-change-order/${scoId}` : undefined,
    scoDetail?.scoNumber ?? undefined
  );

  const { data: costCodes = [] } = useProjectCostCodesQuery(projectId);
  const { data: changeTypes } = useSCOChangeTypesForForm();
  const { data: units } = useLookupsQuery('UNIT');
  const currentPurchaseOrderIsIssued = scoDetail?.purchaseOrder?.status === 'ISSUED';
  const sourcePurchaseOrderStatus =
    typeof sourcePurchaseOrder?.status === 'string'
      ? sourcePurchaseOrder.status
      : sourcePurchaseOrder?.status?.name;
  const sourcePurchaseOrderIsIssued = sourcePurchaseOrderStatus === 'ISSUED';
  const selectedPurchaseOrderOption =
    scoDetail?.purchaseOrder?.id && currentPurchaseOrderIsIssued
      ? {
          value: scoDetail.purchaseOrder.id,
          label: scoDetail.purchaseOrder.poNumber ?? scoDetail.purchaseOrder.id,
        }
      : sourcePurchaseOrder?.id && sourcePurchaseOrderIsIssued
        ? {
            value: sourcePurchaseOrder.id,
            label: sourcePurchaseOrder.poNumber ?? sourcePurchaseOrder.id,
            description: [
              sourcePurchaseOrder.vendor?.name,
              sourcePurchaseOrder.total
                ? formatCurrency(Number(sourcePurchaseOrder.total))
                : undefined,
            ]
              .filter(Boolean)
              .join(' - '),
          }
        : undefined;
  const purchaseOrderPicker = usePurchaseOrderOptions({
    projectId,
    selectedOption: selectedPurchaseOrderOption,
  });
  const { data: scoFolderId } = useProjectFolderQuery(projectId || undefined, 'sub change order');

  const createMutation = useCreateSCOMutation();
  const updateMutation = useUpdateSCOMutation();
  const addAttachmentMutation = useAddSCOAttachmentMutation();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeSection, setActiveSection] = useState<string>('sco-details');
  const [isSaving, setIsSaving] = useState(false);

  const costCodeOptions = costCodes.map((costCode) => ({
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
    negotiatedDiscount: 0,
    shippingHandlingFee: 0,
    taxPercent: 0,
    changeTypeId: '',
    lineItems: [defaultLineItem],
  };

  const { control, handleSubmit, reset, setValue, formState } = useForm<CreateSCOInput>({
    resolver: zodResolver(createSCOInputSchema),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  useEffect(() => {
    if (!isEdit || !scoDetail) return;

    reset({
      projectId: scoDetail.projectId ?? projectId,
      purchaseOrderId: currentPurchaseOrderIsIssued
        ? (scoDetail.purchaseOrderId ?? scoDetail.purchaseOrder?.id ?? '')
        : '',
      date: scoDetail.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      title: scoDetail.title ?? '',
      description: scoDetail.description ?? '',
      negotiatedDiscount: toNonNegativeNumber(scoDetail.negotiatedDiscount),
      shippingHandlingFee: toNonNegativeNumber(scoDetail.shippingHandlingFee),
      taxPercent: toNonNegativeNumber(scoDetail.taxPercent),
      changeTypeId: scoDetail.changeTypeId ?? scoDetail.changeType?.id ?? '',
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
  }, [currentPurchaseOrderIsIssued, isEdit, projectId, reset, scoDetail]);

  useEffect(() => {
    if (isEdit || !sourcePurchaseOrderIsIssued || !sourcePurchaseOrder?.id) return;

    setValue('purchaseOrderId', sourcePurchaseOrder.id, {
      shouldDirty: false,
      shouldTouch: false,
      shouldValidate: true,
    });
  }, [isEdit, setValue, sourcePurchaseOrder?.id, sourcePurchaseOrderIsIssued]);

  const watchedLineItems = useWatch({ control, name: 'lineItems' });
  const lineItemsForTotals = useMemo(() => watchedLineItems ?? [], [watchedLineItems]);
  const watchedNegotiatedDiscount = useWatch({ control, name: 'negotiatedDiscount' }) ?? 0;
  const watchedShippingHandlingFee = useWatch({ control, name: 'shippingHandlingFee' }) ?? 0;
  const watchedTaxPercent = useWatch({ control, name: 'taxPercent' }) ?? 0;
  const taxPercent = toNonNegativeNumber(watchedTaxPercent);
  const { subtotal, taxAmount, total } = calculatePurchaseOrderTotals({
    lineItems: lineItemsForTotals,
    negotiatedDiscount: watchedNegotiatedDiscount,
    shippingHandlingFee: watchedShippingHandlingFee,
    taxPercent,
  });
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
      } catch (error) {
        toast.error(getApiErrorMessage(error, `Failed to upload file: ${file.name}`));
      }
    }
  }

  async function resolveScoUploadFolderId(targetScoId: string): Promise<string | undefined> {
    try {
      return await resolveProjectEntityFolder(projectId, 'SUB_CHANGE_ORDER', targetScoId);
    } catch {
      return scoFolderId;
    }
  }

  const onSubmit = async (formData: CreateSCOInput) => {
    const cleaned: CreateSCOInput = {
      ...formData,
      projectId,
      purchaseOrderId: formData.purchaseOrderId,
      description: formData.description || undefined,
      negotiatedDiscount: toNonNegativeNumber(formData.negotiatedDiscount),
      shippingHandlingFee: toNonNegativeNumber(formData.shippingHandlingFee),
      taxPercent: toNonNegativeNumber(formData.taxPercent),
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
        const folderId = await resolveScoUploadFolderId(saved.id);
        if (folderId) {
          await uploadFilesAndAttach(saved.id, folderId, selectedFiles);
        } else {
          toast.error('SCO folder not found - files were not uploaded.');
        }
      }

      navigate(isEdit ? '..' : `../${saved.id}`, { relative: 'path' });
    } finally {
      setIsSaving(false);
    }
  };

  if ((isEdit && isLoadingDetail) || isLoadingProject) {
    return <ProjectFormPageLoading sections={SCO_FORM_SECTIONS.length} />;
  }

  const canSubmitSubChangeOrder = isEdit
    ? project?.capabilities?.actions?.subChangeOrder?.update === true
    : project?.capabilities?.actions?.subChangeOrder?.create === true;
  if (!canSubmitSubChangeOrder) return <Forbidden />;

  return (
    <ProjectFormShell
      onSubmit={(event) => void handleSubmit(onSubmit, onInvalidFormSubmit)(event)}
      title={isEdit ? `Edit ${scoDetail?.scoNumber ?? 'SCO'}` : 'New Sub Change Order'}
      submitLabel={isEdit ? 'Save Changes' : 'Create SCO'}
      isSubmitting={isSubmitting}
      sections={SCO_FORM_SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
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
                negotiatedDiscount: 0,
                shippingHandlingFee: 0,
                taxPercent: 0,
                changeTypeId: randomChangeType,
                lineItems: d.lineItems.map((item) => ({
                  description: item.description,
                  quantity: item.qty,
                  unitId: unitOptions[Math.floor(Math.random() * unitOptions.length)]?.value ?? '',
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
    >
      <FormLayout className="pt-4 pb-8 lg:pb-10">
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
                      <SCORequiredFieldLabel>Purchase Order</SCORequiredFieldLabel>
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
                        disabled={!projectId || isEdit}
                        placeholder="Select purchase order..."
                        searchPlaceholder="Search purchase orders..."
                        emptyMessage="No issued purchase orders found."
                        loadingMessage="Loading purchase orders..."
                        triggerClassName={
                          fieldState.invalid ? scoInvalidControlClassName : undefined
                        }
                        testId="sco-purchase-order-select"
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
                      <SCORequiredFieldLabel>Date</SCORequiredFieldLabel>
                      <InputWrapper
                        className={fieldState.invalid ? scoInvalidControlClassName : undefined}
                      >
                        <Input
                          type="date"
                          {...field}
                          aria-invalid={fieldState.invalid}
                          data-testid="sco-date-input"
                        />
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
                      <SCORequiredFieldLabel>Change Type</SCORequiredFieldLabel>
                      <SearchableSelect
                        options={changeTypeOptions}
                        value={field.value || null}
                        onValueChange={(value) => field.onChange(value ?? '')}
                        placeholder="Select change type..."
                        searchPlaceholder="Search change types..."
                        emptyMessage="No change types found."
                        className={fieldState.invalid ? scoInvalidControlClassName : undefined}
                        testId="sco-change-type-select"
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
                    <SCORequiredFieldLabel>Title</SCORequiredFieldLabel>
                    <InputWrapper
                      className={fieldState.invalid ? scoInvalidControlClassName : undefined}
                    >
                      <Input
                        {...field}
                        placeholder="e.g. Added electrical rough-in"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                        data-testid="sco-title-input"
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
                    <FieldLabel className={scoFieldLabelClassName}>Description</FieldLabel>
                    <Textarea
                      {...field}
                      placeholder="Describe the requested change..."
                      rows={3}
                      data-testid="sco-description-input"
                    />
                  </Field>
                )}
              />

            </CardContent>
          </Card>

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
            showLineTotal
          >
            <PurchaseOrderFormTotalsFooter
              control={control}
              subtotal={subtotal}
              taxPercent={taxPercent}
              taxAmount={taxAmount}
              total={total}
              negotiatedDiscountName="negotiatedDiscount"
              shippingHandlingFeeName="shippingHandlingFee"
              taxPercentName="taxPercent"
            />
          </LineItems>

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
    </ProjectFormShell>
  );
}

function useSCOChangeTypesForForm() {
  return useLookupsQuery('SCO_CHANGE_TYPE');
}

function SCORequiredFieldLabel({ children }: { children: ReactNode }) {
  return <FormFieldLabel required>{children}</FormFieldLabel>;
}

function formatPurchaseOrderOption(po: POListItem): InfiniteSearchSelectOption {
  const hasInactiveVendor = po.vendor?.status === 'INACTIVE';

  return {
    value: po.id,
    label: po.poNumber ?? po.id,
    description: [po.vendor?.name, po.total ? formatCurrency(Number(po.total)) : undefined]
      .filter(Boolean)
      .join(' - '),
    badge: hasInactiveVendor ? 'Inactive' : undefined,
    disabled: hasInactiveVendor,
  };
}

function canSelectPurchaseOrderForSCO(po: POListItem) {
  return po.status === 'ISSUED';
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
        status: 'ISSUED',
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
      query.data?.pages.flatMap((page) =>
        page.data.filter(canSelectPurchaseOrderForSCO).map(formatPurchaseOrderOption)
      ) ?? [];
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
