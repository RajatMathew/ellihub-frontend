import { useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
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
import {
  Command,
  CommandCheck,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@app/components/ui/command';
import { Field, FieldError, FieldLabel } from '@app/components/ui/field';
import { Input, InputWrapper } from '@app/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@app/components/ui/popover';
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

import { MockDataButton } from '@app/components/dev/mock-data-button';
import { FormSectionNav } from '@app/components/form-section-nav';
import { cn } from '@app/lib/utils';
import { formatCurrency } from '@app/lib/helpers';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import {
  useCostCodeCategoriesQuery,
  useCostCodesQuery,
  useCreateCostCodeMutation,
} from '@modules/catalog/hooks';
import { usePOsQuery } from '@modules/purchase-orders/hooks/po.hooks';
import scoMockData from '@modules/sco/mock/sco-create.mock.json';
import {
  SCO_CHANGE_TYPE_OPTIONS,
  SCO_FORM_SECTIONS,
  SCO_PRIORITY_OPTIONS,
} from '@modules/sco/constants/sco.constants';
import {
  useAddSCOLineItemMutation,
  useCreateSCOMutation,
  useRemoveSCOLineItemMutation,
  useSCODetailQuery,
  useUpdateSCOLineItemMutation,
  useUpdateSCOMutation,
} from '@modules/sco/hooks/sco.hooks';
import {
  createSCOInputSchema,
  type CreateSCOInput,
  type SCOLineItem,
  type SCOLineItemInput,
} from '@modules/sco/schemas/sco.schema';

/* ---- Helpers ---- */

function computeLineItemDiff(original: SCOLineItem[], current: SCOLineItemInput[]) {
  const toRemove = original.slice(current.length);
  const toAdd = current.slice(original.length);
  const toUpdate: { lineItemId: string; data: SCOLineItemInput }[] = [];

  for (let i = 0; i < Math.min(original.length, current.length); i++) {
    const orig = original[i];
    const curr = current[i];
    if (
      orig.description !== curr.description ||
      orig.quantity !== curr.qty ||
      orig.unit !== curr.unit ||
      orig.unitPrice !== curr.unitPrice ||
      (orig.costCategory ?? undefined) !== curr.costCategory ||
      (orig.costCodeId ?? undefined) !== curr.costCodeId ||
      (orig.notes ?? undefined) !== curr.notes
    ) {
      toUpdate.push({ lineItemId: orig.id, data: curr });
    }
  }

  return { toRemove, toAdd, toUpdate };
}

/* ---- Cost Code Picker ---- */

function generateCostCode(existingCodes: string[]): string {
  const prefix = 'CC';
  let max = 0;
  for (const code of existingCodes) {
    const match = code.match(/^CC-(\d+)$/);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

function CostCodePicker({
  value,
  costCodeId,
  onSelect,
  invalid,
}: {
  value: string;
  costCodeId?: string;
  onSelect: (description: string, costCodeId?: string) => void;
  invalid?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [triggerWidth, setTriggerWidth] = useState(0);

  const { data: costCodesData } = useCostCodesQuery();
  const costCodes = costCodesData?.data ?? [];
  const { data: categories = [] } = useCostCodeCategoriesQuery();
  const createMutation = useCreateCostCodeMutation();

  useEffect(() => {
    if (open && triggerRef.current) {
      setTriggerWidth(triggerRef.current.offsetWidth);
    }
  }, [open]);

  const options = costCodes.map((cc) => ({
    value: cc.id,
    label: `${cc.code} — ${cc.name}`,
  }));

  const selectedLabel = costCodeId
    ? options.find((o) => o.value === costCodeId)?.label ?? value
    : value;

  const handleCreate = async () => {
    if (!newName.trim() || !newCategoryId) return;
    const code = generateCostCode(costCodes.map((cc) => cc.code));
    try {
      const created = await createMutation.mutateAsync({
        name: newName.trim(),
        code,
        costCodeCategoryId: newCategoryId,
        description: newDescription.trim() || undefined,
      });
      const label = `${created.code} — ${created.name}`;
      onSelect(label, created.id);
      setDialogOpen(false);
      setNewName('');
      setNewCategoryId('');
      setNewDescription('');
      toast.success('Cost code created');
    } catch {
      // error toast from mutation
    }
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            ref={triggerRef}
            type="button"
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid}
            className={cn(
              'flex h-8.5 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-[0.8125rem] leading-[var(--text-sm--line-height)] gap-1 shadow-xs shadow-black/5 transition-shadow outline-none',
              'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/30',
              '[&>span]:line-clamp-1',
            )}
          >
            <span className={cn('truncate', !selectedLabel && 'text-muted-foreground')}>
              {selectedLabel || 'Select cost code...'}
            </span>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-60 -me-0.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="p-0 overflow-hidden"
          align="start"
          sideOffset={4}
          style={triggerWidth > 0 ? { width: triggerWidth } : undefined}
        >
          <Command>
            <CommandInput placeholder="Search cost codes..." />
            <CommandList>
              <CommandEmpty>No cost codes found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    keywords={[option.label]}
                    onSelect={() => {
                      onSelect(option.label, option.value);
                      setOpen(false);
                    }}
                  >
                    {option.label}
                    {option.value === costCodeId && <CommandCheck />}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false);
                    setDialogOpen(true);
                  }}
                  className="text-primary"
                >
                  <Plus className="size-4 mr-1" />
                  Create New Cost Code
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-[13px] font-bold tracking-[0.05em] uppercase">
              New Cost Code
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Field>
              <FieldLabel className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase">
                Name
              </FieldLabel>
              <InputWrapper>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Enter name"
                  autoComplete="off"
                />
              </InputWrapper>
            </Field>

            <Field>
              <FieldLabel className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase">
                Category
              </FieldLabel>
              <Select value={newCategoryId} onValueChange={setNewCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel className="text-[11px] font-semibold tracking-[0.05em] text-gray-500 uppercase">
                Description
              </FieldLabel>
              <InputWrapper>
                <Input
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Enter description (optional)"
                  autoComplete="off"
                />
              </InputWrapper>
            </Field>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="h-8 rounded-sm px-3 text-[13px] font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={!newName.trim() || !newCategoryId || createMutation.isPending}
              onClick={handleCreate}
              className="h-8 rounded-sm px-3 text-[13px] font-semibold"
            >
              {createMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---- Page ---- */

export function SCOFormPage() {
  const { projectId = '', scoId } = useParams<{ projectId: string; scoId: string }>();
  const navigate = useNavigate();
  const isEdit = !!scoId;

  const { data: scoDetail, isLoading: isLoadingDetail } = useSCODetailQuery(scoId ?? '');
  const { data: posData } = usePOsQuery({ projectId, size: 1000 });

  const createMutation = useCreateSCOMutation();
  const updateMutation = useUpdateSCOMutation();
  const addLineItemMutation = useAddSCOLineItemMutation();
  const updateLineItemMutation = useUpdateSCOLineItemMutation();
  const removeLineItemMutation = useRemoveSCOLineItemMutation();

  // PO dropdown — exclude DRAFT POs (backend rejects SCOs on DRAFT POs)
  const poOptions = (posData?.data ?? [])
    .filter((po) => po.status?.name !== 'DRAFT')
    .map((po) => ({
      value: po.id,
      label: `${po.poNumber ?? 'Draft'} — ${po.vendor?.name ?? 'Unknown'}`,
    }));

  const defaultValues: CreateSCOInput = {
    purchaseOrderId: '',
    title: '',
    amount: 0,
    markupAmount: 0,
    initiatedBy: 'VENDOR',
    date: new Date().toISOString().slice(0, 10),
    reasonForChange: '',
    detailedScope: '',
    scheduleImpactDays: 0,
    changeType: undefined,
    priority: 'MEDIUM',
    vendorContactName: '',
    vendorContactEmail: '',
    vendorReferenceNumber: '',
    costCodeId: undefined,
    impactsSchedule: false,
    lineItems: [{ description: '', qty: 1, unit: 'EA', unitPrice: 0 }],
  };

  const { control, handleSubmit, reset, watch, setValue, formState } = useForm<CreateSCOInput>({
    resolver: zodResolver(createSCOInputSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  const impactsSchedule = watch('impactsSchedule');
  const watchedLineItems = watch('lineItems');
  const watchedMarkup = watch('markupAmount') ?? 0;

  // Auto-calculate amount from line items
  const lineItemsTotal = watchedLineItems.reduce(
    (sum, li) => sum + (li.qty ?? 0) * (li.unitPrice ?? 0),
    0,
  );
  const calculatedAmount = Math.round(lineItemsTotal * 100) / 100;
  const totalAmount = Math.round((calculatedAmount + watchedMarkup) * 100) / 100;

  // Sync calculated amount (line items only, no markup) to form — backend validates amount === line items sum
  useEffect(() => {
    setValue('amount', calculatedAmount);
  }, [calculatedAmount, setValue]);

  // Reset form when detail loads in edit mode
  useEffect(() => {
    if (isEdit && scoDetail) {
      const liTotal = scoDetail.lineItems.reduce(
        (sum, li) => sum + li.quantity * li.unitPrice,
        0,
      );
      const markup = Math.round((scoDetail.amount - liTotal) * 100) / 100;
      reset({
        purchaseOrderId: scoDetail.purchaseOrder?.id ?? '',
        title: scoDetail.title,
        amount: scoDetail.amount,
        markupAmount: markup > 0 ? markup : 0,
        initiatedBy: scoDetail.initiatedBy as 'VENDOR' | 'FIRM',
        date: scoDetail.date?.slice(0, 10) ?? '',
        reasonForChange: scoDetail.reasonForChange ?? '',
        detailedScope: scoDetail.detailedScope ?? '',
        scheduleImpactDays: scoDetail.scheduleImpactDays ?? 0,
        changeType: scoDetail.changeType?.name ?? undefined,
        priority: scoDetail.priority ?? 'MEDIUM',
        vendorContactName: scoDetail.vendorContactName ?? '',
        vendorContactEmail: scoDetail.vendorContactEmail ?? '',
        vendorReferenceNumber: scoDetail.vendorReferenceNumber ?? '',
        costCodeId: scoDetail.costCode?.id ?? undefined,
        impactsSchedule: (scoDetail.scheduleImpactDays ?? 0) > 0,
        lineItems:
          scoDetail.lineItems.length > 0
            ? scoDetail.lineItems.map((li) => ({
                description: li.description,
                qty: li.quantity,
                unit: li.unit ?? '',
                unitPrice: li.unitPrice,
                costCategory: li.costCategory ?? undefined,
                costCodeId: li.costCodeId ?? undefined,
                notes: li.notes ?? undefined,
              }))
            : [{ description: '', qty: 1, unit: 'EA', unitPrice: 0 }],
      });
    }
  }, [isEdit, scoDetail, reset]);

  const [activeSection, setActiveSection] = useState<string>('sco-details');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const onSubmit = async (formData: CreateSCOInput) => {
    if (isEdit && scoId && scoDetail) {
      setIsSaving(true);
      try {
        await updateMutation.mutateAsync({
          id: scoId,
          data: {
            title: formData.title,
            amount: formData.amount,
            initiatedBy: formData.initiatedBy,
            date: formData.date,
            reasonForChange: formData.reasonForChange,
            detailedScope: formData.detailedScope,
            scheduleImpactDays: formData.impactsSchedule ? formData.scheduleImpactDays : undefined,
            changeType: formData.changeType ?? undefined,
            priority: formData.priority,
            vendorContactName: formData.vendorContactName,
            vendorContactEmail: formData.vendorContactEmail || undefined,
            vendorReferenceNumber: formData.vendorReferenceNumber,
            costCodeId: formData.costCodeId ?? undefined,
          },
        });

        const originalItems = scoDetail.lineItems ?? [];
        const { toRemove, toAdd, toUpdate } = computeLineItemDiff(
          originalItems,
          formData.lineItems,
        );

        const ops: Promise<unknown>[] = [
          ...toRemove.map((item) =>
            removeLineItemMutation.mutateAsync({ scoId, lineItemId: item.id }),
          ),
          ...toUpdate.map((item) =>
            updateLineItemMutation.mutateAsync({
              scoId,
              lineItemId: item.lineItemId,
              data: item.data,
            }),
          ),
          ...toAdd.map((item) =>
            addLineItemMutation.mutateAsync({ scoId, data: item }),
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
      // Strip UI-only fields and clean empty strings before sending to API
      const payload = {
        purchaseOrderId: formData.purchaseOrderId,
        title: formData.title,
        amount: formData.amount,
        initiatedBy: formData.initiatedBy,
        ...(formData.date ? { date: formData.date } : {}),
        ...(formData.reasonForChange ? { reasonForChange: formData.reasonForChange } : {}),
        ...(formData.detailedScope ? { detailedScope: formData.detailedScope } : {}),
        ...(formData.impactsSchedule && formData.scheduleImpactDays ? { scheduleImpactDays: formData.scheduleImpactDays } : {}),
        ...(formData.changeType ? { changeType: formData.changeType } : {}),
        ...(formData.priority ? { priority: formData.priority } : {}),
        ...(formData.vendorContactName ? { vendorContactName: formData.vendorContactName } : {}),
        ...(formData.vendorContactEmail ? { vendorContactEmail: formData.vendorContactEmail } : {}),
        ...(formData.vendorReferenceNumber ? { vendorReferenceNumber: formData.vendorReferenceNumber } : {}),
        ...(formData.costCodeId ? { costCodeId: formData.costCodeId } : {}),
        lineItems: formData.lineItems.map((li) => ({
          description: li.description,
          qty: li.qty,
          unit: li.unit,
          unitPrice: li.unitPrice,
          ...(li.costCategory ? { costCategory: li.costCategory } : {}),
          ...(li.costCodeId ? { costCodeId: li.costCodeId } : {}),
          ...(li.notes ? { notes: li.notes } : {}),
        })),
      };

      createMutation.mutate(payload as CreateSCOInput, {
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
                Subcontractor Change Orders
              </Link>
            </div>
            <ToolbarPageTitle>
              {isEdit ? `Edit ${scoDetail?.scoNumber ?? 'SCO'}` : 'New Subcontractor Change Order'}
            </ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEdit
                ? 'Update the change order details below.'
                : 'Create a new subcontractor change order.'}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            {!isEdit && (
              <MockDataButton
                data={scoMockData}
                onLoad={(entries) => {
                  const d = entries[Math.floor(Math.random() * entries.length)];
                  const randomPO =
                    poOptions[Math.floor(Math.random() * poOptions.length)]?.value ?? '';
                  const liTotal = d.lineItems.reduce(
                    (sum, li) => sum + li.qty * li.unitPrice,
                    0,
                  );
                  const markup = Math.round(liTotal * 0.1 * 100) / 100;
                  reset({
                    ...d,
                    purchaseOrderId: randomPO,
                    title: d.title ?? 'Mock SCO',
                    initiatedBy: (d.initiatedBy ?? 'FIRM') as CreateSCOInput['initiatedBy'],
                    amount: Math.round((liTotal + markup) * 100) / 100,
                    markupAmount: markup,
                    impactsSchedule: false,
                    scheduleImpactDays: 0,
                    lineItems: d.lineItems,
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
              {isEdit ? 'Save Changes' : 'Create SCO'}
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <Separator />

      {/* Main layout: sidebar nav + content */}
      <div className="flex gap-8 pt-8">
        <FormSectionNav
          sections={SCO_FORM_SECTIONS as unknown as { id: string; label: string }[]}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <div className="flex-1 min-w-0 space-y-6">
          {/* ---- Section 1: Change Order Details ---- */}
          <Card id="sco-details">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Change Order Details</h2>
                <p className="text-sm text-muted-foreground">
                  Core information about this subcontractor change order.
                </p>
              </div>

              <Separator />

              {/* Purchase Order */}
              <Controller
                name="purchaseOrderId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Purchase Order *
                    </FieldLabel>
                    <SearchableSelect
                      options={poOptions}
                      value={field.value || null}
                      onValueChange={(v) => field.onChange(v ?? '')}
                      placeholder="Select purchase order..."
                      searchPlaceholder="Search POs..."
                      emptyMessage="No purchase orders found."
                      disabled={isEdit}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Title */}
              <Controller
                name="title"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Title *
                    </FieldLabel>
                    <InputWrapper>
                      <Input
                        {...field}
                        placeholder="e.g. Additional framing for revised wall layout"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Change Type + Initiated By */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="changeType"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Change Type
                      </FieldLabel>
                      <SearchableSelect
                        options={SCO_CHANGE_TYPE_OPTIONS.map((o) => ({
                          value: o.value,
                          label: o.label,
                        }))}
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
                  name="initiatedBy"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Initiated By *
                      </FieldLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VENDOR">Vendor</SelectItem>
                          <SelectItem value="FIRM">Firm</SelectItem>
                        </SelectContent>
                      </Select>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Priority + Date */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Priority
                      </FieldLabel>
                      <Select value={field.value ?? ''} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority..." />
                        </SelectTrigger>
                        <SelectContent>
                          {SCO_PRIORITY_OPTIONS.map((p) => (
                            <SelectItem key={p.value} value={p.value}>
                              {p.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />

                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Date
                      </FieldLabel>
                      <InputWrapper>
                        <Input type="date" {...field} />
                      </InputWrapper>
                    </Field>
                  )}
                />
              </div>

              {/* Reason for Change */}
              <Controller
                name="reasonForChange"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Reason for Change
                    </FieldLabel>
                    <Textarea
                      {...field}
                      placeholder="Describe the reason for this change..."
                      rows={3}
                    />
                  </Field>
                )}
              />

              {/* Detailed Scope */}
              <Controller
                name="detailedScope"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Detailed Scope
                    </FieldLabel>
                    <Textarea
                      {...field}
                      placeholder="Describe the scope of work..."
                      rows={3}
                    />
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
                  Cost details and vendor contact information.
                </p>
              </div>

              <Separator />

              {/* Vendor Contact Name + Email */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="vendorContactName"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Vendor Contact Name
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          {...field}
                          placeholder="e.g. John Smith"
                          autoComplete="off"
                        />
                      </InputWrapper>
                    </Field>
                  )}
                />

                <Controller
                  name="vendorContactEmail"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Vendor Contact Email
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="email"
                          {...field}
                          placeholder="e.g. john@vendor.com"
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Vendor Reference Number */}
              <Controller
                name="vendorReferenceNumber"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Vendor Reference #
                    </FieldLabel>
                    <InputWrapper>
                      <Input
                        {...field}
                        placeholder="e.g. VCO-2025-001"
                        autoComplete="off"
                      />
                    </InputWrapper>
                  </Field>
                )}
              />
            </CardContent>
          </Card>

          {/* ---- Section 3: Line Items ---- */}
          <Card id="line-items">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Line Items</h2>
                <p className="text-sm text-muted-foreground">
                  At least one line item is required.
                </p>
              </div>

              <Separator />

              {fields.map((field, index) => {
                const lineQty = watchedLineItems[index]?.qty ?? 0;
                const linePrice = watchedLineItems[index]?.unitPrice ?? 0;
                const lineAmount = Math.round(lineQty * linePrice * 100) / 100;

                return (
                  <div
                    key={field.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-accent/50 p-4"
                  >
                    <div className="flex-1 space-y-4">
                      {/* Cost Code / Description */}
                      <Controller
                        name={`lineItems.${index}.description`}
                        control={control}
                        render={({ fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                              Cost Code *
                            </FieldLabel>
                            <CostCodePicker
                              value={watchedLineItems[index]?.description ?? ''}
                              costCodeId={watchedLineItems[index]?.costCodeId}
                              onSelect={(description, costCodeId) => {
                                setValue(`lineItems.${index}.description`, description);
                                setValue(`lineItems.${index}.costCodeId`, costCodeId);
                              }}
                              invalid={fieldState.invalid}
                            />
                            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                          </Field>
                        )}
                      />

                      {/* Qty + Unit + Unit Price + Amount */}
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                        <Controller
                          name={`lineItems.${index}.qty`}
                          control={control}
                          render={({ field: f, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                                Qty *
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
                        <Controller
                          name={`lineItems.${index}.unit`}
                          control={control}
                          render={({ field: f, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                                Unit *
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
                        <Controller
                          name={`lineItems.${index}.unitPrice`}
                          control={control}
                          render={({ field: f, fieldState }) => (
                            <Field data-invalid={fieldState.invalid}>
                              <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                                Unit Price *
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
                        <Field>
                          <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                            Amount
                          </FieldLabel>
                          <InputWrapper>
                            <Input
                              type="text"
                              value={formatCurrency(lineAmount)}
                              readOnly
                              className="bg-muted"
                            />
                          </InputWrapper>
                        </Field>
                      </div>

                      {/* Notes */}
                      <Controller
                        name={`lineItems.${index}.notes`}
                        control={control}
                        render={({ field: f }) => (
                          <Field>
                            <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                              Notes
                            </FieldLabel>
                            <InputWrapper>
                              <Input
                                {...f}
                                placeholder="Optional notes"
                                autoComplete="off"
                              />
                            </InputWrapper>
                          </Field>
                        )}
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      mode="icon"
                      className="size-8 mt-6 text-muted-foreground hover:text-destructive"
                      disabled={fields.length <= 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                );
              })}

              {formState.errors.lineItems?.root && (
                <p className="text-sm text-destructive">
                  {formState.errors.lineItems.root.message}
                </p>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  append({ description: '', qty: 1, unit: 'EA', unitPrice: 0 })
                }
              >
                <Plus className="size-4" />
                Add Line Item
              </Button>

              {/* ---- Receipt-style totals ---- */}
              <Separator />

              <div className="flex justify-end">
                <div className="w-full max-w-xs space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(calculatedAmount)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-muted-foreground">Markup</span>
                    <Controller
                      name="markupAmount"
                      control={control}
                      render={({ field }) => (
                        <InputWrapper className="w-32">
                          <Input
                            type="number"
                            step="0.01"
                            value={field.value ?? 0}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            className="text-right text-sm"
                          />
                        </InputWrapper>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Total Amount</span>
                    <span className="text-base">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
