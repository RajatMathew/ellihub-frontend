import { cn } from '@/app/lib/utils';

export interface ProjectFilterTabOption<TValue extends string | undefined = string | undefined> {
  label: string;
  value: TValue;
}

interface ProjectFilterTabsProps<TValue extends string | undefined = string | undefined> {
  value: TValue;
  options: readonly ProjectFilterTabOption<TValue>[];
  onValueChange: (value: TValue) => void;
  className?: string;
}

export function ProjectFilterTabs<TValue extends string | undefined = string | undefined>({
  value,
  options,
  onValueChange,
  className,
}: ProjectFilterTabsProps<TValue>) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 border-b border-table-card-header-foreground/40 sm:inline-flex sm:flex-nowrap sm:gap-0',
        className
      )}
    >
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.label}
            type="button"
            onClick={() => onValueChange(option.value)}
            className={cn(
              '-mb-px shrink-0 border-b-2 px-3 py-2 text-xs uppercase tracking-normal transition-colors sm:px-4',
              isActive
                ? 'border-current font-semibold !text-table-card-header-foreground'
                : 'border-transparent font-medium !text-table-card-header-foreground/75 hover:!text-table-card-header-foreground'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
