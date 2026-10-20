import { useLayoutEffect, useRef, type ReactNode } from 'react';

import { animate, useReducedMotion, type AnimationPlaybackControls } from 'motion/react';

import { EASE_IN_OUT, heightTransitionDuration } from './agent-motion';

/**
 * Glides between two heights when `trigger` changes, instead of letting
 * everything below jump (elli-ui#649) — a live step rail folding into its
 * summary pill, a proposal card settling into its decided chip.
 *
 * Only a change of `trigger` animates. Ordinary growth (a reply streaming,
 * a textarea gaining a line) stays instant, so the wrapper never lags behind
 * typing. The last settled height is kept from a ResizeObserver; when the
 * trigger flips, the layout effect runs after the DOM has its new content but
 * before paint, pins the old height and eases to the new one, then hands back
 * to `auto`. A second flip mid-glide starts from wherever the first had got to.
 */
export function AgentAnimatedHeight({
  trigger,
  children,
  className,
}: {
  trigger: string | number | boolean;
  children: ReactNode;
  className?: string;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const settledHeight = useRef<number | null>(null);
  const lastTrigger = useRef(trigger);
  const running = useRef<AnimationPlaybackControls | null>(null);

  useLayoutEffect(() => {
    const inner = innerRef.current;
    if (!inner || typeof ResizeObserver === 'undefined') return;
    settledHeight.current = inner.offsetHeight;
    const observer = new ResizeObserver(() => {
      if (!running.current) settledHeight.current = inner.offsetHeight;
    });
    observer.observe(inner);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    if (lastTrigger.current === trigger) return;
    lastTrigger.current = trigger;
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    // Mid-glide, the outer box is pinned — that is where we are now.
    const from = running.current ? outer.offsetHeight : settledHeight.current;
    const to = inner.offsetHeight;
    running.current?.stop();
    running.current = null;
    // A hidden tab runs no animation frames, so a glide would sit pinned at the
    // old height until the reader came back; nobody is watching, so snap.
    const duration =
      from === null || document.hidden ? null : heightTransitionDuration(from, to, reduceMotion);
    if (from === null || duration === null) {
      outer.style.height = '';
      outer.style.overflow = '';
      settledHeight.current = to;
      return;
    }

    outer.style.overflow = 'hidden';
    const controls = animate(outer, { height: [from, to] }, { duration, ease: EASE_IN_OUT });
    running.current = controls;
    void controls.then(() => {
      if (running.current !== controls) return;
      running.current = null;
      // Back to `auto`, so later growth is the content's own business again.
      outer.style.height = '';
      outer.style.overflow = '';
      settledHeight.current = inner.offsetHeight;
    });
  }, [trigger, reduceMotion]);

  useLayoutEffect(() => () => running.current?.stop(), []);

  return (
    <div ref={outerRef} className={className}>
      {/* flow-root keeps a child's margin inside the measured box. */}
      <div ref={innerRef} className="flow-root">
        {children}
      </div>
    </div>
  );
}
