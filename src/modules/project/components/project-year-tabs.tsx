import { cn } from '@/app/lib/utils';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, index) => currentYear - 2 + index);

interface ProjectYearTabsProps {
  activeYear: number;
  totalCount: number;
  onYearChange: (year: number) => void;
}

export function ProjectYearTabs({ activeYear, totalCount, onYearChange }: ProjectYearTabsProps) {
  return (
    <div className="-mb-6 flex flex-col gap-3 border-b border-border sm:flex-row sm:items-center sm:justify-between">
      <div className="-mx-1 flex overflow-x-auto px-1">
        {YEARS.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => onYearChange(year)}
            className={cn(
              'relative shrink-0 px-4 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              year === activeYear
                ? 'font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:text-foreground'
            )}
          >
            {year}
            {year === activeYear && (
              <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
      <span className="pb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground sm:pb-0">
        {totalCount} Active Projects
      </span>
    </div>
  );
}
