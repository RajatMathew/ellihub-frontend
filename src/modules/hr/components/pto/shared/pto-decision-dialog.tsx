import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Textarea } from '@/app/components/ui/textarea';
import { Check, RefreshCcw, X } from 'lucide-react';
import { toast } from 'sonner';

export interface PTODecisionTarget {
  id: string;
  name: string;
  type: 'approve' | 'reject';
}

interface PTODecisionDialogProps {
  target: PTODecisionTarget | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (target: PTODecisionTarget, note: string) => Promise<void>;
}

export function PTODecisionDialog({
  target,
  isPending,
  onClose,
  onConfirm,
}: PTODecisionDialogProps) {
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(false);

  const handleClose = () => {
    setNote('');
    setNoteError(false);
    onClose();
  };

  const handleConfirm = async () => {
    if (!target) return;
    if (!note.trim()) {
      setNoteError(true);
      toast.error('Internal note is required');
      return;
    }

    await onConfirm(target, note);
    handleClose();
  };

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {target?.type === 'approve' ? (
              <>
                <Check className="size-5 text-success" /> Approve Request
              </>
            ) : (
              <>
                <X className="size-5 text-destructive" /> Reject Request
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            Confirm your decision for <strong>{target?.name}</strong>. An internal note is required.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Field data-invalid={noteError}>
            <FieldLabel className="flex items-center gap-1 text-xs font-bold uppercase tracking-widest">
              Internal Note <span className="text-destructive">Required</span>
            </FieldLabel>
            <Textarea
              placeholder="Why are you making this decision?"
              value={note}
              onChange={(event) => {
                setNote(event.target.value);
                if (event.target.value.trim()) setNoteError(false);
              }}
              className="min-h-24 resize-none"
              aria-invalid={noteError}
            />
            {noteError && <FieldError errors={[{ message: 'Internal note is required' }]} />}
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            variant={target?.type === 'approve' ? 'primary' : 'destructive'}
            onClick={() => void handleConfirm()}
            disabled={isPending}
          >
            {isPending ? (
              <RefreshCcw className="size-4 animate-spin" />
            ) : target?.type === 'approve' ? (
              <Check className="size-4" />
            ) : (
              <X className="size-4" />
            )}
            Confirm {target?.type === 'approve' ? 'Approval' : 'Rejection'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
