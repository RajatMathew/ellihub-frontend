import { memo, useMemo } from 'react';

import {
  divisionColumnLabel,
  STANDARD_DIVISION_LABELS,
  STANDARD_DIVISIONS,
} from '@/modules/project/lib/division-columns';
import type {
  ProjectDivisionStatsItem,
  ProjectListItem,
} from '@/modules/project/schemas/project.schema';

import { ProjectCard } from './project-card';

const getDivisionLabel = (project: ProjectListItem): string => {
  const division = project.division;

  if (typeof division === 'string') return division;

  return division?.label ?? division?.name ?? 'Unassigned';
};

interface ProjectDivisionBoardProps {
  projects: ProjectListItem[];
  divisionSummary?: ProjectDivisionStatsItem[];
}

export const ProjectDivisionBoard = memo(function ProjectDivisionBoard({
  projects,
  divisionSummary,
}: ProjectDivisionBoardProps) {
  const divisionMap = useMemo(() => {
    const map = new Map<string, ProjectListItem[]>();

    for (const project of projects) {
      const label = divisionColumnLabel(getDivisionLabel(project));
      const existing = map.get(label);

      if (existing) {
        existing.push(project);
      } else {
        map.set(label, [project]);
      }
    }

    return map;
  }, [projects]);

  const divisionTotalMap = useMemo(() => {
    const map = new Map<string, number>();

    for (const division of divisionSummary ?? []) {
      const label = divisionColumnLabel(division.label);
      map.set(label, (map.get(label) ?? 0) + division.count);
    }

    return map;
  }, [divisionSummary]);

  const columns = useMemo(
    () => [
      ...STANDARD_DIVISIONS.map((division) => division.label),
      ...Array.from(new Set([...divisionMap.keys(), ...divisionTotalMap.keys()]))
        .filter((label) => !STANDARD_DIVISION_LABELS.has(label))
        .sort((a, b) => a.localeCompare(b)),
    ],
    [divisionMap, divisionTotalMap]
  );

  const maxRows = useMemo(
    () => Math.max(...columns.map((label) => divisionMap.get(label)?.length ?? 0), 0),
    [columns, divisionMap]
  );

  const cells = useMemo(
    () =>
      Array.from({ length: maxRows }).flatMap((_, rowIndex) =>
        columns.map((divisionLabel) => ({
          key: `${divisionLabel}-${rowIndex}`,
          project: divisionMap.get(divisionLabel)?.[rowIndex],
        }))
      ),
    [columns, divisionMap, maxRows]
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
              <div className="flex items-center justify-between gap-3 rounded-sm bg-card-header px-3 py-2">
                <h2 className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.18em] text-table-card-header-foreground">
                  {divisionLabel}
                </h2>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-table-card-header-foreground/80">
                  {countLabel}
                </span>
              </div>
            </div>
          );
        })}

        {cells.map(({ key, project }) => (
          <div key={key} className="min-w-0">
            {project && <ProjectCard project={project} />}
          </div>
        ))}
      </div>
    </div>
  );
});
