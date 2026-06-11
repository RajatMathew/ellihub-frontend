import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { Forbidden } from '@/app/components/error/forbidden';
import { FormFieldLabel, formInvalidControlClassName } from '@/app/components/form-field-label';
import { FormContent, FormLayout } from '@/app/components/form-layout';
import { LineItems } from '@/app/components/line-items';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { getApiErrorMessage } from '@/app/lib/toast-api-error';
import {
  fakeProjectDescription,
  fakeRFQDeliverables,
  fakeRFQTitle,
  pickRandom,
  randInt,
} from '@/lib/fake-data';
import { filesApi } from '@/modules/files/api/files.api';
import {
  ProjectFormDocumentsCard,
  ProjectFormPageLoading,
  ProjectFormShell,
} from '@/modules/project/components/shared';
import { RFQ_FORM_SECTIONS } from '@/modules/project/constants/rfq';
import { useProjectDetailQuery } from '@/modules/project/hooks';
import { useLookupsQuery } from '@/modules/project/hooks/lookup.hooks';
import {
  useAddRFQAttachmentMutation,
  useCreateRFQMutation,
  useRFQDetailQuery,
  useUpdateRFQMutation,
} from '@/modules/project/hooks/rfq';
import {
  resolveProjectEntityFolder,
  useProjectFolderQuery,
} from '@/modules/project/hooks/use-project-folder';
import {
  createRFQInputSchema,
  type CreateRFQInput,
  type RFQDetail,
} from '@/modules/project/schemas/rfq';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useFieldArray, useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const rfqInvalidControlClassName = formInvalidControlClassName;

/* ---- Random data for dev ---- */

function generateRandomRFQ(rfqTypes?: { id: string }[], units?: { id: string }[]) {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + randInt(7, 30));

  return {
    title: fakeRFQTitle(),
    description: fakeProjectDescription(),
    typeId: rfqTypes && rfqTypes.length > 0 ? pickRandom(rfqTypes).id : '',
    bidDeadline: deadline.toISOString().slice(0, 10),
    deliverables: fakeRFQDeliverables(units),
  };
}

/* ---- Helpers ---- */

type RFQTypeOption = {
  id: string;
  label?: string;
  name?: string;
};

