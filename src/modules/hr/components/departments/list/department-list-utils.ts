import { formatDate } from '@/app/lib/helpers';
import type { Department } from '@/modules/hr/schemas/department.schema';

export function formatDepartmentDate(value: Department['createdAt']) {
  if (!value) return '-';
  return formatDate(value);
}

/**
 * A department can only be deleted once nobody is assigned to it — the same rule
 * the API enforces. Shared by the row menu and by bulk selection so the two
 * cannot disagree about which rows are deletable.
 */
export function canDeleteDepartment(department: Pick<Department, 'employeeCount'>) {
  return (department.employeeCount ?? 0) === 0;
}

export const DEPARTMENT_DELETE_BLOCKED_REASON =
  'Remove employees from this department before deleting it.';
