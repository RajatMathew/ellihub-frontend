import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { FeedbackBoardView } from '@/modules/feedback/components/feedback-board-view';
import { FeedbackEntryForm } from '@/modules/feedback/components/feedback-entry-form';
import { RefreshCcw, X } from 'lucide-react';

interface MarkFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogMode = 'board' | 'create';

export function MarkFeedbackDialog({ open, onOpenChange }: MarkFeedbackDialogProps) {
  const [mode, setMode] = useState<DialogMode>('board');
  const [refreshBoard, setRefreshBoard] = useState<(() => void) | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) setMode('board');
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] flex-col overflow-hidden bg-card text-card-foreground sm:max-h-[min(90vh,56rem)] sm:max-w-5xl"
        showCloseButton={false}
      >
        <DialogHeader className="mb-0 border-b pb-4 pe-14 text-start sm:text-start">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 text-start">
              <DialogTitle className="text-start">
                {mode === 'create' ? 'New feedback' : 'Marked feedback'}
              </DialogTitle>
              <DialogDescription className="text-start">
                {mode === 'create'
                  ? 'New feedback is added to the first feedback column.'
                  : 'See where marked feedback currently stands.'}
              </DialogDescription>
            </div>
            <div className="absolute end-5 top-5 flex items-center gap-1">
              {mode === 'board' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => refreshBoard?.()}
                  disabled={!refreshBoard}
                  className="bg-card"
                >
                  <RefreshCcw className="size-4" />
                  Refresh
                </Button>
              )}
              <Button
                type="button"
                variant="ghost"
                mode="icon"
                size="icon"
                aria-label="Close"
                onClick={() => handleOpenChange(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="min-h-0 overflow-y-auto">
          {mode === 'create' ? (
            <FeedbackEntryForm
              onCancel={() => setMode('board')}
              onSubmitted={() => setMode('board')}
            />
          ) : (
            <FeedbackBoardView
              open={open}
              onAddFeedback={() => setMode('create')}
              onRefreshReady={setRefreshBoard}
            />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
