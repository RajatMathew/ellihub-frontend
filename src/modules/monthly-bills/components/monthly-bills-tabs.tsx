import { cn } from '@/app/lib/utils';
import { MONTHLY_BILL_TABS } from '@/modules/monthly-bills/constants/monthly-bills.constants';
import { getMonthlyBillMonthSearch } from '@/modules/monthly-bills/lib/monthly-bills-date';
import { NavLink } from 'react-router-dom';

export function MonthlyBillsTabs({ selectedDate }: { selectedDate: Date }) {
  const search = getMonthlyBillMonthSearch(selectedDate);

  return (
    <div className="flex max-w-full overflow-x-auto border-b border-border">
      <div className="flex min-w-max">
        {MONTHLY_BILL_TABS.map((tab) => (
          <NavLink
            key={tab.path}
            to={`/app/monthly-bills/${tab.path}${search}`}
            className={({ isActive }) =>
              cn(
                'relative shrink-0 px-4 py-2 text-xs font-medium uppercase tracking-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                {tab.label}
                {isActive && (
                  <span className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-primary" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
