import { useMemo } from 'react';

import type { Employee } from '@/modules/hr/schemas/employee.schema';
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';

interface UseEmployeeOptionsParams {
  employees: Employee[] | undefined;
  project: ProjectDetail | undefined;
}

export function useEmployeeOptions({ employees, project }: UseEmployeeOptionsParams) {
  return useMemo(() => {
    if (!employees) return [];

    // Build a set of existing employee IDs (team members + lead PM)
    const existingIds = new Set(
      [
        ...(project?.teamMembers ?? []).map((tm) => tm.employeeId),
        project?.leadPMId,
      ].filter(Boolean)
    );

    // Filter out employees who are already on the team
    return employees
      .filter((e) => !existingIds.has(e.id))
      .map((e) => ({ value: e.id, label: e.name }));
  }, [employees, project]);
}
