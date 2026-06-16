import type { Department } from '@/modules/hr/schemas/department.schema';

export function formatDepartmentDate(value: Department['createdAt']) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}
