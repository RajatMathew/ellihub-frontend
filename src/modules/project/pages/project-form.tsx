import { useCallback, useEffect, useState, type ReactNode } from 'react';

import { MockDataButton } from '@/app/components/dev/mock-data-button';
import { Forbidden } from '@/app/components/error/forbidden';
import { FormFieldLabel, formInvalidControlClassName } from '@/app/components/form-field-label';
import { FormContent, FormLayout } from '@/app/components/form-layout';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError } from '@/app/components/ui/field';
import { FileDropZone } from '@/app/components/ui/file-drop-zone';
import { Input, InputWrapper } from '@/app/components/ui/input';
import { NumberInput } from '@/app/components/ui/number-input';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Separator } from '@/app/components/ui/separator';
import { Textarea } from '@/app/components/ui/textarea';
import { useAccess } from '@/app/contexts/access-context';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import { isMockDataFillEnabled } from '@/app/lib/mock-data-fill';
import {
  fakeCity,
  fakeContractNumber,
  fakeJobNumber,
  fakeProjectDescription,
  fakeProjectName,
  fakeState,
  fakeStreetAddress,
  fakeZipCode,
  randInt,
} from '@/lib/fake-data';
import { useGCsQuery } from '@/modules/directory/hooks';
import { filesApi } from '@/modules/files/api/files.api';
import { useEmployeesQuery } from '@/modules/hr/hooks/use-employees';
import { contractAttachmentApi } from '@/modules/project/api/contract-attachment.api';
import { FieldwireProjectSelect } from '@/modules/project/components/fieldwire-project-select';
import { ProjectFormPageLoading, ProjectFormShell } from '@/modules/project/components/shared';
import {
  PROJECT_FORM_SECTIONS,
  PROJECT_STATUS_OPTIONS,
} from '@/modules/project/constants/project-form.constants';
import { PAYMENT_TERMS_OPTIONS } from '@/modules/project/constants/project.constants';
import {
  useCreateProjectMutation,
  useCreateScheduleEntryMutation,
  useDivisionsQuery,
  useProjectContractTypesQuery,
  useProjectDetailQuery,
  useProjectStagesQuery,
  useSetProjectActiveMutation,
  useSetProjectClosedMutation,
  useSetProjectCompletedMutation,
  useSetProjectInactiveMutation,
  useUpdateProjectMutation,
} from '@/modules/project/hooks';
import { toDateInputValue } from '@/modules/project/lib/project-date-utils';
import {
  formatProjectStageLabel,
  getProjectStageSwatchClassName,
} from '@/modules/project/lib/project-stage-colors';
import {
  projectFormSchema,
  type CreateProjectInput,
  type ProjectFormValues,
  type UpdateProjectInput,
} from '@/modules/project/schemas/project.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { FileText, X } from 'lucide-react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

const projectInvalidControlClassName = formInvalidControlClassName;
const paymentTermValues = new Set(PAYMENT_TERMS_OPTIONS.map((option) => option.value));

function normalizeProjectPaymentTerms(value: unknown): ProjectFormValues['paymentTerms'] {
  if (!value) return '';

  const normalized = String(value)
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (paymentTermValues.has(normalized as (typeof PAYMENT_TERMS_OPTIONS)[number]['value'])) {
    return normalized;
  }

  if (normalized.includes('15')) return 'NET_15';
  if (normalized.includes('30')) return 'NET_30';
  if (normalized.includes('45')) return 'NET_45';
  if (normalized.includes('60')) return 'NET_60';
  if (normalized.includes('90')) return 'NET_90';
  if (normalized.includes('DUE') || normalized.includes('RECEIPT')) return 'DUE_ON_RECEIPT';

  return '';
}

function ProjectFormFieldLabel({
  children,
  required = false,
}: {
  children: ReactNode;
  required?: boolean;
}) {
  return <FormFieldLabel required={required}>{children}</FormFieldLabel>;
}

