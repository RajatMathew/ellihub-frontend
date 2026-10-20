import { Forbidden } from '@/app/components/error/forbidden';
import { ModuleLoader } from '@/app/components/loader/elegant';
import { ListPageHeader } from '@/app/components/page-header';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { useAccess } from '@/app/contexts/access-context';
import { useQuickBooksStatusQuery } from '@/modules/integrations/hooks/quickbooks.hooks';
import { MonthYearPicker } from '@/modules/monthly-bills/components/month-year-picker';
import { getMonthlyBillTabs } from '@/modules/monthly-bills/components/monthly-bills-tabs';
import {
  MONTHLY_BILLS_ALLOWED_ROLES,
  MONTHLY_BILLS_DEFAULT_PATH,
} from '@/modules/monthly-bills/constants/monthly-bills.constants';
import {
  formatMonthlyBillMonthNumber,
  getCurrentMonthlyBillPeriod,
  getInitialMonthlyBillDate,
  getMonthlyBillDateFromSearch,
  getMonthlyBillMonthSearch,
  getMonthlyBillYear,
} from '@/modules/monthly-bills/lib/monthly-bills-date';
import {
  MonthlyBillsRecurringPage,
  MonthlyBillsSubcontractorPage,
  MonthlyBillsSummaryPage,
} from '@/modules/monthly-bills/pages';
import {
  getRecurringBillsQaDate,
  parseRecurringBillsQaDate,
  RECURRING_BILLS_QA_CLOCK_ENABLED,
  RECURRING_BILLS_QA_DATE_PARAM,
} from '@/modules/monthly-bills/testing/recurring-bills-qa-clock';
import { RecurringBillsQaClockControl } from '@/modules/monthly-bills/testing/recurring-bills-qa-clock-control';
import { Landmark } from 'lucide-react';
import { Link, Navigate, Route, Routes, useLocation, useSearchParams } from 'react-router-dom';

export default function MonthlyBillsRoute() {
  const { access, isAdmin, isLoading } = useAccess();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const canAccess = isAdmin || MONTHLY_BILLS_ALLOWED_ROLES.has(access?.role ?? '');
  const statusQuery = useQuickBooksStatusQuery(canAccess && !isLoading);
  const isQuickBooksConnected = statusQuery.data?.connection?.status === 'CONNECTED';
  const isRecurringRoute = location.pathname.endsWith('/recurring');
  // TEMP_RECURRING_BILLS_QA_CLOCK: UI gate mirrors the backend's role/environment safeguards.
  const qaClockAvailable =
    RECURRING_BILLS_QA_CLOCK_ENABLED &&
    isAdmin &&
    isRecurringRoute &&
    statusQuery.data?.environment === 'sandbox';
  const qaDate = qaClockAvailable ? getRecurringBillsQaDate(searchParams) : undefined;
  const qaNow = qaDate ? parseRecurringBillsQaDate(qaDate) : undefined;
  const currentPeriod = qaNow ? getCurrentMonthlyBillPeriod(qaNow) : undefined;
  const selectedDate = getMonthlyBillDateFromSearch(searchParams, qaNow);
  const selectedMonthSearch = getMonthlyBillMonthSearch(selectedDate);
  const defaultTabPath = `${MONTHLY_BILLS_DEFAULT_PATH}${selectedMonthSearch}`;

  const handleMonthChange = (date: Date) => {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        next.set('month', formatMonthlyBillMonthNumber(date));
        next.set('year', String(getMonthlyBillYear(date)));
        return next;
      },
      { replace: true }
    );
  };

  // TEMP_RECURRING_BILLS_QA_CLOCK: URL-only state makes reset and removal deterministic.
  const handleQaDateChange = (value: string | undefined) => {
    const requestedDate = value ? parseRecurringBillsQaDate(value) : undefined;
    const nextDate = requestedDate ?? getInitialMonthlyBillDate();
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value && requestedDate) {
          next.set(RECURRING_BILLS_QA_DATE_PARAM, value);
        } else {
          next.delete(RECURRING_BILLS_QA_DATE_PARAM);
        }
        next.set('month', formatMonthlyBillMonthNumber(nextDate));
        next.set('year', String(getMonthlyBillYear(nextDate)));
        return next;
      },
      { replace: true }
    );
  };

  if (isLoading) return <ModuleLoader />;
  if (!canAccess) return <Forbidden />;

  return (
    <div className="container-fluid py-7.5">
      <ListPageHeader
        title="Monthly Bills"
        leadingActions={
          <>
            {qaClockAvailable ? (
              <RecurringBillsQaClockControl value={qaDate} onChange={handleQaDateChange} />
            ) : null}
            <MonthYearPicker
              date={selectedDate}
              onChange={handleMonthChange}
              currentPeriod={currentPeriod}
            />
          </>
        }
        tabs={{ items: getMonthlyBillTabs(selectedDate), ariaLabel: 'Monthly bills sections' }}
      />

      <div className="min-w-0">
        {/* Bills can be paid manually without QuickBooks, so only recurring bills -
            which are paid through it alone - wait for a connection. */}
        {statusQuery.isLoading ? (
          <ModuleLoader />
        ) : (
          <Routes>
            <Route index element={<Navigate to={defaultTabPath} replace />} />
            <Route
              path="recurring"
              element={
                isQuickBooksConnected ? (
                  <MonthlyBillsRecurringPage selectedDate={selectedDate} qaDate={qaDate} />
                ) : (
                  <MonthlyBillsQuickBooksRequiredState />
                )
              }
            />
            <Route
              path="subcontractor"
              element={
                <>
                  {!isQuickBooksConnected && <MonthlyBillsManualOnlyNotice />}
                  <MonthlyBillsSubcontractorPage
                    selectedDate={selectedDate}
                    enabled={canAccess && !isLoading}
                  />
                </>
              }
            />
            <Route
              path="summary"
              element={
                <MonthlyBillsSummaryPage
                  selectedDate={selectedDate}
                  enabled={canAccess && !isLoading}
                />
              }
            />
            <Route path="*" element={<Navigate to={defaultTabPath} replace />} />
          </Routes>
        )}
      </div>
    </div>
  );
}

function MonthlyBillsManualOnlyNotice() {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
      <span className="text-muted-foreground">
        QuickBooks is not connected. Payments can still be recorded manually.
      </span>
      <Button variant="outline" size="sm" asChild>
        <Link to="/app/settings/integrations">Connect QuickBooks</Link>
      </Button>
    </div>
  );
}

function MonthlyBillsQuickBooksRequiredState() {
  return (
    <Card>
      <CardContent className="flex min-h-72 flex-col items-center justify-center text-center">
        <Landmark className="mb-4 size-10 text-muted-foreground" />
        <h2 className="text-base font-semibold text-foreground">QuickBooks is not connected</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Recurring bills are paid through QuickBooks. Connect it from integration settings to load
          them.
        </p>
        <Button className="mt-4" asChild>
          <Link to="/app/settings/integrations">Open integration settings</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
