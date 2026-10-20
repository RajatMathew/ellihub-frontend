import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { AlertCircle } from 'lucide-react';

type Props = {
  open: boolean;
  message: string;
  requestId?: string;
  onClose: () => void;
};

export function EmailConnectErrorDialog({ open, message, requestId, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-w-md gap-0 p-0 focus:outline-none focus-visible:outline-none focus-visible:ring-0"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <DialogHeader className="flex flex-row items-start gap-3 px-6 pt-6">
          <span
            aria-hidden="true"
            className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
          >
            <AlertCircle className="size-5" />
          </span>
          <div className="min-w-0 space-y-1.5">
            <DialogTitle>Couldn&apos;t connect the email account</DialogTitle>
            <DialogDescription className="whitespace-pre-line leading-6">
              {message}
            </DialogDescription>
          </div>
        </DialogHeader>

        {requestId && (
          <p className="border-t border-border bg-muted/20 px-6 py-3 text-xs text-muted-foreground">
            Reference ID: <span className="font-mono text-foreground/80">{requestId}</span>
          </p>
        )}

        <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4">
          <Button type="button" autoFocus onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
