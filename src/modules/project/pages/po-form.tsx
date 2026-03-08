import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Mail, Phone, Plus, Trash2, User } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { MockDataButton } from '@app/components/dev/mock-data-button';
import { FormContent, FormLayout } from '@app/components/form-layout';
import { FormSectionNav } from '@app/components/form-section-nav';
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
import { useVendorsQuery } from '@modules/directory/hooks';
import {
  PAYMENT_TERMS_OPTIONS,
  PO_FORM_SECTIONS,
  TRADE_CATEGORY_OPTIONS,
} from '@modules/purchase-orders/constants/po.constants';
import poMockData from '@modules/purchase-orders/mock/po-create.mock.json';
import { useCreatePOMutation } from '@modules/purchase-orders/hooks/po.hooks';
import {
  createPOInputSchema,
  type CreatePOInput,
} from '@modules/purchase-orders/schemas/po.schema';

/* ---- Page ---- */

export function POFormPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: vendorsData } = useVendorsQuery({ limit: 1000 });
  const { data: costCodesData } = useCostCodesQuery();

  const createMutation = useCreatePOMutation();

  const vendorOptions = (vendorsData?.data ?? []).map((v) => ({
    value: v.id,
    label: v.name,
  }));
  const costCodeOptions = (costCodesData?.data ?? []).map((cc) => ({
    value: cc.id,
    label: `${cc.code} - ${cc.name}`,
  }));

  const { control, handleSubmit, formState, reset } = useForm<CreatePOInput>({
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

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  const [activeSection, setActiveSection] = useState<string>('po-details');
  const isSubmitting = createMutation.isPending;

  const onSubmit = (formData: CreatePOInput) => {
    createMutation.mutate(formData, {
      onSuccess: () => navigate('..', { relative: 'path' }),
    });
  };

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
                Purchase Orders
              </Link>
            </div>
            <ToolbarPageTitle>New Purchase Order</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              Create a new purchase order with line items.
            </span>
          </ToolbarHeading>
          <ToolbarActions>
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
            <Button variant="outline" size="sm" type="button" asChild>
              <Link to=".." relative="path">
                Cancel
              </Link>
            </Button>
            <Button size="sm" type="submit" disabled={isSubmitting}>
              <Check className="size-4" />
              Create PO
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <Separator />

      {/* Main layout: sidebar nav + content */}
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

              {/* Contact Name + Email + Phone */}
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
          <Card id="line-items">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Line Items</h2>
                <p className="text-sm text-muted-foreground">At least one line item is required.</p>
              </div>

              <Separator />

              <div className="overflow-x-scroll space-y-2">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="inline-flex items-end gap-3 rounded-lg bg-foreground/5 border border-border p-4 w-fit"
                  >
                    <div className="w-[200px] shrink-0">
                      <Controller
                        name={`lineItems.${index}.description`}
                        control={control}
                        render={({ field: f, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                              Description
                            </FieldLabel>
                            <InputWrapper>
                              <Input
                                {...f}
                                placeholder="e.g. W12x26 beams"
                                aria-invalid={fieldState.invalid}
                                autoComplete="off"
                              />
                            </InputWrapper>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>
                    {/* TO TEST OVERFLOW */}

                    {/* {Array.from({ length: 5 }).map((_, i) => (
                      <div className="w-[200px] shrink-0">
                        <Controller
                          name={`lineItems.${index}.costCodeId`}
                          control={control}
                          render={({ field: f }) => (
                            <Field>
                              <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                                Cost Code
                              </FieldLabel>
                              <SearchableSelect
                                options={costCodeOptions}
                                value={f.value ?? null}
                                onValueChange={(v) => f.onChange(v ?? undefined)}
                                placeholder="Select cost code..."
                                searchPlaceholder="Search cost codes..."
                                emptyMessage="No cost codes found."
                              />
                            </Field>
                          )}
                        />
                      </div>
                    ))} */}

                    <div className="w-[200px] shrink-0">
                      <Controller
                        name={`lineItems.${index}.costCodeId`}
                        control={control}
                        render={({ field: f }) => (
                          <Field>
                            <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                              Cost Code
                            </FieldLabel>
                            <SearchableSelect
                              options={costCodeOptions}
                              value={f.value ?? null}
                              onValueChange={(v) => f.onChange(v ?? undefined)}
                              placeholder="Select cost code..."
                              searchPlaceholder="Search cost codes..."
                              emptyMessage="No cost codes found."
                            />
                          </Field>
                        )}
                      />
                    </div>
                    <div className="w-[100px] shrink-0">
                      <Controller
                        name={`lineItems.${index}.quantity`}
                        control={control}
                        render={({ field: f, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                              Quantity
                            </FieldLabel>
                            <InputWrapper>
                              <Input
                                type="number"
                                step="0.01"
                                {...f}
                                onChange={(e) => f.onChange(Number(e.target.value))}
                                aria-invalid={fieldState.invalid}
                              />
                            </InputWrapper>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>
                    <div className="w-[100px] shrink-0">
                      <Controller
                        name={`lineItems.${index}.unit`}
                        control={control}
                        render={({ field: f, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                              Unit
                            </FieldLabel>
                            <InputWrapper>
                              <Input
                                {...f}
                                placeholder="e.g. EA, LF, SF"
                                aria-invalid={fieldState.invalid}
                                autoComplete="off"
                              />
                            </InputWrapper>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>
                    <div className="w-[120px] shrink-0">
                      <Controller
                        name={`lineItems.${index}.unitPrice`}
                        control={control}
                        render={({ field: f, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                              Unit Price
                            </FieldLabel>
                            <InputWrapper>
                              <Input
                                type="number"
                                step="0.01"
                                {...f}
                                onChange={(e) => f.onChange(Number(e.target.value))}
                                aria-invalid={fieldState.invalid}
                              />
                            </InputWrapper>
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      mode="icon"
                      className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                ))}
              </div>

              {formState.errors.lineItems?.root && (
                <p className="text-sm text-destructive">
                  {formState.errors.lineItems.root.message}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ description: '', quantity: 1, unit: 'EA', unitPrice: 0 })}
              >
                <Plus className="size-4" />
                Add Line Item
              </Button>
            </CardContent>
          </Card>
        </FormContent>
      </FormLayout>
    </form>
  );
}
