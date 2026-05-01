import { FormSectionNav } from '@/app/components/form-section-nav';
import { EMPLOYEE_FORM_SECTIONS } from '@/modules/hr/constants/employees/employee-form.constants';
import type { CreateEmployeeInput } from '@/modules/hr/schemas/employee.schema';
import type { Control } from 'react-hook-form';

import { EmployeeBasicInfoSection } from './employee-basic-info-section';
import { EmployeeEmergencySection } from './employee-emergency-section';
import { EmployeeEmploymentSection } from './employee-employment-section';

interface EmployeeFormContentProps {
  control: Control<CreateEmployeeInput>;
  isEdit: boolean;
  activeSection: string;
  roleOptions: { value: string; label: string }[];
  onSectionChange: (section: string) => void;
}

export function EmployeeFormContent({
  control,
  isEdit,
  activeSection,
  roleOptions,
  onSectionChange,
}: EmployeeFormContentProps) {
  return (
    <>
      <FormSectionNav
        sections={EMPLOYEE_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      <div className="space-y-6 pt-6">
        <EmployeeBasicInfoSection control={control} />
        <EmployeeEmploymentSection control={control} isEdit={isEdit} roleOptions={roleOptions} />
        <EmployeeEmergencySection control={control} />
      </div>
    </>
  );
}
