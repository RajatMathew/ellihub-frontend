import { useState } from 'react';

import { ListPageHeader } from '@/app/components/page-header';
import { FeedbackBoardView } from '@/modules/feedback/components/feedback-board-view';
import { FeedbackDetailView } from '@/modules/feedback/components/feedback-detail-view';
import { FeedbackEntryForm } from '@/modules/feedback/components/feedback-entry-form';

/**
 * Everything that has been sent in, on a page of its own.
 *
 * The board already existed but only inside the header's dialog, which meant
 * reading past feedback required opening the form for writing it and then not
 * writing any. A page is where you go to look at something.
 *
 * The three views are the dialog's, unchanged — a second board that drifts
 * from the first is worse than no page at all.
 */
export function FeedbackListPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);

  return (
    <>
      <ListPageHeader
        title="Feedback"
        actions={[
          {
            label: 'Add feedback',
            onClick: () => {
              setSelectedId(null);
              setComposing(true);
            },
          },
        ]}
      />

      {composing ? (
        <FeedbackEntryForm
          onCancel={() => setComposing(false)}
          onSubmitted={() => setComposing(false)}
        />
      ) : selectedId ? (
        <FeedbackDetailView
          feedbackId={selectedId}
          open
          onBack={() => setSelectedId(null)}
          onNotionUrlReady={() => undefined}
        />
      ) : (
        <FeedbackBoardView
          open
          onAddFeedback={() => setComposing(true)}
          onSelectFeedback={(item) => setSelectedId(item.id)}
        />
      )}
    </>
  );
}
