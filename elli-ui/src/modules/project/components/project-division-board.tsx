import { useMemo } from 'react';

import type { ProjectListItem } from '@/modules/project/schemas/project.schema';

import { ProjectCard } from './project-card';

const STANDARD_DIVISION_ORDER = ['SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL'];

const getDivisionLabel = (project: ProjectListItem): string => {
  const division = project.division;

  if (typeof division === 'string') return division;

  return division?.label ?? division?.name ?? 'Unassigned';
};

export function ProjectDivisionBoard({ projects }: { projects: ProjectListItem[] }) {
  const divisionMap = useMemo(() => {
    const map = new Map<string, ProjectListItem[]>();

    for (const project of projects) {
      const label = getDivisionLabel(project);
      const existing = map.get(label) ?? [];
      map.set(label, [...existing, project]);
    }

    return map;
  }, [projects]);

  const columns = Array.from(divisionMap.keys()).sort((a, b) => {
    const aIndex = STANDARD_DIVISION_ORDER.indexOf(a.toUpperCase());
    const bIndex = STANDARD_DIVISION_ORDER.indexOf(b.toUpperCase());

    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
    if (aIndex !== -1) return -1;
    if (bIndex !== -1) return 1;

    return a.localeCompare(b);
  });

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 2xl:grid-cols-4">
      {columns.map((divisionLabel) => {
        const items = divisionMap.get(divisionLabel) ?? [];

        return (
          <section key={divisionLabel} className="flex min-w-0 flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="min-w-0 truncate text-sm font-semibold uppercase">
                {divisionLabel}
              </h2>
              <span className="shrink-0 text-xs text-muted-foreground">
                {items.length} Job{items.length !== 1 ? 's' : ''}
              </span>
            </div>
            <hr className="border-border" />

            <div className="flex flex-col gap-3">
              {items.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
