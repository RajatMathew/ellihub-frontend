/**
 * How the quoted history opens and closes behind the `•••` toggle (#1293).
 * Previously `hidden` flipped and a few hundred pixels landed in one frame.
 *
 * Opening is two motions at once: the box grows on an elastic curve that
 * overshoots its natural height and springs back, while the content wobbles in
 * like jelly. Closing is a short ease-in with no bounce, because a collapse
 * that bounces reads as a glitch.
 *
 * The height is animated from script rather than CSS: a CSS transition cannot
 * reach `height: auto`, and the `grid-template-rows: 0fr → 1fr` trick cannot
 * overshoot, which the elastic curve needs.
 *
 * The constants are exported for `email-html-document.ts`, whose frame script
 * is a plain string and carries its own copy of `animateQuote`.
 */

export const QUOTE_OPEN_DURATION_MS = 600;
export const QUOTE_CLOSE_DURATION_MS = 240;

/** Overshoots to 104% around 45%, then settles. */
export const QUOTE_ELASTIC_EASING =
  'linear(0, 0.22 10%, 0.66 24%, 0.96 36%, 1.04 45%, 1.03 55%, 1 70%, 1)';
/** For engines without `linear()` easing (Safari before 17.2): one small overshoot. */
export const QUOTE_ELASTIC_FALLBACK_EASING = 'cubic-bezier(.3, 1.15, .6, 1)';
export const QUOTE_CLOSE_EASING = 'cubic-bezier(.5, 0, .75, 0)';

export const QUOTE_JELLY_KEYFRAMES: Keyframe[] = [
  { offset: 0, transform: 'scale(1, .85)', opacity: 0, transformOrigin: 'top center' },
  { offset: 0.35, transform: 'scale(1, 1.02)', opacity: 1 },
  { offset: 0.6, transform: 'scale(1, .995)' },
  { offset: 1, transform: 'scale(1, 1)', opacity: 1, transformOrigin: 'top center' },
];

const running = new WeakMap<HTMLElement, Animation[]>();

/**
 * Show or hide `quoted`, animated unless the viewer asked for reduced motion or
 * the engine has no Web Animations. Safe to call mid-animation: the running
 * one is cancelled and the next starts from the height on screen.
 */
export function animateQuote(quoted: HTMLElement, open: boolean): void {
  // Read before cancelling: while an animation runs, this is its current height.
  const from = quoted.hidden ? 0 : quoted.offsetHeight;
  for (const animation of running.get(quoted) ?? []) {
    // Cancelling rejects `finished`; that is the expected outcome here, not an error.
    animation.finished.catch(() => undefined);
    animation.cancel();
  }
  running.delete(quoted);

  if (!canAnimate(quoted)) {
    quoted.hidden = !open;
    return;
  }

  quoted.hidden = false;
  // Overflow and box-sizing ride in the keyframes, so nothing is left behind
  // on the element when the animation ends or is cancelled.
  const frame = { overflow: 'hidden', boxSizing: 'border-box' } as const;

  if (open) {
    const to = quoted.offsetHeight;
    running.set(quoted, [
      quoted.animate(
        [
          { ...frame, height: `${from}px` },
          { ...frame, height: `${to}px` },
        ],
        { duration: QUOTE_OPEN_DURATION_MS, easing: elasticEasing(quoted) }
      ),
      quoted.animate(QUOTE_JELLY_KEYFRAMES, {
        duration: QUOTE_OPEN_DURATION_MS,
        easing: 'ease-out',
      }),
    ]);
    return;
  }

  const close = quoted.animate(
    [
      { ...frame, height: `${from}px`, opacity: 1 },
      { ...frame, height: '0px', opacity: 0 },
    ],
    // `forwards` holds it at zero until `hidden` takes over, or the box would
    // flash back to full height for a frame.
    { duration: QUOTE_CLOSE_DURATION_MS, easing: QUOTE_CLOSE_EASING, fill: 'forwards' }
  );
  close.onfinish = () => {
    quoted.hidden = true;
    // Already finished, so this only drops the `forwards` fill.
    close.cancel();
    running.delete(quoted);
  };
  running.set(quoted, [close]);
}

function canAnimate(element: HTMLElement): boolean {
  if (typeof element.animate !== 'function') return false;
  const view = element.ownerDocument.defaultView;
  return !view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

function elasticEasing(element: HTMLElement): string {
  const css = element.ownerDocument.defaultView?.CSS;
  return css?.supports?.('animation-timing-function', 'linear(0, 1)')
    ? QUOTE_ELASTIC_EASING
    : QUOTE_ELASTIC_FALLBACK_EASING;
}
