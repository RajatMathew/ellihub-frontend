import { useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
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
import { Textarea } from '@app/components/ui/textarea';

import { FormSectionNav } from '@app/components/form-section-nav';
import { useEmployeesQuery } from '@app/hooks/use-employees';
import { useGCsQuery } from '@modules/directory/hooks';
import {
  DIVISION_OPTIONS,
  PROJECT_FORM_SECTIONS,
} from '@modules/project/constants/project-form.constants';
import {
  useCreateProjectMutation,
  useCreateScheduleEntryMutation,
  useProjectStagesQuery,
} from '@modules/project/hooks';
import {
  projectFormSchema,
  type CreateProjectInput,
  type ProjectFormValues,
} from '@modules/project/schemas/project.schema';

export default function ProjectForm() {
  const navigate = useNavigate();

  /* ---- Queries ---- */

  const stagesQuery = useProjectStagesQuery();
  const gcsQuery = useGCsQuery({ limit: 1000 });
  const employeesQuery = useEmployeesQuery({ size: 1000 });

  /* ---- Build dropdown options ---- */

  const stageOptions = stagesQuery.data?.map((s) => ({ value: s.id, label: s.name })) ?? [];

  const gcOptions = gcsQuery.data?.data?.map((gc) => ({ value: gc.id, label: gc.name })) ?? [];

  const pmOptions =
    employeesQuery.data?.data?.map((e) => ({ value: e.id, label: e.name })) ?? [];

  /* ---- Form setup ---- */

  const { control, handleSubmit } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: {
      name: '',
      description: '',
      jobNumber: '',
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
    },
  });

  /* ---- Mutations ---- */

  const createMutation = useCreateProjectMutation();
  const createScheduleMutation = useCreateScheduleEntryMutation();

  const [activeSection, setActiveSection] = useState<string>('project-info');
  const isSubmitting = createMutation.isPending;

  /* ---- Submit ---- */

  const onSubmit = async (data: ProjectFormValues) => {
    const payload: CreateProjectInput = {
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

    try {
      const project = await createMutation.mutateAsync(payload);

      // Create schedule entry if start date provided
      if (data.effectiveStartDate) {
        try {
          await createScheduleMutation.mutateAsync({
            projectId: project.id,
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
      navigate('..', { relative: 'path' });
    } catch {
      /* error toast from mutation */
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, (errors) => console.warn('Validation errors:', errors))}
      className="container-fluid py-7.5"
    >
      {/* ── Toolbar ── */}
      <Toolbar>
        <ToolbarWrapper>
          <ToolbarHeading>
            <ToolbarPageTitle>New Project</ToolbarPageTitle>
          </ToolbarHeading>
          <ToolbarActions>
            <Button variant="outline" size="sm" type="button" asChild>
              <Link to=".." relative="path">Cancel</Link>
            </Button>
            <Button variant="outline" size="sm" type="submit" disabled={isSubmitting}>
              Save as Draft
            </Button>
            <Button size="sm" type="submit" disabled={isSubmitting}>
              <Check className="size-4" />
              Create Project
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <Separator />

      {/* ── Main layout ── */}
      <div className="flex gap-8 pt-8">
        <FormSectionNav
          sections={PROJECT_FORM_SECTIONS}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        <div className="flex-1 min-w-0 space-y-6">
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

              {/* Row: Contract Category */}
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

              {/* Row: Start Date + End Date */}
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <Controller
                  name="effectiveStartDate"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-xs font-semibold tracking-widest uppercase">
                        Start Date
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
                        End Date
                      </FieldLabel>
                      <InputWrapper>
                        <Input type="date" {...field} />
                      </InputWrapper>
                    </Field>
                  )}
                />
              </div>

              {/* Row: Contract Value */}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  );
}
