import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { Forbidden } from '@/app/components/error/forbidden';
import {
  FormFieldLabel,
  formFieldLabelClassName,
  formInvalidControlClassName,
} from '@/app/components/form-field-label';
import { FormContent, FormLayout } from '@/app/components/form-layout';
import { Card, CardContent } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { InfiniteMultiSearchSelect } from '@/app/components/ui/infinite-multi-search-select';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { NumberInput } from '@/app/components/ui/number-input';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { formatCurrency, formatPercent } from '@/app/lib/helpers';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import { cn } from '@/app/lib/utils';
import { useVendorPickerOptions, type VendorPickerOption } from '@/modules/directory/hooks';
import { filesApi } from '@/modules/files/api/files.api';
import {
  ProjectFormDocumentsCard,
  ProjectFormPageLoading,
  ProjectFormShell,
} from '@/modules/project/components/shared';
import { INVOICE_FORM_SECTIONS } from '@/modules/project/constants/invoice';
import {
  useProjectDetailQuery,
  usePurchaseOrderPickerOptions,
  useSCOPickerOptions,
  type ProjectMultiPickerOption,
  type ProjectPickerOption,
} from '@/modules/project/hooks';
import {
  useAddInvoiceAttachmentMutation,
  useCreateInvoiceMutation,
  useInvoiceDetailQuery,
  useUpdateInvoiceMutation,
} from '@/modules/project/hooks/invoice';
import {
  resolveProjectEntityFolder,
  useProjectFolderQuery,
} from '@/modules/project/hooks/use-project-folder';
import {
  createInvoiceInputSchema,
  type CreateInvoiceInput,
  type InvoiceRelatedSCO,
} from '@/modules/project/schemas/invoice';
import type { POListItem } from '@/modules/project/schemas/purchase-order';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const invoiceFieldLabelClassName = formFieldLabelClassName;

const invoiceInvalidControlClassName = formInvalidControlClassName;

function toDateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

function getInvoiceDetailPath(projectId: string, invoiceId: string) {
  return `/app/project/${projectId}/invoices/${invoiceId}`;
}

function calculateTaxAmount(totalAmount: number, taxRate: number) {
  return Math.round(((totalAmount || 0) * (taxRate || 0) * 100) / 100) / 100;
}

function getInvoiceGrandTotal(totalAmount: number, taxAmount: number) {
  return totalAmount + taxAmount;
}

function relatedSCOToOption(sco: InvoiceRelatedSCO): ProjectMultiPickerOption {
  return {
    value: sco.id,
    label: sco.scoNumber ?? sco.title ?? 'Related SCO',
    description: sco.title ?? sco.description ?? undefined,
    badge: sco.status ?? undefined,
  };
}

