import { useEffect, useState } from 'react';

import { useAppLookupsQuery } from '@/app/hooks/use-lookup';
import { EMPLOYEE_SAMPLE_NAMES } from '@/modules/hr/constants/employees/employee-form.constants';
import { useEmployeeDetailQuery } from '@/modules/hr/hooks/employees.hooks';
import {
  createEmployeeInputSchema,
  type CreateEmployeeInput,
} from '@/modules/hr/schemas/employee.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type Resolver } from 'react-hook-form';
import { toast } from 'sonner';

export function useEmployeeFormState(id: string | undefined) {
  const isEdit = Boolean(id);
  const employeeQuery = useEmployeeDetailQuery(id ?? '');
  const rolesQuery = useAppLookupsQuery('PROFESSIONAL_ROLE');
  const [activeSection, setActiveSection] = useState('info');

  const form = useForm<CreateEmployeeInput>({
    resolver: zodResolver(createEmployeeInputSchema) as Resolver<CreateEmployeeInput>,
    defaultValues: {
      name: '',
      email: '',
      phoneNumber: '',
      address: '',
      startDate: new Date().toISOString().split('T')[0],
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
      roleId: '',
      createAccount: true,
    },
  });

  useEffect(() => {
    if (!isEdit || !employeeQuery.data) return;

    const employee = employeeQuery.data;
    form.reset({
      name: employee.name,
      email: employee.email,
      phoneNumber: employee.phoneNumber ?? '',
      address: employee.address ?? '',
      startDate: employee.startDate ? new Date(employee.startDate).toISOString().split('T')[0] : '',
      emergencyContactName: employee.emergencyContactName ?? '',
      emergencyContactPhone: employee.emergencyContactPhone ?? '',
      emergencyContactRelation: employee.emergencyContactRelation ?? '',
      roleId: employee.roleId ?? '',
      createAccount: true,
    });
  }, [employeeQuery.data, form, isEdit]);

  const fillSample = () => {
    const selectedName =
      EMPLOYEE_SAMPLE_NAMES[Math.floor(Math.random() * EMPLOYEE_SAMPLE_NAMES.length)];
    const emailPrefix = selectedName.toLowerCase().replace(' ', '.');

    form.reset({
      name: selectedName,
      email: `${emailPrefix}@contractor-corp.com`,
      phoneNumber: `(555) 012-${Math.floor(1000 + Math.random() * 9000)}`,
      address: `${Math.floor(100 + Math.random() * 900)} Construction Way, Building B`,
      startDate: new Date().toISOString().split('T')[0],
      emergencyContactName: 'Jane Smith',
      emergencyContactPhone: '(555) 012-9999',
      emergencyContactRelation: 'Spouse',
      createAccount: true,
    });
    toast.info('Populated with candidate data.');
  };

  const roleOptions = (rolesQuery.data ?? []).map((role) => ({
    value: role.id,
    label: role.label || role.name || 'Unknown',
  }));

  return {
    isEdit,
    form,
    employeeQuery,
    roleOptions,
    activeSection,
    setActiveSection,
    fillSample,
  };
}
