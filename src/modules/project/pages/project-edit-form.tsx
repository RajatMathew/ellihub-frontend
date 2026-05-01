import { useEffect, useRef, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { Controller, useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';

import { FormSectionNav } from '@/app/components/form-section-nav';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input, InputWrapper } from '@/app/components/ui/input';
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
import { useGCsQuery } from '@/modules/directory/hooks';
import { useEmployeesQuery } from '@/modules/hr/hooks/use-employees';
import { ProjectFormPageLoading } from '@/modules/project/components/shared';
import {
  PROJECT_FORM_SECTIONS,
  PROJECT_STATUS_OPTIONS,
} from '@/modules/project/constants/project-form.constants';
import {
  useDivisionsQuery,
  useProjectDetailQuery,
  useProjectStagesQuery,
  useSetProjectActiveMutation,
  useSetProjectClosedMutation,
  useSetProjectCompletedMutation,
  useSetProjectInactiveMutation,
  useUpdateProjectMutation,
} from '@/modules/project/hooks';
import {
  projectFormSchema,
  type ProjectDetail,
  type ProjectFormValues,
  type UpdateProjectInput,
} from '@/modules/project/schemas/project.schema';

const parseDateValue = (value: unknown): string =>
  typeof value === 'string' ? value.split('T')[0] : '';

export default function ProjectEditForm() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const { data: project, isLoading } = useProjectDetailQuery(projectId);

  if (isLoading) return <ProjectFormPageLoading sections={PROJECT_FORM_SECTIONS.length} />;
  if (!project) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground">Project not found.</div>
      </div>
    );
  }

  return <ProjectEditFormInner project={project} projectId={projectId} navigate={navigate} />;
}

/* ---- Inner component rendered once project data is loaded ---- */

