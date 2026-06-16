import {
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
} from '@/modules/hr/hooks/employees.hooks';
import type { CreateEmployeeInput } from '@/modules/hr/schemas/employee.schema';
import { toast } from 'sonner';

interface UseSaveEmployeeParams {
  id: string | undefined;
  isEdit: boolean;
  onSaved: (id?: string) => void;
}

export function useSaveEmployee({ id, isEdit, onSaved }: UseSaveEmployeeParams) {
  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const saveEmployee = async (formData: CreateEmployeeInput) => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({ ...formData, id });
        toast.success('Employee updated.');
        onSaved();
        return;
      }

      const created = await createMutation.mutateAsync(formData);
      toast.success('Employee created.');
      onSaved(created.id);
    } catch (error) {
      console.error('Failed to save employee:', error);
    }
  };

  return {
    saveEmployee,
    isSubmitting,
  };
}
