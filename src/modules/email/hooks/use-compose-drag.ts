import { useRef, useState, type DragEvent } from 'react';

/** What `EmailComposeFields` needs to draw and clear the drop overlay. */
export interface ComposeDragState {
  isDragging: boolean;
  onDragEnter: (event: DragEvent<HTMLElement>) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDropCapture: () => void;
}

/**
 * Drag-to-attach state for a composer.
 *
 * Counted rather than toggled: `dragenter` and `dragleave` both fire for every
 * nested element the pointer crosses, so a boolean flickers off the moment the
 * drag passes over the editor's own children. The depth only reaches zero when
 * the pointer has genuinely left.
 *
 * `useEmailCompose` owns a copy of this for the new-message editor; a reply has
 * no controller, so it holds one directly. Same hook either way, so a file
 * dropped on a reply behaves exactly as it does on a new message
 * (elli-ui#1189).
 */
export function useComposeDrag(): ComposeDragState {
  const [isDragging, setIsDragging] = useState(false);
  const depthRef = useRef(0);

  return {
    isDragging,
    onDragEnter: (event) => {
      event.preventDefault();
      depthRef.current += 1;
      setIsDragging(true);
    },
    onDragLeave: (event) => {
      event.preventDefault();
      depthRef.current = Math.max(0, depthRef.current - 1);
      if (depthRef.current === 0) setIsDragging(false);
    },
    /** Takes the overlay down however the drag ended, including a handled drop. */
    onDropCapture: () => {
      depthRef.current = 0;
      setIsDragging(false);
    },
  };
}
