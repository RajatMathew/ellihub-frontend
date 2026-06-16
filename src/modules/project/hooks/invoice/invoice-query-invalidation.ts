import type { QueryClient } from '@tanstack/react-query';

import { invoiceKeys } from '@/modules/project/constants/invoice';
import { invalidateProjectQueries } from '@/modules/project/hooks/shared';

export function invalidateInvoiceQueries(queryClient: QueryClient, invoiceId?: string) {
  return invalidateProjectQueries(
    queryClient,
    invoiceId ? [invoiceKeys.all, invoiceKeys.detail(invoiceId)] : [invoiceKeys.all],
  );
}

export function invalidateInvoiceDetail(queryClient: QueryClient, invoiceId: string) {
  return invalidateProjectQueries(queryClient, [invoiceKeys.detail(invoiceId)]);
}
