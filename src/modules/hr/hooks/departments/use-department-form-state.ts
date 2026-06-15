import { useEffect, useState } from 'react';

import { fakeDepartmentDescription, fakeDepartmentName } from '@/lib/fake-data';
import { useDepartmentDetailQuery } from '@/modules/hr/hooks/departments.hooks';
import {
  createDepartmentInputSchema,
  type CreateDepartmentInput,
} from '@/modules/hr/schemas/department.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';

export function useDepartmentFormState(id: string | undefined) {
  const isEdit = Boolean(id);
  const departmentQuery = useDepartmentDetailQuery(id ?? '');
  const [activeSection, setActiveSection] = useState('info');

  const form = useForm<CreateDepartmentInput>({
    resolver: zodResolver(createDepartmentInputSchema) as Resolver<CreateDepartmentInput>,
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (!isEdit || !departmentQuery.data) return;

    form.reset({
      name: departmentQuery.data.name,
      description: departmentQuery.data.description ?? '',
    });
  }, [departmentQuery.data, form, isEdit]);

  const fillSample = () => {
    const selectedName = fakeDepartmentName();

    form.reset({
      name: selectedName,
      description: fakeDepartmentDescription(selectedName),
    });
    toast.info('Form filled with sample department data.');
  };

  return {
    isEdit,
    form,
    departmentQuery,
    activeSection,
    setActiveSection,
    fillSample,
  };
}
