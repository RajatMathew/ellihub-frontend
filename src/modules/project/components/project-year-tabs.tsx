import { PageTabs, type PageTabItem } from '@/app/components/page-tabs';

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 7 }, (_, index) => currentYear - 2 + index);
const YEAR_TABS: PageTabItem<number | null>[] = [
  { label: 'ALL', value: null },
  ...YEARS.map((year) => ({ label: String(year), value: year })),
];

interface ProjectYearTabsProps {
  activeYear: number | null;
  onYearChange: (year: number | null) => void;
}

export function ProjectYearTabs({ activeYear, onYearChange }: ProjectYearTabsProps) {
  return (
    <PageTabs
      items={YEAR_TABS}
      activeValue={activeYear}
      onValueChange={onYearChange}
      ariaLabel="Project year filters"
    />
  );
}
