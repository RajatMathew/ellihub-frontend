import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Button } from '@app/components/ui/button';
import { Card, CardContent } from '@app/components/ui/card';
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

import { FormSectionNav } from '@app/components/form-section-nav';
import { LineItems } from '@app/components/line-items';
import { useCostCodesQuery } from '@modules/catalog/hooks';
import { useVendorsQuery } from '@modules/directory/hooks';
import {
  INVOICE_FORM_SECTIONS,
  INVOICE_TYPE_OPTIONS,
  INVOICE_CATEGORY_OPTIONS,
} from '../constants/invoice.constants';
import {
  useAddInvoiceLineItemMutation,
  useCreateInvoiceMutation,
  useInvoiceDetailQuery,
  useRemoveInvoiceLineItemMutation,
  useUpdateInvoiceLineItemMutation,
  useUpdateInvoiceMutation,
} from '../hooks';
import {
  createInvoiceInputSchema,
  type CreateInvoiceInput,
  type InvoiceLineItem,
  type InvoiceLineItemInput,
} from '../schemas/invoice.schema';

/* ---- Helpers ---- */

function computeLineItemDiff(
  original: InvoiceLineItem[],
  current: InvoiceLineItemInput[],
) {
  const toRemove = original.slice(current.length);
  const toAdd = current.slice(original.length);
  const toUpdate: { lineItemId: string; data: InvoiceLineItemInput }[] = [];

  for (let i = 0; i < Math.min(original.length, current.length); i++) {
    const orig = original[i];
    const curr = current[i];
    if (
      orig.description !== curr.description ||
      orig.qty !== curr.qty ||
      orig.unit !== curr.unit ||
      orig.unitPrice !== curr.unitPrice ||
      (orig.costCodeId ?? undefined) !== curr.costCodeId
    ) {
      toUpdate.push({ lineItemId: orig.id, data: curr });
    }
  }

  return { toRemove, toAdd, toUpdate };
}

/* ---- Page ---- */

