import { useEffect, useState } from 'react';

import { useAppLookupsQuery } from '@/app/hooks/use-lookup';
import {
  fakeContactName,
  fakeDateInputBetween,
  fakeEmployeeEmail,
  fakePhone,
  fakeStreetAddress,
  pickRandom,
} from '@/lib/fake-data';
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
      createAccount: false,
      authRole: 'user',
      password: '',
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
      createAccount: false,
      authRole: 'user',
      password: '',
    });
  }, [employeeQuery.data, form, isEdit]);

  const fillSample = () => {
    const selectedName = fakeContactName();
    const emergencyName = fakeContactName();

    form.reset({
      name: selectedName,
      email: fakeEmployeeEmail(selectedName),
      phoneNumber: fakePhone(),
      address: fakeStreetAddress(),
      startDate: fakeDateInputBetween(-3650, -30),
      emergencyContactName: emergencyName,
      emergencyContactPhone: fakePhone(),
      emergencyContactRelation: pickRandom(['Spouse', 'Parent', 'Sibling', 'Partner']),
      roleId: pickRandom(rolesQuery.data ?? [])?.id || '',
      createAccount: false,
      authRole: 'user',
      password: '',
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
