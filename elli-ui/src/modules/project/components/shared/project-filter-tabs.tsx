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
    <div className={cn('inline-flex min-w-max items-center gap-0', className)}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <button
            key={option.label}
            type="button"
            onClick={() => onValueChange(option.value)}
            className={cn(
              'border-b-2 px-4 py-2 text-xs font-medium uppercase tracking-normal transition-colors',
              isActive
                ? 'border-foreground text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
