import { Forbidden } from '@/app/components/error/forbidden';
import { ModuleLoader } from '@/app/components/loader/elegant';
import {
  Toolbar,
  ToolbarActions,
  ToolbarHeading,
  ToolbarPageTitle,
  ToolbarWrapper,
} from '@/app/components/toolbar/toolbar';
import { useAccess } from '@/app/contexts/access-context';
import { MonthYearPicker } from '@/modules/monthly-bills/components/month-year-picker';
import { MonthlyBillsTabs } from '@/modules/monthly-bills/components/monthly-bills-tabs';
import {
  MONTHLY_BILL_TABS,
  MONTHLY_BILLS_ALLOWED_ROLES,
  MONTHLY_BILLS_DEFAULT_PATH,
} from '@/modules/monthly-bills/constants/monthly-bills.constants';
import {
  formatMonthlyBillMonthNumber,
  getMonthlyBillDateFromSearch,
  getMonthlyBillMonthSearch,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import { MonthlyBillsSubcontractorPage, MonthlyBillsTabPage } from '@/modules/monthly-bills/pages';
import { Navigate, Route, Routes, useSearchParams } from 'react-router-dom';

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
    <div className="container-fluid py-7.5">
      <Toolbar className="gap-3 pt-5 pb-3 mb-4">
        <ToolbarWrapper>
          <ToolbarHeading className="gap-2">
            <ToolbarPageTitle>Monthly Bills</ToolbarPageTitle>
          </ToolbarHeading>
          <ToolbarActions className="w-full justify-start sm:w-auto sm:justify-end">
            <MonthYearPicker date={selectedDate} onChange={handleMonthChange} />
          </ToolbarActions>
        </ToolbarWrapper>

        <MonthlyBillsTabs selectedDate={selectedDate} />
      </Toolbar>

      <div className="min-w-0">
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
    </div>
  );
}