export default function ProjectForm() {
  const { projectId } = useParams<{ projectId: string }>();
  const isEditMode = !!projectId;
  const navigate = useNavigate();
  const { access } = useAccess();
  const isAuthPMCreatingProject = !isEditMode && access?.role === 'pm';

  /* ---- Queries ---- */

  const { data: existingProject, isLoading: isLoadingProject } = useProjectDetailQuery(
    projectId ?? ''
  );
  const canTransferLeadPM =
    !isEditMode || existingProject?.capabilities?.actions?.projectTeam?.['transfer-lead'] === true;
  const stagesQuery = useProjectStagesQuery();
  const divisionsQuery = useDivisionsQuery();
  const contractTypesQuery = useProjectContractTypesQuery();
  const gcsQuery = useGCsQuery({ limit: 1000 });
  const employeesQuery = useEmployeesQuery(
    { size: 1000 },
    { enabled: !!access && !isAuthPMCreatingProject }
  );

  /* ---- Build dropdown options ---- */

  const stageOptions =
    stagesQuery.data?.map((s) => ({
      value: s.id,
      label: formatProjectStageLabel(s.name),
      swatchClassName: getProjectStageSwatchClassName(s.name),
    })) ?? [];
  const divisionOptions =
    divisionsQuery.data?.map((d) => ({
      value: d.id,
      label: d.label || d.name || 'Unknown',
    })) ?? [];
  const contractTypeOptions =
    contractTypesQuery.data?.map((type) => {
      const label = type.label || type.name || type.id;
      return { value: label, label };
    }) ?? [];
  const gcOptions =
    gcsQuery.data?.data?.map((gc) => ({
      value: gc.id,
      label: gc.name,
      badge: gc.status === 'INACTIVE' ? 'Inactive' : undefined,
      disabled: gc.status === 'INACTIVE',
    })) ?? [];
  const activeGcOptions = gcOptions.filter((option) => !option.disabled);
  const pmOptions = isAuthPMCreatingProject
    ? access?.employeeId
      ? [{ value: access.employeeId, label: 'Current PM' }]
      : []
    : (employeesQuery.data?.data
        ?.filter((employee) => employee.authRole === 'pm')
        .map((employee) => ({ value: employee.id, label: employee.name })) ?? []);

  /* ---- Form setup ---- */

  const { control, handleSubmit, reset, setValue } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema) as Resolver<ProjectFormValues>,
    defaultValues: {
      name: '',
      description: '',
      jobNumber: '',
      contractNumber: '',
      fieldwireProjectId: '',
      fieldwireProjectName: '',
      stageId: '',
      status: 'ACTIVE',
      divisionId: '',
      gcId: '',
      leadPMId: '',
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      contractValue: 0,
      contractType: '',
      retainagePercent: 0,
      targetBudgetPercent: 0,
      taxRate: 0,
      paymentTerms: 'NET_30',
      estimatedStartDate: '',
      estimatedEndDate: '',
      actualStartDate: '',
      actualCompletionDate: '',
      setInactiveDate: '',
      tcoDate: '',
    },
  });

  useEffect(() => {
    if (isAuthPMCreatingProject && access?.employeeId) {
      setValue('leadPMId', access.employeeId, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [access?.employeeId, isAuthPMCreatingProject, setValue]);

  // Pre-fill form when editing
  useEffect(() => {
    let paymentTermsSyncTimeout: number | undefined;

    if (isEditMode && existingProject) {
      const contract = existingProject.primeContract;
      const nextFieldwireProjectName = existingProject.fieldwireProjectName ?? '';
      const nextPaymentTerms = normalizeProjectPaymentTerms(
        existingProject.paymentTerms ?? contract?.paymentTerms
      );
      reset({
        name: existingProject.name,
        description: existingProject.description ?? '',
        jobNumber: existingProject.jobNumber ?? '',
        contractNumber: existingProject.contractNumber ?? '',
        fieldwireProjectId: existingProject.fieldwireProjectId ?? '',
        fieldwireProjectName: nextFieldwireProjectName,
        stageId: existingProject.stageId,
        status: existingProject.status ?? 'ACTIVE',
        divisionId: existingProject.divisionId ?? '',
        gcId: existingProject.gcId,
        leadPMId: existingProject.leadPMId ?? '',
        streetAddress: existingProject.streetAddress ?? '',
        city: existingProject.city ?? '',
        state: existingProject.state ?? '',
        zipCode: existingProject.zipCode ?? '',
        contractValue: Number(existingProject.contractValue ?? contract?.contractValue ?? 0),
        contractType: existingProject.contractType ?? contract?.contractType ?? '',
        retainagePercent: existingProject.retainagePercent ?? contract?.retainagePercent ?? 0,
        targetBudgetPercent:
          existingProject.targetBudgetPercent ?? contract?.targetBudgetPercent ?? 0,
        taxRate: Number(existingProject.taxRate ?? 0),
        paymentTerms: nextPaymentTerms,
        estimatedStartDate: toDateInputValue(
          existingProject.estimatedStartDate ?? contract?.estimatedStartDate
        ),
        estimatedEndDate: toDateInputValue(
          existingProject.estimatedEndDate ?? contract?.estimatedEndDate
        ),
        setInactiveDate: toDateInputValue(
          existingProject.setInactiveDate ?? contract?.setInactiveDate
        ),
        tcoDate: toDateInputValue(
          existingProject.tcoDate ??
            contract?.tcoDate ??
            existingProject.estimatedEndDate ??
            contract?.estimatedEndDate
        ),
        actualStartDate: toDateInputValue(
          existingProject.actualStartDate ?? contract?.actualStartDate
        ),
        actualCompletionDate: toDateInputValue(
          existingProject.actualCompletionDate ?? contract?.actualCompletionDate
        ),
      });

      paymentTermsSyncTimeout = window.setTimeout(() => {
        setValue('paymentTerms', nextPaymentTerms, {
          shouldDirty: false,
          shouldValidate: true,
        });
      });
    }

    return () => {
      if (paymentTermsSyncTimeout !== undefined) {
        window.clearTimeout(paymentTermsSyncTimeout);
      }
    };
  }, [isEditMode, existingProject, reset, setValue]);

  /* ---- Contract documents (pre-upload selection) ---- */

  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);

  const handleFileSelected = useCallback((file: File | null) => {
    if (file) {
      setSelectedFiles((prev) => [...prev, file]);
    }
    setCurrentFile(null);
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  /* ---- Mutations ---- */

  const createMutation = useCreateProjectMutation();
  const updateMutation = useUpdateProjectMutation();
  const setActiveMutation = useSetProjectActiveMutation();
  const setInactiveMutation = useSetProjectInactiveMutation();
  const setClosedMutation = useSetProjectClosedMutation();
  const setCompletedMutation = useSetProjectCompletedMutation();
  const createScheduleMutation = useCreateScheduleEntryMutation();

  const [activeSection, setActiveSection] = useState<string>('project-info');
  const isSubmitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    setActiveMutation.isPending ||
    setInactiveMutation.isPending ||
    setClosedMutation.isPending ||
    setCompletedMutation.isPending;

  /* ---- Submit ---- */

  const fillRandom = () => {
    const name = fakeProjectName();
    const start = new Date();
    start.setDate(start.getDate() + Math.floor(Math.random() * 30));
    const end = new Date(start);
    end.setMonth(end.getMonth() + 12);
    const actualStart = new Date(start);
    actualStart.setDate(actualStart.getDate() + randInt(0, 14));
    const actualCompletion = new Date(actualStart);
    actualCompletion.setMonth(actualCompletion.getMonth() + randInt(8, 14));
    const inactiveDate = new Date(actualCompletion);
    inactiveDate.setDate(inactiveDate.getDate() + randInt(1, 45));

    reset({
      name,
      description: fakeProjectDescription(),
      jobNumber: fakeJobNumber(),
      contractNumber: fakeContractNumber(),
      fieldwireProjectId: '',
      fieldwireProjectName: '',
      stageId: stageOptions[Math.floor(Math.random() * stageOptions.length)]?.value || '',
      status:
        PROJECT_STATUS_OPTIONS[Math.floor(Math.random() * PROJECT_STATUS_OPTIONS.length)]?.value ||
        'ACTIVE',
      divisionId: divisionOptions[Math.floor(Math.random() * divisionOptions.length)]?.value || '',
      gcId: activeGcOptions[Math.floor(Math.random() * activeGcOptions.length)]?.value || '',
      leadPMId: pmOptions[Math.floor(Math.random() * pmOptions.length)]?.value || '',
      streetAddress: fakeStreetAddress(),
      city: fakeCity(),
      state: fakeState(),
      zipCode: fakeZipCode(),
      contractValue: randInt(50000, 1050000),
      contractType: 'Lump Sum',
      retainagePercent: 10,
      targetBudgetPercent: 8,
      taxRate: 8.875,
      paymentTerms:
        PAYMENT_TERMS_OPTIONS[Math.floor(Math.random() * PAYMENT_TERMS_OPTIONS.length)]?.value ||
        'NET_30',
      estimatedStartDate: start.toISOString().split('T')[0],
      estimatedEndDate: end.toISOString().split('T')[0],
      actualStartDate: actualStart.toISOString().split('T')[0],
      actualCompletionDate: actualCompletion.toISOString().split('T')[0],
      setInactiveDate: inactiveDate.toISOString().split('T')[0],
      tcoDate: end.toISOString().split('T')[0],
    });
  };

  const onSubmit = async (data: ProjectFormValues) => {
    try {
      let resultProjectId: string;

      if (isEditMode && projectId) {
        // Update project fields
        const updatePayload: UpdateProjectInput = {
          name: data.name,
          description: data.description,
          jobNumber: data.jobNumber || undefined,
          contractNumber: data.contractNumber || undefined,
          fieldwireProjectId: data.fieldwireProjectId || null,
          fieldwireProjectName: data.fieldwireProjectId
            ? data.fieldwireProjectName || undefined
            : null,
          stageId: data.stageId,
          status: data.status,
          divisionId: data.divisionId,
          gcId: data.gcId,
          leadPMId: data.leadPMId,
          streetAddress: data.streetAddress || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zipCode: data.zipCode || undefined,
          contractValue: data.contractValue,
          contractType: data.contractType || undefined,
          retainagePercent: data.retainagePercent,
          targetBudgetPercent: data.targetBudgetPercent,
          taxRate: data.taxRate,
          paymentTerms: data.paymentTerms || undefined,
          estimatedStartDate: data.estimatedStartDate || undefined,
          estimatedEndDate: data.estimatedEndDate || undefined,
          actualStartDate: data.actualStartDate || undefined,
          actualCompletionDate: data.actualCompletionDate || undefined,
          setInactiveDate: data.setInactiveDate || undefined,
          tcoDate: data.tcoDate,
        };
        const updated = await updateMutation.mutateAsync({ id: projectId, data: updatePayload });
        resultProjectId = updated.id;

        // Handle status change if needed (backend has separate status endpoints)
        const oldStatus = existingProject?.status;
        const newStatus = data.status;

        if (oldStatus !== newStatus) {
          const statusInput = { id: projectId, silent: true };
          if (newStatus === 'ACTIVE') await setActiveMutation.mutateAsync(statusInput);
          else if (newStatus === 'INACTIVE') await setInactiveMutation.mutateAsync(statusInput);
          else if (newStatus === 'CLOSED') await setClosedMutation.mutateAsync(statusInput);
          else if (newStatus === 'COMPLETED') await setCompletedMutation.mutateAsync(statusInput);
        }
      } else {
        // Create new project (flat payload matching Swagger)
        const createPayload: CreateProjectInput = {
          name: data.name,
          description: data.description,
          jobNumber: data.jobNumber || undefined,
          contractNumber: data.contractNumber || undefined,
          fieldwireProjectId: data.fieldwireProjectId || undefined,
          fieldwireProjectName: data.fieldwireProjectId
            ? data.fieldwireProjectName || undefined
            : undefined,
          stageId: data.stageId,
          divisionId: data.divisionId,
          status: data.status,
          gcId: data.gcId,
          leadPMId: data.leadPMId,
          streetAddress: data.streetAddress || undefined,
          city: data.city || undefined,
          state: data.state || undefined,
          zipCode: data.zipCode || undefined,
          contractValue: data.contractValue,
          contractType: data.contractType || undefined,
          retainagePercent: data.retainagePercent,
          targetBudgetPercent: data.targetBudgetPercent,
          taxRate: data.taxRate,
          paymentTerms: data.paymentTerms || undefined,
          estimatedStartDate: data.estimatedStartDate || undefined,
          estimatedEndDate: data.estimatedEndDate || undefined,
          actualStartDate: data.actualStartDate || undefined,
          actualCompletionDate: data.actualCompletionDate || undefined,
          setInactiveDate: data.setInactiveDate || undefined,
          tcoDate: data.tcoDate,
        };
        const project = await createMutation.mutateAsync(createPayload);
        resultProjectId = project.id;
        toast.success('Project created.');
      }

      // Create schedule entry if start date provided (optional)
      if (data.estimatedStartDate) {
        try {
          await createScheduleMutation.mutateAsync({
            projectId: resultProjectId,
            date: data.estimatedStartDate,
            description: 'Project scheduled start',
            adjustedFinishDate: data.estimatedEndDate || undefined,
          });
        } catch {
          console.warn('Schedule entry creation failed');
        }
      }

      // Upload contract documents if any were selected
      if (selectedFiles.length > 0) {
        try {
          // Discover the project's "prime contract" folder
          const root = await filesApi.getRootFolder();
          const rootDetail = await filesApi.getFolderDetails(root.id);
          const projectsFolder = rootDetail.children.find(
            (c) => c.type === 'FOLDER' && (c.name || '').toLowerCase() === 'projects'
          );
          if (projectsFolder) {
            const projectsFolderDetail = await filesApi.getFolderDetails(projectsFolder.id);
            const projectFolder = projectsFolderDetail.children.find(
              (c) => c.type === 'FOLDER' && c.name === resultProjectId
            );
            if (projectFolder) {
              const projectFolderDetail = await filesApi.getFolderDetails(projectFolder.id);
              const primeContractFolder = projectFolderDetail.children.find(
                (c) => c.type === 'FOLDER' && (c.name || '').toLowerCase() === 'prime contract'
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
    return <ProjectFormPageLoading sections={PROJECT_FORM_SECTIONS.length} />;
  }

  if (isEditMode && !existingProject) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Project not found.</div>
      </div>
    );
  }

  if (isEditMode && !existingProject?.capabilities?.canEdit) {
    return <Forbidden />;
  }

  return (
    <ProjectFormShell
      formKey={isEditMode ? (existingProject?.id ?? 'loading') : 'create'}
      onSubmit={(event) => void handleSubmit(onSubmit, onInvalidFormSubmit)(event)}
      title={isEditMode ? 'Edit Project' : 'New Project'}
      submitLabel={isEditMode ? 'Save Changes' : 'Create Project'}
      isSubmitting={isSubmitting}
      sections={PROJECT_FORM_SECTIONS}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      extraActions={
        isMockDataFillEnabled && !isEditMode ? <MockDataButton onClick={fillRandom} /> : undefined
      }
    >
      <FormLayout className="pt-4 pb-8 lg:pb-10">
        <FormContent>
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

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                <Controller
                  name="status"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <ProjectFormFieldLabel>Project Status</ProjectFormFieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger
                          aria-invalid={fieldState.invalid}
                          className={
                            fieldState.invalid ? projectInvalidControlClassName : undefined
                          }
                        >
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                        <SelectContent>
                          {PROJECT_STATUS_OPTIONS.map((opt) => (
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
                  name="stageId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <ProjectFormFieldLabel required>Project Stage</ProjectFormFieldLabel>
                      <SearchableSelect
                        options={stageOptions}
                        value={field.value || null}
                        onValueChange={(v) => field.onChange(v ?? '')}
                        placeholder="Select stage..."
                        searchPlaceholder="Search stages..."
                        emptyMessage="No stages found."
                        className={fieldState.invalid ? projectInvalidControlClassName : undefined}
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
                      <ProjectFormFieldLabel>Project ID / Job #</ProjectFormFieldLabel>
                      <InputWrapper
                        className={fieldState.invalid ? projectInvalidControlClassName : undefined}
                      >
                        <Input
                          {...field}
                          placeholder="P-2026-9299"
                          aria-invalid={fieldState.invalid}
                          autoComplete="off"
                        />
                      </InputWrapper>
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="fieldwireProjectName"
                  control={control}
                  render={({ field: nameField }) => (
                    <Controller
                      name="fieldwireProjectId"
                      control={control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <ProjectFormFieldLabel>Fieldwire Project</ProjectFormFieldLabel>
                          <FieldwireProjectSelect
                            value={field.value || null}
                            currentName={nameField.value}
                            currentProjectId={projectId}
                            onValueChange={(value, selectedProject) => {
                              field.onChange(value ?? '');
                              nameField.onChange(selectedProject?.name ?? '');
                            }}
                          />
                          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                        </Field>
                      )}
                    />
                  )}
                />
              </div>

              {/* Row: Project Name */}
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <ProjectFormFieldLabel required>Project Name</ProjectFormFieldLabel>
                    <InputWrapper
                      className={fieldState.invalid ? projectInvalidControlClassName : undefined}
                    >
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
                    <ProjectFormFieldLabel required>Description / Scope</ProjectFormFieldLabel>
                    <Textarea
                      {...field}
                      rows={5}
                      placeholder="Brief scope of work..."
                      aria-invalid={fieldState.invalid}
                      className={fieldState.invalid ? projectInvalidControlClassName : undefined}
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
                      <ProjectFormFieldLabel>Street Address</ProjectFormFieldLabel>
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
                        <ProjectFormFieldLabel>City</ProjectFormFieldLabel>
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
                        <ProjectFormFieldLabel>State</ProjectFormFieldLabel>
                        <InputWrapper>
                          <Input {...field} maxLength={2} placeholder="NY" autoComplete="off" />
                        </InputWrapper>
                      </Field>
                    )}
                  />

                  <Controller
                    name="zipCode"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <ProjectFormFieldLabel>Zip Code</ProjectFormFieldLabel>
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
                        <ProjectFormFieldLabel required>General Contractor</ProjectFormFieldLabel>
                        <SearchableSelect
                          options={gcOptions}
                          value={field.value || null}
                          onValueChange={(v) => field.onChange(v ?? '')}
                          placeholder="Select GC..."
                          searchPlaceholder="Search contractors..."
                          emptyMessage="No contractors found."
                          className={
                            fieldState.invalid ? projectInvalidControlClassName : undefined
                          }
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />

                  <Controller
                    name="leadPMId"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <ProjectFormFieldLabel required>Lead PM</ProjectFormFieldLabel>
                        <SearchableSelect
                          options={pmOptions}
                          value={field.value || null}
                          onValueChange={(v) => field.onChange(v ?? '')}
                          placeholder="Select Lead PM..."
                          searchPlaceholder="Search people..."
                          emptyMessage="No PM users found."
                          disabled={isAuthPMCreatingProject || !canTransferLeadPM}
                          className={
                            fieldState.invalid ? projectInvalidControlClassName : undefined
                          }
                        />
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
                      <ProjectFormFieldLabel>Contract Number</ProjectFormFieldLabel>
                      <InputWrapper>
                        <Input
                          {...field}
                          data-testid="project-contract-number-input"
                          placeholder="e.g. C-2026-001"
                          autoComplete="off"
                        />
                      </InputWrapper>
                    </Field>
                  )}
                />

                <Controller
                  name="contractType"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <ProjectFormFieldLabel>Contract Type</ProjectFormFieldLabel>
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="project-contract-type-select">
                          <SelectValue placeholder="Select contract type..." />
                        </SelectTrigger>
                        <SelectContent>
                          {contractTypeOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}
                />
              </div>

              {/* Row: Contract Category + Payment Terms */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="divisionId"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <ProjectFormFieldLabel required>
                        Contract Category / Division
                      </ProjectFormFieldLabel>
                      <SearchableSelect
                        options={divisionOptions}
                        value={field.value || null}
                        onValueChange={(v) => field.onChange(v ?? '')}
                        placeholder="Select division..."
                        searchPlaceholder="Search divisions..."
                        emptyMessage="No divisions found."
                        className={fieldState.invalid ? projectInvalidControlClassName : undefined}
                      />
                      {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                    </Field>
                  )}
                />

                <Controller
                  name="paymentTerms"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <ProjectFormFieldLabel>Payment Terms</ProjectFormFieldLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger data-testid="project-payment-terms-select">
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

              {/* Row: Contract Value + Retainage % */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="contractValue"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <ProjectFormFieldLabel>Contract Value</ProjectFormFieldLabel>
                      <InputWrapper
                        className={fieldState.invalid ? projectInvalidControlClassName : undefined}
                      >
                        <span className="text-muted-foreground text-sm">$</span>
                        <NumberInput
                          value={field.value ?? 0}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="project-contract-value-input"
                          min={0}
                          decimalPlaces={2}
                          placeholder="0.00"
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
                      <ProjectFormFieldLabel>Retainage %</ProjectFormFieldLabel>
                      <InputWrapper
                        className={fieldState.invalid ? projectInvalidControlClassName : undefined}
                      >
                        <NumberInput
                          value={field.value ?? 0}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="project-retainage-percent-input"
                          min={0}
                          max={100}
                          decimalPlaces={2}
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

              {/* Row: Target Budget % + Tax Rate */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="targetBudgetPercent"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <ProjectFormFieldLabel>Target Budget %</ProjectFormFieldLabel>
                      <InputWrapper
                        className={fieldState.invalid ? projectInvalidControlClassName : undefined}
                      >
                        <NumberInput
                          value={field.value ?? 0}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="project-target-budget-percent-input"
                          min={0}
                          max={100}
                          decimalPlaces={2}
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
                  name="taxRate"
                  control={control}
                  render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                      <ProjectFormFieldLabel>Tax Rate %</ProjectFormFieldLabel>
                      <InputWrapper
                        className={fieldState.invalid ? projectInvalidControlClassName : undefined}
                      >
                        <NumberInput
                          value={field.value ?? 0}
                          onValueChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          data-testid="project-tax-rate-input"
                          min={0}
                          max={100}
                          decimalPlaces={2}
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
                <h3 className="mb-4 text-base font-semibold text-foreground">Dates</h3>

                {/* Row: Estimated Start + End */}
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Controller
                    name="estimatedStartDate"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <ProjectFormFieldLabel>Estimated Start Date</ProjectFormFieldLabel>
                        <InputWrapper>
                          <Input
                            type="date"
                            {...field}
                            data-testid="project-estimated-start-date-input"
                          />
                        </InputWrapper>
                      </Field>
                    )}
                  />

                  <Controller
                    name="estimatedEndDate"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <ProjectFormFieldLabel>Estimated End Date</ProjectFormFieldLabel>
                        <InputWrapper>
                          <Input
                            type="date"
                            {...field}
                            data-testid="project-estimated-end-date-input"
                          />
                        </InputWrapper>
                      </Field>
                    )}
                  />
                </div>

                {/* Row: Inactive Date + TCO Date */}
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Controller
                    name="setInactiveDate"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <ProjectFormFieldLabel>Inactive Date</ProjectFormFieldLabel>
                        <InputWrapper>
                          <Input type="date" {...field} data-testid="project-inactive-date-input" />
                        </InputWrapper>
                      </Field>
                    )}
                  />

                  <Controller
                    name="tcoDate"
                    control={control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <ProjectFormFieldLabel required>TCO Date</ProjectFormFieldLabel>
                        <InputWrapper
                          className={
                            fieldState.invalid ? projectInvalidControlClassName : undefined
                          }
                        >
                          <Input
                            type="date"
                            {...field}
                            data-testid="project-tco-date-input"
                            aria-invalid={fieldState.invalid}
                          />
                        </InputWrapper>
                        {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                      </Field>
                    )}
                  />
                </div>

                {/* Row: Actual Start + Completion */}
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  <Controller
                    name="actualStartDate"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <ProjectFormFieldLabel>Actual Start Date</ProjectFormFieldLabel>
                        <InputWrapper>
                          <Input
                            type="date"
                            {...field}
                            data-testid="project-actual-start-date-input"
                          />
                        </InputWrapper>
                      </Field>
                    )}
                  />

                  <Controller
                    name="actualCompletionDate"
                    control={control}
                    render={({ field }) => (
                      <Field>
                        <ProjectFormFieldLabel>Actual Completion Date</ProjectFormFieldLabel>
                        <InputWrapper>
                          <Input
                            type="date"
                            {...field}
                            data-testid="project-actual-completion-date-input"
                          />
                        </InputWrapper>
                      </Field>
                    )}
                  />
                </div>
              </div>

              {!isEditMode && (
                <>
                  <Separator />

                  {/* ── Contract Documents sub-section ── */}
                  <div>
                    <h3 className="mb-4 text-base font-semibold text-foreground">
                      Contract Documents
                    </h3>
                    <p className="mb-4 text-sm text-muted-foreground">
                      Select files to attach as contract documents. They will be uploaded after the
                      project is created.
                    </p>

                    {selectedFiles.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div
                            key={`${file.name}-${index}`}
                            className="flex items-center gap-3 rounded-lg border p-2.5"
                          >
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{file.name}</p>
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
                </>
              )}
            </CardContent>
          </Card>
        </FormContent>
      </FormLayout>
    </ProjectFormShell>
  );
}
