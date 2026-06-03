import { useMemo } from 'react';

import type { ProjectListItem } from '@/modules/project/schemas/project.schema';

import { ProjectCard } from './project-card';

const STANDARD_DIVISIONS: Array<{ label: string; keys: string[] }> = [
  { label: 'SCA', keys: ['SCA'] },
  { label: 'Institutional', keys: ['INSTITUTIONAL'] },
  { label: 'Public', keys: ['PUBLIC', 'DDC'] },
  { label: 'Public / State', keys: ['PUBLIC / STATE', 'PUBLIC STATE', 'CIVIL'] },
];

const normalizeDivisionLabel = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').toUpperCase();

const getDivisionLabel = (project: ProjectListItem): string => {
  const division = project.division;

  if (typeof division === 'string') return division;

  return division?.label ?? division?.name ?? 'Unassigned';
};

const getDivisionColumnLabel = (label: string): string => {
  const normalizedLabel = normalizeDivisionLabel(label);
  const standardDivision = STANDARD_DIVISIONS.find((division) =>
    division.keys.includes(normalizedLabel)
  );

  return standardDivision?.label ?? label;
};

export function ProjectDivisionBoard({ projects }: { projects: ProjectListItem[] }) {
  const divisionMap = useMemo(() => {
    const map = new Map<string, ProjectListItem[]>();

    for (const project of projects) {
      const label = getDivisionColumnLabel(getDivisionLabel(project));
      const existing = map.get(label) ?? [];
      map.set(label, [...existing, project]);
    }

    return map;
  }, [projects]);

  const columns = [
    ...STANDARD_DIVISIONS.map((division) => division.label),
    ...Array.from(divisionMap.keys())
      .filter((label) => !STANDARD_DIVISIONS.some((division) => division.label === label))
      .sort((a, b) => a.localeCompare(b)),
  ];
  const maxRows = Math.max(
    ...columns.map((divisionLabel) => divisionMap.get(divisionLabel)?.length ?? 0),
    0
  );

  return (
    <div className="-mx-4 overflow-x-auto px-4 lg:-mx-7.5 lg:px-7.5">
      <div
        className="grid min-w-[1120px] gap-x-5 gap-y-3"
        style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(260px, 1fr))` }}
      >
        {columns.map((divisionLabel) => {
          const items = divisionMap.get(divisionLabel) ?? [];

          return (
            <div key={divisionLabel} className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="min-w-0 truncate text-xs font-semibold uppercase text-foreground">
                  {divisionLabel}
                </h2>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                  {items.length}
                </span>
              </div>
              <hr className="border-t-2 border-border dark:border-zinc-700/70" />
            </div>
          );
        })}

        {Array.from({ length: maxRows }).flatMap((_, rowIndex) =>
          columns.map((divisionLabel) => {
            const project = divisionMap.get(divisionLabel)?.[rowIndex];

            return (
              <div key={`${divisionLabel}-${rowIndex}`} className="min-w-0">
                {project && <ProjectCard project={project} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
