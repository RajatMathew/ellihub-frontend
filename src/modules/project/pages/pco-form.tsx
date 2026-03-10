import { useEffect, useState } from 'react';

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
import { Switch } from '@app/components/ui/switch';
import { Textarea } from '@app/components/ui/textarea';

import { FormSectionNav } from '@app/components/form-section-nav';
import { LineItems } from '@app/components/line-items';
import { useContactsQuery } from '@modules/directory/hooks';
import { useCostCodesQuery } from '@modules/catalog/hooks';
import { PCO_FORM_SECTIONS, PCO_PRIORITY_OPTIONS } from '../constants/pco.constants';
import {
  useAddPCOLineItemMutation,
  useCreatePCOMutation,
  usePCOChangeTypesQuery,
  usePCODetailQuery,
  useRemovePCOLineItemMutation,
  useUpdatePCOLineItemMutation,
  useUpdatePCOMutation,
} from '../hooks';
import {
  createPCOInputSchema,
  type CreatePCOInput,
  type PCODetail,
  type PCOLineItem,
  type PCOLineItemInput,
} from '../schemas/pco.schema';

/* ---- Helpers ---- */

function computeLineItemDiff(
  original: PCOLineItem[],
  current: PCOLineItemInput[],
) {
  const toRemove = original.slice(current.length);
  const toAdd = current.slice(original.length);
  const toUpdate: { lineItemId: string; data: PCOLineItemInput }[] = [];

  for (let i = 0; i < Math.min(original.length, current.length); i++) {
    const orig = original[i];
    const curr = current[i];
    if (
      orig.title !== curr.title ||
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

export function PCOFormPage() {
  const { projectId = '', pcoId } = useParams<{ projectId: string; pcoId: string }>();
  const navigate = useNavigate();
  const isEdit = !!pcoId;

  const { data: pcoDetail, isLoading: isLoadingDetail } = usePCODetailQuery(pcoId ?? '');
  const { data: changeTypes = [] } = usePCOChangeTypesQuery();
  const { data: contactsData } = useContactsQuery({ page: 1, size: 1000 });
  const { data: costCodesData } = useCostCodesQuery();

  const createMutation = useCreatePCOMutation();
  const updateMutation = useUpdatePCOMutation();
  const addLineItemMutation = useAddPCOLineItemMutation();
  const updateLineItemMutation = useUpdatePCOLineItemMutation();
  const removeLineItemMutation = useRemovePCOLineItemMutation();

  const changeTypeOptions = changeTypes.map((ct) => ({ value: ct.id, label: ct.name }));
  const contactOptions = (contactsData?.data ?? []).map((c) => ({
    value: c.id,
    label: c.fullName,
  }));
  const costCodeOptions = (costCodesData?.data ?? []).map((cc) => ({
    value: cc.id,
    label: `${cc.code} - ${cc.name}`,
  }));

  const defaultValues: CreatePCOInput = {
    projectId,
    date: new Date().toISOString().slice(0, 10),
    title: '',
    description: '',
    amount: 0,
    markupAmount: 0,
    scheduleImpactDays: 0,
    requestedBy: '',
    contactId: undefined,
    changeTypeId: undefined,
    priority: 'MEDIUM',
    impactsSchedule: false,
    estimatedCost: 0,
    costCodeId: undefined,
    lineItems: [{ title: '', description: '', qty: 1, unit: 'EA', unitPrice: 0 }],
  };

  const { control, handleSubmit, reset, watch, formState } = useForm<CreatePCOInput>({
    resolver: zodResolver(createPCOInputSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  const impactsSchedule = watch('impactsSchedule');

  // Reset form when detail loads in edit mode
  useEffect(() => {
    if (isEdit && pcoDetail) {
      reset({
        projectId: pcoDetail.project?.id ?? projectId,
        date: pcoDetail.date?.slice(0, 10) ?? '',
        title: pcoDetail.title,
        description: pcoDetail.description ?? '',
        amount: pcoDetail.amount,
        markupAmount: pcoDetail.markupAmount ?? 0,
        scheduleImpactDays: pcoDetail.scheduleImpactDays ?? 0,
        requestedBy: pcoDetail.requestedBy ?? '',
        contactId: pcoDetail.contactId ?? undefined,
        changeTypeId: pcoDetail.changeTypeId ?? undefined,
        priority: pcoDetail.priority ?? 'MEDIUM',
        impactsSchedule: pcoDetail.impactsSchedule ?? false,
        estimatedCost: pcoDetail.estimatedCost ?? 0,
        costCodeId: pcoDetail.costCodeId ?? undefined,
        lineItems: pcoDetail.lineItems.length > 0
          ? pcoDetail.lineItems.map((li) => ({
              title: li.title,
              description: li.description ?? '',
              qty: li.qty,
              unit: li.unit ?? '',
              unitPrice: li.unitPrice,
              costCodeId: li.costCodeId ?? undefined,
            }))
          : [{ title: '', description: '', qty: 1, unit: 'EA', unitPrice: 0 }],
      });
    }
  }, [isEdit, pcoDetail, reset, projectId]);

  const [activeSection, setActiveSection] = useState<string>('pco-details');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (formData: CreatePCOInput) => {
    // Auto-set line item title from description (title is required by backend)
    formData.lineItems = formData.lineItems.map((li) => ({
      ...li,
      title: li.title || li.description,
    }));

    if (isEdit && pcoId && pcoDetail) {
      setIsSaving(true);
      try {
        // 1. Update basic PCO fields
        await updateMutation.mutateAsync({
          id: pcoId,
          data: {
            date: formData.date,
            title: formData.title,
            description: formData.description,
            amount: formData.amount,
            markupAmount: formData.markupAmount,
            scheduleImpactDays: formData.scheduleImpactDays,
            requestedBy: formData.requestedBy,
            contactId: formData.contactId ?? null,
            changeTypeId: formData.changeTypeId ?? null,
            priority: formData.priority,
            impactsSchedule: formData.impactsSchedule,
            estimatedCost: formData.estimatedCost,
            costCodeId: formData.costCodeId ?? null,
          },
        });

        // 2. Persist line item changes via sub-resource APIs
        const originalItems = pcoDetail.lineItems ?? [];
        const { toRemove, toAdd, toUpdate } = computeLineItemDiff(
          originalItems,
          formData.lineItems,
        );

        const ops: Promise<unknown>[] = [
          ...toRemove.map((item) =>
            removeLineItemMutation.mutateAsync({ pcoId, lineItemId: item.id }),
          ),
          ...toUpdate.map((item) =>
            updateLineItemMutation.mutateAsync({
              pcoId,
              lineItemId: item.lineItemId,
              data: item.data,
            }),
          ),
          ...toAdd.map((item) =>
            addLineItemMutation.mutateAsync({ pcoId, data: item }),
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
        <div className="text-sm text-muted-foreground">Loading change order...</div>
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
                Prime Change Orders
              </Link>
            </div>
            <ToolbarPageTitle>
              {isEdit ? 'Edit Change Order' : 'New Change Order'}
            </ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEdit
                ? 'Update the change order details below.'
                : 'Create a new prime change order.'}
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
              {isEdit ? 'Save Changes' : 'Create Change Order'}
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <Separator />

      {/* Main layout: sidebar nav + content */}
      <FormSectionNav
        sections={PCO_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="pt-6 space-y-6">
          {/* ---- Section 1: Change Order Details ---- */}
          <Card id="pco-details">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Change Order Details</h2>
                <p className="text-sm text-muted-foreground">
                  Core information about this change order.
                </p>
              </div>

              <Separator />

              {/* Date + Priority */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="date"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
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
                  name="priority"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Priority
                      </FieldLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select priority..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PCO_PRIORITY_OPTIONS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Title */}
              <Controller
                name="title"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Title
                    </FieldLabel>
                    <InputWrapper>
                      <Input
                        {...field}
                        placeholder="e.g. Foundation reinforcement"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                      placeholder="Describe the change order..."
                      rows={4}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Change Type + Contact */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="changeTypeId"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Change Type
                      </FieldLabel>
                      <SearchableSelect
                        options={changeTypeOptions}
                        value={field.value ?? null}
                        onValueChange={(v) => field.onChange(v ?? undefined)}
                        placeholder="Select change type..."
                        searchPlaceholder="Search types..."
                        emptyMessage="No change types found."
                      />
                    </Field>
                  )}
                />

                <Controller
                  name="contactId"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Contact
                      </FieldLabel>
                      <SearchableSelect
                        options={contactOptions}
                        value={field.value ?? null}
                        onValueChange={(v) => field.onChange(v ?? undefined)}
                        placeholder="Select contact..."
                        searchPlaceholder="Search contacts..."
                        emptyMessage="No contacts found."
                      />
                    </Field>
                  )}
                />
              </div>

              {/* Requested By */}
              <Controller
                name="requestedBy"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Requested By
                    </FieldLabel>
                    <InputWrapper>
                      <Input
                        {...field}
                        placeholder="e.g. John Doe"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Impacts Schedule + Schedule Impact Days */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="impactsSchedule"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Impacts Schedule
                      </FieldLabel>
                      <div className="flex items-center gap-2 pt-1">
                        <Switch checked={field.value ?? false} onCheckedChange={field.onChange} />
                        <span className="text-sm text-muted-foreground">
                          {field.value ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </Field>
                  )}
                />

                {impactsSchedule && (
                  <Controller
                    name="scheduleImpactDays"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Schedule Impact (Days)
                        </FieldLabel>
                        <InputWrapper>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            aria-invalid={fieldState.invalid}
                          />
                        </InputWrapper>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* ---- Section 2: Financial Info ---- */}
          <Card id="financial">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Financial Info</h2>
                <p className="text-sm text-muted-foreground">
                  Cost and markup details for this change order.
                </p>
              </div>

              <Separator />

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="amount"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Amount
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
                  name="markupAmount"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Markup Amount
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

              <Controller
                name="estimatedCost"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Estimated Cost
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
            defaultItem={{ title: '', description: '', qty: 1, unit: 'EA', unitPrice: 0 }}
            rootError={formState.errors.lineItems?.root}
          />
      </div>
    </form>
  );
}
