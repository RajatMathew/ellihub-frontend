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
        // `secondary` is the one variant whose `light` appearance does not use a
        // `-soft` token pair — it takes the raw `--secondary` surface, which in
        // the editorial theme is a cool blue-grey (#ebeef3) on a warm cream page.
        // Neutral statuses were the only cold thing on the screen. `--muted` is
        // each theme's own neutral and warm where the theme is.
        //
        // Background only: `--muted-foreground` is a mid-grey that drops this to
        // 4.4:1 in light, under AA for 11px text. Keeping the variant's own
        // foreground holds 12–18:1 in every theme. In light, dark and dark-blue
        // `--muted` and `--secondary` are the same value, so nothing moves there.
        resolved === 'neutral' && 'bg-muted',
        className
      )}
    >
      <span className="truncate">{text}</span>
    </Badge>
  );
}
