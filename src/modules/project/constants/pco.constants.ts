export const PCO_FORM_SECTIONS = [
  { id: 'pco-details', label: 'Change Order Details' },
  { id: 'line-items', label: 'Line Items' },
  { id: 'documents', label: 'Documents' },
] as const;

export const PCO_PRIORITY_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
  { value: 'URGENT', label: 'Urgent' },
] as const;

export function getPriorityVariant(priority: string | null | undefined) {
  switch (priority) {
    case 'URGENT':
      return 'destructive' as const;
    case 'HIGH':
      return 'warning' as const;
    case 'MEDIUM':
      return 'primary' as const;
    case 'LOW':
      return 'secondary' as const;
    default:
      return 'secondary' as const;
  }
}

export function getStatusBadgeVariant(
  statusName: string | undefined,
): 'success' | 'warning' | 'info' | 'destructive' | 'secondary' {
  if (!statusName) return 'secondary';
  const lower = statusName.toLowerCase();
  if (lower.includes('approved') || lower.includes('executed')) return 'success';
  if (lower.includes('pending') || lower.includes('draft') || lower.includes('reverted'))
    return 'warning';
  if (lower.includes('sent') || lower.includes('penciled')) return 'info';
  if (lower.includes('rejected') || lower.includes('void')) return 'destructive';
  return 'secondary';
}

export const PCO_STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-muted-foreground',
  PENDING_REVIEW: 'bg-warning',
  REVERTED: 'bg-warning',
  APPROVED: 'bg-success',
  SENT_TO_GC: 'bg-info',
  PENCILED: 'bg-info',
  EXECUTED: 'bg-primary',
  REJECTED: 'bg-destructive',
  VOID: 'bg-muted-foreground',
};
