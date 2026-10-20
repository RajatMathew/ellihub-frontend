import { useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

import { usePointerCoarse } from '@/app/hooks/use-pointer-coarse';
import { cn } from '@/app/lib/utils';
import { EmailRowActionIcon } from '@/modules/email/components/email-row-action-icon';
import type { EmailRowAction } from '@/modules/email/lib/email-row-actions';
import {
  beginRowSwipeGesture,
  resolveRowSwipeSnap,
  rowSwipeTargetX,
  rowSwipeVelocityX,
  trackRowSwipeGesture,
  type RowSwipeGesture,
  type RowSwipeSnap,
} from '@/modules/email/lib/email-row-swipe';
import { closeRowSwipe, openRowSwipe } from '@/modules/email/lib/email-row-swipe-registry';
import { animate, motion, useMotionValue, useReducedMotion, type PanInfo } from 'motion/react';

// Matches Tailwind's `w-16` (4rem) — a scale value, not an arbitrary pixel
// guess, and what the panel buttons below are actually sized with. It was
// `w-20` while the drawer held two actions; four of those are 320px, which on
// a 360px phone pushes the whole row off screen and leaves nothing to tap to
// close the drawer again.
const ACTION_WIDTH_PX = 64;

interface EmailRowSwipeActionsProps {
  children: ReactNode;
  /** Every action the row offers, in order — see `emailRowActions`. */
  actions: EmailRowAction[];
  /** Off during bulk-select — a drag would fight the checkbox gesture. */
  disabled?: boolean;
  className?: string;
}

/**
 * Swipe-to-reveal actions behind an email row, touch only (elli-ui#1073) —
 * the interaction reactbits.dev/c/micro/swipe-row demonstrates, rebuilt on
 * this app's own tokens and the `motion` dependency it already has rather than
 * the demo's own icon and animation packages.
 *
 * On a touch screen this drawer is how the row's actions are reached: the
 * row's own icon buttons used to be shown always there, which left a phone
 * with no room for the timestamp, so `EmailRowCard` now keeps them for a mouse
 * and for keyboard focus. It is a pointer gesture with no keyboard equivalent,
 * which is why those icon buttons still exist rather than being replaced by it.
 */
export function EmailRowSwipeActions({
  children,
  actions,
  disabled = false,
  className,
}: EmailRowSwipeActionsProps) {
  const id = useId();
  const isCoarsePointer = usePointerCoarse();
  const reducedMotion = useReducedMotion();
  const x = useMotionValue(0);
  const [snap, setSnap] = useState<RowSwipeSnap>('closed');
  // The horizontal samples of the gesture in flight, for the release velocity.
  const gestureRef = useRef<RowSwipeGesture | null>(null);
  // Where that release leaves the drawer, settled at `pointerup` so the click
  // that follows can read it. Cleared on the next press, never by the click —
  // `onDragEnd` arrives a frame later and reads it too.
  const releaseRef = useRef<RowSwipeSnap | null>(null);

  const revealWidth = actions.length * ACTION_WIDTH_PX;
  // Critically damped when motion is reduced: the drawer still opens and
  // closes, it just doesn't bounce on the way. Memoized so `close` below has
  // a stable dependency instead of a new object every render.
  const springTransition = useMemo(
    () =>
      reducedMotion
        ? { type: 'spring' as const, stiffness: 500, damping: 50 }
        : { type: 'spring' as const, stiffness: 420, damping: 34, mass: 0.8 },
    [reducedMotion]
  );

  const close = useCallback(() => {
    setSnap('closed');
    animate(x, 0, springTransition);
  }, [x, springTransition]);

  useEffect(() => {
    if (snap !== 'open') return;
    openRowSwipe(id, close);
    return () => closeRowSwipe(id);
  }, [snap, id, close]);

  const active = !disabled && isCoarsePointer && actions.length > 0;

  if (!active) {
    return <>{children}</>;
  }

  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div
        className="absolute inset-y-0 right-0 flex"
        style={{ width: revealWidth }}
        aria-hidden={snap === 'closed'}
      >
        {actions.map((action) => (
          <button
            key={action.key}
            type="button"
            tabIndex={snap === 'open' ? 0 : -1}
            aria-label={action.label}
            aria-pressed={action.pressed}
            className={cn(
              'flex h-full w-16 flex-col items-center justify-center gap-1 text-[11px] font-medium',
              // Only Delete is loud. The rest share one fill and are told
              // apart by a hairline, their glyph and their caption.
              action.destructive
                ? 'bg-destructive text-destructive-foreground'
                : 'border-l border-border bg-secondary text-secondary-foreground first:border-l-0'
            )}
            onClick={() => {
              close();
              action.run();
            }}
          >
            <EmailRowActionIcon action={action} className="size-4" />
            {action.caption}
          </button>
        ))}
      </div>

      <motion.div
        // `relative` + an opaque background: the reveal panel is `absolute`,
        // which paints above static content regardless of DOM order, and its
        // own background stays transparent everywhere the row itself is (this
        // list's rows have no card background until hovered/selected — see
        // `EmailRowCard`'s doc comment). Without both, the drawer showed
        // through a closed, idle row instead of staying hidden behind it.
        className="relative bg-mail-pane"
        drag="x"
        dragConstraints={{ left: -revealWidth, right: 0 }}
        dragElastic={{ left: 0.06, right: 0.5 }}
        dragMomentum={false}
        style={{ x }}
        // Capture, and on this element rather than `window`: the samples have
        // to start before anything inside the row can stop the event, and it
        // has to be this row's own press, not a neighbour's.
        onPointerDownCapture={(event) => {
          gestureRef.current = beginRowSwipeGesture(event.clientX, event.timeStamp);
          releaseRef.current = null;
        }}
        onPointerMoveCapture={(event) => {
          gestureRef.current = trackRowSwipeGesture(
            gestureRef.current,
            event.clientX,
            event.timeStamp
          );
        }}
        // The release is settled here, not in `onDragEnd`. `motion` dispatches
        // that one from `frame.postRender`, which lands *after* the click it
        // is supposed to inform; `pointerup` is native and runs before it.
        onPointerUpCapture={(event) => {
          const gesture = trackRowSwipeGesture(gestureRef.current, event.clientX, event.timeStamp);
          gestureRef.current = null;
          releaseRef.current = resolveRowSwipeSnap(
            x.get(),
            rowSwipeVelocityX(gesture),
            revealWidth
          );
        }}
        onPointerCancelCapture={() => {
          gestureRef.current = null;
          releaseRef.current = null;
        }}
        onDragEnd={(_event, info: PanInfo) => {
          // Prefer the release already settled at `pointerup` so the drawer
          // and the click can never disagree about what the gesture was.
          const next =
            releaseRef.current ?? resolveRowSwipeSnap(x.get(), info.velocity.x, revealWidth);
          setSnap(next);
          animate(x, rowSwipeTargetX(next, revealWidth), springTransition);
        }}
        onClickCapture={(event) => {
          // Swallow the click only when the drawer is actually involved —
          // open already, or opening because of the gesture that just ended.
          //
          // Deliberately not a "did the finger move far enough to be a swipe"
          // test. That needs a slop constant, and any constant is wrong: a
          // thumb leaving the glass rolls ten or twenty pixels *vertically*,
          // which moves this drawer by zero (`drag="x"`), and judging it as a
          // swipe made the mail unopenable on real phones (elli-ui#1073).
          // Whether a drag that large should have produced a click at all is
          // the browser's own tap slop to decide, per device — it already has
          // the DPI and the platform convention, and this code does not.
          if (snap !== 'open' && releaseRef.current !== 'open') return;

          event.preventDefault();
          event.stopPropagation();
          // A tap on the sliver still showing beside an open drawer dismisses
          // the drawer — that is what a tap there means. The decision is
          // written back because even a 3px tap starts a pan, so `onDragEnd`
          // still arrives a frame later and would otherwise re-read the
          // release that settled before this dismissal and reopen the drawer.
          if (snap === 'open') {
            releaseRef.current = 'closed';
            close();
          }
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
