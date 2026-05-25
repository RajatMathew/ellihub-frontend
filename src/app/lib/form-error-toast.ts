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

const FIELD_LABELS: Record<string, string> = {
  adjustedFinishDate: 'Adjusted finish date',
  awardQuoteIds: 'Awarded quote',
  bidDeadline: 'Bid deadline',
  changeTypeId: 'Change type',
  costCodeId: 'Cost code',
  deliverables: 'Deliverables',
  description: 'Description',
  dueDate: 'Due date',
  email: 'Email',
  employeeId: 'Employee',
  endDate: 'End date',
  expectedDate: 'Expected date',
  fullName: 'Name',
  gcTypeId: 'GC type',
  invoiceDate: 'Invoice date',
  invoiceNumber: 'Invoice number',
  lineItems: 'Line items',
  name: 'Name',
  paymentMethodId: 'Payment method',
  projectId: 'Project',
  purchaseOrderId: 'Purchase order',
  quantity: 'Quantity',
  role: 'Role',
  shipToAddress: 'Ship to address',
  startDate: 'Start date',
  taxPercent: 'Tax rate',
  title: 'Title',
  tradeCategoryId: 'Trade category',
  typeId: 'Type',
  unitId: 'Unit',
  unitPrice: 'Unit price',
  vendorId: 'Vendor',
};

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

interface FieldErrorMatch {
  error: FieldError;
  path: string[];
}

function labelizeFieldName(fieldName: string): string {
  const known = FIELD_LABELS[fieldName];
  if (known) return known;

  const withoutId = fieldName.endsWith('Id') ? fieldName.slice(0, -2) : fieldName;
  const spaced = withoutId
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase();

  return spaced ? spaced.charAt(0).toUpperCase() + spaced.slice(1) : fieldName;
}

function formatErrorPath(path: string[]): string {
  const visibleSegments = path.filter((segment) => segment !== 'root');
  if (visibleSegments.length === 0) return '';

  const parts: string[] = [];

  visibleSegments.forEach((segment) => {
    if (/^\d+$/.test(segment)) {
      const itemNumber = Number(segment) + 1;
      const previous = parts.pop() ?? 'Item';
      parts.push(`${previous.replace(/s$/i, '')} ${itemNumber}`);
      return;
    }

    parts.push(labelizeFieldName(segment));
  });

  return parts.join(' ');
}

function normalizeMessage(message: string | undefined, fieldLabel: string): string | undefined {
  const rawMessage = message?.trim();
  const lowerMessage = rawMessage?.toLowerCase() ?? '';

  if (
    !rawMessage ||
    lowerMessage === 'required' ||
    lowerMessage === 'invalid input' ||
    lowerMessage.includes('expected string') ||
    lowerMessage.includes('expected number') ||
    lowerMessage.includes('expected array') ||
    lowerMessage.includes('invalid_type')
  ) {
    return fieldLabel ? `${fieldLabel} is required.` : rawMessage;
  }

  return rawMessage;
}

function findFirstFieldError(value: unknown, path: string[] = []): FieldErrorMatch | undefined {
  if (!value) return undefined;

  if (isFieldError(value) && getErrorMessage(value)) {
    return { error: value, path };
  }

  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const error = findFirstFieldError(item, [...path, String(index)]);
      if (error) return error;
    }
    return undefined;
  }

  if (!isRecord(value)) return undefined;

  for (const [key, item] of Object.entries(value)) {
    const error = findFirstFieldError(item, [...path, key]);
    if (error) return error;
  }

  return isFieldError(value) ? { error: value, path } : undefined;
}

export function showFormErrorToast<TFieldValues extends FieldValues>(
  errors: FieldErrors<TFieldValues>,
  options: FormErrorToastOptions = {}
) {
  const firstError = findFirstFieldError(errors);
  const fieldLabel = firstError ? formatErrorPath(firstError.path) : '';
  const description =
    normalizeMessage(getErrorMessage(firstError?.error), fieldLabel) ??
    options.fallbackDescription ??
    DEFAULT_DESCRIPTION;

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
