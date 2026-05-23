import { useCallback, useEffect, useMemo, useState } from 'react';

import { fakeInvoiceNumber } from '@/lib/fake-data';

import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { FormSectionNav } from '@/app/components/form-section-nav';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { InfiniteMultiSearchSelect } from '@/app/components/ui/infinite-multi-search-select';
import { InfiniteSearchSelect } from '@/app/components/ui/infinite-search-select';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { formatCurrency } from '@/app/lib/helpers';
import { useVendorsQuery } from '@/modules/directory/hooks';
import { filesApi } from '@/modules/files/api/files.api';
import {
  ProjectFormDocumentsCard,
  ProjectFormPageLoading,
  ProjectFormToolbar,
} from '@/modules/project/components/shared';
import { INVOICE_FORM_SECTIONS } from '@/modules/project/constants/invoice';
import {
  useAddInvoiceAttachmentMutation,
  useCreateInvoiceMutation,
  useInvoiceDetailQuery,
  useUpdateInvoiceMutation,
} from '@/modules/project/hooks/invoice';
import { usePOsQuery } from '@/modules/project/hooks/purchase-order';
import { useSCOsQuery } from '@/modules/project/hooks/sub-change-order';
import { useProjectFolderQuery } from '@/modules/project/hooks/use-project-folder';
import {
  createInvoiceInputSchema,
  type CreateInvoiceInput,
} from '@/modules/project/schemas/invoice';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

function toDateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

function getInvoiceDetailPath(projectId: string, invoiceId: string) {
  return `/app/project/${projectId}/invoices/${invoiceId}`;
}

function calculateTaxAmount(totalAmount: number, taxRate: number) {
  return Math.round(((totalAmount || 0) * (taxRate || 0) * 100) / 100) / 100;
}

