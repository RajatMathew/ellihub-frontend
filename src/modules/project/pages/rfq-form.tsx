import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Search } from 'lucide-react';
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
import { useVendorsQuery } from '@modules/directory/hooks/vendors.hooks';
import { BIDDING_TYPE_OPTIONS, RFQ_FORM_SECTIONS } from '../constants/rfq.constants';
import {
  useAddRFQDeliverableMutation,
  useCreateRFQMutation,
  useInviteVendorsMutation,
  useRFQDetailQuery,
  useRemoveRFQDeliverableMutation,
  useUpdateRFQDeliverableMutation,
  useUpdateRFQMutation,
} from '../hooks';
import {
  createRFQInputSchema,
  type CreateRFQInput,
  type RFQDeliverable,
  type RFQDeliverableInput,
} from '../schemas/rfq.schema';

/* ---- Helpers ---- */

function computeDeliverableDiff(
  original: RFQDeliverable[],
  current: RFQDeliverableInput[],
) {
  const toRemove = original.slice(current.length);
  const toAdd = current.slice(original.length);
  const toUpdate: { deliverableId: string; data: RFQDeliverableInput }[] = [];

  for (let i = 0; i < Math.min(original.length, current.length); i++) {
    const orig = original[i];
    const curr = current[i];
    if (
      orig.description !== curr.description ||
      (orig.specifications ?? '') !== (curr.specifications ?? '') ||
      orig.quantity !== curr.quantity ||
      orig.unit !== curr.unit ||
      (orig.costCodeId ?? undefined) !== curr.costCodeId ||
      (orig.estimatedUnitPrice ?? undefined) !== curr.estimatedUnitPrice
    ) {
      toUpdate.push({ deliverableId: orig.id, data: curr });
    }
  }

  return { toRemove, toAdd, toUpdate };
}

/* ---- Page ---- */