function ProjectEditFormInner({
  project,
  projectId,
  navigate,
}: {
  project: ProjectDetail;
  projectId: string;
  navigate: NavigateFunction;
}) {
  const primeContract = project.primeContract;

  /* ---- Queries ---- */

  const stagesQuery = useProjectStagesQuery();
  const divisionsQuery = useDivisionsQuery();
  const gcsQuery = useGCsQuery({ limit: 1000 });
  const employeesQuery = useEmployeesQuery({ size: 1000 });

  /* ---- Build dropdown options ---- */

  const stageOptions = stagesQuery.data?.map((s) => ({ value: s.id, label: s.name })) ?? [];
  const divisionOptions =
    divisionsQuery.data?.map((d) => ({
      value: d.id,
      label: d.label || d.name || 'Unknown',
    })) ?? [];
  const gcOptions = gcsQuery.data?.data?.map((gc) => ({ value: gc.id, label: gc.name })) ?? [];
  const pmOptions = employeesQuery.data?.data?.map((e) => ({ value: e.id, label: e.name })) ?? [];

  /* ---- Form setup with existing values ---- */

  const { control, handleSubmit } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema) as Resolver<ProjectFormValues>,
    defaultValues: {
      name: project.name,
      description: project.description ?? '',
      jobNumber: project.jobNumber ?? '',
      contractNumber: project.contractNumber ?? '',
      fieldwireProjectId: project.fieldwireProjectId ?? '',
      stageId: project.stageId,
      status: project.status ?? 'ACTIVE',
      divisionId: project.divisionId ?? '',
      gcId: project.gcId,
      leadPMId: project.leadPMId ?? '',
      streetAddress: project.streetAddress ?? '',
      city: project.city ?? '',
      state: project.state ?? '',
      zipCode: project.zipCode ?? '',
      contractValue: project.contractValue ?? primeContract?.contractValue ?? 0,
      contractType: primeContract?.contractType ?? '',
      retainagePercent: project.retainagePercent ?? primeContract?.retainagePercent ?? 0,
      targetBudgetPercent: project.targetBudgetPercent ?? primeContract?.targetBudgetPercent ?? 0,
      taxRate: project.taxRate ?? 0,
      paymentTerms: primeContract?.paymentTerms ?? '',
      estimatedStartDate: parseDateValue(project.estimatedStartDate ?? primeContract?.estimatedStartDate),
      estimatedEndDate: parseDateValue(project.estimatedEndDate ?? primeContract?.estimatedCompletionDate),
      actualStartDate: parseDateValue(primeContract?.actualStartDate),
      actualCompletionDate: parseDateValue(primeContract?.actualCompletionDate),
      setInactiveDate: parseDateValue(project.setInactiveDate),
      tcoDate: parseDateValue(project.tcoDate),
    },
  });

  /* ---- Status (not in projectFormSchema, managed separately) ---- */

  /* ---- Mutation ---- */

  const updateMutation = useUpdateProjectMutation();
  const setActiveMutation = useSetProjectActiveMutation();
  const setInactiveMutation = useSetProjectInactiveMutation();
  const setClosedMutation = useSetProjectClosedMutation();
  const setCompletedMutation = useSetProjectCompletedMutation();

  const [activeSection, setActiveSection] = useState<string>('project-info');
  const isSubmitting =
    updateMutation.isPending ||
    setActiveMutation.isPending ||
    setInactiveMutation.isPending ||
    setClosedMutation.isPending ||
    setCompletedMutation.isPending;

  /* ---- Submit ---- */

  const onSubmit = async (data: ProjectFormValues) => {
    const payload: UpdateProjectInput = {
      name: data.name,
      description: data.description,
      fieldwireProjectId: data.fieldwireProjectId || null,
      stageId: data.stageId,
      divisionId: data.divisionId,
      gcId: data.gcId,
      leadPMId: data.leadPMId || undefined,
      status: data.status,
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
      setInactiveDate: data.setInactiveDate || undefined,
      tcoDate: data.tcoDate || undefined,
    };

    try {
      // 1. Update general fields
      await updateMutation.mutateAsync({ id: projectId, data: payload });

      // 2. Handle status change if needed (backend has separate status endpoints)
      const oldStatus = project.status;
      const newStatus = data.status;

      if (oldStatus !== newStatus) {
        if (newStatus === 'ACTIVE') await setActiveMutation.mutateAsync(projectId);
        else if (newStatus === 'INACTIVE') await setInactiveMutation.mutateAsync(projectId);
        else if (newStatus === 'CLOSED') await setClosedMutation.mutateAsync(projectId);
        else if (newStatus === 'COMPLETED') await setCompletedMutation.mutateAsync(projectId);
      }

      toast.success('Project updated.');
      navigate(`/app/project/${projectId}/overview`);
    } catch {
      /* error toast from mutation */
    }
  };

  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  useEffect(() => {
    if (headerRef.current) {
      setHeaderHeight(headerRef.current.offsetHeight);
    }
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit as SubmitHandler<ProjectFormValues>)}
      className="container-fluid py-7.5"
    >
      {/* ── Toolbar ── */}
      <Toolbar sticky ref={headerRef} className="mb-0">
        <ToolbarWrapper>
          <ToolbarHeading>
            <ToolbarPageTitle>Edit Project</ToolbarPageTitle>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" size="sm" type="button" asChild>
              <Link to={`/app/project/${projectId}/overview`}>Cancel</Link>
            </Button>
            <Button size="sm" type="submit" disabled={isSubmitting}>
              <Check className="size-4" />
              Save Changes
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* ── Section Navigation ── */}
      <FormSectionNav
        sections={PROJECT_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
        scrollOffset={headerHeight}
        className="sticky border-b border-border mb-6"
        top={headerHeight}
      />

      <div className="space-y-6">
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

            {/* Row: Project Stage + Status */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Controller
                name="stageId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Project Stage
                    </FieldLabel>
                    <SearchableSelect
                      options={stageOptions}
                      value={field.value || null}
                      onValueChange={(v) => field.onChange(v ?? '')}
                      placeholder="Select stage..."
                      searchPlaceholder="Search stages..."
                      emptyMessage="No stages found."
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="status"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Project Status
                    </FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger aria-invalid={fieldState.invalid}>
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
            </div>

            {/* Row: Job Number (read-only) */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                        disabled
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="fieldwireProjectId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Fieldwire Project ID
                    </FieldLabel>
                    <InputWrapper>
                      <Input
                        {...field}
                        placeholder="Fieldwire UUID"
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
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

            {/* Row: Contract Category */}
            <Controller
              name="divisionId"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                    Contract Category / Division
                  </FieldLabel>
                  <SearchableSelect
                    options={divisionOptions}
                    value={field.value || null}
                    onValueChange={(v) => field.onChange(v ?? '')}
                    placeholder="Select division..."
                    searchPlaceholder="Search divisions..."
                    emptyMessage="No divisions found."
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />

            {/* Row: Start Date + End Date */}
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
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
                name="estimatedEndDate"
                control={control}
                render={({ field }) => (
                  <Field>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                      Estimated End Date
                    </FieldLabel>
                    <InputWrapper>
                      <Input type="date" {...field} />
                    </InputWrapper>
                  </Field>
                )}
              />
            </div>

            {/* Row: Contract Value (read-only — edited via contract dialog) */}
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
                      disabled
                    />
                  </InputWrapper>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contract value is managed from the contract details section.
                  </p>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
