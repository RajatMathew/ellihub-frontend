import { useEffect, useState, useCallback } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, FileText, Shuffle, X } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';

import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@app/components/toolbar/toolbar';
import { Button } from '@app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
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

import { FileDropZone } from '@app/components/ui/file-drop-zone';
import { FormSectionNav } from '@app/components/form-section-nav';
import { CostEstimationSections } from '@modules/project/components/cost-estimation-sections';
import { useContactsQuery } from '@modules/directory/hooks';
import { useCostCodesQuery, useCreateCostCodeMutation } from '@modules/catalog/hooks';
import { CostCodeFormDialog } from '@modules/catalog/components/costcode-form-dialog';
import { filesApi } from '@modules/files/api/files.api';
import { PCO_FORM_SECTIONS, PCO_PRIORITY_OPTIONS } from '../constants/pco.constants';
import { useAddPCOAttachmentMutation } from '../hooks/pco-attachment.hooks';
import { useProjectFolderQuery } from '../hooks/use-project-folder';
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
  type PCOLineItem,
  type PCOLineItemInput,
} from '../schemas/pco.schema';

/* ---- Random data for dev ---- */

const RANDOM_PCO_TITLES = [
  'Additional structural steel for mezzanine',
  'Revised HVAC ductwork layout — 3rd floor',
  'Window upgrade to triple-pane glazing',
  'Foundation underpinning — east wall',
  'Added fire suppression to parking garage',
  'Electrical panel upgrade — 200A to 400A',
  'Roof drain relocation per architect RFI',
  'Concrete mix upgrade to 5000 PSI',
  'Added ADA ramp at main entrance',
  'Waterproofing membrane — basement level',
  'Demolition of existing CMU partition walls',
  'Install temporary shoring for beam replacement',
];

const RANDOM_LINE_ITEMS = [
  { description: 'W12x26 steel beams', unit: 'LF', qtyRange: [10, 200], priceRange: [45, 120] },
  { description: 'Concrete 5000 PSI', unit: 'CY', qtyRange: [5, 80], priceRange: [180, 350] },
  { description: '4" PVC conduit', unit: 'LF', qtyRange: [50, 500], priceRange: [8, 25] },
  { description: 'Drywall installation', unit: 'SF', qtyRange: [100, 2000], priceRange: [3, 8] },
  { description: 'Excavation & backfill', unit: 'CY', qtyRange: [10, 150], priceRange: [35, 85] },
  { description: 'Rebar #5 Grade 60', unit: 'TON', qtyRange: [1, 10], priceRange: [1200, 2200] },
  { description: 'Copper piping 3/4"', unit: 'LF', qtyRange: [20, 300], priceRange: [12, 35] },
  { description: 'Demolition labor', unit: 'HR', qtyRange: [8, 80], priceRange: [55, 95] },
  { description: 'Waterproofing membrane', unit: 'SF', qtyRange: [200, 3000], priceRange: [4, 12] },
  { description: 'Temporary shoring', unit: 'DAY', qtyRange: [5, 30], priceRange: [250, 600] },
  { description: 'Fire damper installation', unit: 'EA', qtyRange: [2, 20], priceRange: [180, 450] },
  { description: 'Insulation R-30 batts', unit: 'SF', qtyRange: [100, 1500], priceRange: [2, 6] },
  { description: 'Structural bolts A325', unit: 'EA', qtyRange: [50, 500], priceRange: [3, 12] },
  { description: 'Mobilization / setup', unit: 'LS', qtyRange: [1, 1], priceRange: [1500, 8000] },
];

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randBetween(min: number, max: number, decimals = 0): number {
  const val = Math.random() * (max - min) + min;
  return Number(val.toFixed(decimals));
}

