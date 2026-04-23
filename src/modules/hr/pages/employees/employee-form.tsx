import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Check, Contact2, Mail, MapPin, Phone, UserPlus } from 'lucide-react';
import { Controller, useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';

import { FormSectionNav } from '@app/components/form-section-nav';
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
import { Separator } from '@app/components/ui/separator';
import { Switch } from '@app/components/ui/switch';

import {
  useCreateEmployeeMutation,
  useEmployeeDetailQuery,
  useUpdateEmployeeMutation,
} from '../../hooks/employees.hooks';
import { createEmployeeInputSchema, type CreateEmployeeInput } from '../../schemas/employee.schema';

const EMPLOYEE_FORM_SECTIONS = [
  { id: 'info', label: 'Basic Info' },
  { id: 'employment', label: 'Employment' },
  { id: 'emergency', label: 'Emergency Contact' },
];

export default function EmployeeFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: employee, isLoading: isLoadingDetail } = useEmployeeDetailQuery(id ?? '');
  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();

  const [activeSection, setActiveSection] = useState<string>('info');

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeInputSchema) as Resolver<CreateEmployeeInput>,
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      address: '',
      startDate: new Date().toISOString().split('T')[0],
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      roleId: '',
      createAccount: true,
    },
  });

  useEffect(() => {
    if (isEdit && employee) {
      reset({
        name: employee.name,
        email: employee.email,
        phoneNumber: employee.phoneNumber ?? '',
        address: employee.address ?? '',
        startDate: employee.startDate
          ? new Date(employee.startDate).toISOString().split('T')[0]
          : '',
        emergencyContactName: employee.emergencyContactName ?? '',
        emergencyContactPhone: employee.emergencyContactPhone ?? '',
        emergencyContactRelation: employee.emergencyContactRelation ?? '',
        roleId: employee.roleId ?? '',
        createAccount: true,
      });
    }
  }, [isEdit, employee, reset]);

  const handleFillRandom = () => {
    const names = [
      'John Smith',
      'Sarah Jenkins',
      'Michael Ross',
      'Rachel Zane',
      'Louis Litt',
      'Donna Paulsen',
    ];
    const selectedName = names[Math.floor(Math.random() * names.length)];
    const emailPrefix = selectedName.toLowerCase().replace(' ', '.');

    reset({
      name: selectedName,
      email: `${emailPrefix}@contractor-corp.com`,
      phoneNumber: `(555) 012-${Math.floor(1000 + Math.random() * 9000)}`,
      address: `${Math.floor(100 + Math.random() * 900)} Construction Way, Building B`,
      startDate: new Date().toISOString().split('T')[0],
      emergencyContactName: 'Jane Smith',
      emergencyContactPhone: '(555) 012-9999',
      emergencyContactRelation: 'Spouse',
      createAccount: true,
    });
    toast.info('Populated with candidate data.');
  };

  const onSubmit = async (data: CreateEmployeeInput) => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ ...data, id });
        navigate('..', { relative: 'path' });
      } else {
        const created = await createMutation.mutateAsync(data);
        navigate(`../${created.id}`, { relative: 'path' });
      }
    } catch (err) {
      // Error handled by mutation toast
    }
  };

  if (isEdit && isLoadingDetail) {
    return (
      <div className="container-fluid py-7.5 text-center">
        <div className="text-sm text-muted-foreground uppercase tracking-widest mt-20">
          Loading profile data...
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as SubmitHandler<CreateEmployeeInput>)} className="container-fluid py-7.5">
      <Toolbar sticky={false}>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to="../.." relative="path" className="hover:text-foreground">
                HR / Employees
              </Link>
              {' / '}
              <span>{isEdit ? 'Edit Profile' : 'New Induction'}</span>
            </div>
            <ToolbarPageTitle>{isEdit ? 'Update Profile' : 'Add New Employee'}</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEdit
                ? 'Modify personal details and employment configuration.'
                : 'Induct a new staff member into the workforce management system.'}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            {!isEdit && (
              <Button variant="outline" size="sm" type="button" onClick={handleFillRandom}>
                Fill Sample
              </Button>
            )}
            <Button variant="outline" size="sm" type="button" asChild>
              <Link to=".." relative="path">
                Cancel
              </Link>
            </Button>
            <Button size="sm" type="submit" disabled={isSubmitting}>
              <Check className="size-4" />
              {isEdit ? 'Save Profile' : 'Create Employee'}
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <FormSectionNav
        sections={EMPLOYEE_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="pt-6 space-y-6">
        {/* ---- Basic Info ---- */}
        <Card id="info">
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-[0.2em] mb-1">
                Personal Identity
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Fundamental identifying information for the employee.
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                      Full Legal Name
                    </FieldLabel>
                    <InputWrapper>
                      <UserPlus className="size-4 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="e.g. Robert J. Oppenheimer"
                        autoComplete="off"
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="email"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                      Work Email Address
                    </FieldLabel>
                    <InputWrapper>
                      <Mail className="size-4 text-muted-foreground" />
                      <Input
                        {...field}
                        type="email"
                        placeholder="robert@contractor-corp.com"
                        autoComplete="off"
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Controller
                name="phoneNumber"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                      Contact Number
                    </FieldLabel>
                    <InputWrapper>
                      <Phone className="size-4 text-muted-foreground" />
                      <Input {...field} placeholder="(555) 000-0000" autoComplete="off" />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="address"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                      Physical Address
                    </FieldLabel>
                    <InputWrapper>
                      <MapPin className="size-4 text-muted-foreground" />
                      <Input {...field} placeholder="123 Industrial St, NY" autoComplete="off" />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* ---- Employment ---- */}
        <Card id="employment">
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-[0.2em] mb-1">
                Employment Configuration
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Workforce placement and onboarding details.
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Controller
                name="startDate"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                      Commencement Date
                    </FieldLabel>
                    <InputWrapper>
                      <Calendar className="size-4 text-muted-foreground" />
                      <Input {...field} type="date" />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              {!isEdit && (
                <Controller
                  name="createAccount"
                  control={control}
                  render={({ field }) => (
                    <Field>
                      <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                        Create System Account
                      </FieldLabel>
                      <div className="flex items-center gap-3 pt-2">
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                        <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                          Auto-generate login credentials
                        </span>
                      </div>
                    </Field>
                  )}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* ---- Emergency ---- */}
        <Card id="emergency">
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-[0.2em] mb-1">
                Emergency Information
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Protocol contacts for critical incidents.
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Controller
                name="emergencyContactName"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                      Contact Name
                    </FieldLabel>
                    <InputWrapper>
                      <Contact2 className="size-4 text-muted-foreground" />
                      <Input {...field} placeholder="Next of Kin" autoComplete="off" />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="emergencyContactPhone"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                      Contact Phone
                    </FieldLabel>
                    <InputWrapper>
                      <Phone className="size-4 text-muted-foreground" />
                      <Input {...field} placeholder="(555) 999-9999" autoComplete="off" />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="emergencyContactRelation"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                      Relationship
                    </FieldLabel>
                    <InputWrapper>
                      <Input {...field} placeholder="e.g. Spouse, Parent" autoComplete="off" />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </form>
  );
}
