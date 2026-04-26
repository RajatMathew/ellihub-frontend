import { useCallback, useMemo, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, FileText, X } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { MockDataButton } from '@app/components/dev/mock-data-button';
import { FormSectionNav } from '@app/components/form-section-nav';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
import { FileDropZone } from '@app/components/ui/file-drop-zone';
import { Field, FieldError, FieldLabel } from '@app/components/ui/field';
import { InfiniteMultiSearchSelect } from '@app/components/ui/infinite-multi-search-select';
import { InfiniteSearchSelect } from '@app/components/ui/infinite-search-select';
import { Input, InputWrapper } from '@app/components/ui/input';
import { Separator } from '@app/components/ui/separator';
import { Textarea } from '@app/components/ui/textarea';
import { formatCurrency } from '@app/lib/helpers';
import { useVendorsQuery } from '@modules/directory/hooks';
import { filesApi } from '@modules/files/api/files.api';
import { usePOsQuery } from '@modules/purchase-orders/hooks/po.hooks';
import { useSCOsQuery } from '@modules/sco/hooks/sco.hooks';

import { INVOICE_FORM_SECTIONS } from '../constants/invoice.constants';
import {
  useCreateInvoiceMutation,
  useInvoiceDetailQuery,
  useUpdateInvoiceMutation,
} from '../hooks';
import { useAddInvoiceAttachmentMutation } from '../hooks/invoice-attachment.hooks';
import { useProjectFolderQuery } from '../hooks/use-project-folder';
import {
  createInvoiceInputSchema,
  type CreateInvoiceInput,
} from '../schemas/invoice.schema';

function toDateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : '';
}

function fileSizeLabel(size: number) {
  return `${(size / 1024).toFixed(1)} KB`;
}

export function InvoiceFormPage() {
  const { projectId = '', invoiceId } = useParams<{ projectId: string; invoiceId: string }>();
  const navigate = useNavigate();
  const isEdit = !!invoiceId;

  const { data: invoiceDetail, isLoading: isLoadingDetail } = useInvoiceDetailQuery(invoiceId ?? '');
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
    [posData],
  );

  const vendorOptions = useMemo(
    () =>
      (vendorsData?.data ?? []).map((vendor) => ({
        value: vendor.id,
        label: vendor.name,
      })),
    [vendorsData],
  );

  const scoOptions = useMemo(
    () =>
      (scosData?.data ?? []).map((sco) => ({
        value: sco.id,
        label: sco.scoNumber ?? sco.title ?? sco.id,
        description: sco.title ?? sco.purchaseOrder?.poNumber ?? undefined,
      })),
    [scosData],
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
          purchaseOrderId:
            invoiceDetail.purchaseOrderId ?? invoiceDetail.purchaseOrder?.id ?? '',
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

  const { control, handleSubmit, reset, setValue, watch } =
    useForm<CreateInvoiceInput>({
      resolver: zodResolver(createInvoiceInputSchema),
      defaultValues,
      values: editValues,
    });

  const totalAmount = watch('totalAmount') ?? 0;
  const taxAmount = watch('taxAmount') ?? 0;
  const taxRate = watch('taxRate') ?? 0;
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;
  const isImmutable = isEdit;

  const enterMockData = useCallback(() => {
    const randomPo = poOptions[Math.floor(Math.random() * poOptions.length)];
    const randomPoData = (posData?.data ?? []).find((po) => po.id === randomPo?.value);
    const subtotal = Math.floor(Math.random() * 15000) + 1500;
    const tax = Math.round(subtotal * 0.085 * 100) / 100;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    reset({
      projectId,
      vendorId: randomPoData?.vendorId ?? vendorOptions[0]?.value ?? '',
      purchaseOrderId: randomPo?.value ?? '',
      invoiceNumber: `INV-${Date.now().toString(36).toUpperCase()}`,
      invoiceDate: new Date().toISOString().slice(0, 10),
      dueDate: dueDate.toISOString().slice(0, 10),
      totalAmount: subtotal + tax,
      taxAmount: tax,
      taxRate: 8.5,
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
            taxAmount: formData.taxAmount,
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

        navigate(`../${updated.id}`, { relative: 'path' });
        return;
      }

      const created = await createMutation.mutateAsync({
        ...formData,
        attachments: attachmentIds,
      });
      navigate(`../${created.id}`, { relative: 'path' });
    } finally {
      setIsSaving(false);
    }
  }

  if (isEdit && isLoadingDetail) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading invoice...</div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, (errors) => console.warn('Validation errors:', errors))}
      className="container-fluid py-7.5"
    >
      <Toolbar sticky={false}>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to=".." relative="path" className="hover:text-foreground">
                Invoices
              </Link>
            </div>
            <ToolbarPageTitle>{isEdit ? 'Edit Invoice' : 'New Invoice'}</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEdit ? 'Update unpaid invoice details.' : 'Create a new invoice.'}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            {!isEdit && (
              <MockDataButton data={null} onLoad={enterMockData} />
            )}
            <Button variant="outline" size="sm" type="button" asChild>
              <Link to=".." relative="path">
                Cancel
              </Link>
            </Button>
            <Button size="sm" type="submit" disabled={isSubmitting}>
              <Check className="size-4" />
              {isEdit ? 'Save Changes' : 'Create Invoice'}
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

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
                        if (selectedPo?.vendorId) {
                          setValue('vendorId', selectedPo.vendorId, { shouldValidate: true });
                        }
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
                      options={vendorOptions}
                      value={field.value || null}
                      onValueChange={(value) => field.onChange(value ?? '')}
                      search=""
                      onSearchChange={() => undefined}
                      disabled={isImmutable}
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
                Enter the invoice total and tax values.
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
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
                name="taxAmount"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold uppercase tracking-widest">
                      Tax Amount
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
                  <span className="font-semibold tabular-nums">
                    {formatCurrency(totalAmount)}
                  </span>
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

        <Card id="documents">
          <CardHeader>
            <CardTitle className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FileDropZone
              value={null}
              onChange={(file) => {
                if (file) setSelectedFiles((prev) => [...prev, file]);
              }}
            />

            {selectedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex flex-col gap-2 rounded-lg border p-2.5 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <span className="block truncate text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {fileSizeLabel(file.size)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      mode="icon"
                      size="sm"
                      type="button"
                      className="self-end sm:self-auto"
                      onClick={() =>
                        setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index))
                      }
                    >
                      <X className="size-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {isEdit && invoiceDetail && invoiceDetail.attachments?.length > 0 && (
              <div className="mt-4 space-y-2">
                <div className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Existing Documents
                </div>
                {invoiceDetail.attachments.map(
                  (attachment: { id: string; document?: { id?: string; name?: string } }) => (
                    <div
                      key={attachment.id}
                      className="flex items-center gap-3 rounded-lg border p-2.5"
                    >
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm font-medium">
                        {attachment.document?.name ?? 'Document'}
                      </span>
                    </div>
                  ),
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
