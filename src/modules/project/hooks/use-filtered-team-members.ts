import { useMemo } from 'react';

import type { ProjectDetail } from '@/modules/project/schemas/project.schema';

interface UseFilteredTeamMembersParams {
  project: ProjectDetail;
}

export function useFilteredTeamMembers({ project }: UseFilteredTeamMembersParams) {
  return useMemo(() => {
    const leadPMId = project.leadPMId;

    // Filter out the lead PM from teamMembers to avoid duplicate display
    const teamMembers = (project.teamMembers ?? []).filter(
      (tm) => tm.employeeId !== leadPMId
    );

    const totalMembers = teamMembers.length + (project.leadPM ? 1 : 0);
    const hasMembers = !!project.leadPM || teamMembers.length > 0;

    return {
      teamMembers,
      totalMembers,
      hasMembers,
    };
  }, [project]);
}
