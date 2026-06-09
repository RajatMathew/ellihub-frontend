import { useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { useAccess } from '@/app/contexts/access-context';
import { useFieldwireProjectsQuery } from '@/modules/project/hooks';
import type { FieldwireProjectOption } from '@/modules/project/schemas/project.schema';
import { X } from 'lucide-react';

type FieldwireProjectSelectProps = {
  value: string | null;
  currentName?: string | null;
  currentProjectId?: string | null;
  onValueChange: (value: string | null, project?: FieldwireProjectOption) => void;
};

function getFieldwireProjectLabel(project: Pick<FieldwireProjectOption, 'name' | 'code'>) {
  return project.code ? `${project.name} (${project.code})` : project.name;
}

export function FieldwireProjectSelect({
  value,
  currentName,
  currentProjectId,
  onValueChange,
}: FieldwireProjectSelectProps) {
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
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

  const isDisabled = !canLoadFieldwireProjects || fieldwireProjectsQuery.isLoading;

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <SearchableSelect
          className="min-w-0 flex-1"
          options={options}
          value={value}
          onValueChange={(nextValue) => {
            if (!canLoadFieldwireProjects) return;
            if (!nextValue && value) {
              setIsClearDialogOpen(true);
              return;
            }

            const selectedProject = nextValue
              ? projects.find((project) => project.id === nextValue)
              : undefined;
            const linkedProject = selectedProject?.linkedProject;

            if (linkedProject && (!currentProjectId || linkedProject.id !== currentProjectId)) {
              const linkedProjectLabel = linkedProject.jobNumber
                ? `${linkedProject.name} (${linkedProject.jobNumber})`
                : linkedProject.name;
              setLinkError(`Already linked to ${linkedProjectLabel} project.`);
              return;
            }

            setLinkError(null);
            onValueChange(nextValue, selectedProject);
          }}
          disabled={isDisabled}
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
        {value && (
          <Button
            type="button"
            variant="outline"
            mode="icon"
            size="md"
            className="shrink-0"
            aria-label="Clear Fieldwire project"
            title="Clear Fieldwire project"
            disabled={isDisabled}
            onClick={() => setIsClearDialogOpen(true)}
          >
            <X className="size-4" />
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={isClearDialogOpen}
        onOpenChange={setIsClearDialogOpen}
        title="Remove Fieldwire Project?"
        description={
          <>
            This will unlink {currentName || 'the selected Fieldwire project'} from this project.
            Existing synced Fieldwire change order data for the previous mapping may be reset after
            you save.
          </>
        }
        confirmLabel="Remove Fieldwire Project"
        variant="destructive"
        onConfirm={() => {
          setLinkError(null);
          onValueChange(null);
          setIsClearDialogOpen(false);
        }}
      />
      {linkError && <p className="text-xs text-destructive">{linkError}</p>}
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
