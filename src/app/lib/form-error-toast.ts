import type {
  FieldError,
  FieldErrors,
  FieldValues,
  SubmitErrorHandler,
} from 'react-hook-form';
import { toast } from 'sonner';

interface FormErrorToastOptions {
  title?: string;
  fallbackDescription?: string;
}

const DEFAULT_TITLE = 'Please complete the required fields.';
const DEFAULT_DESCRIPTION = 'Review the highlighted fields and try again.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFieldError(value: unknown): value is FieldError {
  return isRecord(value) && ('message' in value || 'type' in value || 'ref' in value);
}

function getErrorMessage(error: FieldError | undefined): string | undefined {
  const message = error?.message;
  return typeof message === 'string' && message.trim() ? message.trim() : undefined;
}

function findFirstFieldError(value: unknown): FieldError | undefined {
  if (!value) return undefined;

  if (isFieldError(value) && getErrorMessage(value)) {
    return value;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const error = findFirstFieldError(item);
      if (error) return error;
    }
    return undefined;
  }

  if (!isRecord(value)) return undefined;

  for (const item of Object.values(value)) {
    const error = findFirstFieldError(item);
    if (error) return error;
  }

  return isFieldError(value) ? value : undefined;
}

export function showFormErrorToast<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>,
  options: FormErrorToastOptions = {}
) {
  const firstError = findFirstFieldError(errors);
  const description =
    getErrorMessage(firstError) ?? options.fallbackDescription ?? DEFAULT_DESCRIPTION;

  toast.error(options.title ?? DEFAULT_TITLE, {
    description,
  });
}

export function onInvalidFormSubmit<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>
) {
  showFormErrorToast(errors);
}

export function createFormErrorToastHandler<TFieldValues extends FieldValues>(
  options?: FormErrorToastOptions
): SubmitErrorHandler<TFieldValues> {
  return (errors) => showFormErrorToast(errors, options);
}
