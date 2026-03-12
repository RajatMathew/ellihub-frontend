import { useCallback, useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check, FileText, X } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
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
import { FileDropZone } from '@app/components/ui/file-drop-zone';
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
import { useEmployeesQuery } from '@app/hooks/use-employees';
import { useGCsQuery } from '@modules/directory/hooks';
import { filesApi } from '@modules/files/api/files.api';
import { contractAttachmentApi } from '@modules/project/api/contract-attachment.api';
import {
  DIVISION_OPTIONS,
  PROJECT_FORM_SECTIONS,
} from '@modules/project/constants/project-form.constants';
import { PAYMENT_TERMS_OPTIONS } from '@modules/project/constants/project.constants';
import {
  useCreateProjectMutation,
  useCreateScheduleEntryMutation,
  useProjectDetailQuery,
  useProjectContractQuery,
  useProjectStagesQuery,
  useUpdateProjectMutation,
  useUpsertProjectContractMutation,
} from '@modules/project/hooks';
import {
  projectFormSchema,
  type CreateProjectInput,
  type ProjectFormValues,
} from '@modules/project/schemas/project.schema';

export default function ProjectForm() {
  const { projectId } = useParams<{ projectId: string }>();
  const isEditMode = !!projectId;
  const navigate = useNavigate();

  /* ---- Queries ---- */

  const { data: existingProject, isLoading: isLoadingProject } = useProjectDetailQuery(projectId ?? '');
  const { data: existingContract } = useProjectContractQuery(isEditMode ? projectId! : '');
  const stagesQuery = useProjectStagesQuery();
  const gcsQuery = useGCsQuery({ limit: 1000 });
  const employeesQuery = useEmployeesQuery({ size: 1000 });

  /* ---- Build dropdown options ---- */

  const stageOptions = stagesQuery.data?.map((s) => ({ value: s.id, label: s.name })) ?? [];

  const gcOptions = gcsQuery.data?.data?.map((gc) => ({ value: gc.id, label: gc.name })) ?? [];

  const pmOptions =
    employeesQuery.data?.data?.map((e) => ({ value: e.id, label: e.name })) ?? [];

  /* ---- Form setup ---- */

  const { control, handleSubmit, reset } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      jobNumber: '',
      contractNumber: '',
      stageId: '',
      division: 'SCA',
      gcId: '',
      leadPMId: '',
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      effectiveStartDate: '',
      effectiveEndDate: '',
      contractValue: 0,
      contractType: '',
      totalContractValue: 0,
      retainagePercent: 0,
      targetBudgetPercent: 0,
      paymentTerms: '',
      estimatedStartDate: '',
      estimatedCompletionDate: '',
      actualStartDate: '',
      actualCompletionDate: '',
    },
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (isEditMode && existingProject) {
      const contract = existingContract ?? existingProject.primeContract;
      reset({
        name: existingProject.name,
        description: existingProject.description ?? '',
        jobNumber: existingProject.jobNumber ?? '',
        contractNumber: existingProject.contractNumber ?? '',
        stageId: existingProject.stageId,
        division: existingProject.division,
        gcId: existingProject.gcId,
        leadPMId: existingProject.leadPMId ?? '',
        streetAddress: existingProject.streetAddress ?? '',
        city: existingProject.city ?? '',
        state: existingProject.state ?? '',
        zipCode: existingProject.zipCode ?? '',
        effectiveStartDate: existingProject.effectiveStartDate?.split('T')[0] ?? '',
        effectiveEndDate: existingProject.effectiveEndDate?.split('T')[0] ?? '',
        contractValue: contract?.contractValue ?? 0,
        contractType: contract?.contractType ?? '',
        totalContractValue: contract?.totalContractValue ?? 0,
        retainagePercent: contract?.retainagePercent ?? 0,
        targetBudgetPercent: contract?.targetBudgetPercent ?? 0,
        paymentTerms: contract?.paymentTerms ?? '',
        estimatedStartDate: contract?.estimatedStartDate?.split('T')[0] ?? '',
        estimatedCompletionDate: contract?.estimatedCompletionDate?.split('T')[0] ?? '',
        actualStartDate: contract?.actualStartDate?.split('T')[0] ?? '',
        actualCompletionDate: contract?.actualCompletionDate?.split('T')[0] ?? '',
      });
    }
  }, [isEditMode, existingProject, existingContract, reset]);

  /* ---- Contract documents (pre-upload selection) ---- */

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const handleFileSelected = useCallback(
    (file: File | null) => {
      if (file) {
        setSelectedFiles((prev) => [...prev, file]);
      }
      setCurrentFile(null);
    },
    [],
  );

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /* ---- Mutations ---- */

  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();
  const upsertContractMutation = useUpsertProjectContractMutation();
  const createScheduleMutation = useCreateScheduleEntryMutation();

  const [activeSection, setActiveSection] = useState<string>('project-info');
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  /* ---- Submit ---- */

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      let resultProjectId: string;

      if (isEditMode && projectId) {
        // Update project fields (contract is NOT updatable via this endpoint)
        const projectPayload: CreateProjectInput = {
          name: data.name,
          description: data.description,
          contractNumber: data.contractNumber || undefined,
          stageId: data.stageId,
          division: data.division,
          gcId: data.gcId,
          leadPMId: data.leadPMId || undefined,
          streetAddress: data.streetAddress || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zipCode: data.zipCode || undefined,
        };
        const updated = await updateMutation.mutateAsync({ id: projectId, data: projectPayload });
        resultProjectId = updated.id;

        // Update contract via separate endpoint
        if (data.contractValue) {
          try {
            await upsertContractMutation.mutateAsync({
              projectId,
              data: {
                contractValue: data.contractValue,
                contractType: data.contractType || undefined,
                totalContractValue: data.totalContractValue || undefined,
                retainagePercent: data.retainagePercent || undefined,
                targetBudgetPercent: data.targetBudgetPercent || undefined,
                paymentTerms: (data.paymentTerms as 'NET_15' | 'NET_30' | 'NET_45' | 'NET_60' | 'NET_90' | 'DUE_ON_RECEIPT') || undefined,
                estimatedStartDate: data.estimatedStartDate || null,
                estimatedCompletionDate: data.estimatedCompletionDate || null,
                actualStartDate: data.actualStartDate || null,
                actualCompletionDate: data.actualCompletionDate || null,
              },
            });
          } catch {
            console.warn('Contract update failed');
          }
        }

        toast.success('Project updated.');
      } else {
        // Create new project (contract is included in create payload)
        const createPayload: CreateProjectInput = {
          name: data.name,
          description: data.description,
          jobNumber: data.jobNumber || undefined,
          stageId: data.stageId,
          division: data.division,
          gcId: data.gcId,
          leadPMId: data.leadPMId || undefined,
          streetAddress: data.streetAddress || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zipCode: data.zipCode || undefined,
          contract: data.contractValue ? { contractValue: data.contractValue } : undefined,
        };
        const project = await createMutation.mutateAsync(createPayload);
        resultProjectId = project.id;

        // Create schedule entry if start date provided
        if (data.effectiveStartDate) {
          try {
            await createScheduleMutation.mutateAsync({
              projectId: resultProjectId,
              data: {
                date: data.effectiveStartDate,
                description: 'Project scheduled start',
                adjustedStartDate: data.effectiveStartDate,
                adjustedFinishDate: data.effectiveEndDate || undefined,
              },
            });
          } catch {
            // Project was created; schedule entry failed — non-blocking
            console.warn('Schedule entry creation failed');
          }
        }

        toast.success('Project created.');
      }

      // Upload contract documents if any were selected
      if (selectedFiles.length > 0) {
        try {
          // Discover the project's "prime contract" folder
          const root = await filesApi.getRootFolder();
          const rootDetail = await filesApi.getFolderDetails(root.id);
          const projectsFolder = rootDetail.children.find(
            (c) => c.type === 'FOLDER' && c.name.toLowerCase() === 'projects',
          );
          if (projectsFolder) {
            const projectsFolderDetail = await filesApi.getFolderDetails(projectsFolder.id);
            const projectFolder = projectsFolderDetail.children.find(
              (c) => c.type === 'FOLDER' && c.name === resultProjectId,
            );
            if (projectFolder) {
              const projectFolderDetail = await filesApi.getFolderDetails(projectFolder.id);
              const primeContractFolder = projectFolderDetail.children.find(
                (c) => c.type === 'FOLDER' && c.name.toLowerCase() === 'prime contract',
              );
              if (primeContractFolder) {
                for (const file of selectedFiles) {
                  try {
                    const dotIdx = file.name.lastIndexOf('.');
                    const name = dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name;
                    const uploaded = await filesApi.uploadFile(file, {
                      name,
                      parentId: primeContractFolder.id,
                      mimeType: file.type || undefined,
                      size: file.size,
                    });
                    await contractAttachmentApi.add(resultProjectId, { fileId: uploaded.id });
                  } catch {
                    console.warn(`Failed to upload contract document: ${file.name}`);
                  }
                }
              }
            }
          }
        } catch {
          console.warn('Contract document upload failed');
        }
      }

      navigate('..', { relative: 'path' });
    } catch {
      /* error toast from mutation */
    }
  };

  if (isEditMode && isLoadingProject) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Loading project...</div>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit, (errors) => console.warn('Validation errors:', errors))}
      className="container-fluid py-7.5"
    >
      {/* ── Toolbar ── */}
      <Toolbar sticky={false}>
        <ToolbarWrapper>
          <ToolbarHeading>
            <ToolbarPageTitle>{isEditMode ? 'Edit Project' : 'New Project'}</ToolbarPageTitle>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" size="sm" type="button" asChild>
              <Link to=".." relative="path">Cancel</Link>
            </Button>
            {!isEditMode && (
              <Button variant="outline" size="sm" type="submit" disabled={isSubmitting}>
                Save as Draft
              </Button>
            )}
            <Button size="sm" type="submit" disabled={isSubmitting}>
              <Check className="size-4" />
              {isEditMode ? 'Save Changes' : 'Create Project'}
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* ── Main layout ── */}
      <FormSectionNav
        sections={PROJECT_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="pt-6 space-y-6">
          {/* ════════════════════════════════════════════
              Section 1: Project Info
             ════════════════════════════════════════════ */}
          <Card id="project-info">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Project Info</h2>
                <p className="text-sm text-muted-foreground">
                  General details about the project and its location.
                </p>
              </div>

              <Separator />

              {/* Row: Project Status + Job # */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="stageId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Project Status
                      </FieldLabel>
                      <SearchableSelect
                        options={stageOptions}
                        value={field.value || null}
                        onValueChange={(v) => field.onChange(v ?? '')}
                        placeholder="Select status..."
                        searchPlaceholder="Search stages..."
                        emptyMessage="No stages found."
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="jobNumber"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Project ID / Job #
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          {...field}
                          placeholder="P-2026-9299"
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
                          disabled={isEditMode}
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              {/* Row: Project Name */}
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Project Name
                    </FieldLabel>
                    <InputWrapper>
                      <Input
                        {...field}
                        placeholder="Enter the official project title"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* Row: Description */}
              <Controller
                name="description"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Description / Scope
                    </FieldLabel>
                    <Textarea
                      {...field}
                      rows={5}
                      placeholder="Brief scope of work..."
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {/* ── Location sub-section ── */}
              <div className="pt-2">
                <h3 className="text-base font-semibold text-foreground mb-4">Location</h3>

                {/* Street Address */}
                <Controller
                  name="streetAddress"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Street Address
                      </FieldLabel>
                      <InputWrapper>
                        <Input {...field} autoComplete="off" />
                      </InputWrapper>
                    </Field>
                  )}
                />

                {/* City + State + Zip */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-3 mt-5">
                  <Controller
                    name="city"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          City
                        </FieldLabel>
                        <InputWrapper>
                          <Input {...field} autoComplete="off" />
                        </InputWrapper>
                      </Field>
                    )}
                  />

                  <Controller
                    name="state"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          State
                        </FieldLabel>
                        <InputWrapper>
                          <Input
                            {...field}
                            maxLength={2}
                            placeholder="NY"
                            autoComplete="off"
                          />
                        </InputWrapper>
                      </Field>
                    )}
                  />

                  <Controller
                    name="zipCode"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Zip Code
                        </FieldLabel>
                        <InputWrapper>
                          <Input {...field} autoComplete="off" maxLength={10} />
                        </InputWrapper>
                      </Field>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* ── Key Stakeholders sub-section ── */}
              <div>
                <h3 className="text-base font-semibold text-foreground mb-4">Key Stakeholders</h3>

                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Controller
                    name="gcId"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          General Contractor
                        </FieldLabel>
                        <SearchableSelect
                          options={gcOptions}
                          value={field.value || null}
                          onValueChange={(v) => field.onChange(v ?? '')}
                          placeholder="Select GC..."
                          searchPlaceholder="Search contractors..."
                          emptyMessage="No contractors found."
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="leadPMId"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Project Manager
                        </FieldLabel>
                        <SearchableSelect
                          options={pmOptions}
                          value={field.value || null}
                          onValueChange={(v) => field.onChange(v ?? '')}
                          placeholder="Select PM..."
                          searchPlaceholder="Search people..."
                          emptyMessage="No contacts found."
                        />
                      </Field>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ════════════════════════════════════════════
              Section 2: Contract
             ════════════════════════════════════════════ */}
          <Card id="contract">
            <CardContent className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Contract</h2>
                <p className="text-sm text-muted-foreground">Financials and timeline.</p>
              </div>

              <Separator />

              {/* Row: Contract Number + Contract Type */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="contractNumber"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Contract Number
                      </FieldLabel>
                      <InputWrapper>
                        <Input {...field} placeholder="e.g. C-2026-001" autoComplete="off" />
                      </InputWrapper>
                    </Field>
                  )}
                />

                <Controller
                  name="contractType"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Contract Type
                      </FieldLabel>
                      <InputWrapper>
                        <Input {...field} placeholder="e.g. Lump Sum, GMP" autoComplete="off" />
                      </InputWrapper>
                    </Field>
                  )}
                />
              </div>

              {/* Row: Contract Category + Payment Terms */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="division"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Contract Category
                      </FieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger aria-invalid={fieldState.invalid}>
                          <SelectValue placeholder="Select category..." />
                        </SelectTrigger>
                        <SelectContent>
                          {DIVISION_OPTIONS.map((opt) => (
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
                          <SelectValue placeholder="Select payment terms..." />
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
              </div>

              {/* Row: Contract Value + Total Contract Value */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="contractValue"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Contract Value
                      </FieldLabel>
                      <InputWrapper>
                        <span className="text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
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

                <Controller
                  name="totalContractValue"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Total Contract Value
                      </FieldLabel>
                      <InputWrapper>
                        <span className="text-muted-foreground text-sm">$</span>
                        <Input
                          type="number"
                          step="0.01"
                          min={0}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
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
              </div>

              {/* Row: Retainage % + Target Budget % */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                          step="0.1"
                          min={0}
                          max={100}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          placeholder="0"
                          aria-invalid={fieldState.invalid}
                        />
                        <span className="text-muted-foreground text-sm">%</span>
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="targetBudgetPercent"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Target Budget %
                      </FieldLabel>
                      <InputWrapper>
                        <Input
                          type="number"
                          step="0.1"
                          min={0}
                          max={100}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          placeholder="0"
                          aria-invalid={fieldState.invalid}
                        />
                        <span className="text-muted-foreground text-sm">%</span>
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />
              </div>

              <Separator />

              {/* ── Dates sub-section ── */}
              <div>
                <h3 className="text-base font-semibold text-foreground mb-4">Dates</h3>

                {/* Row: Effective Start + End */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Controller
                    name="effectiveStartDate"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Effective Start Date
                        </FieldLabel>
                        <InputWrapper>
                          <Input type="date" {...field} />
                        </InputWrapper>
                      </Field>
                    )}
                  />

                  <Controller
                    name="effectiveEndDate"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Effective End Date
                        </FieldLabel>
                        <InputWrapper>
                          <Input type="date" {...field} />
                        </InputWrapper>
                      </Field>
                    )}
                  />
                </div>

                {/* Row: Estimated Start + Completion */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 mt-5">
                  <Controller
                    name="estimatedStartDate"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Estimated Start Date
                        </FieldLabel>
                        <InputWrapper>
                          <Input type="date" {...field} />
                        </InputWrapper>
                      </Field>
                    )}
                  />

                  <Controller
                    name="estimatedCompletionDate"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Estimated Completion Date
                        </FieldLabel>
                        <InputWrapper>
                          <Input type="date" {...field} />
                        </InputWrapper>
                      </Field>
                    )}
                  />
                </div>

                {/* Row: Actual Start + Completion */}
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 mt-5">
                  <Controller
                    name="actualStartDate"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Actual Start Date
                        </FieldLabel>
                        <InputWrapper>
                          <Input type="date" {...field} />
                        </InputWrapper>
                      </Field>
                    )}
                  />

                  <Controller
                    name="actualCompletionDate"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                          Actual Completion Date
                        </FieldLabel>
                        <InputWrapper>
                          <Input type="date" {...field} />
                        </InputWrapper>
                      </Field>
                    )}
                  />
                </div>
              </div>

              <Separator />

              {/* ── Contract Documents sub-section ── */}
              <div>
                <h3 className="text-base font-semibold text-foreground mb-4">
                  Contract Documents
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Select files to attach as contract documents. They will be uploaded after the project is {isEditMode ? 'saved' : 'created'}.
                </p>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center gap-3 p-2.5 rounded-lg border"
                      >
                        <FileText className="size-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{file.name}</p>
                        </div>
                        <Button
                          variant="ghost"
                          mode="icon"
                          size="sm"
                          type="button"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="size-3.5 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <FileDropZone
                  value={currentFile}
                  onChange={handleFileSelected}
                  disabled={isSubmitting}
                />
              </div>
            </CardContent>
          </Card>
      </div>
    </form>
  );
}
