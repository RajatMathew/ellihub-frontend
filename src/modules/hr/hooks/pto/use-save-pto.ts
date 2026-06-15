import { useCreatePTOMutation, useUpdatePTOMutation } from '@/modules/hr/hooks/pto.hooks';
import type { CreatePTOInput } from '@/modules/hr/schemas/pto.schema';
import { useNavigate } from 'react-router-dom';

interface UseSavePTOParams {
  id: string | undefined;
  isEdit: boolean;
}

export function useSavePTO({ id, isEdit }: UseSavePTOParams) {
  const navigate = useNavigate();
  const createMutation = useCreatePTOMutation();
  const updateMutation = useUpdatePTOMutation();

  const savePTO = async (formData: CreatePTOInput) => {
    if (isEdit && id) {
      await updateMutation.mutateAsync({
        id,
        typeId: formData.typeId,
        startDate: formData.startDate,
        endDate: formData.endDate,
        reason: formData.reason,
      });
      navigate('..', { relative: 'path' });
      return;
    }

    await createMutation.mutateAsync(formData);
    navigate('..', { relative: 'path' });
  };

  return {
    savePTO,
    isPending: createMutation.isPending || updateMutation.isPending,
  };
}
