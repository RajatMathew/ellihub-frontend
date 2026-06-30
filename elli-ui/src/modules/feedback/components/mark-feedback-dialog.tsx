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
import { FeedbackDetailView } from '@/modules/feedback/components/feedback-detail-view';
import { FeedbackEntryForm } from '@/modules/feedback/components/feedback-entry-form';
import { feedbackKeys } from '@/modules/feedback/constants/feedback.keys';
import { useQueryClient } from '@tanstack/react-query';
import { ExternalLink, RefreshCcw, X } from 'lucide-react';

interface MarkFeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DialogMode = 'board' | 'create';

const NOTION_FEEDBACK_BOARD_URL =
  'https://app.notion.com/p/3821073375a78019a93fef44bafe6453?v=3821073375a78065a58a000cd1116f7c';

export function MarkFeedbackDialog({ open, onOpenChange }: MarkFeedbackDialogProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<DialogMode | 'detail'>('board');
  const [selectedFeedbackId, setSelectedFeedbackId] = useState<string | null>(null);
  const [activeNotionUrl, setActiveNotionUrl] = useState<string | null>(null);

  function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setMode('board');
      setSelectedFeedbackId(null);
      setActiveNotionUrl(null);
    }
  }

  function handleRefresh() {
    void queryClient.refetchQueries({ queryKey: feedbackKeys.board(), type: 'active' });

    if (mode === 'detail' && selectedFeedbackId) {
      void queryClient.refetchQueries({
        queryKey: feedbackKeys.detail(selectedFeedbackId),
        type: 'active',
      });
    }
  }

  const notionUrl = mode === 'board' ? NOTION_FEEDBACK_BOARD_URL : activeNotionUrl;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[calc(100vh-1rem)] w-[calc(100vw-1rem)] flex-col overflow-hidden bg-card text-card-foreground sm:max-h-[min(90vh,56rem)] sm:max-w-5xl"
        showCloseButton={false}
      >
        <DialogHeader className="mb-0 pb-4 pe-14 text-start sm:text-start">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 text-start">
              <DialogTitle className="text-start">
                {mode === 'create'
                  ? 'New feedback'
                  : mode === 'detail'
                    ? 'Feedback details'
                    : 'Feedback board'}
              </DialogTitle>
              <DialogDescription className="mt-1.5 text-start">
                {mode === 'create'
                  ? 'New feedback is added to the first feedback column.'
                  : mode === 'detail'
                    ? 'Review the full feedback without leaving the app.'
                    : 'Track submitted feedback across each stage.'}
              </DialogDescription>
            </div>
            <div className="absolute end-5 top-5 flex items-center gap-1">
              {notionUrl && (
                <>
                  <Button variant="outline" size="sm" className="bg-card" asChild>
                    <a href={notionUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="size-4" />
                      Open in Notion
                    </a>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefresh}
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
          ) : mode === 'detail' ? (
            <FeedbackDetailView
              feedbackId={selectedFeedbackId}
              open={open}
              onBack={() => {
                setMode('board');
                setSelectedFeedbackId(null);
              }}
              onNotionUrlReady={setActiveNotionUrl}
            />
          ) : (
            <FeedbackBoardView
              open={open}
              onAddFeedback={() => setMode('create')}
              onSelectFeedback={(item) => {
                setSelectedFeedbackId(item.id);
                setMode('detail');
                setActiveNotionUrl(item.url ?? null);
              }}
            />
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
