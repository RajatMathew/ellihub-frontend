import { toastApiError } from '@/app/lib/toast-api-error';

export function toastInvoiceApiError(error: unknown, fallback: string) {
  toastApiError(error, fallback);
}