export function InvoiceFormPage() {
  const { projectId = '', invoiceId } = useParams<{ projectId: string; invoiceId: string }>();
  const navigate = useNavigate();
  const isEdit = !!invoiceId;

  const { data: invoiceDetail, isLoading: isLoadingDetail } = useInvoiceDetailQuery(invoiceId ?? '');
  const { data: vendorsData } = useVendorsQuery({ page: 1, size: 1000 });
  const { data: costCodesData } = useCostCodesQuery();

  const createMutation = useCreateInvoiceMutation();
  const updateMutation = useUpdateInvoiceMutation();
  const addLineItemMutation = useAddInvoiceLineItemMutation();
  const updateLineItemMutation = useUpdateInvoiceLineItemMutation();
  const removeLineItemMutation = useRemoveInvoiceLineItemMutation();

  const vendorOptions = (vendorsData?.data ?? []).map((v) => ({
    value: v.id,
    label: v.name,
  }));
  const costCodeOptions = (costCodesData?.data ?? []).map((cc) => ({
    value: cc.id,
    label: `${cc.code} - ${cc.name}`,
  }));

  const defaultValues: CreateInvoiceInput = {
    projectId,
    vendorId: undefined,
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().slice(0, 10),
    dueDate: '',
    invoiceType: undefined,
    category: undefined,
    notes: '',
    totalAmount: 0,
    taxAmount: 0,
    taxRate: 0,
    retainagePercent: 0,
    lineItems: [{ description: '', qty: 1, unit: 'EA', unitPrice: 0 }],
  };

  const editValues: CreateInvoiceInput | undefined =
    isEdit && invoiceDetail
      ? {
          projectId: invoiceDetail.project?.id ?? projectId,
          vendorId: invoiceDetail.vendor?.id ?? undefined,
          invoiceNumber: invoiceDetail.invoiceNumber ?? '',
          invoiceDate: invoiceDetail.invoiceDate?.slice(0, 10) ?? '',
          dueDate: invoiceDetail.dueDate?.slice(0, 10) ?? '',
          invoiceType: (invoiceDetail.invoiceType as CreateInvoiceInput['invoiceType']) ?? undefined,
          category: (invoiceDetail.category as CreateInvoiceInput['category']) ?? undefined,
          notes: invoiceDetail.notes ?? '',
          totalAmount: invoiceDetail.totalAmount,
          taxAmount: invoiceDetail.taxAmount ?? 0,
          taxRate: invoiceDetail.taxRate ?? 0,
          retainagePercent: invoiceDetail.retainagePercent ?? 0,
          lineItems:
            invoiceDetail.lineItems.length > 0
              ? invoiceDetail.lineItems.map((li) => ({
                  description: li.description ?? '',
                  qty: li.qty,
                  unit: li.unit ?? '',
                  unitPrice: li.unitPrice,
                  costCodeId: li.costCodeId ?? undefined,
                }))
              : [{ description: '', qty: 1, unit: 'EA', unitPrice: 0 }],
        }
      : undefined;

  const { control, handleSubmit, formState } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceInputSchema),
    defaultValues,
    values: editValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  const [activeSection, setActiveSection] = useState<string>('invoice-details');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (formData: CreateInvoiceInput) => {
    if (isEdit && invoiceId && invoiceDetail) {
      setIsSaving(true);
      try {
        await updateMutation.mutateAsync({
          id: invoiceId,
          data: {
            invoiceNumber: formData.invoiceNumber,
            invoiceDate: formData.invoiceDate,
            dueDate: formData.dueDate || undefined,
            invoiceType: (formData.invoiceType as 'PRELIMINARY' | 'FINAL' | 'REVISION') ?? undefined,
            category: (formData.category as 'MATERIALS' | 'LABOR' | 'EQUIPMENT' | 'SUBCONTRACTOR' | 'PROFESSIONAL_SERVICES' | 'OTHER') ?? null,
            notes: formData.notes || null,
            totalAmount: formData.totalAmount,
            taxAmount: formData.taxAmount ?? null,
            taxRate: formData.taxRate ?? null,
            retainagePercent: formData.retainagePercent ?? undefined,
          },
        });

        const originalItems = invoiceDetail.lineItems ?? [];
        const { toRemove, toAdd, toUpdate } = computeLineItemDiff(
          originalItems,
          formData.lineItems ?? [],
        );

        const ops: Promise<unknown>[] = [
          ...toRemove.map((item) =>
            removeLineItemMutation.mutateAsync({ invoiceId, lineItemId: item.id }),
          ),
          ...toUpdate.map((item) =>
            updateLineItemMutation.mutateAsync({
              invoiceId,
              lineItemId: item.lineItemId,
              data: item.data,
            }),
          ),
          ...toAdd.map((item) =>
            addLineItemMutation.mutateAsync({ invoiceId, data: item }),
          ),
        ];

        if (ops.length > 0) {
          const results = await Promise.allSettled(ops);
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length > 0) {
            toast.error(`${failures.length} line item operation(s) failed.`);
            return;
          }
        }

        navigate('..', { relative: 'path' });
      } catch {
        // mutation error toast already shown
      } finally {
        setIsSaving(false);
      }
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => navigate('..', { relative: 'path' }),
      });
    }
  };

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
      {/* Toolbar */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to=".." relative="path" className="hover:text-foreground">
                Invoices
              </Link>
            </div>
            <ToolbarPageTitle>
              {isEdit ? 'Edit Invoice' : 'New Invoice'}
            </ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEdit
                ? 'Update the invoice details below.'
                : 'Create a new invoice.'}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
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

      <Separator />

      {/* Main layout: sidebar nav + content */}
      <FormSectionNav
        sections={INVOICE_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="pt-6 space-y-6">
          {/* ---- Section 1: Invoice Details ---- */}
          <Card id="invoice-details">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Invoice Details</h2>
                <p className="text-sm text-muted-foreground">
                  Core information about this invoice.
                </p>
              </div>

              <Separator />

              {/* Invoice Number + Invoice Date */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="invoiceNumber"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Invoice Number
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          {...field}
                          placeholder="e.g. INV-001"
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
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
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Invoice Date
                      </FieldLabel>
                      <InputWrapper>
                        <Input type="date" {...field} aria-invalid={fieldState.invalid} />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Due Date + Vendor */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="dueDate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Due Date
                      </FieldLabel>
                      <InputWrapper>
                        <Input type="date" {...field} aria-invalid={fieldState.invalid} />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="vendorId"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Vendor
                      </FieldLabel>
                      <SearchableSelect
                        options={vendorOptions}
                        value={field.value ?? null}
                        onValueChange={(v) => field.onChange(v ?? undefined)}
                        placeholder="Select vendor..."
                        searchPlaceholder="Search vendors..."
                        emptyMessage="No vendors found."
                      />
                    </Field>
                  )}
                />
              </div>

              {/* Type + Category */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="invoiceType"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Invoice Type
                      </FieldLabel>
                      <Select
                        key={`invoiceType-${field.value ?? 'empty'}`}
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {INVOICE_TYPE_OPTIONS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />

                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Category
                      </FieldLabel>
                      <Select
                        key={`category-${field.value ?? 'empty'}`}
                        value={field.value ?? ''}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {INVOICE_CATEGORY_OPTIONS.map((c) => (
                            <SelectItem key={c.value} value={c.value}>
                              {c.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </div>

              {/* Notes */}
              <Controller
                name="notes"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Notes
                    </FieldLabel>
                    <Textarea
                      {...field}
                      placeholder="Additional notes..."
                      rows={4}
                    />
                  </Field>
                )}
              />
            </CardContent>
          </Card>

          {/* ---- Section 2: Financial Info ---- */}
          <Card id="financial">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Financial Info</h2>
                <p className="text-sm text-muted-foreground">
                  Amount, tax, and retainage details.
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="totalAmount"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Total Amount
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          aria-invalid={fieldState.invalid}
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
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Tax Amount
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? 0}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          aria-invalid={fieldState.invalid}
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="taxRate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Tax Rate (%)
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
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
                        Retainage (%)
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          value={field.value ?? 0}
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
            fieldNames={{ quantity: 'qty' }}
            defaultItem={{ description: '', qty: 1, unit: 'EA', unitPrice: 0 }}
            rootError={formState.errors.lineItems?.root}
            subtitle="Add line items for this invoice."
          />
      </div>
    </form>
  );
}
