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
import { ExternalLink, RefreshCcw, X } from 'lucide-react';

interface MarkFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogMode = 'board' | 'create';

const NOTION_FEEDBACK_BOARD_URL =
  'https://app.notion.com/p/3821073375a78019a93fef44bafe6453?v=3821073375a78065a58a000cd1116f7c';

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
                <>
                  <Button variant="outline" size="sm" className="bg-card" asChild>
                    <a href={NOTION_FEEDBACK_BOARD_URL} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" />
                      Open in Notion
                    </a>
                  </Button>
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
                </>
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
