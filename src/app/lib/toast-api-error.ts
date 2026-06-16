import { type AxiosError } from 'axios';
import { toast } from 'sonner';

type ValidationPathSegment = string | number;

interface ApiValidationIssue {
  path?: ValidationPathSegment[];
  message?: string;
}

interface ApiErrorResponse {
  message?: string | string[];
  details?: { details?: ApiValidationIssue[] } | ApiValidationIssue[];
  errors?: ApiValidationIssue[];
}

const FIELD_LABELS: Record<string, string> = {
  address: 'Address',
  attachments: 'Attachments',
  awardedAmount: 'Awarded amount',
  awardedQuoteId: 'Awarded quote',
  awardedVendorId: 'Awarded vendor',
  bidDeadline: 'Bid deadline',
  body: 'Body',
  cancellationReason: 'Cancellation reason',
  changeTypeId: 'Change type',
  costCodeId: 'Cost code',
  deliverables: 'Deliverables',
  description: 'Description',
  dueDate: 'Due date',
  email: 'Email',
  entityId: 'Entity',
  expectedDate: 'Expected date',
  fullName: 'Full name',
  invoiceDate: 'Invoice date',
  invoiceNumber: 'Invoice number',
  leadTime: 'Lead time',
  lineItems: 'Line items',
  name: 'Name',
  notes: 'Notes',
  paidDate: 'Paid date',
  paymentMethodId: 'Payment method',
  paymentReference: 'Payment reference',
  projectId: 'Project',
  purchaseOrderId: 'Purchase order',
  quantity: 'Quantity',
  reason: 'Reason',
  rfqId: 'RFQ',
  role: 'Role',
  shipToAddress: 'Ship to address',
  subject: 'Subject',
  taxAmount: 'Tax amount',
  taxPercent: 'Tax percent',
  tcoDate: 'TCO date',
  title: 'Title',
  totalAmount: 'Total amount',
  tradeCategoryId: 'Trade category',
  typeId: 'Type',
  unit: 'Unit',
  unitId: 'Unit',
  unitPrice: 'Unit price',
  vendorId: 'Vendor',
  vendorIds: 'Vendors',
  voidReason: 'Void reason',
};

