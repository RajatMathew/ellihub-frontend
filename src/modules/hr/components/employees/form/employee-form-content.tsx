import type { CreateEmployeeInput } from '@/modules/hr/schemas/employee.schema';
import type { Control } from 'react-hook-form';

import { EmployeeBasicInfoSection } from './employee-basic-info-section';
import { EmployeeEmergencySection } from './employee-emergency-section';
import { EmployeeEmploymentSection } from './employee-employment-section';

interface EmployeeFormContentProps {
  control: Control<CreateEmployeeInput>;
  isEdit: boolean;
  roleOptions: { value: string; label: string }[];
}

export function EmployeeFormContent({ control, isEdit, roleOptions }: EmployeeFormContentProps) {
  return (
    <div className="space-y-6 pt-4 pb-8 lg:pb-10">
      <EmployeeBasicInfoSection control={control} />
      <EmployeeEmploymentSection control={control} isEdit={isEdit} roleOptions={roleOptions} />
      <EmployeeEmergencySection control={control} />
    </div>
  );
}
