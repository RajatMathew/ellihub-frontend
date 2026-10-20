import { useMemo } from 'react';

import { col } from '@/app/components/data-table';
import { cn } from '@/app/lib/utils';
import { REGISTER_CLR_TONES } from '@/modules/finance/constants/checking-register.constants';
import {
  formatRegisterDate,
  formatRegisterMoney,
  getRegisterAmountClassName,
} from '@/modules/finance/lib/checking-register.utils';
import type { QuickBooksRegisterTransaction } from '@/modules/integrations/schemas/quickbooks.schema';

/**
 * The register's columns.
 *
 * A hook rather than a constant because every money cell has to be formatted in
 * the selected account's currency, which is not known until the account loads.
 */
export function useRegisterTransactionColumns(currencyCode: string | null) {
  return useMemo(
    () => [
      col.date<QuickBooksRegisterTransaction>({
        key: 'txnDate',
        muted: true,
        title: 'Date',
        value: (transaction) => formatRegisterDate(transaction.txnDate),
        width: 'xs',
      }),
      col.text<QuickBooksRegisterTransaction>({
        key: 'transactionType',
        secondary: (transaction) =>
          transaction.checkNumber ? `No. ${transaction.checkNumber}` : null,
        title: 'Type / No.',
        value: (transaction) => transaction.transactionType || '-',
        width: 'sm',
      }),
      col.text<QuickBooksRegisterTransaction>({
        key: 'payee',
        title: 'Payee',
        tooltip: (transaction) => transaction.payee,
        value: (transaction) => transaction.payee || '-',
        width: 'lg',
      }),
      col.text<QuickBooksRegisterTransaction>({
        key: 'category',
        title: 'Category',
        tooltip: (transaction) => transaction.category,
        value: (transaction) => transaction.category || '-',
        width: 'lg',
      }),
      col.status<QuickBooksRegisterTransaction>({
        fallback: '-',
        key: 'clr',
        title: 'CLR',
        tones: REGISTER_CLR_TONES,
        value: (transaction) => transaction.clr,
        width: 'xs',
      }),
      // `col.currency` fixes one colour for the column; an amount is coloured by
      // its own sign, so this one cell renders itself.
      col.custom<QuickBooksRegisterTransaction>({
        align: 'end',
        cell: (transaction) => (
          <span
            className={cn(
              'text-sm font-semibold tabular-nums',
              getRegisterAmountClassName(transaction.amount)
            )}
          >
            {formatRegisterMoney(transaction.amount, currencyCode)}
          </span>
        ),
        key: 'amount',
        title: 'Amount',
        width: 'xs',
      }),
      col.currency<QuickBooksRegisterTransaction>({
        key: 'balance',
        title: 'Balance',
        value: (transaction) => formatRegisterMoney(transaction.balance, currencyCode),
        width: 'xs',
      }),
    ],
    [currencyCode]
  );
}
