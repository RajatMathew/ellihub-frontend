import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import { LoaderCircle } from 'lucide-react';

type EmailPermanentDeleteDialogProps = {
  open: boolean;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void> | void;
};

export function EmailPermanentDeleteDialog({
  open,
  isPending,
  onOpenChange,
  onConfirm,
}: EmailPermanentDeleteDialogProps) {
  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isPending) onOpenChange(nextOpen);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Permanently delete this email?</AlertDialogTitle>
          <AlertDialogDescription>
            This email will be permanently removed from your mailbox and cannot be recovered.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={isPending}
            aria-busy={isPending}
            onClick={(event) => {
              event.preventDefault();
              void Promise.resolve(onConfirm())
                .then(() => onOpenChange(false))
                .catch(() => undefined);
            }}
          >
            {isPending && <LoaderCircle aria-hidden="true" className="animate-spin" />}
            {isPending ? 'Deleting…' : 'Delete permanently'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
