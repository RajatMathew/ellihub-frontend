import { FormSectionNav } from '@/app/components/form-section-nav';
import { DEPARTMENT_FORM_SECTIONS } from '@/modules/hr/constants/departments/department-form.constants';
import type { CreateDepartmentInput } from '@/modules/hr/schemas/department.schema';
import type { Control } from 'react-hook-form';

import { DepartmentGeneralInfoSection } from './department-general-info-section';

interface DepartmentFormContentProps {
  activeSection: string;
  control: Control<CreateDepartmentInput>;
  onSectionChange: (section: string) => void;
}

export function DepartmentFormContent({
  activeSection,
  control,
  onSectionChange,
}: DepartmentFormContentProps) {
  return (
    <>
      <FormSectionNav
        sections={DEPARTMENT_FORM_SECTIONS}
        activeSection={activeSection}
        onSectionChange={onSectionChange}
      />

      <div className="space-y-6 pt-6">
        <DepartmentGeneralInfoSection control={control} />
      </div>
    </>
  );
}
