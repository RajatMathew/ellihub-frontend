import { useMemo } from 'react';

import type { ProjectListItem } from '@/modules/project/schemas/project.schema';

import { ProjectCard } from './project-card';

export function ProjectDivisionBoard({ projects }: { projects: ProjectListItem[] }) {
  // Dynamically determine columns based on divisions present in the data
  const divisionMap = useMemo(() => {
    const map = new Map<string, ProjectListItem[]>();
    
    // Initialize map with projects
    projects.forEach(project => {
      const div = project.division;
      const label = typeof div === 'string' ? div : (div?.label || div?.name || 'Unassigned');
      
      const existing = map.get(label) || [];
      map.set(label, [...existing, project]);
    });
    
    return map;
  }, [projects]);

  // Sort columns: Standard ones first, then alphabetical
  const STANDARD_COLS = ['SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL'];
  const columns = Array.from(divisionMap.keys()).sort((a, b) => {
    const ai = STANDARD_COLS.indexOf(a.toUpperCase());
    const bi = STANDARD_COLS.indexOf(b.toUpperCase());
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {columns.map((divLabel) => {
        const items = divisionMap.get(divLabel) || [];
        return (
          <div key={divLabel} className="flex flex-col gap-4">
            {/* Column header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase">{divLabel}</span>
              <span className="text-xs text-muted-foreground">
                {items.length} Job{items.length !== 1 ? 's' : ''}
              </span>
            </div>
            <hr className="border-border" />

            {/* Project cards */}
            <div className="flex flex-col gap-3">
              {items.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
              {items.length === 0 && (
                <p className="text-xs text-muted-foreground py-4 text-center">No projects</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
