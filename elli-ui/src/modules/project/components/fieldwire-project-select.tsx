import { useMemo } from 'react';

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
  const fieldwireProjectsQuery = useFieldwireProjectsQuery();
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
          const selectedProject = nextValue
            ? projects.find((project) => project.id === nextValue)
            : undefined;

          onValueChange(nextValue, selectedProject);
        }}
        disabled={fieldwireProjectsQuery.isLoading}
        placeholder={
          fieldwireProjectsQuery.isLoading ? 'Loading Fieldwire projects...' : 'Select project...'
        }
        searchPlaceholder="Search Fieldwire projects..."
        emptyMessage={
          fieldwireProjectsQuery.isError
            ? 'Unable to load Fieldwire projects.'
            : 'No Fieldwire projects found.'
        }
      />
      {fieldwireProjectsQuery.isError && (
        <p className="text-xs text-destructive">Unable to load Fieldwire projects.</p>
      )}
    </div>
  );
}
