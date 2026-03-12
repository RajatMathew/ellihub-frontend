import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Mail, Phone, User } from 'lucide-react';
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
import { useCostCodesQuery } from '@modules/catalog/hooks';
import { useContactsQuery, useVendorsQuery } from '@modules/directory/hooks';
import {
  PAYMENT_TERMS_OPTIONS,
  PO_FORM_SECTIONS,
  TRADE_CATEGORY_OPTIONS,
} from '@modules/purchase-orders/constants/po.constants';
import poMockData from '@modules/purchase-orders/mock/po-create.mock.json';
import { useCreatePOMutation, usePODetailQuery, useUpdatePOMutation } from '@modules/purchase-orders/hooks/po.hooks';
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

  const createMutation = useCreatePOMutation();
  const updateMutation = useUpdatePOMutation();

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

  const { control, handleSubmit, formState, reset, setValue } = useForm<CreatePOInput>({
    resolver: zodResolver(createPOInputSchema),
    defaultValues: {
      projectId,
      vendorId: '',
      tradeCategory: 'MATERIAL',
      description: '',
      contactName: '',
      contactEmail: '',
      contactPhone: '',
      leadTime: '',
      issueDate: new Date().toISOString().slice(0, 10),
      expectedDate: '',
      shipToAddress: '',
      taxPercent: 0,
      paymentTerms: 'NET_30',
      retainagePercent: 10,
      notes: '',
      vendorNotes: '',
      lineItems: [{ description: '', quantity: 1, unit: 'EA', unitPrice: 0 }],
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (isEditMode && existingPO) {
      reset({
        projectId: existingPO.projectId,
        vendorId: existingPO.vendorId,
        tradeCategory: existingPO.tradeCategory,
        description: existingPO.description,
        contactName: existingPO.contactName ?? '',
        contactEmail: existingPO.contactEmail ?? '',
        contactPhone: existingPO.contactPhone ?? '',
        leadTime: existingPO.leadTime ?? '',
        issueDate: existingPO.issueDate?.split('T')[0] ?? '',
        expectedDate: existingPO.expectedDate?.split('T')[0] ?? '',
        shipToAddress: existingPO.shipToAddress ?? '',
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
      });
    }
  }, [isEditMode, existingPO, reset]);

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  const [activeSection, setActiveSection] = useState<string>('po-details');
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (formData: CreatePOInput) => {
    if (isEditMode && poId) {
      updateMutation.mutate(
        { id: poId, data: formData },
        { onSuccess: () => navigate('..', { relative: 'path' }) },
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => navigate('..', { relative: 'path' }),
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
      onSubmit={handleSubmit(onSubmit, (errors) => console.warn('Validation errors:', errors))}
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
                      <Select value={field.value} onValueChange={field.onChange}>
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
                        Lead Time
                      </FieldLabel>
                      <InputWrapper>
                        <Input {...field} placeholder="e.g. 2-3 weeks" autoComplete="off" />
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
          />
        </FormContent>
      </FormLayout>
    </form>
  );
}