export function InvoiceFormPage() {
  const { projectId = '', invoiceId } = useParams<{ projectId: string; invoiceId: string }>();
  const navigate = useNavigate();
  const isEdit = !!invoiceId;

  const { data: invoiceDetail, isLoading: isLoadingDetail } = useInvoiceDetailQuery(
    invoiceId ?? ''
  );
  const { data: project, isLoading: isLoadingProject } = useProjectDetailQuery(projectId);
  const { data: invoiceFolderId } = useProjectFolderQuery(projectId || undefined, 'invoice');

  const [vendorSearch, setVendorSearch] = useState('');
  const [poSearch, setPoSearch] = useState('');
  const [scoSearch, setScoSearch] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeSection, setActiveSection] = useState<string>('invoice-details');
  const [isSaving, setIsSaving] = useState(false);
  const [pickedPurchaseOrder, setPickedPurchaseOrder] = useState<POListItem | null>(null);
  const [pickedPurchaseOrderOption, setPickedPurchaseOrderOption] =
    useState<ProjectPickerOption | null>(null);
  const [pickedSCOOptions, setPickedSCOOptions] = useState<ProjectMultiPickerOption[]>([]);

  const createMutation = useCreateInvoiceMutation();
  const updateMutation = useUpdateInvoiceMutation();
  const addAttachmentMutation = useAddInvoiceAttachmentMutation();

  const defaultValues: CreateInvoiceInput = {
    projectId,
    vendorId: '',
    purchaseOrderId: '',
    externalInvoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    totalAmount: 0,
    taxAmount: 0,
    taxRate: 0,
    notes: '',
    vendorCoupon: false,
    relatedSCOIds: [],
    attachments: [],
  };

  const editValues: CreateInvoiceInput | undefined =
    isEdit && invoiceDetail
      ? {
          projectId: invoiceDetail.projectId ?? invoiceDetail.project?.id ?? projectId,
          vendorId: invoiceDetail.vendorId ?? invoiceDetail.vendor?.id ?? '',
          purchaseOrderId: invoiceDetail.purchaseOrderId ?? invoiceDetail.purchaseOrder?.id ?? '',
          externalInvoiceNumber: invoiceDetail.externalInvoiceNumber ?? '',
          invoiceDate: toDateInput(invoiceDetail.invoiceDate),
          dueDate: toDateInput(invoiceDetail.dueDate),
          totalAmount: invoiceDetail.totalAmount ?? 0,
          taxAmount: invoiceDetail.taxAmount ?? 0,
          taxRate: invoiceDetail.taxRate ?? 0,
          notes: invoiceDetail.notes ?? '',
          vendorCoupon: invoiceDetail.vendorCoupon ?? false,
          relatedSCOIds: invoiceDetail.relatedSCOIds ?? [],
          attachments: [],
        }
      : undefined;

  const { control, handleSubmit, reset, setValue, watch } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceInputSchema),
    defaultValues,
    values: editValues,
  });

  const selectedPurchaseOrderId = watch('purchaseOrderId');
  const selectedVendorId = watch('vendorId');
  const watchedRelatedSCOIds = watch('relatedSCOIds');
  const selectedRelatedSCOIds = useMemo(() => watchedRelatedSCOIds ?? [], [watchedRelatedSCOIds]);
  const selectedRelatedSCOIdsKey = selectedRelatedSCOIds.join('|');
  const totalAmount = watch('totalAmount') ?? 0;
  const taxRate = watch('taxRate') ?? 0;
  const selectedPurchaseOrderOption = useMemo<ProjectPickerOption | null>(() => {
    if (!selectedPurchaseOrderId) return null;

    if (pickedPurchaseOrderOption?.value === selectedPurchaseOrderId) {
      return pickedPurchaseOrderOption;
    }

    if (invoiceDetail?.purchaseOrderId === selectedPurchaseOrderId && invoiceDetail.purchaseOrder) {
      return {
        value: selectedPurchaseOrderId,
        label: invoiceDetail.purchaseOrder.poNumber ?? 'Purchase Order',
        description: invoiceDetail.vendor?.name ?? undefined,
        badge: invoiceDetail.purchaseOrder.status ?? undefined,
      };
    }

    return null;
  }, [
    invoiceDetail?.purchaseOrder,
    invoiceDetail?.purchaseOrderId,
    invoiceDetail?.vendor?.name,
    pickedPurchaseOrderOption,
    selectedPurchaseOrderId,
  ]);
  const poPicker = usePurchaseOrderPickerOptions({
    projectId,
    search: poSearch,
    status: 'ISSUED',
    selectedOptions: selectedPurchaseOrderOption ? [selectedPurchaseOrderOption] : [],
    queryScope: 'invoice-form-po-picker',
  });
  const selectedSCOOptions = useMemo<ProjectMultiPickerOption[]>(() => {
    const selectedIds = new Set(selectedRelatedSCOIds);
    const fromDetail =
      invoiceDetail?.relatedSCOs
        ?.map(relatedSCOToOption)
        .filter((option) => selectedIds.has(option.value)) ?? [];
    const fromPicked = pickedSCOOptions.filter((option) => selectedIds.has(option.value));

    const seen = new Set<string>();
    return [...fromDetail, ...fromPicked].filter((option) => {
      if (seen.has(option.value)) return false;
      seen.add(option.value);
      return true;
    });
  }, [invoiceDetail?.relatedSCOs, pickedSCOOptions, selectedRelatedSCOIds]);
  const scoPicker = useSCOPickerOptions({
    projectId,
    purchaseOrderId: selectedPurchaseOrderId || undefined,
    search: scoSearch,
    selectedOptions: selectedSCOOptions,
    enabled: !!selectedPurchaseOrderId,
    queryScope: 'invoice-form-sco-picker',
  });
  const taxAmount = calculateTaxAmount(totalAmount, taxRate);
  const grandTotal = getInvoiceGrandTotal(totalAmount, taxAmount);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;
  const isImmutable = isEdit;
  const isVendorLocked = isImmutable || !!selectedPurchaseOrderId;
  const selectedPurchaseOrder = useMemo(() => {
    if (!selectedPurchaseOrderId) return undefined;
    if (pickedPurchaseOrder?.id === selectedPurchaseOrderId) return pickedPurchaseOrder;
    return poPicker.items.find((po) => po.id === selectedPurchaseOrderId);
  }, [pickedPurchaseOrder, poPicker.items, selectedPurchaseOrderId]);
  const selectedVendorContextOption = useMemo<VendorPickerOption | null>(() => {
    if (!selectedVendorId) return null;

    const poVendorId = selectedPurchaseOrder?.vendorId ?? selectedPurchaseOrder?.vendor?.id;
    if (selectedVendorId === poVendorId && selectedPurchaseOrder?.vendor?.name) {
      return {
        value: selectedVendorId,
        label: selectedPurchaseOrder.vendor.name,
      };
    }

    const invVendorId = invoiceDetail?.vendorId ?? invoiceDetail?.vendor?.id;
    if (selectedVendorId === invVendorId && invoiceDetail?.vendor?.name) {
      return {
        value: selectedVendorId,
        label: invoiceDetail.vendor.name,
      };
    }

    return null;
  }, [selectedVendorId, selectedPurchaseOrder, invoiceDetail]);

  const vendorPicker = useVendorPickerOptions({
    search: vendorSearch,
    selectedOptions: selectedVendorContextOption ? [selectedVendorContextOption] : [],
    queryScope: 'invoice-form-picker',
  });

  const selectedVendorOption = useMemo<VendorPickerOption | null>(() => {
    if (!selectedVendorId) return null;
    if (selectedVendorContextOption) return selectedVendorContextOption;

    const foundInFetched = vendorPicker.options.find((opt) => opt.value === selectedVendorId);
    if (foundInFetched && foundInFetched.label !== foundInFetched.value) {
      return foundInFetched;
    }

    return null;
  }, [selectedVendorId, selectedVendorContextOption, vendorPicker.options]);

  const vendorOptions = vendorPicker.options;

  useEffect(() => {
    setValue('taxAmount', taxAmount, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [setValue, taxAmount]);

  useEffect(() => {
    setPickedPurchaseOrder((current) =>
      current && current.id !== selectedPurchaseOrderId ? null : current
    );
    setPickedPurchaseOrderOption((current) =>
      current && current.value !== selectedPurchaseOrderId ? null : current
    );
  }, [selectedPurchaseOrderId]);

  useEffect(() => {
    const selectedIds = new Set(
      selectedRelatedSCOIdsKey ? selectedRelatedSCOIdsKey.split('|') : []
    );
    setPickedSCOOptions((current) => {
      const next = current.filter((option) => selectedIds.has(option.value));
      return next.length === current.length ? current : next;
    });
  }, [selectedRelatedSCOIdsKey]);

  const enterMockData = useCallback(() => {
    const randomPo = poPicker.options[Math.floor(Math.random() * poPicker.options.length)];
    const randomPoData = poPicker.items.find((po) => po.id === randomPo?.value);
    const subtotal = Math.floor(Math.random() * 15000) + 1500;
    const taxRate = 8.5;
    const tax = calculateTaxAmount(subtotal, taxRate);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    reset({
      projectId,
      vendorId:
        randomPoData?.vendorId ?? vendorOptions.find((option) => !option.disabled)?.value ?? '',
      purchaseOrderId: randomPo?.value ?? '',
      externalInvoiceNumber: 'VENDOR-' + (Math.floor(Math.random() * 9000) + 1000),
      vendorCoupon: false,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: dueDate.toISOString().slice(0, 10),
      totalAmount: subtotal,
      taxAmount: tax,
      taxRate,
      notes: 'Progress billing for approved work.',
      relatedSCOIds: scoPicker.options.slice(0, 2).map((option) => option.value),
      attachments: [],
    });
  }, [poPicker.items, poPicker.options, projectId, reset, scoPicker.options, vendorOptions]);

  async function uploadFiles(folderId: string, files: File[]) {
    const documentIds: string[] = [];
    for (const file of files) {
      try {
        const uploaded = await filesApi.uploadFile(file, {
          name: file.name,
          parentId: folderId,
          mimeType: file.type || undefined,
          size: file.size,
        });
        documentIds.push(uploaded.id);
      } catch (error) {
        toast.error(getApiErrorMessage(error, `Failed to upload ${file.name}.`));
        throw error;
      }
    }
    return documentIds;
  }

  async function resolveInvoiceUploadFolderId(
    targetInvoiceId: string
  ): Promise<string | undefined> {
    try {
      return await resolveProjectEntityFolder(projectId, 'INVOICE', targetInvoiceId);
    } catch {
      return invoiceFolderId;
    }
  }

  async function onSubmit(formData: CreateInvoiceInput) {
    const existingAttachmentCount = invoiceDetail?.attachments?.length ?? 0;

    if (!isEdit && !formData.vendorCoupon && selectedFiles.length === 0) {
      toast.error('At least one attachment is required.');
      return;
    }

    if (
      isEdit &&
      !invoiceDetail?.vendorCoupon &&
      existingAttachmentCount + selectedFiles.length === 0
    ) {
      toast.error('At least one attachment is required.');
      return;
    }

    if (selectedFiles.length > 0 && !invoiceFolderId) {
      toast.error('Invoice folder is not ready yet. Please try again.');
      return;
    }

    setIsSaving(true);
    try {
      const attachmentIds =
        !isEdit && selectedFiles.length > 0 && invoiceFolderId
          ? await uploadFiles(invoiceFolderId, selectedFiles)
          : [];

      if (!isEdit && !formData.vendorCoupon && attachmentIds.length === 0) {
        toast.error('At least one attachment is required.');
        return;
      }

      if (isEdit && invoiceId) {
        const calculatedTaxAmount = calculateTaxAmount(formData.totalAmount, formData.taxRate);
        const updated = await updateMutation.mutateAsync({
          id: invoiceId,
          data: {
            id: invoiceId,
            projectId: formData.projectId,
            vendorId: formData.vendorId,
            purchaseOrderId: formData.purchaseOrderId,
            externalInvoiceNumber: formData.externalInvoiceNumber || null,
            invoiceDate: formData.invoiceDate,
            dueDate: formData.dueDate,
            totalAmount: formData.totalAmount,
            taxAmount: calculatedTaxAmount,
            taxRate: formData.taxRate,
            notes: formData.notes,
            relatedSCOIds: formData.relatedSCOIds,
          },
        });

        if (selectedFiles.length > 0) {
          const folderId = await resolveInvoiceUploadFolderId(invoiceId);
          if (!folderId) {
            toast.error('Invoice folder is not ready yet. Please try again.');
            return;
          }

          const uploadedIds = await uploadFiles(folderId, selectedFiles);
          for (const documentId of uploadedIds) {
            await addAttachmentMutation.mutateAsync({
              invoiceId,
              data: { documentId },
            });
          }
        }

        navigate(getInvoiceDetailPath(projectId, updated.id));
        return;
      }

      const created = await createMutation.mutateAsync({
        ...formData,
        externalInvoiceNumber: formData.externalInvoiceNumber || null,
        taxAmount: calculateTaxAmount(formData.totalAmount, formData.taxRate),
        attachments: attachmentIds,
      });
      navigate(getInvoiceDetailPath(projectId, created.id));
    } catch {
      // Mutation hooks and file uploads surface their own toasts.
    } finally {
      setIsSaving(false);
    }
  }

  if ((isEdit && isLoadingDetail) || isLoadingProject) {
    return <ProjectFormPageLoading sections={INVOICE_FORM_SECTIONS.length} />;
  }

  const canSubmitInvoice = isEdit
    ? project?.capabilities?.actions?.invoice?.update === true
    : project?.capabilities?.actions?.invoice?.create === true;
  if (!canSubmitInvoice) return <Forbidden />;

  const invoiceNumberDisplay = invoiceDetail?.invoiceNumber ?? 'Invoice';

  return (
    <ProjectFormShell
      onSubmit={(event) => void handleSubmit(onSubmit, onInvalidFormSubmit)(event)}
      title={isEdit ? 'Edit Invoice' : 'New Invoice'}
      submitLabel={isEdit ? 'Save Changes' : 'Create Invoice'}
      isSubmitting={isSubmitting}
      sections={INVOICE_FORM_SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      extraActions={!isEdit ? <MockDataButton data={null} onLoad={enterMockData} /> : undefined}
    >
      <FormLayout className="pt-4 pb-8 lg:pb-10">
        <FormContent>
          <Card id="invoice-details">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Invoice Details</h2>
                <p className="text-sm text-muted-foreground">
                  Link the invoice to a purchase order and vendor.
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <Controller
                  name="purchaseOrderId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <InvoiceRequiredFieldLabel>Purchase Order</InvoiceRequiredFieldLabel>
                      <InfiniteSearchSelect
                        options={poPicker.options}
                        value={field.value || null}
                        onValueChange={(value) => {
                          field.onChange(value ?? '');
                          const selectedPo = poPicker.items.find((po) => po.id === value);
                          setPickedPurchaseOrder(selectedPo ?? null);
                          setValue('vendorId', selectedPo?.vendorId ?? '', {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                          setValue('relatedSCOIds', [], {
                            shouldDirty: true,
                            shouldValidate: true,
                          });
                        }}
                        onOptionChange={setPickedPurchaseOrderOption}
                        selectedOption={selectedPurchaseOrderOption}
                        search={poSearch}
                        onSearchChange={setPoSearch}
                        isLoading={poPicker.isLoading}
                        isFetchingNextPage={poPicker.isFetchingNextPage}
                        hasNextPage={poPicker.hasNextPage}
                        onFetchNextPage={poPicker.fetchNextPage}
                        disabled={isImmutable}
                        placeholder="Select purchase order..."
                        searchPlaceholder="Search purchase orders..."
                        emptyMessage="No issued purchase orders found."
                        loadingMessage="Loading purchase orders..."
                        triggerClassName={
                          fieldState.invalid ? invoiceInvalidControlClassName : undefined
                        }
                        testId="invoice-purchase-order-select"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="vendorId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <InvoiceRequiredFieldLabel>Vendor</InvoiceRequiredFieldLabel>
                      <InfiniteSearchSelect
                        options={vendorOptions}
                        value={field.value || null}
                        onValueChange={(value) => field.onChange(value ?? '')}
                        selectedOption={selectedVendorOption}
                        search={vendorSearch}
                        onSearchChange={setVendorSearch}
                        isLoading={vendorPicker.isLoading}
                        isFetchingNextPage={vendorPicker.isFetchingNextPage}
                        hasNextPage={vendorPicker.hasNextPage}
                        onFetchNextPage={vendorPicker.fetchNextPage}
                        disabled={isVendorLocked}
                        placeholder="Select vendor..."
                        searchPlaceholder="Search vendors..."
                        emptyMessage="No vendors found."
                        loadingMessage="Loading vendors..."
                        triggerClassName={
                          fieldState.invalid ? invoiceInvalidControlClassName : undefined
                        }
                        testId="invoice-vendor-select"
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div
                className={cn(
                  'grid grid-cols-1 gap-5',
                  isEdit ? 'lg:grid-cols-4' : 'lg:grid-cols-3'
                )}
              >
                {isEdit && (
                  <Field>
                    <FormFieldLabel>Invoice Number</FormFieldLabel>
                    <InputWrapper>
                      <Input
                        value={invoiceNumberDisplay}
                        readOnly
                        disabled
                        aria-readonly="true"
                        data-testid="invoice-number-display"
                      />
                    </InputWrapper>
                  </Field>
                )}

                <Controller
                  name="externalInvoiceNumber"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FormFieldLabel>External Invoice Number</FormFieldLabel>
                      <InputWrapper
                        className={fieldState.invalid ? invoiceInvalidControlClassName : undefined}
                      >
                        <Input
                          value={field.value ?? ''}
                          onChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          placeholder="Vendor invoice #"
                          autoComplete="off"
                          aria-invalid={fieldState.invalid}
                          data-testid="invoice-external-invoice-number-input"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
                <Controller
                  name="invoiceDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <InvoiceRequiredFieldLabel>Invoice Date</InvoiceRequiredFieldLabel>
                      <InputWrapper
                        className={fieldState.invalid ? invoiceInvalidControlClassName : undefined}
                      >
                        <Input
                          type="date"
                          {...field}
                          aria-invalid={fieldState.invalid}
                          data-testid="invoice-date-input"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="dueDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <InvoiceRequiredFieldLabel>Due Date</InvoiceRequiredFieldLabel>
                      <InputWrapper
                        className={fieldState.invalid ? invoiceInvalidControlClassName : undefined}
                      >
                        <Input
                          type="date"
                          {...field}
                          aria-invalid={fieldState.invalid}
                          data-testid="invoice-due-date-input"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className={invoiceFieldLabelClassName}>Notes</FieldLabel>
                    <Textarea
                      {...field}
                      placeholder="Additional notes..."
                      rows={4}
                      data-testid="invoice-notes-input"
                    />
                  </Field>
                )}
              />
            </CardContent>
          </Card>

          <Card id="financial">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Financial</h2>
                <p className="text-sm text-muted-foreground">
                  Enter the invoice amount and tax rate.
                </p>
              </div>

              <Separator />

              <div className="flex justify-end">
                <div className="w-full max-w-sm space-y-3 rounded-lg border bg-muted/20 p-4">
                  <Controller
                    name="totalAmount"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid} className="gap-1">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <InvoiceRequiredFieldLabel>Invoice Amount</InvoiceRequiredFieldLabel>
                          <InputWrapper
                            className={cn(
                              'w-32',
                              fieldState.invalid && invoiceInvalidControlClassName
                            )}
                          >
                            <NumberInput
                              value={field.value ?? 0}
                              onValueChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                              min={0.01}
                              decimalPlaces={2}
                              placeholder="0.00"
                              aria-invalid={fieldState.invalid}
                              className="text-right"
                              data-testid="invoice-total-amount-input"
                            />
                          </InputWrapper>
                        </div>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">Tax Rate (%)</span>
                    <Controller
                      name="taxRate"
                      control={control}
                      render={({ field, fieldState }) => (
                        <InputWrapper
                          className={cn(
                            'w-32',
                            fieldState.invalid && invoiceInvalidControlClassName
                          )}
                        >
                          <NumberInput
                            value={field.value ?? 0}
                            onValueChange={field.onChange}
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                            min={0}
                            max={100}
                            decimalPlaces={3}
                            placeholder="0"
                            aria-invalid={fieldState.invalid}
                            className="text-right"
                            data-testid="invoice-tax-rate-input"
                          />
                        </InputWrapper>
                      )}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Tax ({formatPercent(taxRate)})</span>
                    <span className="font-medium tabular-nums">{formatCurrency(taxAmount)}</span>
                  </div>
                  <Separator className="my-3" />
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Grand Total</span>
                    <span className="font-semibold tabular-nums">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="related-scos">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Related SCOs</h2>
                <p className="text-sm text-muted-foreground">
                  Link sub change orders covered by this invoice.
                </p>
              </div>

              <Separator />

              <Controller
                name="relatedSCOIds"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className={invoiceFieldLabelClassName}>
                      Sub Change Orders
                    </FieldLabel>
                    <InfiniteMultiSearchSelect
                      options={scoPicker.options}
                      value={field.value ?? []}
                      onValueChange={field.onChange}
                      selectedOptions={selectedSCOOptions}
                      onOptionsChange={setPickedSCOOptions}
                      search={scoSearch}
                      onSearchChange={setScoSearch}
                      isLoading={scoPicker.isLoading}
                      isFetchingNextPage={scoPicker.isFetchingNextPage}
                      hasNextPage={scoPicker.hasNextPage}
                      onFetchNextPage={scoPicker.fetchNextPage}
                      disabled={!selectedPurchaseOrderId}
                      placeholder={
                        selectedPurchaseOrderId
                          ? 'Select related SCOs...'
                          : 'Select a purchase order first...'
                      }
                      searchPlaceholder="Search related SCOs..."
                      emptyMessage={
                        selectedPurchaseOrderId
                          ? 'No SCOs found for this purchase order.'
                          : 'Select a purchase order first.'
                      }
                      testId="invoice-related-scos-select"
                    />
                  </Field>
                )}
              />
            </CardContent>
          </Card>

          <ProjectFormDocumentsCard
            selectedFiles={selectedFiles}
            existingDocuments={isEdit && invoiceDetail ? invoiceDetail.attachments : undefined}
            fileInputTestId="invoice-file-input"
            onAddFile={(file) => setSelectedFiles((prev) => [...prev, file])}
            onRemoveFile={(index) =>
              setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index))
            }
          >
            {!isEdit && (
              <Controller
                name="vendorCoupon"
                control={control}
                render={({ field }) => (
                  <label className="flex items-start gap-3 rounded-md border bg-muted/20 p-3 text-sm">
                    <Checkbox
                      checked={field.value === true}
                      onCheckedChange={(checked) => field.onChange(checked === true)}
                      data-testid="invoice-vendor-coupon-checkbox"
                    />
                    <span className="min-w-0 font-medium text-foreground">Vendor Coupon</span>
                  </label>
                )}
              />
            )}
          </ProjectFormDocumentsCard>
        </FormContent>
      </FormLayout>
    </ProjectFormShell>
  );
}

function InvoiceRequiredFieldLabel({ children }: { children: ReactNode }) {
  return <FormFieldLabel required>{children}</FormFieldLabel>;
}
