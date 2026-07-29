export const EMAIL_RECONNECT_REQUIRED_CODE = 'EMAIL_RECONNECT_REQUIRED';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function getApiErrorCode(data: unknown): string | null {
  if (!isRecord(data)) return null;
  if (typeof data.code === 'string') return data.code;

  for (const key of ['details', 'error', 'data'] as const) {
    const nestedCode = getApiErrorCode(data[key]);
    if (nestedCode) return nestedCode;
  }

  return null;
}

export function isEmailReconnectRequiredResponse(data: unknown): boolean {
  return getApiErrorCode(data) === EMAIL_RECONNECT_REQUIRED_CODE;
}

export function shouldRedirectToSignIn(status: number | undefined, data: unknown): boolean {
  return status === 401 && !isEmailReconnectRequiredResponse(data);
}
