import { useEffect, useMemo, useState } from 'react';

import { useAccess } from '@/app/contexts/access-context';
import { useAppLookupsQuery } from '@/app/hooks/use-lookup';
import { usePTODetailQuery } from '@/modules/hr/hooks/pto.hooks';
import {
  useEmployeePickerOptions,
  type EmployeePickerOption,
} from '@/modules/hr/hooks/use-employee-picker-options';
import { createPTOInputSchema, type CreatePTOInput } from '@/modules/hr/schemas/pto.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch, type Resolver } from 'react-hook-form';

export function usePTOFormState(id: string | undefined) {
  const isEdit = Boolean(id);
  const { access, isAdmin, isLoading: isAccessLoading } = useAccess();
  const currentEmployeeId = access?.employeeId ?? '';
  const ptoQuery = usePTODetailQuery(id ?? '');
  const [employeeSearch, setEmployeeSearch] = useState('');
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
  const selectedEmployeeId = useWatch({ control: form.control, name: 'employeeId' });
  const selectedEmployeeOptions = useMemo<EmployeePickerOption[]>(() => {
    const employee = ptoQuery.data?.employee;
    if (!employee || employee.id !== selectedEmployeeId) return [];
    return [
      {
        value: employee.id,
        label: employee.name,
        description: employee.email ?? employee.phoneNumber ?? undefined,
      },
    ];
  }, [ptoQuery.data?.employee, selectedEmployeeId]);
  const employeePicker = useEmployeePickerOptions({
    search: employeeSearch,
    selectedOptions: selectedEmployeeOptions,
    enabled: isAdmin,
    queryScope: 'pto-form-employee-picker',
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

  const employeeOptions = isAdmin ? employeePicker.options : [];

  const typeOptions = (typesQuery.data ?? []).map((type) => ({
    value: type.id,
    label: type.label || type.name || 'Unknown',
  }));

  return {
    isEdit,
    form,
    ptoQuery,
    employeeOptions,
    employeeSearch,
    onEmployeeSearchChange: setEmployeeSearch,
    isEmployeeFetchingNextPage: employeePicker.isFetchingNextPage,
    hasMoreEmployees: employeePicker.hasNextPage,
    onFetchMoreEmployees: employeePicker.fetchNextPage,
    typeOptions,
    showEmployeeSelector: isAdmin,
    hasCurrentEmployee: isAdmin || Boolean(currentEmployeeId),
    isEmployeesLoading: isAdmin && employeePicker.isLoading,
    isAccessLoading,
    isTypesLoading: typesQuery.isLoading,
  };
}
