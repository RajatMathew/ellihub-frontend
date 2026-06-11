import { Forbidden } from '@/app/components/error/forbidden';
import { ModuleLoader } from '@/app/components/loader/elegant';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { Card } from '@/app/components/ui/card';
import { useAccess } from '@/app/contexts/access-context';
import { MonthYearPicker } from '@/modules/monthly-bills/components/month-year-picker';
import { MonthlyBillsTable } from '@/modules/monthly-bills/components/monthly-bills-table';
import { MonthlyBillsTabs } from '@/modules/monthly-bills/components/monthly-bills-tabs';
import {
  MONTHLY_BILL_TABS,
  MONTHLY_BILLS_ALLOWED_ROLES,
  MONTHLY_BILLS_DEFAULT_PATH,
} from '@/modules/monthly-bills/constants/monthly-bills.constants';
import { useMonthlyBillsQuery } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import {
  formatMonthlyBillMonthNumber,
  getMonthlyBillDateFromSearch,
  getMonthlyBillDateRange,
  getMonthlyBillMonthNumber,
  getMonthlyBillMonthSearch,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';

function MonthlyBillsTabPage({ title, selectedDate }: { title: string; selectedDate: Date }) {
  return (
    <Card className="space-y-3 p-6">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          month: {formatMonthlyBillMonthNumber(selectedDate)}, year: {selectedDate.getFullYear()}
        </p>
      </div>
    </Card>
  );
}

function MonthlyBillsSubcontractorPage({
  selectedDate,
  enabled,
}: {
  selectedDate: Date;
  enabled: boolean;
}) {
  const { startDate, endDate } = getMonthlyBillDateRange(selectedDate);
  const monthlyBillsQuery = useMonthlyBillsQuery(
    {
      startDate,
      endDate,
      month: getMonthlyBillMonthNumber(selectedDate),
      year: selectedDate.getFullYear(),
    },
    enabled
  );

  return (
    <MonthlyBillsTable
      groups={monthlyBillsQuery.data ?? []}
      selectedDate={selectedDate}
      isLoading={monthlyBillsQuery.isLoading}
      isError={monthlyBillsQuery.isError}
      onRetry={() => void monthlyBillsQuery.refetch()}
    />
  );
}

export default function MonthlyBillsRoute() {
  const { access, isAdmin, isLoading } = useAccess();
  const [searchParams, setSearchParams] = useSearchParams();
  const canAccess = isAdmin || MONTHLY_BILLS_ALLOWED_ROLES.has(access?.role ?? '');
  const selectedDate = getMonthlyBillDateFromSearch(searchParams);
  const selectedMonthSearch = getMonthlyBillMonthSearch(selectedDate);
  const defaultTabPath = `${MONTHLY_BILLS_DEFAULT_PATH}${selectedMonthSearch}`;

  const handleMonthChange = (date: Date) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('month', formatMonthlyBillMonthNumber(date));
        next.set('year', String(date.getFullYear()));
        return next;
      },
      { replace: true }
    );
  };

  if (isLoading) return <ModuleLoader />;
  if (!canAccess) return <Forbidden />;

  return (
    <div className="container-fluid py-4">
      <Toolbar className="gap-3 -mt-4 pt-4 pb-3 mb-4">
        <ToolbarWrapper>
          <ToolbarHeading className="gap-2 lg:gap-2">
            <ToolbarPageTitle>Monthly Bills</ToolbarPageTitle>
          </ToolbarHeading>
          <ToolbarActions>
            <MonthYearPicker date={selectedDate} onChange={handleMonthChange} />
          </ToolbarActions>
        </ToolbarWrapper>

        <MonthlyBillsTabs selectedDate={selectedDate} />
      </Toolbar>

      <Routes>
        <Route index element={<Navigate to={defaultTabPath} replace />} />
        {MONTHLY_BILL_TABS.map((tab) => (
          <Route
            key={tab.path}
            path={tab.path}
            element={
              tab.path === 'subcontractor' ? (
                <MonthlyBillsSubcontractorPage
                  selectedDate={selectedDate}
                  enabled={canAccess && !isLoading}
                />
              ) : (
                <MonthlyBillsTabPage title={tab.pageTitle} selectedDate={selectedDate} />
              )
            }
          />
        ))}
        <Route path="*" element={<Navigate to={defaultTabPath} replace />} />
      </Routes>
    </div>
  );
}
