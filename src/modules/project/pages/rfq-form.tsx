import { useCallback, useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, FileText, Shuffle, X } from 'lucide-react';
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
import { Card, CardContent, CardHeader, CardTitle } from '@app/components/ui/card';
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

import { FileDropZone } from '@app/components/ui/file-drop-zone';
import { FormSectionNav } from '@app/components/form-section-nav';
import { LineItems } from '@app/components/line-items';
import { filesApi } from '@modules/files/api/files.api';
import { RFQ_FORM_SECTIONS, RFQ_TRACK_OPTIONS } from '../constants/rfq.constants';
import { useProjectFolderQuery } from '../hooks/use-project-folder';
import {
  useAddRFQDeliverableMutation,
  useCreateRFQMutation,
  useRFQDetailQuery,
  useRemoveRFQDeliverableMutation,
  useUpdateRFQDeliverableMutation,
  useAddRFQAttachmentMutation,
  useUpdateRFQMutation,
} from '../hooks';
import {
  createRFQInputSchema,
  type CreateRFQInput,
  type RFQDeliverable,
  type RFQDeliverableInput,
} from '../schemas/rfq.schema';

/* ---- Random data for dev ---- */

const RANDOM_RFQ_TITLES = [
  'Structural steel supply — Phase 2',
  'HVAC equipment for floors 3-5',
  'Exterior cladding materials',
  'Electrical switchgear & panels',
  'Plumbing fixtures and rough-in materials',
  'Concrete formwork and pour — foundation',
  'Fire protection sprinkler system',
  'Elevator installation — 2 cabs',
  'Roofing membrane and insulation',
  'Window and curtain wall fabrication',
  'Demolition and hazmat abatement',
  'Landscaping and site work',
];

const RANDOM_DELIVERABLES = [
  { description: 'W14x30 steel beams, ASTM A992', unit: 'LF', qtyRange: [50, 500] },
  { description: 'RTU HVAC units, 15-ton capacity', unit: 'EA', qtyRange: [2, 8] },
  { description: 'Aluminum curtain wall panels', unit: 'SF', qtyRange: [500, 5000] },
  { description: '200A electrical distribution panel', unit: 'EA', qtyRange: [4, 20] },
  { description: 'PVC Schedule 40 pipe, 4"', unit: 'LF', qtyRange: [100, 1000] },
  { description: '5000 PSI concrete, delivered', unit: 'CY', qtyRange: [20, 200] },
  { description: 'Fire sprinkler heads, pendant type', unit: 'EA', qtyRange: [50, 500] },
  { description: 'Passenger elevator cab, 3500 lb', unit: 'EA', qtyRange: [1, 4] },
  { description: 'TPO roofing membrane, 60 mil', unit: 'SF', qtyRange: [2000, 15000] },
  { description: 'Double-pane insulated glass units', unit: 'EA', qtyRange: [20, 200] },
  { description: 'Asbestos abatement, contained area', unit: 'SF', qtyRange: [500, 3000] },
  { description: 'Topsoil and grading', unit: 'CY', qtyRange: [50, 500] },
  { description: 'Rebar #4, Grade 60', unit: 'TON', qtyRange: [2, 20] },
  { description: 'Drywall, 5/8" Type X fire-rated', unit: 'SF', qtyRange: [1000, 10000] },
];

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRandomRFQ() {
  const numDeliverables = randInt(2, 5);
  const used = new Set<number>();
  const deliverables = Array.from({ length: numDeliverables }, () => {
    let idx: number;
    do { idx = Math.floor(Math.random() * RANDOM_DELIVERABLES.length); } while (used.has(idx) && used.size < RANDOM_DELIVERABLES.length);
    used.add(idx);
    const item = RANDOM_DELIVERABLES[idx];
    return {
      description: item.description,
      quantity: randInt(item.qtyRange[0], item.qtyRange[1]),
      unit: item.unit,
    };
  });

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + randInt(7, 30));

  return {
    title: pickRandom(RANDOM_RFQ_TITLES),
    description: '',
    track: pickRandom(['MATERIAL', 'FABRICATION', 'INSTALLATION'] as const),
    bidDeadline: deadline.toISOString().slice(0, 10),
    biddingType: pickRandom(['ANONYMOUS', 'OPEN'] as const),
    deliverables,
  };
}

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
  const { data: rfqFolderId } = useProjectFolderQuery(projectId || undefined, 'rfq');

  const createMutation = useCreateRFQMutation();
  const updateMutation = useUpdateRFQMutation();
  const addDeliverableMutation = useAddRFQDeliverableMutation();
  const updateDeliverableMutation = useUpdateRFQDeliverableMutation();
  const removeDeliverableMutation = useRemoveRFQDeliverableMutation();
  const addAttachmentMutation = useAddRFQAttachmentMutation();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const defaultValues: CreateRFQInput = {
    projectId,
    title: '',
    description: '',
    estimatedBudget: undefined,
    track: 'MATERIAL',
    bidDeadline: '',
    biddingType: 'ANONYMOUS',
    minimumVendors: 1,
    deliverables: [
      { description: '', quantity: 0, unit: '' },
    ],
  };

  const { control, handleSubmit, reset, formState } = useForm<CreateRFQInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createRFQInputSchema) as any,
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
        track: rfqDetail.track ?? 'MATERIAL',
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
                estimatedUnitPrice: d.estimatedUnitPrice ?? undefined,
              }))
            : [{ description: '', specifications: '', quantity: 0, unit: '' }],
      });
    }
  }, [isEdit, rfqDetail, reset, projectId]);

  const [activeSection, setActiveSection] = useState<string>('rfq-details');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const fillRandom = useCallback(() => {
    const data = generateRandomRFQ();
    reset({ projectId, ...data });
  }, [reset, projectId]);

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
            track: formData.track,
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

        // Upload new files
        if (selectedFiles.length > 0) {
          if (rfqFolderId) {
            await uploadFilesAndAttach(rfqId, rfqFolderId, selectedFiles);
          } else {
            toast.error('RFQ folder not found — files were not uploaded.');
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
          if (selectedFiles.length > 0) {
            if (rfqFolderId) {
              await uploadFilesAndAttach(created.id, rfqFolderId, selectedFiles);
            } else {
              toast.error('RFQ folder not found — files were not uploaded.');
            }
          }
          navigate(`../${created.id}`, { relative: 'path' });
        },
      });
    }
  };

  async function uploadFilesAndAttach(targetRfqId: string, folderId: string, files: File[]) {
    for (const file of files) {
      try {
        const uploaded = await filesApi.uploadFile(file, {
          name: file.name,
          parentId: folderId,
          mimeType: file.type || undefined,
          size: file.size,
        });
        await addAttachmentMutation.mutateAsync({
          rfqId: targetRfqId,
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
        <div className="text-sm text-muted-foreground">Loading RFQ...</div>
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

              {/* Bid Deadline + Track */}
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
                  name="track"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Track
                      </FieldLabel>
                      <Select value={field.value ?? 'MATERIAL'} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select track..." />
                        </SelectTrigger>
                        <SelectContent>
                          {RFQ_TRACK_OPTIONS.map((opt) => (
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
            costCodeOptions={[]}
            hideCostCode
            hideUnitPrice
            defaultItem={{ description: '', quantity: 0, unit: '' }}
            rootError={formState.errors.deliverables?.root}
            title="Deliverables"
            subtitle="At least one deliverable is required."
            addLabel="Add Deliverable"
          />

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
              {isEdit && rfqDetail && rfqDetail.attachments?.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-2">
                    Existing Documents
                  </div>
                  {rfqDetail.attachments.map((att) => (
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
    </form>
  );
}
