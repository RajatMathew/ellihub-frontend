import { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/app/lib/utils';

const HIDE_DELAY_MS = 900;
const MIN_THUMB_HEIGHT = 32;

interface ThumbMetrics {
  top: number;
  height: number;
  scrollable: boolean;
}

/**
 * Floating overlay scroll thumb for a container whose native scrollbar is
 * hidden (see the `scrollbar-hover` utility). Sits on top of the content, only
 * appears while scrolling (or when grabbed), and supports dragging — the
 * closest CSS-free approximation of a macOS overlay scrollbar.
 */
export function EmailListScrollbar({ scrollElement }: { scrollElement: HTMLElement | null }) {
  const [metrics, setMetrics] = useState<ThumbMetrics>({ top: 0, height: 0, scrollable: false });
  const [visible, setVisible] = useState(false);
  const [dragging, setDragging] = useState(false);
  const hideTimerRef = useRef<number | null>(null);
  const dragStateRef = useRef<{ startY: number; startScrollTop: number } | null>(null);

  const measure = useCallback(() => {
    if (!scrollElement) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollElement;
    if (scrollHeight <= clientHeight + 1) {
      setMetrics({ top: 0, height: 0, scrollable: false });
      return;
    }
    const height = Math.max((clientHeight / scrollHeight) * clientHeight, MIN_THUMB_HEIGHT);
    const maxTop = clientHeight - height;
    const top = (scrollTop / (scrollHeight - clientHeight)) * maxTop;
    setMetrics({ top, height, scrollable: true });
  }, [scrollElement]);

  const reveal = useCallback(() => {
    setVisible(true);
    if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    hideTimerRef.current = window.setTimeout(() => {
      if (!dragStateRef.current) setVisible(false);
    }, HIDE_DELAY_MS);
  }, []);

  useEffect(() => {
    if (!scrollElement) return;
    // Initial measurement runs async so the effect body itself stays setState-free.
    const initialFrame = requestAnimationFrame(() => measure());

    let frame = 0;
    const handleScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        measure();
        reveal();
      });
    };
    const observer = new ResizeObserver(() => measure());
    observer.observe(scrollElement);
    scrollElement.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      cancelAnimationFrame(initialFrame);
      cancelAnimationFrame(frame);
      observer.disconnect();
      scrollElement.removeEventListener('scroll', handleScroll);
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
    };
  }, [measure, reveal, scrollElement]);

  if (!scrollElement || !metrics.scrollable) return null;

  return (
    // Sits over the list content; transform keeps updates off the layout path.
    <div
      role="presentation"
      className={cn(
        'absolute inset-y-0 right-0 z-20 w-2.5',
        visible || dragging ? 'opacity-100' : 'opacity-0',
        'motion-safe:transition-opacity motion-safe:duration-200'
      )}
      onPointerEnter={reveal}
    >
      <div
        role="presentation"
        className={cn(
          'absolute right-0.5 w-1.5 cursor-default rounded-full bg-foreground/50 hover:bg-foreground/70',
          dragging && 'bg-foreground/70'
        )}
        style={{ top: metrics.top, height: metrics.height }}
        onPointerDown={(event) => {
          event.preventDefault();
          event.currentTarget.setPointerCapture(event.pointerId);
          dragStateRef.current = {
            startY: event.clientY,
            startScrollTop: scrollElement.scrollTop,
          };
          setDragging(true);
        }}
        onPointerMove={(event) => {
          const dragState = dragStateRef.current;
          if (!dragState) return;
          const { scrollHeight, clientHeight } = scrollElement;
          const maxThumbTravel = clientHeight - metrics.height;
          if (maxThumbTravel <= 0) return;
          const scrollPerPixel = (scrollHeight - clientHeight) / maxThumbTravel;
          scrollElement.scrollTo({
            top: dragState.startScrollTop + (event.clientY - dragState.startY) * scrollPerPixel,
          });
        }}
        onPointerUp={(event) => {
          event.currentTarget.releasePointerCapture(event.pointerId);
          dragStateRef.current = null;
          setDragging(false);
          reveal();
        }}
      />
    </div>
  );
}
