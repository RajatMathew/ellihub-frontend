import { useEffect, useState } from 'react';

import { DEPARTMENT_SAMPLE_NAMES } from '@/modules/hr/constants/departments/department-form.constants';
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
    const selectedName =
      DEPARTMENT_SAMPLE_NAMES[Math.floor(Math.random() * DEPARTMENT_SAMPLE_NAMES.length)];
    const suffix = Math.floor(Math.random() * 1000);

    form.reset({
      name: `${selectedName} ${suffix}`,
      description: `Focused responsibilities for the ${selectedName} team, organized around clear ownership and measurable outcomes.`,
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
