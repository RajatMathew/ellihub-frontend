import { EMPLOYEE_STATUS_LABELS } from '@/modules/hr/constants/employees/employee-list.constants';

export function getEmployeeStatusLabel(status: string | null | undefined) {
  return EMPLOYEE_STATUS_LABELS[status ?? 'ACTIVE'] ?? status ?? 'Active';
}

export function getEmployeeStatusTone(status: string | null | undefined) {
  return (status ?? 'ACTIVE') === 'ACTIVE'
    ? 'border-success/20 bg-success/10 text-success'
    : 'border-muted-foreground/20 bg-muted text-muted-foreground';
}
