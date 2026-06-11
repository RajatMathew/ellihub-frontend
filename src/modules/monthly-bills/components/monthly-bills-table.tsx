import { useMemo, useState, type ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent } from '@/app/components/ui/card';
import { Checkbox } from '@/app/components/ui/checkbox';
import { NumberInput } from '@/app/components/ui/number-input';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Switch } from '@/app/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';
import { useDebouncedCallback } from '@/app/hooks/use-debounced-callback';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { MarkPaymentDialog } from '@/modules/monthly-bills/components/mark-payment-dialog';
import { PaymentsDialog } from '@/modules/monthly-bills/components/payments-dialog';
import { useUpsertPlannedPaymentMutation } from '@/modules/monthly-bills/hooks/monthly-bills.hooks';
import type {
  MonthlyBillItem,
  MonthlyBillProjectGroup,
} from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { format, getMonth, getYear } from 'date-fns';
import { AlertCircle, ClipboardList, CreditCard, ExternalLink, RefreshCcw } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MonthlyBillsTableProps {
  groups: MonthlyBillProjectGroup[];
  selectedDate: Date;
  /** Whether the current user (admin or accountant) can mark payments. */
  canMarkPayment: boolean;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
}

const SKELETON_ROW_COUNT = 3;

function getProjectTitle(group: MonthlyBillProjectGroup) {
  return group.project.jobNumber
    ? `${group.project.name} - ${group.project.jobNumber}`
    : group.project.name;
}

/**
 * A key derived from the group's server data for the selected month. Changing it remounts the
 * card so the To Pay / Ready inputs re-seed from fresh server values (e.g. after a save refetch
 * or switching months), while leaving them untouched while the user is editing.
 */
function getProjectCardKey(group: MonthlyBillProjectGroup, selectedDate: Date) {
  const period = `${getYear(selectedDate)}-${getMonth(selectedDate)}`;
  const bills = group.bills
    .map(
      (bill) =>
        `${bill.purchaseOrder.id}:${bill.plannedPayment?.amount ?? 0}:${
          bill.plannedPayment?.isReady ?? false
        }`
    )
    .join('|');
  return `${group.project.id}:${period}:${bills}`;
}

/** Payments whose transaction date falls within the selected billing month. */
function getMonthPayments(bill: MonthlyBillItem, selectedDate: Date) {
  const month = getMonth(selectedDate);
  const year = getYear(selectedDate);
  return bill.payments.filter((payment) => {
    if (!payment.txnDate) return false;
    const date = new Date(payment.txnDate);
    return getMonth(date) === month && getYear(date) === year;
  });
}

export function MonthlyBillsTable({
  groups,
  selectedDate,
  canMarkPayment,
  isLoading,
  isError,
  onRetry,
}: MonthlyBillsTableProps) {
  if (isError) {
    return (
      <Card className="overflow-hidden">
        <MonthlyBillsFeedback
          icon={<AlertCircle className="size-10 text-destructive/60" />}
          title="Failed to load monthly bills"
          description="Something went wrong. Please try again."
          action={
            <Button variant="outline" size="sm" onClick={onRetry}>
              <RefreshCcw className="size-3.5" />
              Retry
            </Button>
          }
        />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <MonthlyBillsTableSkeleton selectedDate={selectedDate} canMarkPayment={canMarkPayment} />
      </Card>
    );
  }

  if (groups.length === 0) {
    return (
      <Card className="overflow-hidden">
        <MonthlyBillsFeedback
          icon={<ClipboardList className="size-10 text-muted-foreground/50" />}
          title="No monthly bills"
          description="Unpaid purchase orders for this period will appear here once available."
        />
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <MonthlyBillsProjectCard
          key={getProjectCardKey(group, selectedDate)}
          group={group}
          selectedDate={selectedDate}
          canMarkPayment={canMarkPayment}
        />
      ))}
    </div>
  );
}

