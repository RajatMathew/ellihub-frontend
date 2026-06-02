import { cn } from '@/app/lib/utils';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, index) => currentYear - 2 + index);

interface ProjectYearTabsProps {
  activeYear: number | null;
  totalCount: number;
  onYearChange: (year: number | null) => void;
}

export function ProjectYearTabs({ activeYear, totalCount, onYearChange }: ProjectYearTabsProps) {
  const tabs = [
    { label: 'ALL', value: null },
    ...YEARS.map((year) => ({ label: String(year), value: year })),
  ];

  return (
    <div className="-mb-3 flex flex-col gap-2 border-b border-border sm:flex-row sm:items-center sm:justify-between">
      <div className="-mx-1 flex overflow-x-auto px-1">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => onYearChange(tab.value)}
            className={cn(
              'relative shrink-0 px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              tab.value === activeYear
                ? 'font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.value === activeYear && (
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
