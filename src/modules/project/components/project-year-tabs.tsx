import { cn } from '@app/lib/utils';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, i) => currentYear - 1 + i);

interface ProjectYearTabsProps {
  activeYear: number;
  totalCount: number;
  onYearChange: (year: number) => void;
}

export function ProjectYearTabs({ activeYear, totalCount, onYearChange }: ProjectYearTabsProps) {
  return (
    <div className="flex items-center justify-between border-b border-border mb-5">
      <div className="flex items-center gap-1">
        {YEARS.map((year) => (
          <button
            key={year}
            type="button"
            onClick={() => onYearChange(year)}
            className={cn(
              'px-3 py-2.5 text-sm font-medium transition-colors',
              year === activeYear
                ? 'text-foreground border-b-2 border-success font-semibold'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {year}
          </button>
        ))}
      </div>
      <span className="text-xs font-medium uppercase text-muted-foreground tracking-wide">
        {totalCount} Active Projects
      </span>
    </div>
  );
}
