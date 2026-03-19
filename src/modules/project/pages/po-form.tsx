import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, FileText, Mail, Phone, User, X } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { MockDataButton } from '@app/components/dev/mock-data-button';
import { FormContent, FormLayout } from '@app/components/form-layout';
import { FormSectionNav } from '@app/components/form-section-nav';
import { LineItems } from '@app/components/line-items';
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
import { Input, InputWrapper } from '@app/components/ui/input';
import { SearchableSelect } from '@app/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/components/ui/select';
import { Separator } from '@app/components/ui/separator';
import { Textarea } from '@app/components/ui/textarea';
import { formatCurrency } from '@app/lib/helpers';
import { toast } from 'sonner';
import { useCostCodesQuery } from '@modules/catalog/hooks';
import { useContactsQuery, useVendorsQuery } from '@modules/directory/hooks';
import { filesApi } from '@modules/files/api/files.api';
import {
  PAYMENT_TERMS_OPTIONS,
  PO_FORM_SECTIONS,
  TRADE_CATEGORY_OPTIONS,
} from '@modules/purchase-orders/constants/po.constants';
import poMockData from '@modules/purchase-orders/mock/po-create.mock.json';
import { useAddPOAttachmentMutation } from '@modules/purchase-orders/hooks/po-attachment.hooks';
import {
  useAddPOLineItemMutation,
  useCreatePOMutation,
  usePODetailQuery,
  useRemovePOLineItemMutation,
  useUpdatePOMutation,
} from '@modules/purchase-orders/hooks/po.hooks';
import { useRFQListQuery } from '@modules/project/hooks';
import { useProjectFolderQuery } from '@modules/project/hooks/use-project-folder';
import {
  createPOInputSchema,
  type CreatePOInput,
} from '@modules/purchase-orders/schemas/po.schema';

/* ---- Page ---- */

