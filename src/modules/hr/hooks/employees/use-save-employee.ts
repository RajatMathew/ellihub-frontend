import {
  useCreateEmployeeMutation,
  useUpdateEmployeeMutation,
} from '@/modules/hr/hooks/employees.hooks';
import { employeeDepartmentChange } from '@/modules/hr/lib/employee-department';
import type { CreateEmployeeInput } from '@/modules/hr/schemas/employee.schema';
import posthog from 'posthog-js';
import { toast } from 'sonner';

interface UseSaveEmployeeParams {
  id: string | undefined;
  isEdit: boolean;
  /** The department the employee was in when the form loaded. */
  originalDepartmentId?: string | null;
  onSaved: (id?: string) => void;
}

export function useSaveEmployee({
  id,
  isEdit,
  originalDepartmentId,
  onSaved,
}: UseSaveEmployeeParams) {
  const createMutation = useCreateEmployeeMutation();
  const updateMutation = useUpdateEmployeeMutation();
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  const saveEmployee = async (formData: CreateEmployeeInput) => {
    try {
      if (isEdit && id) {
        await updateMutation.mutateAsync({
          ...formData,
          id,
          departmentId: employeeDepartmentChange(originalDepartmentId, formData.departmentId),
        });
        toast.success('Employee updated.');
        onSaved();
        return;
      }

      const created = await createMutation.mutateAsync(formData);
      posthog.capture('employee_created', { employee_id: created.id });
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
