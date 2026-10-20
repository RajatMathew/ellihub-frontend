import { useEffect, useRef, useState, type RefObject } from 'react';

import { isFileDrag } from '@/modules/files/global-drop/global-drop';

/** How long after the last dragover the drag counts as gone — it left the window. */
const DRAG_GONE_MS = 150;

export type GlobalFileDrag = { active: boolean; count: number };

/** Read at event time, so the caller can decide them after the drag has begun. */
export type GlobalFileDropHandlers = { accepting: boolean; onDrop: (files: File[]) => void };

/**
 * Files dragged over the app from the computer (elli-ui#1333), seen from the
 * window, after every element has had its turn.
 *
 * A drop zone of its own — the composer, an attachment field — claims a drag
 * by calling `preventDefault` on it, and React runs those handlers before the
 * event reaches the window. So a drag already claimed is left alone: the
 * island hides and the zone takes the drop. Anything unclaimed is taken here,
 * which also stops the browser opening a dropped file in place of the app.
 *
 * `handlers` is read at event time; `accepting` false still swallows the drop
 * (no file opens in the tab) but uploads nothing.
 */
export function useGlobalFileDrag(handlers: RefObject<GlobalFileDropHandlers>): GlobalFileDrag {
  const [drag, setDrag] = useState<GlobalFileDrag>({ active: false, count: 0 });
  const goneTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const hide = () => {
      window.clearTimeout(goneTimer.current);
      setDrag((current) => (current.active ? { active: false, count: 0 } : current));
    };

    const onDragOver = (event: DragEvent) => {
      if (!isFileDrag(event.dataTransfer?.types)) return;
      // Claimed by a drop zone under the pointer: it shows its own target.
      if (event.defaultPrevented) return hide();
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = handlers.current.accepting ? 'copy' : 'none';
      }
      const count = event.dataTransfer?.items.length ?? 0;
      setDrag((current) =>
        current.active && current.count === count ? current : { active: true, count }
      );
      window.clearTimeout(goneTimer.current);
      goneTimer.current = window.setTimeout(hide, DRAG_GONE_MS);
    };

    const onDropEvent = (event: DragEvent) => {
      if (!isFileDrag(event.dataTransfer?.types)) return;
      hide();
      if (event.defaultPrevented) return;
      event.preventDefault();
      const files = Array.from(event.dataTransfer?.files ?? []);
      if (handlers.current.accepting && files.length > 0) handlers.current.onDrop(files);
    };

    window.addEventListener('dragenter', onDragOver);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('drop', onDropEvent);
    return () => {
      window.clearTimeout(goneTimer.current);
      window.removeEventListener('dragenter', onDragOver);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDropEvent);
    };
  }, [handlers]);

  return drag;
}
