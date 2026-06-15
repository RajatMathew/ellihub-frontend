import { useEffect } from 'react';

import { useAccess } from '@/app/contexts/access-context';
import { useAppLookupsQuery } from '@/app/hooks/use-lookup';
import { useEmployeesQuery } from '@/modules/hr/hooks/employees.hooks';
import { usePTODetailQuery } from '@/modules/hr/hooks/pto.hooks';
import { createPTOInputSchema, type CreatePTOInput } from '@/modules/hr/schemas/pto.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';

export function usePTOFormState(id: string | undefined) {
  const isEdit = Boolean(id);
  const { access, isAdmin, isLoading: isAccessLoading } = useAccess();
  const currentEmployeeId = access?.employeeId ?? '';
  const ptoQuery = usePTODetailQuery(id ?? '');
  const employeesQuery = useEmployeesQuery(
    {
      page: 1,
      size: 100,
      sortBy: 'name',
      sortOrder: 'asc',
    },
    { enabled: isAdmin }
  );
  const typesQuery = useAppLookupsQuery('PTO_TYPE');

  const form = useForm<CreatePTOInput>({
    resolver: zodResolver(createPTOInputSchema) as Resolver<CreatePTOInput>,
    defaultValues: {
      employeeId: currentEmployeeId,
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

  useEffect(() => {
    if (isEdit || isAdmin || !currentEmployeeId) return;
    form.setValue('employeeId', currentEmployeeId, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [currentEmployeeId, form, isAdmin, isEdit]);

  const employeeOptions = isAdmin
    ? (employeesQuery.data?.data ?? []).map((employee) => ({
        value: employee.id,
        label: employee.name,
      }))
    : [];

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
    showEmployeeSelector: isAdmin,
    hasCurrentEmployee: isAdmin || Boolean(currentEmployeeId),
    isEmployeesLoading: isAdmin && employeesQuery.isLoading,
    isAccessLoading,
    isTypesLoading: typesQuery.isLoading,
  };
}
