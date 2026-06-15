import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Switch } from '@/app/components/ui/switch';
import { formatCurrency, formatDate } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { MonthlyBillDetails } from '@/modules/monthly-bills/components/monthly-bill-details';
import {
  PaymentsCell,
  SubChangeOrdersCell,
  ToPayCell,
} from '@/modules/monthly-bills/components/monthly-bills-cells';
import type { MonthlyBillColumnKey } from '@/modules/monthly-bills/constants/monthly-bills-columns';
import { getMonthPayments, sumPayments } from '@/modules/monthly-bills/lib/monthly-bills-bill';
import type { MonthlyBillItem } from '@/modules/monthly-bills/schemas/monthly-bills.schema';
import { ChevronDown, CreditCard, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MonthlyBillMobileCardProps {
  bill: MonthlyBillItem;
  projectId: string;
  selectedDate: Date;
  toPay: number;
  ready: boolean;
  canUpdateBills: boolean;
  canMarkPayment: boolean;
  canRecordPayment: boolean;
  visibleColumns: Set<MonthlyBillColumnKey>;
  isBulkEditing: boolean;
  isAmountEditing: boolean;
  isAmountSaving: boolean;
  isReadySaving: boolean;
  hasAmountChanges: boolean;
  onToPayChange: (value: number) => void;
  onReadyChange: (checked: boolean) => void;
  onAmountEdit: () => void;
  onAmountSave: () => void;
  onMarkPayment: () => void;
}

export function MonthlyBillMobileCard({
  bill,
  projectId,
  selectedDate,
  toPay,
  ready,
  canUpdateBills,
  canMarkPayment,
  canRecordPayment,
  visibleColumns,
  isBulkEditing,
  isAmountEditing,
  isAmountSaving,
  isReadySaving,
  hasAmountChanges,
  onToPayChange,
  onReadyChange,
  onAmountEdit,
  onAmountSave,
  onMarkPayment,
}: MonthlyBillMobileCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { id, poNumber, vendor, issuedAt } = bill.purchaseOrder;
  const monthPayments = getMonthPayments(bill, selectedDate);
  const paidThisMonth = sumPayments(monthPayments);
  const show = (key: MonthlyBillColumnKey) => visibleColumns.has(key);

  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            to={`/app/project/${projectId}/purchase-orders/${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex max-w-full items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80"
          >
            <span className="truncate">{poNumber}</span>
            <ExternalLink className="size-3.5 shrink-0" />
          </Link>
          <p className="mt-1 truncate text-xs text-muted-foreground">{vendor.name}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="text-sm font-semibold tabular-nums text-foreground">
            {formatCurrency(bill.balance)}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
        {show('issueDate') && (
          <MobileMetric
            label="Issue Date"
            value={
              issuedAt
                ? formatDate(issuedAt, { month: '2-digit', day: '2-digit', year: 'numeric' })
                : '-'
            }
          />
        )}
        {show('payments') && (
          <div className="min-w-0">
            <p className="text-muted-foreground">Payments</p>
            <PaymentsCell payments={monthPayments} poNumber={poNumber} />
          </div>
        )}
        {show('paidThisMonth') && (
          <MobileMetric label="Paid Month" value={formatCurrency(paidThisMonth)} />
        )}
        {show('original') && (
          <MobileMetric label="Original" value={formatCurrency(bill.original)} />
        )}
        {show('totalPaid') && (
          <MobileMetric label="Total Paid" value={formatCurrency(bill.totalPaid)} />
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        {show('toPay') && (
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Planned payment</p>
            <ToPayCell
              value={toPay}
              poNumber={poNumber}
              canEdit={canUpdateBills}
              isBulkEditing={isBulkEditing}
              isEditing={isAmountEditing}
              isSaving={isAmountSaving}
              hasChanges={hasAmountChanges}
              onChange={onToPayChange}
              onEdit={onAmountEdit}
              onSave={onAmountSave}
              className="ml-0 w-full"
              inputClassName="h-9 min-w-0 flex-1"
            />
          </div>
        )}

        {show('ready') && (
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/20 px-3 py-2 sm:min-w-32">
            <span className="text-xs font-medium text-muted-foreground">Ready</span>
            <Switch
              size="sm"
              aria-label={`Mark ${poNumber} ready`}
              checked={ready}
              disabled={!canUpdateBills || toPay <= 0 || isReadySaving}
              onCheckedChange={onReadyChange}
            />
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SubChangeOrdersCell
          subChangeOrders={bill.purchaseOrder.subChangeOrders}
          poNumber={poNumber}
          projectId={projectId}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setExpanded((current) => !current)}
          aria-expanded={expanded}
          className="h-8 px-2 text-xs"
        >
          <ChevronDown className={cn('size-3.5 transition-transform', expanded && 'rotate-180')} />
          Details
        </Button>
        {canMarkPayment && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canRecordPayment}
            onClick={onMarkPayment}
            className="h-8 text-xs sm:ml-auto"
          >
            <CreditCard className="size-3.5" />
            Mark Payment
          </Button>
        )}
      </div>

      {expanded && (
        <div className="mt-3 rounded-md border bg-muted/20 p-3">
          <MonthlyBillDetails bill={bill} selectedDate={selectedDate} toPay={toPay} ready={ready} />
        </div>
      )}
    </div>
  );
}

function MobileMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-medium tabular-nums text-foreground">{value}</p>
    </div>
  );
}