function generateRandomPCO(
  changeTypeOptions: { value: string }[],
  contactOptions: { value: string }[],
  costCodeOptions: { value: string }[],
) {
  const numLineItems = randBetween(1, 5);
  const usedItems = new Set<number>();
  const lineItems = Array.from({ length: numLineItems }, () => {
    let idx: number;
    do { idx = Math.floor(Math.random() * RANDOM_LINE_ITEMS.length); } while (usedItems.has(idx) && usedItems.size < RANDOM_LINE_ITEMS.length);
    usedItems.add(idx);
    const item = RANDOM_LINE_ITEMS[idx];
    return {
      title: '',
      description: item.description,
      qty: randBetween(item.qtyRange[0], item.qtyRange[1]),
      unit: item.unit,
      unitPrice: randBetween(item.priceRange[0], item.priceRange[1], 2),
      category: pick(['MATERIALS', 'LABOR', 'EQUIPMENT', 'SUBCONTRACTOR', 'OTHER'] as const),
      costCodeId: costCodeOptions.length > 0 ? pick(costCodeOptions).value : undefined,
    };
  });

  const subtotal = lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0);
  const markupPercent = pick([0, 0, 5, 10, 15, -5]);
  const markupAmount = Number((subtotal * markupPercent / 100).toFixed(2));

  return {
    date: new Date().toISOString().slice(0, 10),
    title: pick(RANDOM_PCO_TITLES),
    description: '',
    amount: 0,
    markupAmount,
    scheduleImpactDays: pick([0, 0, 3, 5, 7, 14, 21]),
    contactId: contactOptions.length > 0 ? pick(contactOptions).value : undefined,
    changeTypeId: changeTypeOptions.length > 0 ? pick(changeTypeOptions).value : undefined,
    priority: pick(['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'URGENT']),
    costCodeId: undefined,
    lineItems,
  };
}

/* ---- Helpers ---- */

function computeLineItemDiff(
  original: PCOLineItem[],
  current: PCOLineItemInput[],
) {
  const originalById = new Map(original.map((o) => [o.id, o]));
  const matchedIds = new Set<string>();

  const toAdd: PCOLineItemInput[] = [];
  const toUpdate: { lineItemId: string; data: PCOLineItemInput }[] = [];

  for (const curr of current) {
    const origId = curr._originalId;
    if (origId && originalById.has(origId)) {
      matchedIds.add(origId);
      const orig = originalById.get(origId)!;
      // Check if anything changed
      if (
        orig.title !== curr.title ||
        orig.description !== curr.description ||
        orig.qty !== curr.qty ||
        orig.unit !== curr.unit ||
        orig.unitPrice !== curr.unitPrice ||
        (orig.category ?? 'MATERIALS') !== (curr.category ?? 'MATERIALS') ||
        (orig.costCodeId ?? undefined) !== curr.costCodeId
      ) {
        toUpdate.push({ lineItemId: origId, data: curr });
      }
    } else {
      // New item (no _originalId or ID not found in original)
      toAdd.push(curr);
    }
  }

  // Original items not matched → removed
  const toRemove = original.filter((o) => !matchedIds.has(o.id));

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

  const { data: pcoFolderId } = useProjectFolderQuery(projectId || undefined, 'prime co');

  const createMutation = useCreatePCOMutation();
  const updateMutation = useUpdatePCOMutation();
  const addLineItemMutation = useAddPCOLineItemMutation();
  const updateLineItemMutation = useUpdatePCOLineItemMutation();
  const removeLineItemMutation = useRemovePCOLineItemMutation();
  const createCostCodeMutation = useCreateCostCodeMutation();
  const addAttachmentMutation = useAddPCOAttachmentMutation();

  const [costCodeDialogOpen, setCostCodeDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

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
    contactId: undefined,
    changeTypeId: undefined,
    priority: 'MEDIUM',
    costCodeId: undefined,
    lineItems: [{ title: '', description: '', qty: 1, unit: 'EA', unitPrice: 0, category: 'MATERIALS' }],
  };

  const { control, handleSubmit, reset, watch, getValues, formState } = useForm<CreatePCOInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createPCOInputSchema) as any,
    defaultValues,
  });

  const fieldArray = useFieldArray({ control, name: 'lineItems' });

  const watchedLineItems = watch('lineItems');
  const subtotal = (watchedLineItems ?? []).reduce(
    (sum: number, li: { qty?: number; unitPrice?: number }) =>
      sum + (li.qty ?? 0) * (li.unitPrice ?? 0),
    0,
  );
  const watchedMarkup = watch('markupAmount') ?? 0;
  const total = subtotal + watchedMarkup;

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
        contactId: pcoDetail.contactId ?? undefined,
        changeTypeId: pcoDetail.changeTypeId ?? undefined,
        priority: pcoDetail.priority ?? 'MEDIUM',
        costCodeId: pcoDetail.costCodeId ?? undefined,
        lineItems: pcoDetail.lineItems.length > 0
          ? pcoDetail.lineItems.map((li) => ({
              _originalId: li.id,
              title: li.title,
              description: li.description ?? '',
              qty: li.qty,
              unit: li.unit ?? '',
              unitPrice: li.unitPrice,
              category: li.category ?? 'MATERIALS',
              costCodeId: li.costCodeId ?? undefined,
            }))
          : [{ title: '', description: '', qty: 1, unit: 'EA', unitPrice: 0, category: 'MATERIALS' as const }],
      });
    }
  }, [isEdit, pcoDetail, reset, projectId]);

  const [activeSection, setActiveSection] = useState<string>('pco-details');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const fillRandom = useCallback(() => {
    const data = generateRandomPCO(changeTypeOptions, contactOptions, costCodeOptions);
    reset({ projectId, ...data });
  }, [reset, projectId, changeTypeOptions, contactOptions, costCodeOptions]);

  const onSubmit = async (formData: CreatePCOInput) => {
    // Restore category and _originalId from raw form state (Zod resolver may default them)
    const rawLineItems = getValues('lineItems') ?? [];
    formData.lineItems = formData.lineItems.map((li, i) => ({
      ...li,
      title: li.title || li.description,
      category: rawLineItems[i]?.category ?? li.category ?? 'MATERIALS',
      _originalId: rawLineItems[i]?._originalId ?? li._originalId,
    }));

    // Auto-compute amount from line items
    const computedAmount = formData.lineItems.reduce(
      (sum, li) => sum + (li.qty ?? 0) * (li.unitPrice ?? 0),
      0,
    );
    formData.amount = computedAmount;

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
            contactId: formData.contactId ?? null,
            changeTypeId: formData.changeTypeId ?? null,
            priority: formData.priority,
            costCodeId: formData.costCodeId ?? null,
          },
        });

        // 2. Sync line items using ID-based diff
        const originalItems = pcoDetail.lineItems ?? [];

        // Strip _originalId before sending to backend
        const stripInternal = (li: PCOLineItemInput) => {
           
          const { _originalId, ...rest } = li;
          return rest;
        };

        const { toRemove, toAdd, toUpdate } = computeLineItemDiff(
          originalItems,
          formData.lineItems,
        );

        // Sequential: updates first, then add new items, then remove deleted
        // (add before remove to avoid "must have at least 1" constraint)
        for (const item of toUpdate) {
          await updateLineItemMutation.mutateAsync({
            pcoId,
            lineItemId: item.lineItemId,
            data: stripInternal(item.data),
          });
        }
        for (const item of toAdd) {
          await addLineItemMutation.mutateAsync({ pcoId, data: stripInternal(item) });
        }
        for (const item of toRemove) {
          await removeLineItemMutation.mutateAsync({ pcoId, lineItemId: item.id });
        }

        // 3. Upload new files
        if (selectedFiles.length > 0 && pcoFolderId) {
          await uploadFilesAndAttach(pcoId, pcoFolderId, selectedFiles);
        }

        navigate('..', { relative: 'path' });
      } catch {
        // mutation error toast already shown
      } finally {
        setIsSaving(false);
      }
    } else {
      // Strip internal fields before sending to backend
      formData.lineItems = formData.lineItems.map(({ _originalId, ...rest }) => rest);
      createMutation.mutate(formData, {
        onSuccess: async (created) => {
          // Upload files after PCO creation
          if (selectedFiles.length > 0 && pcoFolderId) {
            await uploadFilesAndAttach(created.id, pcoFolderId, selectedFiles);
          }
          navigate('..', { relative: 'path' });
        },
      });
    }
  };

  async function uploadFilesAndAttach(targetPcoId: string, folderId: string, files: File[]) {
    for (const file of files) {
      try {
        const uploaded = await filesApi.uploadFile(file, {
          name: file.name,
          parentId: folderId,
          mimeType: file.type || undefined,
          size: file.size,
        });
        await addAttachmentMutation.mutateAsync({
          pcoId: targetPcoId,
          data: { fileId: uploaded.id },
        });
      } catch {
        console.warn(`Failed to upload/attach file: ${file.name}`);
      }
    }
  }

  if (isEdit && isLoadingDetail) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading change order...</div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit as any, (errors) => console.warn('Validation errors:', errors))}
      className="container-fluid py-7.5"
    >
      {/* Toolbar */}
      <Toolbar sticky={false}>
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
            {!isEdit && (
              <Button variant="ghost" size="sm" type="button" onClick={fillRandom}>
                <Shuffle className="size-4" />
                Fill Random
              </Button>
            )}
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

      {/* Main layout: top nav + content */}
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

              {/* Schedule Impact Days */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
              </div>
            </CardContent>
          </Card>

          {/* ---- Section 2: Cost Estimation ---- */}
          <div id="line-items" className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Cost Estimation</h2>
              <p className="text-sm text-muted-foreground">
                Add line items by category.
              </p>
            </div>

            <CostEstimationSections
              control={control}
              fieldArray={fieldArray}
              costCodeOptions={costCodeOptions}
              onAddCostCode={() => setCostCodeDialogOpen(true)}
            />

            {formState.errors.lineItems?.root && (
              <p className="text-sm text-destructive">{formState.errors.lineItems.root.message}</p>
            )}

            {/* Grand totals */}
            <div className="flex justify-end">
              <div className="w-full max-w-sm space-y-3 pt-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Subtotal</span>
                  <span className="font-medium tabular-nums">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">Markup</span>
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
                <Separator />
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span className="text-xs font-semibold tracking-widest uppercase">Total</span>
                  <span className="tabular-nums">{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ---- Section 3: Documents ---- */}
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
              {isEdit && pcoDetail && pcoDetail.attachments?.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
                    Existing Documents
                  </div>
                  {pcoDetail.attachments.map((att: { id: string; document?: { id: string; name: string } }) => (
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
      </div>

      <CostCodeFormDialog
        open={costCodeDialogOpen}
        onOpenChange={setCostCodeDialogOpen}
        onSubmit={(data) => {
          createCostCodeMutation.mutate(data as Parameters<typeof createCostCodeMutation.mutate>[0], {
            onSuccess: () => setCostCodeDialogOpen(false),
          });
        }}
        isSubmitting={createCostCodeMutation.isPending}
      />
    </form>
  );
}
