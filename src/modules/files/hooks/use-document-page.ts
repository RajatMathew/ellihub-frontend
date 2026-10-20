import { useEffect, useState, type RefObject } from 'react';

/**
 * Which page of a rendered document is in view — "Page 2 of 5" — as the
 * reader scrolls. A page counts as current once its top passes the upper
 * third of the viewport, as Word's status bar counts it. Measured from the
 * pages' on-screen boxes, so it holds at any zoom.
 *
 * `pageSelector` matches each page (`docx-preview` draws one `section` per
 * page); `version` changes whenever the document is re-rendered.
 */
export function useDocumentPage(
  scrollRef: RefObject<HTMLElement | null>,
  pageSelector: string,
  version: unknown
): { current: number; total: number } {
  const [position, setPosition] = useState({ current: 0, total: 0 });

  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    const measure = () => {
      const pages = Array.from(scroller.querySelectorAll(pageSelector));
      const view = scroller.getBoundingClientRect();
      const line = view.top + view.height / 3;
      let current = pages.length > 0 ? 1 : 0;
      pages.forEach((page, index) => {
        if (page.getBoundingClientRect().top <= line) current = index + 1;
      });
      setPosition((previous) =>
        previous.current === current && previous.total === pages.length
          ? previous
          : { current, total: pages.length }
      );
    };
    // Fires once on observe, and again when a zoom resizes the pages.
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    for (const child of Array.from(scroller.children)) observer.observe(child);
    scroller.addEventListener('scroll', measure, { passive: true });
    return () => {
      observer.disconnect();
      scroller.removeEventListener('scroll', measure);
    };
  }, [scrollRef, pageSelector, version]);

  return position;
}
