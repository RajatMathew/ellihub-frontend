import { cn } from '@/app/lib/utils';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, index) => currentYear - 2 + index);

interface ProjectYearTabsProps {
  activeYear: number | null;
  onYearChange: (year: number | null) => void;
}

export function ProjectYearTabs({ activeYear, onYearChange }: ProjectYearTabsProps) {
  const tabs = [
    { label: 'ALL', value: null },
    ...YEARS.map((year) => ({ label: String(year), value: year })),
  ];

  return (
    <div className="-mx-4 -mb-3 border-y border-border bg-project-tabs-background px-4 pt-1.5 lg:-mx-7.5 lg:px-7.5">
      <div className="-mx-1 flex overflow-x-auto px-1">
        {tabs.map((tab) => (
          <button
            key={tab.label}
            type="button"
            onClick={() => onYearChange(tab.value)}
            className={cn(
              'relative shrink-0 px-4 pt-1 pb-2.5 text-sm transition-colors hover:cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              tab.value === activeYear
                ? 'font-semibold text-foreground'
                : 'font-medium text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
            {tab.value === activeYear && (
              <span className="absolute inset-x-1 bottom-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