function MonthlyBillsProjectCard({
  group,
  selectedDate,
  canMarkPayment,
}: {
  group: MonthlyBillProjectGroup;
  selectedDate: Date;
  canMarkPayment: boolean;
}) {
  const monthName = format(selectedDate, 'MMMM');
  const monthLabel = format(selectedDate, 'MMMM yyyy').toUpperCase();
  const month = getMonth(selectedDate) + 1;
  const year = getYear(selectedDate);

  const upsertPlannedPayment = useUpsertPlannedPaymentMutation();

  const [paymentBill, setPaymentBill] = useState<MonthlyBillItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [toPayById, setToPayById] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      group.bills.map((bill) => [bill.purchaseOrder.id, bill.plannedPayment?.amount ?? 0])
    )
  );
  const [readyById, setReadyById] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      group.bills.map((bill) => [bill.purchaseOrder.id, bill.plannedPayment?.isReady ?? false])
    )
  );

  const billIds = useMemo(() => group.bills.map((bill) => bill.purchaseOrder.id), [group.bills]);
  const allSelected = billIds.length > 0 && billIds.every((id) => selectedIds.has(id));
  const someSelected = billIds.some((id) => selectedIds.has(id));

  const totals = useMemo(() => {
    return group.bills.reduce(
      (acc, bill) => {
        acc.paidThisMonth += getMonthPayments(bill, selectedDate).reduce(
          (sum, payment) => sum + (payment.amount ?? 0),
          0
        );
        acc.totalPaid += bill.totalPaid;
        acc.toPay += toPayById[bill.purchaseOrder.id] ?? 0;
        return acc;
      },
      { paidThisMonth: 0, totalPaid: 0, toPay: 0 }
    );
  }, [group.bills, selectedDate, toPayById]);

  const toggleAll = (checked: boolean) =>
    setSelectedIds(checked ? new Set(billIds) : new Set());

  const toggleOne = (id: string, checked: boolean) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const commitToPay = (purchaseOrderId: string, amount: number) =>
    upsertPlannedPayment.mutate({ purchaseOrderId, month, year, amount });

  // The endpoint requires an amount, so send the row's current To Pay value alongside the flag.
  const commitReady = (purchaseOrderId: string, isReady: boolean) =>
    upsertPlannedPayment.mutate({
      purchaseOrderId,
      month,
      year,
      amount: toPayById[purchaseOrderId] ?? 0,
      isReady,
    });

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <h3 className="text-sm font-semibold text-foreground">{getProjectTitle(group)}</h3>
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {monthLabel}
        </span>
      </div>

      <div className="overflow-x-auto">
        <Table className="min-w-5xl">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 w-12">
                <Checkbox
                  size="sm"
                  aria-label="Select all purchase orders"
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={(checked) => toggleAll(checked === true)}
                />
              </TableHead>
              <TableHead className="h-10 min-w-44">PO #</TableHead>
              <TableHead className="h-10 min-w-28">PO Issue Date</TableHead>
              <TableHead className="h-10 min-w-32">Vendor</TableHead>
              <TableHead className="h-10 min-w-40">Payments in {monthName}</TableHead>
              <TableHead className="h-10 min-w-28 text-right">Paid This Month</TableHead>
              <TableHead className="h-10 min-w-28 text-right">Original</TableHead>
              <TableHead className="h-10 min-w-28 text-right">Total Paid</TableHead>
              <TableHead className="h-10 min-w-28 text-right">Balance</TableHead>
              <TableHead className="h-10 min-w-28 text-right">To Pay</TableHead>
              <TableHead className="h-10 w-20 text-center">Ready</TableHead>
              {canMarkPayment && <TableHead className="h-10 min-w-40 text-center" />}
            </TableRow>
          </TableHeader>

          <TableBody>
            {group.bills.map((bill) => {
              const id = bill.purchaseOrder.id;
              const monthPayments = getMonthPayments(bill, selectedDate);
              const paidThisMonth = monthPayments.reduce(
                (sum, payment) => sum + (payment.amount ?? 0),
                0
              );

              return (
                <TableRow key={id} data-state={selectedIds.has(id) ? 'selected' : undefined}>
                  <TableCell className="py-3">
                    <Checkbox
                      size="sm"
                      aria-label={`Select ${bill.purchaseOrder.poNumber}`}
                      checked={selectedIds.has(id)}
                      onCheckedChange={(checked) => toggleOne(id, checked === true)}
                    />
                  </TableCell>
                  <TableCell className="py-3">
                    <Link
                      to={`/app/project/${group.project.id}/purchase-orders/${id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80"
                    >
                      {bill.purchaseOrder.poNumber}
                      <ExternalLink className="size-3.5" />
                    </Link>
                  </TableCell>
                  <TableCell className="py-3 text-sm text-muted-foreground">
                    {bill.purchaseOrder.issuedAt
                      ? formatDate(bill.purchaseOrder.issuedAt, {
                          month: '2-digit',
                          day: '2-digit',
                          year: 'numeric',
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="py-3 text-sm font-medium text-foreground">
                    {bill.purchaseOrder.vendor.name}
                  </TableCell>
                  <TableCell className="py-3">
                    <PaymentsCell
                      payments={monthPayments}
                      poNumber={bill.purchaseOrder.poNumber}
                    />
                  </TableCell>
                  <TableCell className="py-3 text-right text-sm text-muted-foreground">
                    {paidThisMonth > 0 ? formatCurrency(paidThisMonth) : '—'}
                  </TableCell>
                  <TableCell className="py-3 text-right text-sm font-medium text-foreground">
                    {formatCurrency(bill.original)}
                  </TableCell>
                  <TableCell className="py-3 text-right text-sm text-muted-foreground">
                    {formatCurrency(bill.totalPaid)}
                  </TableCell>
                  <TableCell className="py-3 text-right text-sm font-semibold text-foreground">
                    {formatCurrency(bill.balance)}
                  </TableCell>
                  <TableCell className="py-3 text-right">
                    <ToPayCell
                      value={toPayById[id] ?? 0}
                      poNumber={bill.purchaseOrder.poNumber}
                      onChange={(value) =>
                        setToPayById((current) => ({ ...current, [id]: value }))
                      }
                      onCommit={(value) => commitToPay(id, value)}
                    />
                  </TableCell>
                  <TableCell className="py-3 text-center">
                    <Switch
                      size="sm"
                      aria-label={`Mark ${bill.purchaseOrder.poNumber} ready`}
                      checked={readyById[id] ?? false}
                      onCheckedChange={(checked) => {
                        setReadyById((current) => ({ ...current, [id]: checked }));
                        commitReady(id, checked);
                      }}
                    />
                  </TableCell>
                  {canMarkPayment && (
                    <TableCell className="py-3 text-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setPaymentBill(bill)}
                      >
                        <CreditCard className="size-3.5" />
                        Mark Payment
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>

          <TableFooter>
            <TableRow className="hover:bg-transparent">
              <TableCell colSpan={4} className="py-3 text-right text-sm font-semibold text-foreground">
                Totals
              </TableCell>
              <TableCell />
              <TableCell className="py-3 text-right text-sm font-semibold text-foreground">
                {formatCurrency(totals.paidThisMonth)}
              </TableCell>
              <TableCell />
              <TableCell className="py-3 text-right text-sm font-semibold text-foreground">
                {formatCurrency(totals.totalPaid)}
              </TableCell>
              <TableCell />
              <TableCell className="py-3 text-right text-sm font-semibold text-foreground">
                {formatCurrency(totals.toPay)}
              </TableCell>
              <TableCell />
              {canMarkPayment && <TableCell />}
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {paymentBill && (
        <MarkPaymentDialog
          key={paymentBill.purchaseOrder.id}
          open={Boolean(paymentBill)}
          onOpenChange={(next) => {
            if (!next) setPaymentBill(null);
          }}
          bill={paymentBill}
          amount={toPayById[paymentBill.purchaseOrder.id] ?? 0}
          month={month}
          year={year}
        />
      )}
    </Card>
  );
}

/** To Pay input. Updates the row total immediately, but debounces the API save. */
function ToPayCell({
  value,
  poNumber,
  onChange,
  onCommit,
}: {
  value: number;
  poNumber: string;
  onChange: (value: number) => void;
  onCommit: (value: number) => void;
}) {
  const debouncedCommit = useDebouncedCallback(onCommit, 600);

  return (
    <NumberInput
      value={value}
      onValueChange={(next) => {
        onChange(next);
        debouncedCommit(next);
      }}
      decimalPlaces={2}
      min={0}
      aria-label={`To pay for ${poNumber}`}
      className="ml-auto h-8 w-24 text-right"
    />
  );
}

function PaymentsCell({
  payments,
  poNumber,
}: {
  payments: MonthlyBillItem['payments'];
  poNumber: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-col items-start gap-0.5 text-sm">
      {payments.length === 0 ? (
        <span className="font-medium text-primary">No payments yet</span>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-medium text-primary hover:text-primary/80 hover:underline"
        >
          {payments.length} payment{payments.length === 1 ? '' : 's'}
        </button>
      )}
      {payments.length > 0 && (
        <PaymentsDialog
          open={open}
          onOpenChange={setOpen}
          payments={payments}
          poNumber={poNumber}
        />
      )}
    </div>
  );
}

function MonthlyBillsTableSkeleton({
  selectedDate,
  canMarkPayment,
}: {
  selectedDate: Date;
  canMarkPayment: boolean;
}) {
  const monthName = format(selectedDate, 'MMMM');
  const monthLabel = format(selectedDate, 'MMMM yyyy').toUpperCase();

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-5">
        <Skeleton className="h-4 w-48" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {monthLabel}
        </span>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-5xl">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-10 w-12" />
              <TableHead className="h-10 min-w-44">PO #</TableHead>
              <TableHead className="h-10 min-w-28">PO Issue Date</TableHead>
              <TableHead className="h-10 min-w-32">Vendor</TableHead>
              <TableHead className="h-10 min-w-40">Payments in {monthName}</TableHead>
              <TableHead className="h-10 min-w-28 text-right">Paid This Month</TableHead>
              <TableHead className="h-10 min-w-28 text-right">Original</TableHead>
              <TableHead className="h-10 min-w-28 text-right">Total Paid</TableHead>
              <TableHead className="h-10 min-w-28 text-right">Balance</TableHead>
              <TableHead className="h-10 min-w-28 text-right">To Pay</TableHead>
              <TableHead className="h-10 w-20 text-center">Ready</TableHead>
              {canMarkPayment && <TableHead className="h-10 min-w-40 text-center" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
              <TableRow key={index} className="hover:bg-transparent">
                <TableCell className="py-3">
                  <Skeleton className="size-4 rounded-sm" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="h-3.5 w-36" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="h-3.5 w-20" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="h-3.5 w-24" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="h-3.5 w-28" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="ml-auto h-3.5 w-16" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="ml-auto h-3.5 w-20" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="ml-auto h-3.5 w-20" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="ml-auto h-3.5 w-20" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="ml-auto h-8 w-24 rounded-md" />
                </TableCell>
                <TableCell className="py-3">
                  <Skeleton className="mx-auto h-5 w-8 rounded-full" />
                </TableCell>
                {canMarkPayment && (
                  <TableCell className="py-3">
                    <Skeleton className="mx-auto h-8 w-32 rounded-md" />
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

function MonthlyBillsFeedback({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <CardContent>
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        {icon}
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
        {action}
      </div>
    </CardContent>
  );
}
