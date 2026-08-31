import { humaniseStatus, statusTone, type StatusTone } from '@/app/components/status-tone';
import { Badge, BadgeDot, type BadgeProps } from '@/app/components/ui/badge';
import { cn } from '@/app/lib/utils';

const TONE_VARIANT: Record<StatusTone, NonNullable<BadgeProps['variant']>> = {
  active: 'primary',
  caution: 'warning',
  info: 'info',
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
 * Fixes the whole treatment — tone, appearance, shape and the dot — so two lists
 * side by side cannot render the same status differently. That was the state
 * before: six parallel status-to-style systems, `light` and `outline` used for
 * the same job, and two of them writing raw `bg-*` classes.
 *
 * The shape is deliberately not the `Badge` pill. A status is the one badge that
 * carries a colour *meaning* rather than a name, so it takes the softer chip and
 * a dot that states the tone even where the fill is too pale to read as one.
 *
 * Reach for `Badge` directly only when it is not a status.
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
  const resolved = tone ?? statusTone(status, tones);

  if (!text) return null;

  return (
    <Badge
      appearance="light"
      size={size}
      variant={TONE_VARIANT[resolved]}
      className={cn(
        // Badges land in truncating cells, where an `inline-flex` with no
        // `min-w-0` overflows instead of clipping.
        'min-w-0 max-w-full justify-start',
        // The status chip: squarer than the pill, no border, and free to grow to
        // its own line height rather than being held to the badge's fixed row.
        'h-auto rounded-md border-transparent px-2 py-0.5 leading-normal',
        className
      )}
    >
      <BadgeDot />
      <span className="truncate">{text}</span>
    </Badge>
  );
}
