import { UndoToast } from '@/modules/tasks/components/undo-toast';
import { toast } from 'sonner';

/** How long the offer stands. */
const UNDO_WINDOW_SECONDS = 5;
/** How long the confirmation stays up once undo has been taken. */
const REVERSED_DISMISS_MS = 2500;

const TOAST_OPTIONS = { unstyled: true, classNames: { toast: 'w-full' } } as const;

/**
 * Raise a toast for a destructive action that can still be taken back.
 *
 * Both halves are one toast, not two. Undo re-raises against the same id, which
 * swaps the content in place and resets sonner's clock to the shorter
 * confirmation window — so the outcome always gets its full time on screen,
 * whether undo was clicked at one second or at four.
 *
 * Sonner owns every dismissal, via `duration`. The component used to hold its
 * own expiry timer and call `toast.dismiss` from inside its render callback;
 * sonner ignored it and the toast sat at "0s" indefinitely.
 */
export function toastUndoable({
  icon = 'trash',
  title,
  description,
  reversedLabel = 'Action reversed successfully.',
  onUndo,
}: {
  icon?: 'trash' | 'archive';
  title: string;
  description?: string | null;
  reversedLabel?: string;
  onUndo: () => void;
}) {
  return toast.custom(
    (toastId) => (
      <UndoToast
        icon={icon}
        title={title}
        description={description}
        reversedLabel={reversedLabel}
        windowSeconds={UNDO_WINDOW_SECONDS}
        onUndo={() => {
          onUndo();
          toast.custom(
            () => (
              <UndoToast
                icon={icon}
                title={title}
                reversedLabel={reversedLabel}
                windowSeconds={UNDO_WINDOW_SECONDS}
                reversed
                onUndo={() => undefined}
              />
            ),
            { ...TOAST_OPTIONS, id: toastId, duration: REVERSED_DISMISS_MS }
          );
        }}
      />
    ),
    { ...TOAST_OPTIONS, duration: UNDO_WINDOW_SECONDS * 1000 }
  );
}