export function InvoiceFormPage() {
  const { projectId = '', invoiceId } = useParams<{ projectId: string; invoiceId: string }>();
  const navigate = useNavigate();
  const isEdit = !!invoiceId;

  const { data: invoiceDetail, isLoading: isLoadingDetail } = useInvoiceDetailQuery(
    invoiceId ?? ''
  );
  const { data: invoiceFolderId } = useProjectFolderQuery(projectId || undefined, 'invoice');
  const { data: vendorsData } = useVendorsQuery({ page: 1, limit: 1000 });

  const [poSearch, setPoSearch] = useState('');
  const [scoSearch, setScoSearch] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [activeSection, setActiveSection] = useState<string>('invoice-details');
  const [isSaving, setIsSaving] = useState(false);

  const { data: posData, isLoading: isLoadingPOs } = usePOsQuery({
    projectId,
    search: poSearch || undefined,
    page: 1,
    size: 25,
  });
  const { data: scosData, isLoading: isLoadingSCOs } = useSCOsQuery({
    projectId,
    search: scoSearch || undefined,
    page: 1,
    size: 50,
  });

  const createMutation = useCreateInvoiceMutation();
  const updateMutation = useUpdateInvoiceMutation();
  const addAttachmentMutation = useAddInvoiceAttachmentMutation();

  const poOptions = useMemo(
    () =>
      (posData?.data ?? []).map((po) => ({
        value: po.id,
        label: po.poNumber ?? po.id,
        description: po.vendor?.name ?? po.description ?? undefined,
      })),
    [posData]
  );

  const vendorOptions = useMemo(
    () =>
      (vendorsData?.data ?? []).map((vendor) => ({
        value: vendor.id,
        label: vendor.name,
      })),
    [vendorsData]
  );

  const scoOptions = useMemo(
    () =>
      (scosData?.data ?? []).map((sco) => ({
        value: sco.id,
        label: sco.scoNumber ?? sco.title ?? sco.id,
        description: sco.title ?? sco.purchaseOrder?.poNumber ?? undefined,
      })),
    [scosData]
  );

  const defaultValues: CreateInvoiceInput = {
    projectId,
    vendorId: '',
    purchaseOrderId: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    totalAmount: 0,
    taxAmount: 0,
    taxRate: 0,
    notes: '',
    relatedSCOIds: [],
    attachments: [],
  };

  const editValues: CreateInvoiceInput | undefined =
    isEdit && invoiceDetail
      ? {
          projectId: invoiceDetail.projectId ?? invoiceDetail.project?.id ?? projectId,
          vendorId: invoiceDetail.vendorId ?? invoiceDetail.vendor?.id ?? '',
          purchaseOrderId: invoiceDetail.purchaseOrderId ?? invoiceDetail.purchaseOrder?.id ?? '',
          invoiceNumber: invoiceDetail.invoiceNumber ?? '',
          invoiceDate: toDateInput(invoiceDetail.invoiceDate),
          dueDate: toDateInput(invoiceDetail.dueDate),
          totalAmount: invoiceDetail.totalAmount ?? 0,
          taxAmount: invoiceDetail.taxAmount ?? 0,
          taxRate: invoiceDetail.taxRate ?? 0,
          notes: invoiceDetail.notes ?? '',
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
  const totalAmount = watch('totalAmount') ?? 0;
  const taxRate = watch('taxRate') ?? 0;
  const taxAmount = calculateTaxAmount(totalAmount, taxRate);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;
  const isImmutable = isEdit;
  const isVendorLocked = isImmutable || !!selectedPurchaseOrderId;
  const selectedPurchaseOrder = useMemo(
    () => (posData?.data ?? []).find((po) => po.id === selectedPurchaseOrderId),
    [posData, selectedPurchaseOrderId]
  );
  const selectedVendorLabel =
    selectedPurchaseOrder?.vendor?.name ??
    (invoiceDetail?.vendorId === selectedVendorId ? invoiceDetail.vendor?.name : undefined);
  const invoiceVendorOptions = useMemo(() => {
    if (!selectedVendorId || vendorOptions.some((option) => option.value === selectedVendorId)) {
      return vendorOptions;
    }

    return [
      {
        value: selectedVendorId,
        label: selectedVendorLabel ?? selectedVendorId,
      },
      ...vendorOptions,
    ];
  }, [selectedVendorId, selectedVendorLabel, vendorOptions]);

  useEffect(() => {
    setValue('taxAmount', taxAmount, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [setValue, taxAmount]);

  const enterMockData = useCallback(() => {
    const randomPo = poOptions[Math.floor(Math.random() * poOptions.length)];
    const randomPoData = (posData?.data ?? []).find((po) => po.id === randomPo?.value);
    const subtotal = Math.floor(Math.random() * 15000) + 1500;
    const taxRate = 8.5;
    const tax = calculateTaxAmount(subtotal, taxRate);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    reset({
      projectId,
      vendorId: randomPoData?.vendorId ?? vendorOptions[0]?.value ?? '',
      purchaseOrderId: randomPo?.value ?? '',
      invoiceNumber: fakeInvoiceNumber(),
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: dueDate.toISOString().slice(0, 10),
      totalAmount: subtotal + tax,
      taxAmount: tax,
      taxRate,
      notes: 'Progress billing for approved work.',
      relatedSCOIds: scoOptions.slice(0, 2).map((option) => option.value),
      attachments: [],
    });
  }, [poOptions, posData, projectId, reset, scoOptions, vendorOptions]);

  async function uploadFiles(folderId: string, files: File[]) {
    const documentIds: string[] = [];
    for (const file of files) {
      const uploaded = await filesApi.uploadFile(file, {
        name: file.name,
        parentId: folderId,
        mimeType: file.type || undefined,
        size: file.size,
      });
      documentIds.push(uploaded.id);
    }
    return documentIds;
  }

  async function onSubmit(formData: CreateInvoiceInput) {
    const existingAttachmentCount = invoiceDetail?.attachments?.length ?? 0;

    if (!isEdit && selectedFiles.length === 0) {
      toast.error('At least one attachment is required.');
      return;
    }

    if (isEdit && existingAttachmentCount + selectedFiles.length === 0) {
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

      if (!isEdit && attachmentIds.length === 0) {
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
            invoiceNumber: formData.invoiceNumber,
            invoiceDate: formData.invoiceDate,
            dueDate: formData.dueDate,
            totalAmount: formData.totalAmount,
            taxAmount: calculatedTaxAmount,
            taxRate: formData.taxRate,
            notes: formData.notes,
            relatedSCOIds: formData.relatedSCOIds,
          },
        });

        if (selectedFiles.length > 0 && invoiceFolderId) {
          const uploadedIds = await uploadFiles(invoiceFolderId, selectedFiles);
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
        taxAmount: calculateTaxAmount(formData.totalAmount, formData.taxRate),
        attachments: attachmentIds,
      });
      navigate(getInvoiceDetailPath(projectId, created.id));
    } finally {
      setIsSaving(false);
    }
  }

  if (isEdit && isLoadingDetail) {
    return <ProjectFormPageLoading sections={INVOICE_FORM_SECTIONS.length} />;
  }

  return (
    <form
      onSubmit={(event) =>
        void handleSubmit(onSubmit, onInvalidFormSubmit)(event)
      }
      className="container-fluid max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-7.5 lg:py-7.5"
    >
      <ProjectFormToolbar
        backLabel="Invoices"
        title={isEdit ? 'Edit Invoice' : 'New Invoice'}
        description={isEdit ? 'Update unpaid invoice details.' : 'Create a new invoice.'}
        submitLabel={isEdit ? 'Save Changes' : 'Create Invoice'}
        isSubmitting={isSubmitting}
        extraActions={!isEdit ? <MockDataButton data={null} onLoad={enterMockData} /> : undefined}
      />

      <FormSectionNav
        sections={INVOICE_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="space-y-6 pt-6">
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
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                      Purchase Order
                    </FieldLabel>
                    <InfiniteSearchSelect
                      options={poOptions}
                      value={field.value || null}
                      onValueChange={(value) => {
                        field.onChange(value ?? '');
                        const selectedPo = (posData?.data ?? []).find((po) => po.id === value);
                        setValue('vendorId', selectedPo?.vendorId ?? '', {
                          shouldDirty: true,
                          shouldValidate: true,
                        });
                      }}
                      search={poSearch}
                      onSearchChange={setPoSearch}
                      isLoading={isLoadingPOs}
                      disabled={isImmutable}
                      placeholder="Select purchase order..."
                      searchPlaceholder="Search purchase orders..."
                      emptyMessage="No purchase orders found."
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
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                      Vendor
                    </FieldLabel>
                    <InfiniteSearchSelect
                      options={invoiceVendorOptions}
                      value={field.value || null}
                      onValueChange={(value) => field.onChange(value ?? '')}
                      search=""
                      onSearchChange={() => undefined}
                      disabled={isVendorLocked}
                      placeholder="Select vendor..."
                      emptyMessage="No vendors found."
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Controller
                name="invoiceNumber"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                      Invoice Number
                    </FieldLabel>
                    <InputWrapper>
                      <Input {...field} placeholder="INV-001" autoComplete="off" />
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
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                      Invoice Date
                    </FieldLabel>
                    <InputWrapper>
                      <Input type="date" {...field} />
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
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                      Due Date
                    </FieldLabel>
                    <InputWrapper>
                      <Input type="date" {...field} />
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
                  <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                    Notes
                  </FieldLabel>
                  <Textarea {...field} placeholder="Additional notes..." rows={4} />
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
                Enter the invoice total and tax rate.
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Controller
                name="totalAmount"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                      Total Amount
                    </FieldLabel>
                    <InputWrapper>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="taxRate"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                      Tax Rate (%)
                    </FieldLabel>
                    <InputWrapper>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value ?? 0}
                        onChange={(event) => field.onChange(Number(event.target.value))}
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="flex justify-end">
              <div className="w-full max-w-sm rounded-lg border bg-muted/20 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="font-semibold tabular-nums">{formatCurrency(totalAmount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-medium tabular-nums">{formatCurrency(taxAmount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax Rate</span>
                  <span className="font-medium tabular-nums">{taxRate}%</span>
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
                  <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                    Sub Change Orders
                  </FieldLabel>
                  <InfiniteMultiSearchSelect
                    options={scoOptions}
                    value={field.value ?? []}
                    onValueChange={field.onChange}
                    search={scoSearch}
                    onSearchChange={setScoSearch}
                    isLoading={isLoadingSCOs}
                    placeholder="Select related SCOs..."
                    searchPlaceholder="Search SCOs..."
                    emptyMessage="No SCOs found."
                  />
                </Field>
              )}
            />
          </CardContent>
        </Card>

        <ProjectFormDocumentsCard
          selectedFiles={selectedFiles}
          existingDocuments={isEdit && invoiceDetail ? invoiceDetail.attachments : undefined}
          onAddFile={(file) => setSelectedFiles((prev) => [...prev, file])}
          onRemoveFile={(index) =>
            setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index))
          }
        />
      </div>
    </form>
  );
}
