import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Check } from 'lucide-react';
import { Controller, useForm } from 'react-hook-form';
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
import { Textarea } from '@app/components/ui/textarea';

import { DEPARTMENT_FORM_SECTIONS } from '../../constants/departments.constants';
import { useCreateDepartmentMutation, useDepartmentDetailQuery, useUpdateDepartmentMutation } from '../../hooks/departments.hooks';
import { createDepartmentInputSchema, type CreateDepartmentInput } from '../../schemas/department.schema';

export default function DepartmentFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: department, isLoading: isLoadingDetail } = useDepartmentDetailQuery(id ?? '');
  const createMutation = useCreateDepartmentMutation();
  const updateMutation = useUpdateDepartmentMutation();

  const [activeSection, setActiveSection] = useState<string>('info');

  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentInputSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (isEdit && department) {
      reset({
        name: department.name,
        description: department.description ?? '',
      });
    }
  }, [isEdit, department, reset]);

  const handleFillRandom = () => {
    const departments = ['Engineering', 'Marketing', 'Sales', 'Human Resources', 'Product', 'Customer Success', 'Finance', 'Legal'];
    const randomDept = departments[Math.floor(Math.random() * departments.length)];
    const randomId = Math.floor(Math.random() * 1000);
    
    reset({
      name: `${randomDept} ${randomId}`,
      description: `Targeted responsibilities for the ${randomDept} team, focused on high-impact objectives and departmental excellence.`,
    });
    toast.info('Form filled with random data.');
  };

  const onSubmit = async (data: CreateDepartmentInput) => {
    if (isEdit && id) {
      await updateMutation.mutateAsync({ ...data, id }, {
        onSuccess: () => navigate('..', { relative: 'path' }),
      });
    } else {
      const created = await createMutation.mutateAsync(data);
      navigate(`../${created.id}`, { relative: 'path' });
    }
  };

  if (isEdit && isLoadingDetail) {
    return (
      <div className="container-fluid py-7.5">
        <div className="text-sm text-muted-foreground uppercase tracking-widest">Loading department...</div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="container-fluid py-7.5">
      <Toolbar sticky={false}>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to="../.." relative="path" className="hover:text-foreground">
                Departments
              </Link>
              {' / '}
              <span>{isEdit ? 'Edit' : 'New Department'}</span>
            </div>
            <ToolbarPageTitle>{isEdit ? 'Edit Department' : 'Create Department'}</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEdit 
                ? 'Update basic information and settings for this department.' 
                : 'Define a new department to organize your company structure.'}
            </span>
          </ToolbarHeading>
          <ToolbarActions>
            {!isEdit && (
              <Button variant="outline" size="sm" type="button" onClick={handleFillRandom}>
                Fill Random
              </Button>
            )}
            <Button variant="outline" size="sm" type="button" asChild>
              <Link to=".." relative="path">Cancel</Link>
            </Button>
            <Button size="sm" type="submit" disabled={isSubmitting}>
              <Check className="size-4" />
              {isEdit ? 'Save Changes' : 'Create Department'}
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      {/* Main layout: top nav + content */}
      <FormSectionNav
        sections={DEPARTMENT_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={setActiveSection}
      />

      <div className="pt-6 space-y-6">
        <Card id="info">
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-foreground uppercase tracking-wide">
                General Information
              </h2>
              <p className="text-sm text-muted-foreground uppercase tracking-wider">
                Basic details that identify the department.
              </p>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-1 gap-5">
              <Controller
                name="name"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">Department Name</FieldLabel>
                    <InputWrapper>
                      <Building2 className="size-4 text-muted-foreground" />
                      <Input 
                        {...field} 
                        placeholder="e.g. Engineering, Sales, Human Resources" 
                        aria-invalid={fieldState.invalid}
                        autoComplete="off"
                      />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <div className="grid grid-cols-1 gap-5">
              <Controller
                name="description"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-xs font-semibold tracking-widest uppercase">Description</FieldLabel>
                    <Textarea 
                      {...field} 
                      placeholder="Describe the department's core responsibilities and functions..." 
                      className="min-h-[120px] resize-none"
                      aria-invalid={fieldState.invalid}
                    />
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
