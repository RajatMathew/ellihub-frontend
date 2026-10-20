import { isAxiosError } from 'axios';

import { EMAIL_RECONNECT_REQUIRED_CODE, getApiErrorCode } from '../../../app/api/api-error-code';

export function isEmailReconnectRequiredError(error: unknown): boolean {
  if (!isAxiosError(error)) return false;
  return getApiErrorCode(error.response?.data) === EMAIL_RECONNECT_REQUIRED_CODE;
}

export function shouldRetryEmailRequest(failureCount: number, error: unknown): boolean {
  return !isEmailReconnectRequiredError(error) && failureCount < 1;
}
