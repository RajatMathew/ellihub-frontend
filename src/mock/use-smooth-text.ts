import { useEffect, useRef, useState } from 'react';

import { useReducedMotion } from 'motion/react';

import { nextRevealLength } from './agent-stream-text';

/**
 * The part of `text` the reader should see this frame (elli-ui#1343).
 *
 * Text that was already complete when it first rendered — a reloaded
 * conversation, an earlier turn — is shown whole. Text that is streaming is
 * revealed a little more every animation frame, paced by `nextRevealLength`,
 * and finishes briskly once `streaming` turns false. Someone who has asked for
 * less motion gets the text as it arrives.
 *
 * Only the frame loop sets state, and it stops as soon as the reveal has caught
 * up, so an idle reply costs nothing.
 *
 * A hidden tab runs no animation frames at all, so a reply streaming behind
 * another tab would sit half-revealed until the reader came back. There is no
 * one to animate for, so a hidden page skips straight to the full text — on a
 * timer, which still fires there.
 */
export function useSmoothText(text: string, streaming: boolean): string {
  const reduceMotion = useReducedMotion() ?? false;
  const [shown, setShown] = useState(() => (streaming ? 0 : text.length));
  const shownRef = useRef(shown);
  const targetRef = useRef(text.length);
  const streamingRef = useRef(streaming);

  useEffect(() => {
    targetRef.current = text.length;
    streamingRef.current = streaming;
    if (reduceMotion || shownRef.current === text.length) return;

    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let last = performance.now();
    const show = (next: number) => {
      shownRef.current = next;
      setShown(next);
    };
    const showAll = () => {
      cancelAnimationFrame(frame);
      show(targetRef.current);
    };
    const tick = (now: number) => {
      if (document.hidden) return showAll();
      const next = nextRevealLength({
        shown: shownRef.current,
        target: targetRef.current,
        elapsedMs: now - last,
        streaming: streamingRef.current,
      });
      last = now;
      show(next);
      if (next !== targetRef.current) frame = requestAnimationFrame(tick);
    };
    const onVisibilityChange = () => {
      if (document.hidden) showAll();
    };

    if (document.hidden) timer = setTimeout(showAll, 0);
    else frame = requestAnimationFrame(tick);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [reduceMotion, streaming, text.length]);

  if (reduceMotion) return text;
  return text.slice(0, Math.min(shown, text.length));
}
