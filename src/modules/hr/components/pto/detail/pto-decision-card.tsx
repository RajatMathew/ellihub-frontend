import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
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
    <Card>
      <CardHeader>
        <div className="min-w-0">
          <CardTitle className="text-sm font-semibold">Review Decision</CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Add an internal note before approving or rejecting this request.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 pt-0">
        <Field data-invalid={noteError}>
          <div className="flex items-center justify-between gap-3">
            <FieldLabel>Internal note</FieldLabel>
            {noteError && <span className="text-xs font-medium text-destructive">Required</span>}
          </div>
          <Textarea
            placeholder="Write a short decision note..."
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
              if (event.target.value.trim()) setNoteError(false);
            }}
            className="min-h-24 resize-none text-sm leading-6"
            aria-invalid={noteError}
          />
          {noteError && <FieldError errors={[{ message: 'Internal note is required' }]} />}
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button
            className="h-10"
            variant="primary"
            onClick={() => handleDecision('approve')}
            disabled={isPending}
          >
            <Check className="size-4" />
            Approve
          </Button>
          <Button
            className="h-10"
            variant="destructive"
            onClick={() => handleDecision('reject')}
            disabled={isPending}
          >
            <X className="size-4" />
            Reject
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
