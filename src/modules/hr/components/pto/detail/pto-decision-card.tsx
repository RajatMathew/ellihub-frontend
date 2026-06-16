import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Textarea } from '@/app/components/ui/textarea';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';

interface PTODecisionCardProps {
  isPending: boolean;
  onDecision: (type: 'approve' | 'reject', note: string) => void;
}

export function PTODecisionCard({ isPending, onDecision }: PTODecisionCardProps) {
  const [note, setNote] = useState('');
  const [noteError, setNoteError] = useState(false);

  const handleDecision = (type: 'approve' | 'reject') => {
    if (!note.trim()) {
      setNoteError(true);
      toast.error('Internal note is required for this decision');
      return;
    }

    setNoteError(false);
    onDecision(type, note);
    setNote('');
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            Decision Management
            <span className="font-black text-destructive">*</span>
          </div>
          {noteError && (
            <span className="text-xs font-bold uppercase tracking-widest text-destructive">
              Internal note is required
            </span>
          )}
        </div>

        <Field data-invalid={noteError}>
          <FieldLabel className="sr-only">Decision note</FieldLabel>
          <Textarea
            placeholder="Add an internal note for this decision..."
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              if (event.target.value.trim()) setNoteError(false);
            }}
            className="min-h-24 resize-none bg-background text-sm leading-relaxed"
            aria-invalid={noteError}
          />
          {noteError && <FieldError errors={[{ message: 'Internal note is required' }]} />}
        </Field>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            className="h-11 flex-1 font-bold uppercase tracking-widest"
            variant="primary"
            onClick={() => handleDecision('approve')}
            disabled={isPending}
          >
            <Check className="size-4" />
            Approve Request
          </Button>
          <Button
            className="h-11 flex-1 font-bold uppercase tracking-widest"
            variant="destructive"
            onClick={() => handleDecision('reject')}
            disabled={isPending}
          >
            <X className="size-4" />
            Reject Request
          </Button>
        </div>
      </div>
    </div>
  );
}
