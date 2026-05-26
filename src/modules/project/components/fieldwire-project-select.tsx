import { useMemo } from 'react';

import { useAccess } from '@/app/contexts/access-context';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { useFieldwireProjectsQuery } from '@/modules/project/hooks';
import type { FieldwireProjectOption } from '@/modules/project/schemas/project.schema';

type FieldwireProjectSelectProps = {
  value: string | null;
  currentName?: string | null;
  onValueChange: (value: string | null, project?: FieldwireProjectOption) => void;
};

function getFieldwireProjectLabel(project: Pick<FieldwireProjectOption, 'name' | 'code'>) {
  return project.code ? `${project.name} (${project.code})` : project.name;
}

export function FieldwireProjectSelect({
  value,
  currentName,
  onValueChange,
}: FieldwireProjectSelectProps) {
  const { can } = useAccess();
  const canLoadFieldwireProjects = can('primeChangeOrder', 'fieldwire-projects');
  const fieldwireProjectsQuery = useFieldwireProjectsQuery(canLoadFieldwireProjects);
  const projects = useMemo(() => fieldwireProjectsQuery.data ?? [], [fieldwireProjectsQuery.data]);

  const options = useMemo(() => {
    const baseOptions = projects.map((project) => ({
      value: project.id,
      label: getFieldwireProjectLabel(project),
    }));

    if (value && currentName && !baseOptions.some((option) => option.value === value)) {
      return [{ value, label: currentName }, ...baseOptions];
    }

    return baseOptions;
  }, [currentName, projects, value]);

  return (
    <div className="space-y-1.5">
      <SearchableSelect
        options={options}
        value={value}
        onValueChange={(nextValue) => {
          if (!canLoadFieldwireProjects) return;

          const selectedProject = nextValue
            ? projects.find((project) => project.id === nextValue)
            : undefined;

          onValueChange(nextValue, selectedProject);
        }}
        disabled={!canLoadFieldwireProjects || fieldwireProjectsQuery.isLoading}
        placeholder={
          !canLoadFieldwireProjects
            ? 'Fieldwire mapping is read-only'
            : fieldwireProjectsQuery.isLoading
              ? 'Loading Fieldwire projects...'
              : 'Select project...'
        }
        searchPlaceholder="Search Fieldwire projects..."
        emptyMessage={
          !canLoadFieldwireProjects
            ? 'Fieldwire project mapping requires Fieldwire project access.'
            : fieldwireProjectsQuery.isError
            ? 'Unable to load Fieldwire projects.'
            : 'No Fieldwire projects found.'
        }
      />
      {!canLoadFieldwireProjects && (
        <p className="text-xs text-muted-foreground">
          Fieldwire project mapping can only be changed by users with Fieldwire project access.
        </p>
      )}
      {canLoadFieldwireProjects && fieldwireProjectsQuery.isError && (
        <p className="text-xs text-destructive">Unable to load Fieldwire projects.</p>
      )}
    </div>
  );
}
