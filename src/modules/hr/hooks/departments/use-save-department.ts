import {
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
} from '@/modules/hr/hooks/departments.hooks';
import type { CreateDepartmentInput } from '@/modules/hr/schemas/department.schema';
import { useNavigate } from 'react-router-dom';

interface UseSaveDepartmentOptions {
  id: string | undefined;
  isEdit: boolean;
}

export function useSaveDepartment({ id, isEdit }: UseSaveDepartmentOptions) {
  const navigate = useNavigate();
  const createMutation = useCreateDepartmentMutation();
  const updateMutation = useUpdateDepartmentMutation();

  const saveDepartment = async (formData: CreateDepartmentInput) => {
    if (isEdit && id) {
      await updateMutation.mutateAsync({ ...formData, id });
      navigate('..', { relative: 'path' });
      return;
    }

    const created = await createMutation.mutateAsync(formData);
    navigate(`../${created.id}`, { relative: 'path' });
  };

  return {
    saveDepartment,
    isPending: createMutation.isPending || updateMutation.isPending,
  };
}
