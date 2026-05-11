import type { AxiosError } from 'axios';
import { toast } from 'sonner';

function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosErr = error as AxiosError<{
    message?: string;
    details?: { details?: { path?: string[]; message?: string }[] };
  }>;
  const data = axiosErr?.response?.data;

  if (data?.details?.details?.length) {
    const messages = data.details.details
      .map((detail) => {
        const field = detail.path?.join('.') ?? '';
        return field ? `${field}: ${detail.message}` : detail.message;
      })
      .filter(Boolean);

    if (messages.length) return messages.join('\n');
  }

  if (data?.message) return data.message;
  return fallback;
}

export function toastInvoiceApiError(error: unknown, fallback: string) {
  toast.error(getApiErrorMessage(error, fallback));
}
