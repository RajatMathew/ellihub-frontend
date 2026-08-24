import { humaniseStatus, statusTone, type StatusTone } from '@/app/components/status-tone';
import { Badge, type BadgeProps } from '@/app/components/ui/badge';
import { cn } from '@/app/lib/utils';

const TONE_VARIANT: Record<StatusTone, NonNullable<BadgeProps['variant']>> = {
  active: 'primary',
  caution: 'warning',
  negative: 'destructive',
  neutral: 'secondary',
  positive: 'success',
};

export interface StatusBadgeProps {
  status: string | null | undefined;
  /** Overrides the resolved tone outright. */
  tone?: StatusTone;
  /** Per-module vocabulary additions. See `statusTone`. */
  tones?: Record<string, StatusTone>;
  /** Overrides the displayed text. Defaults to a humanised `status`. */
  label?: string;
  /** Shown when `status` is null or empty. Renders nothing if omitted. */
  fallback?: string;
  size?: BadgeProps['size'];
  className?: string;
}

/**
 * A record's status, in a table cell or beside a heading.
 *
 * Fixes appearance and size so two lists side by side cannot render the same
 * kind of thing differently — 125 badge call sites had split 60 `light` /
 * 16 `outline` for the same job. Reach for `Badge` directly only when it is not
 * a status.
 */
export function StatusBadge({
  status,
  tone,
  tones,
  label,
  fallback,
  size = 'sm',
  className,
}: StatusBadgeProps) {
  const text = label ?? (status ? humaniseStatus(status) : fallback);

  if (!text) return null;

  return (
    <Badge
      appearance="light"
      size={size}
      variant={TONE_VARIANT[tone ?? statusTone(status, tones)]}
      // Badges land in truncating cells, where an `inline-flex` with no `min-w-0`
      // overflows instead of clipping.
      className={cn('min-w-0 max-w-full justify-start', className)}
    >
      <span className="truncate">{text}</span>
    </Badge>
  );
}
