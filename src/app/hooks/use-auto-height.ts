import { useLayoutEffect, useRef } from 'react';

/**
 * A textarea as tall as what is in it — one line when empty, growing as the
 * reader types, and scrolling once it reaches `maxHeight` pixels.
 *
 * CSS `field-sizing: content` does this on its own in Chromium only; Safari and
 * Firefox ignore it, so a box given rows for a long description sat three lines
 * tall under a one-line placeholder. The height is measured instead: cleared to
 * `auto` so the box can shrink, then set to what the content scrolls to.
 */
export function fitTextareaHeight(element: HTMLTextAreaElement, maxHeight: number) {
  element.style.height = 'auto';
  const height = Math.min(element.scrollHeight, maxHeight);
  element.style.height = `${height}px`;
  element.style.overflowY = element.scrollHeight > maxHeight ? 'auto' : 'hidden';
}

export function useAutoHeight<T extends HTMLTextAreaElement>(value: string, maxHeight = 320) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    if (ref.current) fitTextareaHeight(ref.current, maxHeight);
  }, [value, maxHeight]);
  return ref;
}
