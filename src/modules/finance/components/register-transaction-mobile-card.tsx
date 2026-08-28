import { StatusBadge } from '@/app/components/status-badge';
import { cn } from '@/app/lib/utils';
import { REGISTER_CLR_TONES } from '@/modules/finance/constants/checking-register.constants';
import {
  formatRegisterDate,
  formatRegisterMoney,
  getRegisterAmountClassName,
} from '@/modules/finance/lib/checking-register.utils';
import type { QuickBooksRegisterTransaction } from '@/modules/integrations/schemas/quickbooks.schema';

interface RegisterTransactionMobileCardProps {
  transaction: QuickBooksRegisterTransaction;
  currencyCode: string | null;
}

/** One register row below `lg`, where seven columns do not fit. */
export function RegisterTransactionMobileCard({
  transaction,
  currencyCode,
}: RegisterTransactionMobileCardProps) {
  return (
    <article className="rounded-lg border border-border bg-card p-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {transaction.payee || transaction.transactionType || '-'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatRegisterDate(transaction.txnDate)} · {transaction.transactionType || '-'}
          </p>
        </div>
        <span
          className={cn(
            'shrink-0 text-sm font-semibold tabular-nums',
            getRegisterAmountClassName(transaction.amount)
          )}
        >
          {formatRegisterMoney(transaction.amount, currencyCode)}
        </span>
      </div>

      <dl className="mt-3 grid gap-2 text-xs text-muted-foreground">
        <MobileField label="Category" value={transaction.category || '-'} />
        <MobileField label="No." value={transaction.checkNumber || '-'} />
        <div className="flex items-center justify-between gap-3">
          <dt>CLR</dt>
          <dd>
            <StatusBadge fallback="-" status={transaction.clr} tones={REGISTER_CLR_TONES} />
          </dd>
        </div>
        <MobileField
          label="Balance"
          value={formatRegisterMoney(transaction.balance, currencyCode)}
        />
      </dl>
    </article>
  );
}

function MobileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-3">
      <dt className="shrink-0">{label}</dt>
      <dd className="min-w-0 break-words text-right font-medium text-foreground [overflow-wrap:anywhere]">
        {value}
      </dd>
    </div>
  );
}
