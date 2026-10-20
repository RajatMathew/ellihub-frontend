import { useEffect, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Archive, Send, Trash2 } from 'lucide-react';

/**
 * The body of a toast raised by an action that can still be taken back — a
 * delete, an archive, a send held for its undo window. `toastUndoable` in
 * `./toast-undoable` is what puts it on screen.
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
export type UndoToastIcon = 'trash' | 'archive' | 'send';

const ICONS = { trash: Trash2, archive: Archive, send: Send } as const;

/**
 * Laid out like the app's other toasts — sonner's defaults as `ui/sonner.tsx`
 * and the sonner block in `globals.css` dress them: the full toast column, 16px
 * padding, the popover surface, one border, a soft shadow, a 16px icon beside a
 * 13px title. Only the countdown and the Undo button are its own.
 */
export function UndoToast({
  icon,
  title,
  description,
  windowSeconds,
  onUndo,
}: {
  icon: UndoToastIcon;
  title: string;
  /** What was acted on — the card's own title, so the toast names it. */
  description?: string | null;
  /** How long the offer stands. Printed, and drawn as the draining bar. */
  windowSeconds: number;
  onUndo: () => void;
}) {
  const [secondsLeft, setSecondsLeft] = useState(windowSeconds);

  useEffect(() => {
    const tick = setInterval(() => {
      setSecondsLeft((remaining) => (remaining <= 1 ? 0 : remaining - 1));
    }, 1000);

    return () => clearInterval(tick);
  }, []);

  const Icon = ICONS[icon];

  return (
    <div className="relative flex w-full items-center gap-2 overflow-hidden rounded-lg border border-border bg-popover p-4 text-popover-foreground shadow-lg">
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />

      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-medium leading-5">{title}</p>
        {description ? (
          <p className="truncate text-[13px] text-muted-foreground">{description}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {/* Tabular figures so the width does not twitch as the digit changes,
            and aria-hidden because the button beside it already carries the
            meaning — a screen reader counting down every second would talk
            over everything else. */}
        <span className="text-xs tabular-nums text-muted-foreground" aria-hidden>
          {secondsLeft}s
        </span>
        <Button type="button" variant="primary" size="sm" onClick={onUndo}>
          Undo
        </Button>
      </div>

      {/* The window, draining. Sits under the content rather than beside it, so
          it reports time without competing with the button for the eye.
          `transform` rather than `width` keeps it off the layout path, and the
          duration is set here because the caller owns how long it grants. */}
      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-muted">
        <div
          className="h-full origin-left animate-undo-countdown bg-primary"
          style={{ animationDuration: `${windowSeconds}s` }}
          aria-hidden
        />
      </div>
    </div>
  );
}
