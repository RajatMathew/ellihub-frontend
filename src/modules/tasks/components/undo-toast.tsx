import { useEffect, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/lib/utils';
import { Archive, Check, Trash2 } from 'lucide-react';

/**
 * The body of a toast raised by a destructive action that can still be taken
 * back. `toastUndoable` in `./toast-undoable` is what puts it on screen.
 *
 * Written by hand because no shadcn primitive covers it: sonner's own `action`
 * gives a label and a click and nothing else — no countdown, no progress, and no
 * way to keep the toast up afterwards to report what the click did. Everything
 * under it is still the repo's kit (`Button`, the theme tokens, the `Toaster` in
 * `ui/sonner.tsx`); this only supplies the layout `action` cannot express.
 *
 * The countdown is the point. A delete that vanishes silently leaves you
 * wondering whether it worked; one that says how long you have to change your
 * mind answers the question before it is asked.
 *
 * Deliberately holds no timer of its own beyond the digit it prints. How long
 * the toast lives — and when it goes — is sonner's, set as a duration by the
 * caller. Owning it here meant calling `toast.dismiss` from inside the toast's
 * own render callback, which sonner never acted on: the toast sat at "0s"
 * forever.
 */
export function UndoToast({
  icon,
  title,
  description,
  reversedLabel,
  windowSeconds,
  reversed = false,
  onUndo,
}: {
  icon: 'trash' | 'archive';
  title: string;
  /** What was acted on — the card's own title, so the toast names it. */
  description?: string | null;
  reversedLabel: string;
  /** How long the offer stands. Printed, and drawn as the draining bar. */
  windowSeconds: number;
  /** Once taken, the same toast reports the outcome in place. */
  reversed?: boolean;
  onUndo: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(windowSeconds);

  useEffect(() => {
    if (reversed) return;

    const tick = setInterval(() => {
      setSecondsLeft((remaining) => (remaining <= 1 ? 0 : remaining - 1));
    }, 1000);

    return () => clearInterval(tick);
  }, [reversed]);

  const Icon = reversed ? Check : icon === 'archive' ? Archive : Trash2;

  return (
    <div className="relative w-full overflow-hidden rounded-md border border-border bg-background shadow-lg">
      <div className="flex items-center gap-3 p-4">
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full',
            reversed
              ? 'bg-success-soft text-success-soft-foreground'
              : 'bg-muted text-muted-foreground'
          )}
        >
          <Icon className="size-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{reversed ? reversedLabel : title}</p>
          {/* The name of the thing acted on. Dropped once reversed — it is back,
              so naming it again would read as a second event. */}
          {!reversed && description ? (
            <p className="truncate text-xs text-muted-foreground">{description}</p>
          ) : null}
        </div>

        {!reversed ? (
          <div className="flex shrink-0 items-center gap-2">
            {/* Tabular figures so the width does not twitch as the digit
                changes, and aria-hidden because the button beside it already
                carries the meaning — a screen reader counting down every second
                would talk over everything else. */}
            <span className="text-xs tabular-nums text-muted-foreground" aria-hidden>
              {secondsLeft}s
            </span>
            <Button type="button" variant="primary" size="sm" onClick={onUndo}>
              Undo
            </Button>
          </div>
        ) : null}
      </div>

      {/* The window, draining. Sits under the content rather than beside it, so
          it reports time without competing with the button for the eye.
          `transform` rather than `width` keeps it off the layout path, and the
          duration is set here because the caller owns how long it grants. */}
      {!reversed ? (
        <div className="absolute inset-x-0 bottom-0 h-0.5 bg-muted">
          <div
            className="h-full origin-left animate-undo-countdown bg-primary"
            style={{ animationDuration: `${windowSeconds}s` }}
            aria-hidden
          />
        </div>
      ) : null}
    </div>
  );
}
