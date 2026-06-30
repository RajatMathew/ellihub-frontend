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
        'relative flex min-h-11 min-w-0 flex-wrap items-stretch gap-x-1 gap-y-1 sm:inline-flex sm:flex-nowrap sm:gap-0',
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
              'relative z-10 flex cursor-pointer items-center px-3 font-mono text-xs font-semibold uppercase tracking-[0.08em] transition-colors sm:px-4',
              isActive
                ? '!text-table-card-header-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-1 after:bg-table-card-tab-accent'
                : '!text-table-card-header-foreground/75 hover:!text-table-card-header-foreground'
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