export function POFormPage() {
  const { projectId = '', poId } = useParams<{ projectId: string; poId: string }>();
  const isEditMode = !!poId;
  const navigate = useNavigate();

  const { data: existingPO, isLoading: isLoadingPO } = usePODetailQuery(poId ?? '');
  const { data: vendorsData } = useVendorsQuery({ limit: 1000 });
  const { data: contactsData } = useContactsQuery({ size: 1000 });
  const { data: costCodesData } = useCostCodesQuery();
  const { data: rfqsData } = useRFQListQuery({ projectId, size: 100 });
  const { data: poFolderId } = useProjectFolderQuery(projectId || undefined, 'purchase order');

  const createMutation = useCreatePOMutation();
  const updateMutation = useUpdatePOMutation();
  const addLineItemMutation = useAddPOLineItemMutation();
  const removeLineItemMutation = useRemovePOLineItemMutation();
  const addAttachmentMutation = useAddPOAttachmentMutation();

  const vendorOptions = (vendorsData?.data ?? []).map((v) => ({
    value: v.id,
    label: v.name,
  }));
  const contacts = contactsData?.data ?? [];
  const contactOptions = contacts.map((c) => ({
    value: c.id,
    label: c.fullName,
  }));
  const contactsById = new Map(contacts.map((c) => [c.id, c]));

  const costCodeOptions = (costCodesData?.data ?? []).map((cc) => ({
    value: cc.id,
    label: `${cc.code} - ${cc.name}`,
  }));
  const rfqOptions = (rfqsData?.data ?? []).map((r) => ({
    value: r.id,
    label: r.rfqNumber ?? r.title,
  }));

  const createDefaults: CreatePOInput = {
    projectId,
    vendorId: '',
    rfqId: undefined,
    tradeCategory: 'MATERIAL',
    description: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    leadTime: '',
    issueDate: new Date().toISOString().slice(0, 10),
    expectedDate: '',
    shipToAddress: '',
    markupAmount: 0,
    taxPercent: 0,
    paymentTerms: 'NET_30',
    retainagePercent: 10,
    notes: '',
    vendorNotes: '',
    lineItems: [{ description: '', quantity: 1, unit: 'EA', unitPrice: 0 }],
  };

  const { control, handleSubmit, formState, reset, setValue, watch } = useForm<CreatePOInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createPOInputSchema) as any,
    defaultValues: isEditMode && existingPO ? {
      projectId: existingPO.projectId,
      vendorId: existingPO.vendorId,
      rfqId: existingPO.rfqId ?? undefined,
      tradeCategory: existingPO.tradeCategory,
      description: existingPO.description ?? '',
      contactName: existingPO.contactName ?? '',
      contactEmail: existingPO.contactEmail ?? '',
      contactPhone: existingPO.contactPhone ?? '',
      leadTime: existingPO.leadTime ?? '',
      issueDate: existingPO.issueDate?.split('T')[0] ?? '',
      expectedDate: existingPO.expectedDate?.split('T')[0] ?? '',
      shipToAddress: existingPO.shipToAddress ?? '',
      markupAmount: Number(existingPO.markupAmount ?? 0),
      taxPercent: Number(existingPO.taxPercent) || 0,
      paymentTerms: existingPO.paymentTerms,
      retainagePercent: Number(existingPO.retainagePercent) || 10,
      notes: existingPO.notes ?? '',
      vendorNotes: existingPO.vendorNotes ?? '',
      lineItems: existingPO.lineItems.length > 0
        ? existingPO.lineItems.map((li) => ({
            description: li.description,
            quantity: Number(li.quantity),
            unit: li.unit,
            unitPrice: Number(li.unitPrice),
            costCodeId: li.costCodeId ?? undefined,
            notes: li.notes ?? undefined,
          }))
        : [{ description: '', quantity: 1, unit: 'EA', unitPrice: 0 }],
    } : createDefaults,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  const watchedLineItems = watch('lineItems');
  const subtotal = (watchedLineItems ?? []).reduce(
    (sum: number, li: { quantity?: number; unitPrice?: number }) =>
      sum + (li.quantity ?? 0) * (li.unitPrice ?? 0),
    0,
  );

  const watchedMarkup = watch('markupAmount') ?? 0;
  const taxAmount = subtotal * (watch('taxPercent') ?? 0) / 100;
  const total = subtotal + watchedMarkup + taxAmount;

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('po-details');
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  async function uploadFilesAndAttach(targetPoId: string, folderId: string, files: File[]) {
    for (const file of files) {
      try {
        const uploaded = await filesApi.uploadFile(file, {
          name: file.name,
          parentId: folderId,
          mimeType: file.type || undefined,
          size: file.size,
        });
        await addAttachmentMutation.mutateAsync({
          poId: targetPoId,
          data: { fileId: uploaded.id },
        });
      } catch {
        console.warn(`Failed to upload/attach file: ${file.name}`);
      }
    }
  }

  const onSubmit = async (formData: CreatePOInput) => {
    // Clean empty strings to undefined so backend doesn't reject them
    const { lineItems, ...rest } = formData;
    const cleaned = {
      ...rest,
      rfqId: rest.rfqId || undefined,
      description: rest.description || undefined,
      contactName: rest.contactName || undefined,
      contactEmail: rest.contactEmail || undefined,
      contactPhone: rest.contactPhone || undefined,
      leadTime: rest.leadTime || undefined,
      issueDate: rest.issueDate || undefined,
      expectedDate: rest.expectedDate || undefined,
      shipToAddress: rest.shipToAddress || undefined,
      notes: rest.notes || undefined,
      vendorNotes: rest.vendorNotes || undefined,
      markupAmount: rest.markupAmount || undefined,
      lineItems,
    };

    if (isEditMode && poId && existingPO) {
      setIsSaving(true);
      try {
        // 1. Update basic PO fields (strip lineItems and immutable fields)
        const { lineItems: currentLineItems, vendorId: _vi, projectId: _pi, ...poFields } = cleaned;
        await updateMutation.mutateAsync({ id: poId, data: poFields as any });

        // 2. Sync line items: add all current, then remove all originals
        const originalItems = existingPO.lineItems ?? [];
        for (const li of currentLineItems) {
          await addLineItemMutation.mutateAsync({ poId, data: li });
        }
        for (const item of originalItems) {
          await removeLineItemMutation.mutateAsync({ poId, lineItemId: item.id });
        }

        // 3. Upload files
        if (selectedFiles.length > 0) {
          if (poFolderId) {
            await uploadFilesAndAttach(poId, poFolderId, selectedFiles);
          } else {
            toast.error('PO folder not found — files were not uploaded.');
          }
        }

        navigate('..', { relative: 'path' });
      } catch {
        // error toast already shown
      } finally {
        setIsSaving(false);
      }
    } else {
      createMutation.mutate(cleaned as any, {
        onSuccess: async (created) => {
          // Upload files after creation
          if (selectedFiles.length > 0) {
            if (poFolderId) {
              await uploadFilesAndAttach(created.id, poFolderId, selectedFiles);
            } else {
              toast.error('PO folder not found — files were not uploaded.');
            }
          }
          navigate(`../${created.id}`, { relative: 'path' });
        },
      });
    }
  };

  if (isEditMode && isLoadingPO) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading purchase order...</div>
      </div>
    );
  }

  return (
    <form
      key={isEditMode ? existingPO?.id ?? 'loading' : 'create'}
      onSubmit={handleSubmit(onSubmit as any, (errors) => console.warn('Validation errors:', errors))}
      className="container-fluid py-7.5"
    >
      {/* Toolbar */}

      <Toolbar sticky={false}>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to=".." relative="path" className="hover:text-foreground">
                Purchase Orders
              </Link>
            </div>
            <ToolbarPageTitle>{isEditMode ? 'Edit Purchase Order' : 'New Purchase Order'}</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEditMode
                ? `Editing ${existingPO?.poNumber ?? 'PO'}`
                : 'Create a new purchase order with line items.'}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            {!isEditMode && (
              <MockDataButton
                data={poMockData}
                onLoad={(entries) => {
                  const d = entries[Math.floor(Math.random() * entries.length)];
                  const randomVendor = vendorOptions[Math.floor(Math.random() * vendorOptions.length)]?.value ?? '';
                  reset({
                    ...d,
                    projectId,
                    vendorId: randomVendor,
                    paymentTerms: (d.paymentTerms ?? 'NET_30') as CreatePOInput['paymentTerms'],
                    tradeCategory: (d.tradeCategory ?? 'MATERIAL') as CreatePOInput['tradeCategory'],
                    lineItems: d.lineItems.map((item) => ({
                      ...item,
                      costCodeId: costCodeOptions[Math.floor(Math.random() * costCodeOptions.length)]?.value ?? undefined,
                    })),
                  });
                }}
              />
            )}
            <Button variant="outline" size="sm" type="button" asChild>
              <Link to=".." relative="path">
                Cancel
              </Link>
            </Button>
            <Button size="sm" type="submit" disabled={isSubmitting}>
              <Check className="size-4" />
              {isEditMode ? 'Save Changes' : 'Create PO'}
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* Main layout: top nav + content */}
      <FormLayout>
        <FormSectionNav
          sections={PO_FORM_SECTIONS}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <FormContent>
          {/* ---- Section 1: PO Details ---- */}
          <Card id="po-details">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">PO Details</h2>
                <p className="text-sm text-muted-foreground">
                  Core information about this purchase order.
                </p>
              </div>

              <Separator />

              {/* Vendor + Trade Category */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="vendorId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Vendor
                      </FieldLabel>
                      <SearchableSelect
                        options={vendorOptions}
                        value={field.value || null}
                        onValueChange={(v) => field.onChange(v ?? '')}
                        placeholder="Select vendor..."
                        searchPlaceholder="Search vendors..."
                        emptyMessage="No vendors found."
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="tradeCategory"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Trade Category
                      </FieldLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select trade..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TRADE_CATEGORY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Linked RFQ (optional) */}
              <Controller
                name="rfqId"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Linked RFQ (Optional)
                    </FieldLabel>
                    <SearchableSelect
                      options={rfqOptions}
                      value={field.value ?? null}
                      onValueChange={(v) => field.onChange(v ?? undefined)}
                      placeholder="Select RFQ..."
                      searchPlaceholder="Search RFQs..."
                      emptyMessage="No RFQs found."
                    />
                  </Field>
                )}
              />

              {/* Description */}
              <Controller
                name="description"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Description
                    </FieldLabel>
                    <Textarea
                      {...field}
                      placeholder="Describe the purchase order..."
                      rows={3}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Issue Date + Expected Date */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="issueDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Issue Date
                      </FieldLabel>
                      <InputWrapper>
                        <Input type="date" {...field} aria-invalid={fieldState.invalid} />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="expectedDate"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Expected Delivery Date
                      </FieldLabel>
                      <InputWrapper>
                        <Input type="date" {...field} />
                      </InputWrapper>
                    </Field>
                  )}
                />
              </div>

              {/* Contact — pick from directory */}
              <Field>
                <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                  Contact
                </FieldLabel>
                <SearchableSelect
                  options={contactOptions}
                  value={null}
                  onValueChange={(contactId) => {
                    if (!contactId) return;
                    const contact = contactsById.get(contactId);
                    if (!contact) return;
                    setValue('contactName', contact.fullName, { shouldDirty: true });
                    setValue('contactEmail', contact.email?.email ?? '', { shouldDirty: true });
                    setValue('contactPhone', contact.phoneNumber?.phone ?? '', { shouldDirty: true });
                  }}
                  placeholder="Search contacts..."
                  searchPlaceholder="Search by name..."
                  emptyMessage="No contacts found."
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Select a contact to auto-fill the fields below, or enter manually.
                </p>
              </Field>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Controller
                  name="contactName"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Contact Name
                      </FieldLabel>
                      <InputWrapper>
                        <User className="size-4" />
                        <Input {...field} placeholder="John Smith" autoComplete="off" />
                      </InputWrapper>
                    </Field>
                  )}
                />

                <Controller
                  name="contactEmail"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Contact Email
                      </FieldLabel>
                      <InputWrapper>
                        <Mail className="size-4" />
                        <Input
                          {...field}
                          type="email"
                          placeholder="john@vendor.com"
                          autoComplete="off"
                          aria-invalid={fieldState.invalid}
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="contactPhone"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Contact Phone
                      </FieldLabel>
                      <InputWrapper>
                        <Phone className="size-4" />
                        <Input
                          {...field}
                          type="tel"
                          placeholder="(555) 000-0000"
                          autoComplete="off"
                        />
                      </InputWrapper>
                    </Field>
                  )}
                />
              </div>

              {/* Lead Time + Ship To */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="leadTime"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Lead Time (Days)
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          min={1}
                          step={1}
                          placeholder="e.g. 30"
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value.replace(/[^0-9]/g, ''))}
                          onKeyDown={(e) => { if (['e', 'E', '+', '-', '.'].includes(e.key)) e.preventDefault(); }}
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
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Ship To Address
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          {...field}
                          placeholder="123 Job Site Rd, City ST 00000"
                          autoComplete="off"
                        />
                      </InputWrapper>
                    </Field>
                  )}
                />
              </div>

              {/* Notes + Vendor Notes */}
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Internal Notes
                    </FieldLabel>
                    <Textarea {...field} placeholder="Internal notes..." rows={2} />
                  </Field>
                )}
              />

              <Controller
                name="vendorNotes"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Vendor Notes
                    </FieldLabel>
                    <Textarea {...field} placeholder="Notes visible to vendor..." rows={2} />
                  </Field>
                )}
              />
            </CardContent>
          </Card>

          {/* ---- Section 2: Financial ---- */}
          <Card id="financial">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Financial</h2>
                <p className="text-sm text-muted-foreground">
                  Payment terms, tax, and retainage settings.
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <Controller
                  name="paymentTerms"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Payment Terms
                      </FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_TERMS_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
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
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Tax %
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.001}
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(Number(e.target.value))}
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
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Retainage %
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.5}
                          value={field.value ?? 10}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          aria-invalid={fieldState.invalid}
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* ---- Section 3: Line Items ---- */}
          <LineItems
            control={control}
            fieldPrefix="lineItems"
            fields={fields}
            append={append}
            remove={remove}
            costCodeOptions={costCodeOptions}
            rootError={formState.errors.lineItems?.root}
            showLineTotal
          >
            {/* Receipt-style totals */}
            <Separator className="mt-4" />
            <div className="flex justify-end pt-4">
              <div className="w-full max-w-sm space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Markup</span>
                  <Controller
                    name="markupAmount"
                    control={control}
                    render={({ field }) => (
                      <InputWrapper className="w-32">
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          className="text-right"
                        />
                      </InputWrapper>
                    )}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({watch('taxPercent') ?? 0}%)</span>
                  <span className="font-medium tabular-nums">{formatCurrency(taxAmount)}</span>
                </div>
                <Separator />
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </LineItems>

          {/* ---- Section 4: Documents ---- */}
          <Card id="documents">
            <CardHeader>
              <CardTitle className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <FileDropZone
                value={null}
                onChange={(file) => {
                  if (file) setSelectedFiles((prev) => [...prev, file]);
                }}
                disabled={false}
              />
              {selectedFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={`${file.name}-${idx}`}
                      className="flex items-center justify-between rounded-lg border p-2.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <span className="text-sm font-medium truncate block">{file.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        mode="icon"
                        size="sm"
                        type="button"
                        onClick={() => setSelectedFiles((prev) => prev.filter((_, i) => i !== idx))}
                      >
                        <X className="size-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              {isEditMode && existingPO && (existingPO as any).attachments?.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
                    Existing Documents
                  </div>
                  {(existingPO as any).attachments.map((att: { id: string; document?: { id: string; name: string } }) => (
                    <div
                      key={att.id}
                      className="flex items-center gap-3 rounded-lg border p-2.5"
                    >
                      <FileText className="size-4 text-muted-foreground shrink-0" />
                      <span className="text-sm font-medium truncate">
                        {att.document?.name ?? 'Document'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </FormContent>
      </FormLayout>
    </form>
  );
}
