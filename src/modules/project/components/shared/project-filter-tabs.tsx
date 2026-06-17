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
        'inline-flex min-w-max items-center gap-0 border-b border-[#a09683]',
        className,
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
              '-mb-px border-b-2 px-4 py-2 text-xs uppercase tracking-normal transition-colors',
              isActive
                ? 'border-primary font-semibold text-primary'
                : 'border-transparent font-medium text-foreground/75 hover:text-primary',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