const COLLECTION_SINGULARS: Record<string, string> = {
  Attachments: 'Attachment',
  Deliverables: 'Deliverable',
  'Line items': 'Line item',
  Vendors: 'Vendor',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isValidationIssue(value: unknown): value is ApiValidationIssue {
  return isRecord(value) && ('message' in value || 'path' in value);
}

function getValidationIssues(data: ApiErrorResponse | undefined): ApiValidationIssue[] {
  const details = data?.details;

  if (Array.isArray(details)) {
    return details.filter(isValidationIssue);
  }

  if (details && !Array.isArray(details) && Array.isArray(details.details)) {
    return details.details.filter(isValidationIssue);
  }

  if (Array.isArray(data?.errors)) {
    return data.errors.filter(isValidationIssue);
  }

  return [];
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

function lowerFirst(value: string): string {
  return value ? value.charAt(0).toLowerCase() + value.slice(1) : value;
}

function singularize(label: string): string {
  return COLLECTION_SINGULARS[label] ?? label.replace(/s$/, '');
}

function formatPath(path: ValidationPathSegment[] | undefined): string {
  if (!path?.length) return '';

  const parts: string[] = [];

  path.forEach((segment) => {
    const segmentValue = String(segment);

    if (/^\d+$/.test(segmentValue)) {
      const itemNumber = Number(segmentValue) + 1;
      if (!parts.length) {
        parts.push(`Item ${itemNumber}`);
        return;
      }

      const collectionLabel = parts.pop() ?? 'Item';
      parts.push(`${singularize(collectionLabel)} ${itemNumber}`);
      return;
    }

    const label = labelizeFieldName(segmentValue);
    parts.push(parts.length ? lowerFirst(label) : label);
  });

  return parts.join(' ');
}

function fieldNameForSentence(fieldLabel: string): string {
  return lowerFirst(fieldLabel).replace(/\s+id$/i, '');
}

function getNestedUnitMessage(fieldLabel: string, isRequired: boolean): string | undefined {
  const match = /^(Deliverable|Line item) (\d+) unit$/i.exec(fieldLabel);
  if (!match) return undefined;

  const itemLabel = `${lowerFirst(match[1])} ${match[2]}`;
  return isRequired ? `${fieldLabel} is required.` : `Please select a valid unit for ${itemLabel}.`;
}

function normalizeValidationMessage(message: string | undefined, fieldLabel: string): string {
  const rawMessage = message?.trim();
  if (!rawMessage) {
    return fieldLabel ? `${fieldLabel} is invalid.` : 'The submitted value is invalid.';
  }

  const lowerMessage = rawMessage.toLowerCase();

  if (
    lowerMessage === 'required' ||
    (lowerMessage.includes('too small') &&
      lowerMessage.includes('string') &&
      lowerMessage.includes('>=1')) ||
    (lowerMessage.includes('expected string') && lowerMessage.includes('received undefined')) ||
    (lowerMessage.includes('expected number') && lowerMessage.includes('received undefined')) ||
    (lowerMessage.includes('expected array') && lowerMessage.includes('received undefined'))
  ) {
    return fieldLabel ? `${fieldLabel} is required.` : 'This field is required.';
  }

  if (lowerMessage.includes('expected string')) {
    return fieldLabel ? `${fieldLabel} must be text.` : 'This must be text.';
  }

  if (lowerMessage.includes('expected array')) {
    return fieldLabel ? `${fieldLabel} must be a list.` : 'This must be a list.';
  }

  if (lowerMessage.includes('invalid ulid') || lowerMessage.includes('invalid uuid')) {
    const nestedUnitMessage = getNestedUnitMessage(fieldLabel, false);
    if (nestedUnitMessage) return nestedUnitMessage;

    return fieldLabel
      ? `Please select a valid ${fieldNameForSentence(fieldLabel)}.`
      : 'Please select a valid value.';
  }

  if (lowerMessage.includes('expected number')) {
    return fieldLabel ? `${fieldLabel} must be a number.` : 'This must be a number.';
  }

  if (lowerMessage.includes('invalid date')) {
    return fieldLabel ? `${fieldLabel} must be a valid date.` : 'Please enter a valid date.';
  }

  const cleanMessage = rawMessage.replace(/^Invalid input:\s*/i, '');
  return fieldLabel ? `${fieldLabel}: ${cleanMessage}` : cleanMessage;
}

function formatValidationIssue(issue: ApiValidationIssue): string | undefined {
  const fieldLabel = formatPath(issue.path);
  const message = normalizeValidationMessage(issue.message, fieldLabel);

  return message.trim() || undefined;
}

function isLikelyValidationPath(path: string): boolean {
  const firstSegment = path.split('.')[0];
  return firstSegment in FIELD_LABELS || path.includes('.');
}

function parseRawValidationMessage(message: string): string | undefined {
  const pathPattern = /(?:^|\s)([A-Za-z_][\w]*(?:\.\d+)?(?:\.[A-Za-z_][\w]*)*):\s*/g;
  const matches = [...message.matchAll(pathPattern)].filter((match) =>
    isLikelyValidationPath(match[1])
  );

  if (!matches.length) return undefined;

  const messages = matches
    .map((match, index) => {
      const nextMatch = matches[index + 1];
      const messageStart = (match.index ?? 0) + match[0].length;
      const messageEnd = nextMatch?.index ?? message.length;
      const rawIssueMessage = message.slice(messageStart, messageEnd).trim();
      const path = match[1]
        .split('.')
        .map((segment) => (/^\d+$/.test(segment) ? Number(segment) : segment));

      return formatValidationIssue({ path, message: rawIssueMessage });
    })
    .filter(Boolean);

  return messages.length ? messages.join('\n') : undefined;
}

function formatApiMessage(message: string | string[] | undefined): string | undefined {
  if (Array.isArray(message)) {
    const formattedMessages = message
      .map((entry) => parseRawValidationMessage(entry) ?? entry.trim())
      .filter(Boolean);
    return formattedMessages.length ? formattedMessages.join('\n') : undefined;
  }

  if (!message?.trim()) return undefined;

  return parseRawValidationMessage(message) ?? message;
}

function getRecordApiMessage(record: Record<string, unknown>): string | undefined {
  const message = record.message;
  if (typeof message === 'string' || Array.isArray(message)) {
    const apiMessage = formatApiMessage(message);
    if (apiMessage) return apiMessage;
  }

  const error = record.error;
  if (isRecord(error)) {
    const errorMessage = getRecordApiMessage(error);
    if (errorMessage) return errorMessage;
  }

  const data = record.data;
  if (isRecord(data)) {
    const dataMessage = getRecordApiMessage(data);
    if (dataMessage) return dataMessage;
  }

  return undefined;
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const axiosErr = error as AxiosError<ApiErrorResponse>;
  const data = axiosErr?.response?.data;

  const validationMessages = getValidationIssues(data).map(formatValidationIssue).filter(Boolean);

  if (validationMessages.length) {
    return validationMessages.join('\n');
  }

  const apiMessage = formatApiMessage(data?.message);
  if (apiMessage) return apiMessage;

  if (isRecord(error)) {
    const recordMessage = getRecordApiMessage(error);
    if (recordMessage) return recordMessage;
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
}

export function toastApiError(error: unknown, fallback: string) {
  toast.error(getApiErrorMessage(error, fallback));
}
