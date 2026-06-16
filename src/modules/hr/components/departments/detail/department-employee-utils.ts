import type { DepartmentEmployee } from '@/modules/hr/schemas/department.schema';

export function getDepartmentEmployeeId(assignment: DepartmentEmployee) {
  return assignment.employee?.id ?? assignment.employeeId ?? assignment.id ?? '';
}

export function getDepartmentEmployeeName(assignment: DepartmentEmployee) {
  return (
    assignment.employee?.fullName ??
    assignment.employee?.name ??
    assignment.fullName ??
    assignment.name ??
    'Unknown Employee'
  );
}

export function getDepartmentEmployeeEmail(assignment: DepartmentEmployee) {
  return assignment.employee?.email ?? assignment.email ?? '';
}

export function getDepartmentEmployeeRole(assignment: DepartmentEmployee) {
  return (
    assignment.role?.label ??
    assignment.role?.name ??
    assignment.employee?.role?.label ??
    assignment.employee?.role?.name ??
    'Standard Role'
  );
}

export function getDepartmentEmployeeKey(assignment: DepartmentEmployee) {
  return (
    assignment.id ??
    assignment.employeeId ??
    assignment.employee?.id ??
    getDepartmentEmployeeName(assignment)
  );
}
