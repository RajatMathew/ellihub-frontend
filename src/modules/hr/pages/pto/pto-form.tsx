import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calendar, Check } from 'lucide-react';
import { Controller, useForm, type Resolver, type SubmitHandler } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';

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
import { Textarea } from '@app/components/ui/textarea';
import { Separator } from '@app/components/ui/separator';
import { SearchableSelect } from '@app/components/ui/searchable-select';

import { useEmployeesQuery } from '../../hooks/employees.hooks';
import { useLookupsQuery } from '@modules/project/hooks/lookup.hooks';
import {
  useCreatePTOMutation,
  usePTODetailQuery,
  useUpdatePTOMutation,
} from '../../hooks/pto.hooks';
import { createPTOInputSchema, type CreatePTOInput } from '../../schemas/pto.schema';

export default function PTOFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = !!id;

  const { data: pto, isLoading: isLoadingDetail } = usePTODetailQuery(id ?? '');
  const { data: employeesData } = useEmployeesQuery({ 
    size: 100,
    page: 1,
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const { data: typesData } = useLookupsQuery('PTO_TYPE');
  const createMutation = useCreatePTOMutation();
  const updateMutation = useUpdatePTOMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<CreatePTOInput>({
    resolver: zodResolver(createPTOInputSchema) as Resolver<CreatePTOInput>,
    defaultValues: {
      employeeId: '',
      typeId: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: '',
    },
  });

  useEffect(() => {
    if (isEdit && pto) {
      reset({
        employeeId: pto.employeeId,
        typeId: pto.typeId,
        startDate: pto.startDate ? new Date(pto.startDate).toISOString().split('T')[0] : '',
        endDate: pto.endDate ? new Date(pto.endDate).toISOString().split('T')[0] : '',
        reason: pto.reason ?? '',
      });
    }
  }, [isEdit, pto, reset]);

  const onSubmit = async (data: CreatePTOInput) => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ ...data, id });
      } else {
        await createMutation.mutateAsync(data);
      }
      navigate('..', { relative: 'path' });
    } catch (err) {
      // Error handled by mutation toast
    }
  };

  const employeeOptions = employeesData?.data?.map((emp) => ({
    value: emp.id,
    label: emp.name,
  })) || [];

  const typeOptions = typesData?.map((t) => ({
    value: t.id,
    label: t.label || t.name || 'Unknown',
  })) || [];

  if (isEdit && isLoadingDetail) {
    return (
      <div className="container-fluid py-7.5 text-center">
        <div className="text-sm text-muted-foreground uppercase tracking-widest mt-20">
          Loading request data...
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit as SubmitHandler<CreatePTOInput>)} className="container-fluid py-7.5">
      <Toolbar sticky={false}>
        <ToolbarWrapper>
          <ToolbarHeading>
            <div className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
              <Link to="../.." relative="path" className="hover:text-foreground">
                HR / Time Off
              </Link>
              {' / '}
              <span>{isEdit ? 'Update Request' : 'New Request'}</span>
            </div>
            <ToolbarPageTitle>{isEdit ? 'Modify Request' : 'Submit Time Off'}</ToolbarPageTitle>
            <span className="text-sm text-muted-foreground">
              {isEdit
                ? 'Update the details of this leave request.'
                : 'Enter the details for a new staff absence or leave request.'}
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
              {isEdit ? 'Save Changes' : 'Submit Request'}
            </Button>
          </ToolbarActions>
        </ToolbarWrapper>
      </Toolbar>

      <div className="pt-6 space-y-6">
        <Card>
          <CardContent className="space-y-6">
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-[0.2em] mb-1">
                Leave Configuration
              </h2>
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                Specify the employee and timing for this absence.
              </p>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Controller
                name="employeeId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                      Employee Selection
                    </FieldLabel>
                    <SearchableSelect
                      options={employeeOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Search and select staff..."
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />

              <Controller
                name="typeId"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                      PTO Category
                    </FieldLabel>
                    <SearchableSelect
                      options={typeOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select leave type..."
                    />
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

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

              <Controller
                name="endDate"
                control={control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                      Conclusion Date
                    </FieldLabel>
                    <InputWrapper>
                      <Calendar className="size-4 text-muted-foreground" />
                      <Input {...field} type="date" />
                    </InputWrapper>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
            </div>

            <Controller
              name="reason"
              control={control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel className="text-[10px] font-bold tracking-widest uppercase">
                    Justification / Notes
                  </FieldLabel>
                  <InputWrapper className="min-h-[120px] p-0 overflow-hidden">
                    <Textarea 
                      {...field} 
                      placeholder="Provide context for this leave request..." 
                      className="border-none focus-visible:ring-0 px-4 py-3 shadow-none min-h-[120px] resize-none text-sm leading-relaxed"
                    />
                  </InputWrapper>
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
