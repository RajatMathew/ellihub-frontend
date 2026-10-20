import { UndoToast, type UndoToastIcon } from '@/app/components/undo-toast';
import { MailX, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

/** How long the offer stands, unless the caller says otherwise. */
const UNDO_WINDOW_SECONDS = 5;
/** How long the outcome stays up once undo has been taken. */
const REVERSED_DISMISS_MS = 2500;

/**
 * Sonner's own toast element must not be seen behind the card: the `Toaster` in
 * `ui/sonner.tsx` gives every toast a background, border and shadow, and
 * `unstyled` does not remove classes set there. The `!` is needed for the same
 * reason `sonner.tsx` uses it on alerts.
 */
/**
 * The icon on the outcome, once undo has been taken: what was put back. An
 * unsent email reads as a crossed-out envelope; anything else is restored.
 */
const REVERSED_ICONS = { send: MailX, trash: RotateCcw, archive: RotateCcw } as const;

const TOAST_OPTIONS = {
  unstyled: true,
  classNames: { toast: 'w-full bg-transparent! border-0! shadow-none!' },
} as const;

/**
 * Raise a toast for an action that can still be taken back. Taking the undo
 * swaps it for an info toast reporting the outcome.
 *
 * Sonner owns every dismissal, via `duration`. The component used to hold its
 * own expiry timer and call `toast.dismiss` from inside its render callback;
 * sonner ignored it and the toast sat at "0s" indefinitely.
 *
 * The one exception is `dismissOnExpiry: false`, for a caller whose own timer
 * is what the window means — a held send. Sonner pauses its clock while the
 * pointer is over a toast, so a toast it dismissed could still be offering Undo
 * after the message had gone. That caller dismisses the returned id itself, from
 * outside the render, when its timer fires.
 */
export function toastUndoable({
  icon = 'trash',
  title,
  description,
  reversedLabel = 'Action reversed successfully.',
  windowSeconds = UNDO_WINDOW_SECONDS,
  dismissOnExpiry = true,
  onUndo,
}: {
  icon?: UndoToastIcon;
  title: string;
  description?: string | null;
  reversedLabel?: string;
  windowSeconds?: number;
  dismissOnExpiry?: boolean;
  onUndo: () => void;
}) {
  const toastId = toast.custom(
    () => (
      <UndoToast
        icon={icon}
        title={title}
        description={description}
        windowSeconds={windowSeconds}
        onUndo={() => {
          onUndo();
          // The outcome is an ordinary info toast, so it looks and reads exactly
          // like the app's others. A custom toast cannot be turned into a styled
          // one in place — sonner keeps the old `jsx` on an update by id — so the
          // offer goes and the outcome replaces it.
          toast.dismiss(toastId);
          const ReversedIcon = REVERSED_ICONS[icon];
          toast.info(reversedLabel, {
            duration: REVERSED_DISMISS_MS,
            icon: <ReversedIcon className="size-4 text-info" aria-hidden />,
          });
        }}
      />
    ),
    {
      ...TOAST_OPTIONS,
      duration: dismissOnExpiry ? windowSeconds * 1000 : Number.POSITIVE_INFINITY,
    }
  );
  return toastId;
}
