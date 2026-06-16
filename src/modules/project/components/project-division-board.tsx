import { useMemo } from 'react';

import type {
  ProjectDivisionStatsItem,
  ProjectListItem,
} from '@/modules/project/schemas/project.schema';

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

export function ProjectDivisionBoard({
  projects,
  divisionSummary,
}: {
  projects: ProjectListItem[];
  divisionSummary?: ProjectDivisionStatsItem[];
}) {
  const divisionMap = useMemo(() => {
    const map = new Map<string, ProjectListItem[]>();

    for (const project of projects) {
      const label = getDivisionColumnLabel(getDivisionLabel(project));
      const existing = map.get(label) ?? [];
      map.set(label, [...existing, project]);
    }

    return map;
  }, [projects]);

  const divisionTotalMap = useMemo(() => {
    const map = new Map<string, number>();

    for (const division of divisionSummary ?? []) {
      const label = getDivisionColumnLabel(division.label);
      map.set(label, (map.get(label) ?? 0) + division.count);
    }

    return map;
  }, [divisionSummary]);

  const columns = [
    ...STANDARD_DIVISIONS.map((division) => division.label),
    ...Array.from(new Set([...divisionMap.keys(), ...divisionTotalMap.keys()]))
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
          const totalItems = divisionTotalMap.get(divisionLabel) ?? items.length;
          const countLabel =
            items.length === totalItems ? items.length : `${items.length}/${totalItems}`;

          return (
            <div key={divisionLabel} className="flex min-w-0 flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="min-w-0 truncate text-xs font-semibold uppercase text-foreground">
                  {divisionLabel}
                </h2>
                <span className="shrink-0 text-xs font-semibold text-muted-foreground">
                  {countLabel}
                </span>
              </div>
              <hr className="border-t-2 border-foreground" />
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
