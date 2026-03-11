import { cn } from '@app/lib/utils';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => currentYear - 2 + i);

interface ProjectYearTabsProps {
  activeYear: number;
  totalCount: number;
  onYearChange: (year: number) => void;
}

export function ProjectYearTabs({ activeYear, totalCount, onYearChange }: ProjectYearTabsProps) {
  return (
    <div className="flex items-center justify-between border-b border-border -mb-6">
      <div className="flex items-center">
        {YEARS.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => onYearChange(year)}
            className={cn(
              'relative px-4 py-2.5 text-sm transition-colors',
              year === activeYear
                ? 'text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground font-medium',
            )}
          >
            {year}
            {year === activeYear && (
              <span className="absolute inset-x-1 bottom-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>
      <span className="text-xs font-semibold uppercase text-muted-foreground tracking-widest">
        {totalCount} Active Projects
      </span>
    </div>
  );
}
