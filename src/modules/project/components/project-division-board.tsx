import { useMemo } from 'react';

import type { Division, ProjectListItem } from '@modules/project/schemas/project.schema';

import { ProjectCard } from './project-card';

const DIVISION_ORDER: Division[] = ['SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL'];

interface ProjectDivisionBoardProps {
  projects: ProjectListItem[];
}

export function ProjectDivisionBoard({ projects }: ProjectDivisionBoardProps) {
  const grouped = useMemo(() => {
    const map = new Map<Division, ProjectListItem[]>();
    for (const div of DIVISION_ORDER) map.set(div, []);
    for (const project of projects) {
      map.get(project.division)?.push(project);
    }
    return map;
  }, [projects]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
      {DIVISION_ORDER.map((division) => {
        const items = grouped.get(division) ?? [];
        return (
          <div key={division} className="flex flex-col gap-4">
            {/* Column header */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold uppercase">{division}</span>
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
