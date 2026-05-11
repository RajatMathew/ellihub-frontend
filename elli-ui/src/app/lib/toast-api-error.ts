import { type AxiosError } from 'axios';
import { toast } from 'sonner';

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosErr = error as AxiosError<{
    message?: string;
    details?: { details?: { path?: string[]; message?: string }[] };
  }>;
  const data = axiosErr?.response?.data;
  if (data?.details?.details?.length) {
    const msgs = data.details.details
      .map((d) => {
        const field = d.path?.join('.') ?? '';
        return field ? `${field}: ${d.message}` : d.message;
      })
      .filter(Boolean);
    if (msgs.length) return msgs.join('\n');
  }
  if (data?.message) return data.message;
  return fallback;
}

export function toastApiError(error: unknown, fallback: string) {
  toast.error(getApiErrorMessage(error, fallback));
}
