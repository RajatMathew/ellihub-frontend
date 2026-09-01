import { StatusBadge, type StatusBadgeProps } from '@/app/components/status-badge';
import {
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_TONES,
} from '@/modules/project/constants/project-form.constants';

interface ProjectStatusBadgeProps extends Pick<StatusBadgeProps, 'size' | 'className'> {
  status: string | null | undefined;
  /**
   * Overrides the displayed text. A project's status can come from a lookup
   * record carrying its own wording, which beats the static label map.
   */
  label?: string;
  /** Shown when the project has no status. Renders nothing if omitted. */
  fallback?: string;
}

/**
 * A project's status, wherever it appears.
 *
 * It appears in five places — the project toolbar, the project list, and the
 * projects tab of a GC, a vendor and an employee — and before this each of them
 * decided its own colours. Two maps disagreed outright on `INACTIVE` and
 * `CLOSED`, and the toolbar wrote raw `bg-*` classes that bypassed the badge
 * variants entirely.
 */
export function ProjectStatusBadge({
  status,
  label,
  fallback,
  size,
  className,
}: ProjectStatusBadgeProps) {
  const labels: Record<string, string | undefined> = PROJECT_STATUS_LABELS;

  return (
    <StatusBadge
      className={className}
      fallback={fallback}
      label={label ?? (status ? labels[status] : undefined)}
      size={size}
      status={status}
      tones={PROJECT_STATUS_TONES}
    />
  );
}
