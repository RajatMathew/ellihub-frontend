import { useEffect } from 'react';

import { useAppLookupsQuery } from '@/app/hooks/use-lookup';
import { useEmployeesQuery } from '@/modules/hr/hooks/employees.hooks';
import { usePTODetailQuery } from '@/modules/hr/hooks/pto.hooks';
import { createPTOInputSchema, type CreatePTOInput } from '@/modules/hr/schemas/pto.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';

export function usePTOFormState(id: string | undefined) {
  const isEdit = Boolean(id);
  const ptoQuery = usePTODetailQuery(id ?? '');
  const employeesQuery = useEmployeesQuery({
    page: 1,
    size: 100,
    sortBy: 'name',
    sortOrder: 'asc',
  });
  const typesQuery = useAppLookupsQuery('PTO_TYPE');

  const form = useForm<CreatePTOInput>({
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
    if (!isEdit || !ptoQuery.data) return;

    const pto = ptoQuery.data;
    form.reset({
      employeeId: pto.employeeId,
      typeId: pto.typeId,
      startDate: pto.startDate ? new Date(pto.startDate).toISOString().split('T')[0] : '',
      endDate: pto.endDate ? new Date(pto.endDate).toISOString().split('T')[0] : '',
      reason: pto.reason ?? '',
    });
  }, [form, isEdit, ptoQuery.data]);

  const employeeOptions = (employeesQuery.data?.data ?? []).map((employee) => ({
    value: employee.id,
    label: employee.name,
  }));

  const typeOptions = (typesQuery.data ?? []).map((type) => ({
    value: type.id,
    label: type.label || type.name || 'Unknown',
  }));

  return {
    isEdit,
    form,
    ptoQuery,
    employeeOptions,
    typeOptions,
    isEmployeesLoading: employeesQuery.isLoading,
    isTypesLoading: typesQuery.isLoading,
  };
}
