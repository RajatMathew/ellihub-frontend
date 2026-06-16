import type { CreateDepartmentInput } from '@/modules/hr/schemas/department.schema';
import type { Control } from 'react-hook-form';

import { DepartmentGeneralInfoSection } from './department-general-info-section';

interface DepartmentFormContentProps {
  control: Control<CreateDepartmentInput>;
}

export function DepartmentFormContent({ control }: DepartmentFormContentProps) {
  return (
    <div className="min-h-0 flex-1 space-y-6 pt-4 pb-8 lg:pb-10">
      <DepartmentGeneralInfoSection control={control} />
    </div>
  );
}