function normalizeLookupValue(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

function resolveRFQTypeId(rfqDetail: RFQDetail, rfqTypes?: RFQTypeOption[]) {
  const existingTypeId = rfqDetail.typeId ?? rfqDetail.type?.id;
  if (existingTypeId) return existingTypeId;

  const values = [existingTypeId, rfqDetail.track, rfqDetail.type?.label, rfqDetail.type?.id].map(
    normalizeLookupValue
  );

  return (
    rfqTypes?.find((option) => {
      const candidates = [option.id, option.label, option.name].map(normalizeLookupValue);

      return candidates.some((candidate) => values.includes(candidate));
    })?.id ?? ''
  );
}

function RFQRequiredFieldLabel({ children }: { children: ReactNode }) {
  return <FormFieldLabel required>{children}</FormFieldLabel>;
}

function getRFQTypeLabel(rfqDetail: RFQDetail) {
  return rfqDetail.type?.label ?? rfqDetail.track ?? 'Current track';
}

function getRFQTypeDisplayValue(typeId: string, options: RFQTypeOption[], rfqDetail?: RFQDetail) {
  const option = options.find((item) => item.id === typeId);
  if (option) return option.label ?? option.name ?? option.id;

  const detailTypeId = rfqDetail?.typeId ?? rfqDetail?.type?.id;
  return typeId && detailTypeId === typeId && rfqDetail ? getRFQTypeLabel(rfqDetail) : '';
}

/* ---- Page ---- */

export default function RFQFormPage() {
  const { projectId = '', rfqId } = useParams<{ projectId: string; rfqId: string }>();
  const navigate = useNavigate();
  const isEdit = !!rfqId;

  const { data: rfqDetail, isLoading: isLoadingDetail } = useRFQDetailQuery(rfqId ?? '');
  const { data: project, isLoading: isLoadingProject } = useProjectDetailQuery(projectId);
  const { data: rfqFolderId } = useProjectFolderQuery(projectId || undefined, 'rfq');
  const { data: rfqTypes } = useLookupsQuery('TRADE_CATEGORY');
  const { data: units } = useLookupsQuery('UNIT');

  const createMutation = useCreateRFQMutation();
  const updateMutation = useUpdateRFQMutation();
  const addAttachmentMutation = useAddRFQAttachmentMutation();

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const rfqTypeOptions = useMemo<RFQTypeOption[]>(() => {
    const options = rfqTypes ?? [];
    if (!isEdit || !rfqDetail) return options;

    const selectedTypeId = resolveRFQTypeId(rfqDetail, options);
    if (!selectedTypeId || options.some((option) => option.id === selectedTypeId)) {
      return options;
    }

    return [{ id: selectedTypeId, label: getRFQTypeLabel(rfqDetail) }, ...options];
  }, [isEdit, rfqDetail, rfqTypes]);

  const defaultValues: CreateRFQInput = {
    projectId,
    title: '',
    description: '',
    typeId: '',
    bidDeadline: '',
    deliverables: [{ description: '', quantity: 0, unitId: '' }],
  };

  const { control, handleSubmit, reset, setValue, formState } = useForm<CreateRFQInput>({
    resolver: zodResolver(createRFQInputSchema),
    defaultValues,
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'deliverables' });

  const selectedRFQTypeId = rfqDetail ? resolveRFQTypeId(rfqDetail, rfqTypeOptions) : '';

  // Reset form when detail loads in edit mode
  useEffect(() => {
    if (isEdit && rfqDetail) {
      reset({
        projectId: rfqDetail.project?.id ?? projectId,
        title: rfqDetail.title,
        description: rfqDetail.description || '',
        typeId: selectedRFQTypeId,
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
  }, [isEdit, rfqDetail, reset, projectId, selectedRFQTypeId]);

  useEffect(() => {
    if (isEdit && selectedRFQTypeId) {
      setValue('typeId', selectedRFQTypeId, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [isEdit, selectedRFQTypeId, setValue]);

  const [activeSection, setActiveSection] = useState<string>('rfq-details');
  const [isSaving, setIsSaving] = useState(false);
  const isSubmitting = isSaving || createMutation.isPending || updateMutation.isPending;

  const fillRandom = useCallback(() => {
    const data = generateRandomRFQ(rfqTypes, units);
    reset({ projectId, ...data });
  }, [reset, projectId, rfqTypes, units]);

  async function resolveRfqUploadFolderId(targetRfqId: string): Promise<string | undefined> {
    try {
      return await resolveProjectEntityFolder(projectId, 'RFQ', targetRfqId);
    } catch {
      return rfqFolderId;
    }
  }

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
          const folderId = await resolveRfqUploadFolderId(rfqId);
          if (folderId) {
            await uploadFilesAndAttach(rfqId, folderId, selectedFiles);
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
            const folderId = await resolveRfqUploadFolderId(created.id);
            if (folderId) {
              await uploadFilesAndAttach(created.id, folderId, selectedFiles);
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
      } catch (error) {
        toast.error(getApiErrorMessage(error, `Failed to upload file: ${file.name}`));
      }
    }
  }

  if ((isEdit && isLoadingDetail) || isLoadingProject) {
    return <ProjectFormPageLoading sections={RFQ_FORM_SECTIONS.length} />;
  }

  const canSubmitRfq = isEdit
    ? project?.capabilities?.actions?.rfq?.update === true
    : project?.capabilities?.actions?.rfq?.create === true;
  if (!canSubmitRfq) return <Forbidden />;

  return (
    <ProjectFormShell
      onSubmit={(event) => void handleSubmit(onSubmit, onInvalidFormSubmit)(event)}
      title={isEdit ? 'Edit RFQ' : 'New RFQ'}
      submitLabel={isEdit ? 'Save Changes' : 'Create RFQ'}
      isSubmitting={isSubmitting}
      sections={RFQ_FORM_SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      extraActions={!isEdit ? <MockDataButton onClick={fillRandom} /> : undefined}
    >
      <FormLayout className="pt-4 pb-8 lg:pb-10">
        <FormContent>
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
                      <RFQRequiredFieldLabel>Bid Deadline</RFQRequiredFieldLabel>
                      <InputWrapper
                        className={fieldState.invalid ? rfqInvalidControlClassName : undefined}
                      >
                        <Input
                          type="date"
                          {...field}
                          aria-invalid={fieldState.invalid}
                          data-testid="rfq-bid-deadline-input"
                        />
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
                      <RFQRequiredFieldLabel>Track (Type)</RFQRequiredFieldLabel>
                      <Select
                        value={field.value || selectedRFQTypeId}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger
                          aria-invalid={fieldState.invalid}
                          className={fieldState.invalid ? rfqInvalidControlClassName : undefined}
                          data-testid="rfq-type-select"
                        >
                          <span
                            className={
                              field.value || selectedRFQTypeId ? '' : 'text-muted-foreground'
                            }
                          >
                            {getRFQTypeDisplayValue(
                              field.value || selectedRFQTypeId,
                              rfqTypeOptions,
                              rfqDetail
                            ) || 'Select track...'}
                          </span>
                        </SelectTrigger>
                        <SelectContent>
                          {rfqTypeOptions.map((opt) => (
                            <SelectItem key={opt.id} value={opt.id}>
                              {opt.label ?? opt.name ?? opt.id}
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
                    <RFQRequiredFieldLabel>Title</RFQRequiredFieldLabel>
                    <InputWrapper
                      className={fieldState.invalid ? rfqInvalidControlClassName : undefined}
                    >
                      <Input
                        {...field}
                        placeholder="e.g. Structural Steel Supply"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                        data-testid="rfq-title-input"
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
                    <RFQRequiredFieldLabel>Description</RFQRequiredFieldLabel>
                    <Textarea
                      {...field}
                      placeholder="Describe the scope of work..."
                      rows={4}
                      aria-invalid={fieldState.invalid}
                      className={fieldState.invalid ? rfqInvalidControlClassName : undefined}
                      data-testid="rfq-description-input"
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
            unitOptions={(units ?? []).map((u) => ({
              value: u.id,
              label: u.label || u.name || u.id,
            }))}
            fieldNames={{ unit: 'unitId' }}
            allowCustomUnit={false}
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
        </FormContent>
      </FormLayout>
    </ProjectFormShell>
  );
}
