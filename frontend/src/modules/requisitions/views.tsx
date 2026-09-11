import { cn } from '@app/lib/utils';

export type ViewMode = 'list' | 'board' | 'pipeline';

const MODES: { key: ViewMode; label: string; hint: string }[] = [
  { key: 'pipeline', label: 'Pipeline', hint: 'Project × month grid' },
  { key: 'board',    label: 'Board',    hint: 'Kanban by stage' },
  { key: 'list',     label: 'List',     hint: 'One row per project' },
];

export function ViewSwitcher({
  mode, onChange,
}: {
  mode: ViewMode; onChange: (m: ViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden bg-background text-[12px]">
      {MODES.map(m => {
        const active = mode === m.key;
        return (
          <button
            key={m.key}
            type="button"
            onClick={() => onChange(m.key)}
            title={m.hint}
            className={cn(
              'px-3 py-1 font-semibold border-r border-border last:border-r-0 transition-colors',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
