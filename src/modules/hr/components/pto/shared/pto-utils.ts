import { formatDate } from '@/app/lib/helpers';
import type { PTO, PTOStatus } from '@/modules/hr/schemas/pto.schema';

export function formatPTOReference(id: string, length = 4) {
  return `PTO-${id.slice(-length).toUpperCase()}`;
}

export function calculatePTODays(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
}

export function formatPTODate(value: string) {
  return formatDate(value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatPTODateTime(value: string) {
  return formatDate(value, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
}

export function getPTOEmployeeName(pto: PTO) {
  return pto.employee?.name ?? 'Unknown';
}

export function getPTOTypeLabel(pto: PTO) {
  return pto.type?.label ?? pto.type?.name ?? 'Vacation';
}

export function getPTORoleLabel(pto: PTO) {
  return pto.employee?.role?.label ?? pto.employee?.role?.name ?? '-';
}

export function getPTOStatusTone(status: PTOStatus) {
  const tones: Record<PTOStatus, string> = {
    PENDING: 'border-warning/20 bg-warning/10 text-warning',
    APPROVED: 'border-success/20 bg-success/10 text-success',
    REJECTED: 'border-destructive/20 bg-destructive/10 text-destructive',
  };

  return tones[status];
}
