import { useCallback, useEffect, useState } from 'react';

import { FormSectionNav } from '@/app/components/form-section-nav';
import { LineItems } from '@/app/components/line-items';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import { filesApi } from '@/modules/files/api/files.api';
import {
  ProjectFormDocumentsCard,
  ProjectFormPageLoading,
  ProjectFormToolbar,
} from '@/modules/project/components/shared';
import { RFQ_FORM_SECTIONS } from '@/modules/project/constants/rfq';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import {
  useAddRFQAttachmentMutation,
  useCreateRFQMutation,
  useRFQDetailQuery,
  useUpdateRFQMutation,
} from '@/modules/project/hooks/rfq';
import { useProjectFolderQuery } from '@/modules/project/hooks/use-project-folder';
import { createRFQInputSchema, type CreateRFQInput } from '@/modules/project/schemas/rfq';
import { zodResolver } from '@hookform/resolvers/zod';
import { Shuffle } from 'lucide-react';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

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
    do {
      idx = Math.floor(Math.random() * RANDOM_DELIVERABLES.length);
    } while (used.has(idx) && used.size < RANDOM_DELIVERABLES.length);
    used.add(idx);
    const item = RANDOM_DELIVERABLES[idx];
    return {
      description: item.description,
      quantity: randInt(item.qtyRange[0], item.qtyRange[1]),
      unitId: '',
    };
  });

  const deadline = new Date();
  deadline.setDate(deadline.getDate() + randInt(7, 30));

  return {
    title: pickRandom(RANDOM_RFQ_TITLES),
    description: '',
    typeId: '',
    bidDeadline: deadline.toISOString().slice(0, 10),
    biddingType: pickRandom(['ANONYMOUS', 'OPEN'] as const),
    deliverables,
  };
}

/* ---- Helpers ---- */

/* ---- Page ---- */

export default function RFQFormPage() {
  const { projectId = '', rfqId } = useParams<{ projectId: string; rfqId: string }>();
  const navigate = useNavigate();
  const isEdit = !!rfqId;

  const { data: rfqDetail, isLoading: isLoadingDetail } = useRFQDetailQuery(rfqId ?? '');
  const { data: rfqFolderId } = useProjectFolderQuery(projectId || undefined, 'rfq');
  const { data: rfqTypes } = useLookupsQuery('TRADE_CATEGORY');
  const { data: units } = useLookupsQuery('UNIT');

  const createMutation = useCreateRFQMutation();
  const updateMutation = useUpdateRFQMutation();
  const addAttachmentMutation = useAddRFQAttachmentMutation();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const defaultValues: CreateRFQInput = {
    projectId,
    title: '',
    description: '',
    typeId: '',
    bidDeadline: '',
    deliverables: [{ description: '', quantity: 0, unitId: '' }],
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
        description: rfqDetail.description || '',
        typeId: rfqDetail.typeId ?? rfqDetail.type?.id ?? '',
        bidDeadline: rfqDetail.bidDeadline
          ? new Date(rfqDetail.bidDeadline).toISOString().split('T')[0]
          : '',
        deliverables:
          rfqDetail.deliverables && rfqDetail.deliverables.length > 0
            ? rfqDetail.deliverables.map((d) => ({
                description: d.name || d.description || '',
                specifications: d.specifications ?? '',
                quantity: d.quantity ?? 0,
                unitId: d.unitId ?? (typeof d.unit === 'object' ? d.unit?.id : '') ?? '',
                estimatedUnitPrice: d.estimatedUnitPrice ?? undefined,
              }))
            : [{ description: '', specifications: '', quantity: 0, unitId: '' }],
      });
    }
  }, [isEdit, rfqDetail, reset, projectId, rfqTypes]);

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
          data: formData,
        });

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
          documentId: uploaded.id,
        });
      } catch {
        toast.error(`Failed to upload file: ${file.name}`);
      }
    }
  }

  if (isEdit && isLoadingDetail) {
    return <ProjectFormPageLoading sections={RFQ_FORM_SECTIONS.length} />;
  }

  return (
    <form
      onSubmit={(event) =>
        void handleSubmit(onSubmit, () => {
          toast.error('Please fix the highlighted RFQ fields.');
        })(event)
      }
      className="container-fluid max-w-full overflow-x-hidden px-4 py-5 sm:px-6 lg:px-7.5 lg:py-7.5"
    >
      <ProjectFormToolbar
        backLabel="RFQs"
        title={isEdit ? 'Edit RFQ' : 'New RFQ'}
        description={
          isEdit ? 'Update the RFQ details below.' : 'Create a new request for quotation.'
        }
        submitLabel={isEdit ? 'Save Changes' : 'Create RFQ'}
        isSubmitting={isSubmitting}
        extraActions={
          !isEdit ? (
            <Button variant="ghost" size="sm" type="button" onClick={fillRandom}>
              <Shuffle className="size-4" />
              Fill Random
            </Button>
          ) : undefined
        }
      />

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
                    <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
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
                name="typeId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
                      Track (Type)
                    </FieldLabel>
                    <Select value={field.value ?? ''} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={fieldState.invalid}>
                        <SelectValue
                          placeholder={
                            rfqDetail?.track || rfqDetail?.type?.label || 'Select track...'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {rfqTypes?.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
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
                  <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
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
                  <FieldLabel className="text-xs font-semibold tracking-normal uppercase">
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
          unitOptions={units?.map((u) => ({ value: u.id, label: u.label || u.name || u.id }))}
          fieldNames={{ unit: 'unitId' }}
          hideCostCode
          hideUnitPrice
          defaultItem={{ description: '', quantity: 0, unitId: '' }}
          rootError={formState.errors.deliverables?.root}
          title="Deliverables"
          subtitle="At least one deliverable is required."
          addLabel="Add Deliverable"
        />

        <ProjectFormDocumentsCard
          selectedFiles={selectedFiles}
          existingDocuments={isEdit && rfqDetail ? rfqDetail.attachments : undefined}
          onAddFile={(file) => setSelectedFiles((prev) => [...prev, file])}
          onRemoveFile={(index) =>
            setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index))
          }
        />
      </div>
    </form>
  );
}