export default function RFQFormPage() {
  const { projectId = '', rfqId } = useParams<{ projectId: string; rfqId: string }>();
  const navigate = useNavigate();
  const isEdit = !!rfqId;

  const { data: rfqDetail, isLoading: isLoadingDetail } = useRFQDetailQuery(rfqId ?? '');
  const { data: costCodesData } = useCostCodesQuery();

  const costCodeOptions = (costCodesData?.data ?? []).map((cc) => ({
    value: cc.id,
    label: `${cc.code} - ${cc.name}`,
  }));

  const createMutation = useCreateRFQMutation();
  const updateMutation = useUpdateRFQMutation();
  const addDeliverableMutation = useAddRFQDeliverableMutation();
  const updateDeliverableMutation = useUpdateRFQDeliverableMutation();
  const removeDeliverableMutation = useRemoveRFQDeliverableMutation();
  const inviteVendorsMutation = useInviteVendorsMutation();

  // Vendor selection (not part of Zod schema — sent via invite-vendors after create)
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>([]);
  const [vendorSearch, setVendorSearch] = useState('');
  const { data: vendorsData } = useVendorsQuery({ page: 1, limit: 1000 });
  const vendors = vendorsData?.data ?? [];

  const defaultValues: CreateRFQInput = {
    projectId,
    title: '',
    description: '',
    estimatedBudget: undefined,
    bidDeadline: '',
    biddingType: 'ANONYMOUS',
    minimumVendors: 3,
    deliverables: [
      { description: '', quantity: 0, unit: '' },
    ],
  };

  const { control, handleSubmit, reset, formState } = useForm<CreateRFQInput>({
    resolver: zodResolver(createRFQInputSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'deliverables' });

  // Reset form when detail loads in edit mode
  useEffect(() => {
    if (isEdit && rfqDetail) {
      reset({
        projectId: rfqDetail.project?.id ?? projectId,
        title: rfqDetail.title,
        description: rfqDetail.description ?? '',
        estimatedBudget: rfqDetail.estimatedBudget ?? undefined,
        bidDeadline: rfqDetail.bidDeadline?.slice(0, 10) ?? '',
        biddingType: (rfqDetail.biddingType as 'ANONYMOUS' | 'OPEN') ?? 'ANONYMOUS',
        minimumVendors: rfqDetail.minimumVendors ?? 3,
        deliverables:
          rfqDetail.deliverables.length > 0
            ? rfqDetail.deliverables.map((d) => ({
                description: d.description,
                specifications: d.specifications ?? '',
                quantity: d.quantity,
                unit: d.unit,
                costCodeId: d.costCodeId ?? undefined,
                estimatedUnitPrice: d.estimatedUnitPrice ?? undefined,
              }))
            : [{ description: '', specifications: '', quantity: 0, unit: '' }],
      });
      // Load already-invited vendor IDs
      const existingVendorIds = rfqDetail.invites
        ?.map((inv) => inv.vendorId)
        .filter((id): id is string => !!id) ?? [];
      setSelectedVendorIds(existingVendorIds);
    }
  }, [isEdit, rfqDetail, reset, projectId]);

  const [activeSection, setActiveSection] = useState<string>('rfq-details');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending || inviteVendorsMutation.isPending;

  const onSubmit = async (formData: CreateRFQInput) => {
    if (isEdit && rfqId && rfqDetail) {
      setIsSaving(true);
      try {
        await updateMutation.mutateAsync({
          id: rfqId,
          data: {
            title: formData.title,
            description: formData.description || null,
            estimatedBudget: formData.estimatedBudget ?? null,
            bidDeadline: formData.bidDeadline,
            biddingType: formData.biddingType,
            minimumVendors: formData.minimumVendors,
          },
        });

        const originalItems = rfqDetail.deliverables ?? [];
        const { toRemove, toAdd, toUpdate } = computeDeliverableDiff(
          originalItems,
          formData.deliverables,
        );

        const ops: Promise<unknown>[] = [
          ...toRemove.map((item) =>
            removeDeliverableMutation.mutateAsync({ rfqId, deliverableId: item.id }),
          ),
          ...toUpdate.map((item) =>
            updateDeliverableMutation.mutateAsync({
              rfqId,
              deliverableId: item.deliverableId,
              data: item.data,
            }),
          ),
          ...toAdd.map((item) =>
            addDeliverableMutation.mutateAsync({ rfqId, data: item }),
          ),
        ];

        if (ops.length > 0) {
          const results = await Promise.allSettled(ops);
          const failures = results.filter((r) => r.status === 'rejected');
          if (failures.length > 0) {
            toast.error(`${failures.length} deliverable operation(s) failed.`);
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
        onSuccess: async (created) => {
          // Invite selected vendors if any
          if (selectedVendorIds.length > 0) {
            try {
              await inviteVendorsMutation.mutateAsync({
                rfqId: created.id,
                data: { vendorIds: selectedVendorIds },
              });
            } catch {
              // toast already shown by the hook
            }
          }
          navigate('..', { relative: 'path' });
        },
      });
    }
  };

  if (isEdit && isLoadingDetail) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading RFQ...</div>
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
                RFQs
              </Link>
            </div>
            <ToolbarPageTitle>
              {isEdit ? 'Edit RFQ' : 'New RFQ'}
            </ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEdit
                ? 'Update the RFQ details below.'
                : 'Create a new request for quotation.'}
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
              {isEdit ? 'Save Changes' : 'Create RFQ'}
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* Main layout: top nav + content */}
      <FormSectionNav
        sections={RFQ_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="pt-6 space-y-6">
          {/* ---- Section 1: RFQ Details ---- */}
          <Card id="rfq-details">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">RFQ Details</h2>
                <p className="text-sm text-muted-foreground">
                  Core information about this request for quotation.
                </p>
              </div>

              <Separator />

              {/* Bid Deadline + Bidding Type */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="bidDeadline"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Bid Deadline
                      </FieldLabel>
                      <InputWrapper>
                        <Input type="date" {...field} aria-invalid={fieldState.invalid} />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="biddingType"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Bidding Type
                      </FieldLabel>
                      <Select value={field.value ?? 'ANONYMOUS'} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select bidding type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {BIDDING_TYPE_OPTIONS.map((opt) => (
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
                        placeholder="e.g. Structural Steel Supply"
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
                      placeholder="Describe the scope of work..."
                      rows={4}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Estimated Budget */}
              <Controller
                name="estimatedBudget"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Estimated Budget
                    </FieldLabel>
                    <InputWrapper>
                      <span className="text-muted-foreground text-sm">$</span>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value === '' ? undefined : e.target.valueAsNumber,
                          )
                        }
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        placeholder="0.00"
                        aria-invalid={fieldState.invalid}
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Minimum Vendors */}
              <Controller
                name="minimumVendors"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Minimum Vendors
                    </FieldLabel>
                    <InputWrapper>
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        value={field.value ?? 3}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                        aria-invalid={fieldState.invalid}
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </CardContent>
          </Card>

          {/* ---- Section 2: Deliverables ---- */}
          <LineItems
            id="deliverables"
            control={control}
            fieldPrefix="deliverables"
            fields={fields}
            append={append}
            remove={remove}
            costCodeOptions={costCodeOptions}
            fieldNames={{ unitPrice: 'estimatedUnitPrice' }}
            defaultItem={{ description: '', quantity: 0, unit: '' }}
            rootError={formState.errors.deliverables?.root}
            title="Deliverables"
            subtitle="At least one deliverable is required."
            addLabel="Add Deliverable"
          />

          {/* ---- Section 3: Vendors ---- */}
          <Card id="vendors">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Vendors</h2>
                <p className="text-sm text-muted-foreground">
                  Select vendors to invite when this RFQ is created.
                </p>
              </div>

              <Separator />

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  className="pl-9"
                  autoComplete="off"
                />
              </div>

              {/* Vendor list */}
              <div className="max-h-72 overflow-y-auto space-y-1 rounded-md border p-3">
                {vendors
                  .filter((v) =>
                    v.name.toLowerCase().includes(vendorSearch.toLowerCase()),
                  )
                  .map((v) => (
                    <label
                      key={v.id}
                      className="flex items-center gap-2.5 py-1.5 text-sm cursor-pointer hover:bg-accent rounded px-1.5"
                    >
                      <input
                        type="checkbox"
                        className="accent-primary"
                        checked={selectedVendorIds.includes(v.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedVendorIds((prev) => [...prev, v.id]);
                          } else {
                            setSelectedVendorIds((prev) =>
                              prev.filter((id) => id !== v.id),
                            );
                          }
                        }}
                      />
                      {v.name}
                    </label>
                  ))}
                {vendors.length === 0 && (
                  <p className="text-sm text-muted-foreground py-2 text-center">
                    No vendors found.
                  </p>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                {selectedVendorIds.length} vendor{selectedVendorIds.length !== 1 ? 's' : ''} selected
              </p>
            </CardContent>
          </Card>
      </div>
    </form>
  );
}
