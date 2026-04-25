import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { Button } from '@app/components/ui/button';
import { Field, FieldLabel } from '@app/components/ui/field';
import { Input } from '@app/components/ui/input';
import { Textarea } from '@app/components/ui/textarea';
import { SearchableSelect } from '@app/components/ui/searchable-select';
import { useEmployeesQuery } from '../../hooks/employees.hooks';
import { useLookupsQuery } from '@modules/project/hooks/lookup.hooks';
import { useCreatePTOMutation } from '../../hooks/pto.hooks';
import { createPTOInputSchema, type CreatePTOInput } from '../../schemas/pto.schema';

interface PTORequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PTORequestDialog({ open, onOpenChange }: PTORequestDialogProps) {
  const { data: employeesData } = useEmployeesQuery({ 
    size: 100,
    page: 1,
    sortBy: 'name',
    sortOrder: 'asc'
  });
  const { data: typesData } = useLookupsQuery('PTO_TYPE');
  const createMutation = useCreatePTOMutation();

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreatePTOInput>({
    resolver: zodResolver(createPTOInputSchema),
    defaultValues: {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    },
  });

  const onSubmit = async (data: CreatePTOInput) => {
    try {
      await createMutation.mutateAsync(data);
      onOpenChange(false);
      reset();
    } catch (error) {
      // Handled by mutation toast
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-xs font-bold uppercase tracking-widest">
            New Time Off Request
          </DialogTitle>
          <DialogDescription className="text-xs">
            Submit a new leave request for approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <Controller
              name="employeeId"
              control={control}
              render={({ field }) => (
                <Field className="col-span-2">
                  <FieldLabel className="text-[10px] font-bold uppercase tracking-widest">
                    Employee
                  </FieldLabel>
                  <SearchableSelect
                    options={employeeOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select employee..."
                  />
                  {errors.employeeId && (
                    <p className="text-[10px] text-destructive uppercase font-bold mt-1">
                      {errors.employeeId.message}
                    </p>
                  )}
                </Field>
              )}
            />

            <Controller
              name="typeId"
              control={control}
              render={({ field }) => (
                <Field className="col-span-2">
                  <FieldLabel className="text-[10px] font-bold uppercase tracking-widest">
                    Leave Type
                  </FieldLabel>
                  <SearchableSelect
                    options={typeOptions}
                    value={field.value}
                    onValueChange={field.onChange}
                    placeholder="Select type..."
                  />
                  {errors.typeId && (
                    <p className="text-[10px] text-destructive uppercase font-bold mt-1">
                      {errors.typeId.message}
                    </p>
                  )}
                </Field>
              )}
            />

            <Controller
              name="startDate"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel className="text-[10px] font-bold uppercase tracking-widest">
                    Start Date
                  </FieldLabel>
                  <Input type="date" {...field} />
                  {errors.startDate && (
                    <p className="text-[10px] text-destructive uppercase font-bold mt-1">
                      {errors.startDate.message}
                    </p>
                  )}
                </Field>
              )}
            />

            <Controller
              name="endDate"
              control={control}
              render={({ field }) => (
                <Field>
                  <FieldLabel className="text-[10px] font-bold uppercase tracking-widest">
                    End Date
                  </FieldLabel>
                  <Input type="date" {...field} />
                  {errors.endDate && (
                    <p className="text-[10px] text-destructive uppercase font-bold mt-1">
                      {errors.endDate.message}
                    </p>
                  )}
                </Field>
              )}
            />

            <Controller
              name="reason"
              control={control}
              render={({ field }) => (
                <Field className="col-span-2">
                  <FieldLabel className="text-[10px] font-bold uppercase tracking-widest">
                    Reason / Note
                  </FieldLabel>
                  <Textarea 
                    {...field} 
                    placeholder="Optional details about your request..."
                    className="h-24"
                  />
                </Field>
              )}
            />
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={() => onOpenChange(false)}
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              size="sm" 
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Request'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
