import { useEffect } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { formatDateTime } from '@/app/lib/helpers';
import { cn } from '@/app/lib/utils';
import { useFeedbackDetailQuery } from '@/modules/feedback/hooks/use-submit-feedback';
import type {
  FeedbackDetailAttachment,
  FeedbackDetailContentBlock,
} from '@/modules/feedback/schemas/feedback.schema';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import { ArrowLeft, CheckSquare2, ExternalLink, List, MessageSquareText } from 'lucide-react';

interface FeedbackDetailViewProps {
  feedbackId: string | null;
  open: boolean;
  onBack: () => void;
  onNotionUrlReady: (url: string | null) => void;
}

function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

function BlockLeadIcon({ type, checked }: { type: string; checked?: boolean }) {
  if (type === 'to_do') {
    return (
      <CheckSquare2
        className={cn(
          'mt-0.5 size-4 shrink-0',
          checked ? 'text-success-soft-foreground' : 'text-muted-foreground'
        )}
      />
    );
  }

  if (type.includes('list_item')) {
    return <List className="mt-1 size-4 shrink-0 text-muted-foreground" />;
  }

  return <MessageSquareText className="mt-1 size-4 shrink-0 text-muted-foreground" />;
}

function FeedbackDetailBlockView({
  block,
  depth = 0,
  index = 0,
}: {
  block: FeedbackDetailContentBlock;
  depth?: number;
  index?: number;
}) {
  const hasChildren = Boolean(block.children?.length);
  const baseSpacing = depth > 0 ? 'mt-2' : '';

  if (block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3') {
    return (
      <div className={cn('space-y-3', baseSpacing)}>
        <h3 className="text-base font-semibold text-foreground">{block.text}</h3>
        {hasChildren && (
          <div className="space-y-3 border-s border-border/70 ps-4">
            {block.children?.map((child, childIndex) => (
              <FeedbackDetailBlockView
                key={child.id}
                block={child}
                depth={depth + 1}
                index={childIndex}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (block.type === 'bulleted_list_item' || block.type === 'numbered_list_item') {
    return (
      <div className={cn('space-y-2', baseSpacing)}>
        <div className="flex items-start gap-3">
          <span className="mt-0.5 text-sm font-semibold text-muted-foreground">
            {block.type === 'numbered_list_item' ? `${index + 1}.` : '•'}
          </span>
          <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {block.text}
          </p>
        </div>
        {hasChildren && (
          <div className="ms-6 space-y-2 border-s border-border/70 ps-4">
            {block.children?.map((child, childIndex) => (
              <FeedbackDetailBlockView
                key={child.id}
                block={child}
                depth={depth + 1}
                index={childIndex}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (block.type === 'to_do') {
    return (
      <div className={cn('space-y-2', baseSpacing)}>
        <div className="flex items-start gap-3 rounded-md border border-border/70 bg-muted/20 px-3 py-2.5">
          <BlockLeadIcon type={block.type} checked={block.checked} />
          <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
            {block.text}
          </p>
        </div>
        {hasChildren && (
          <div className="ms-6 space-y-2 border-s border-border/70 ps-4">
            {block.children?.map((child, childIndex) => (
              <FeedbackDetailBlockView
                key={child.id}
                block={child}
                depth={depth + 1}
                index={childIndex}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (block.type === 'quote' || block.type === 'callout') {
    return (
      <div className={cn('space-y-2', baseSpacing)}>
        <div className="rounded-md border border-border/70 bg-muted/20 px-4 py-3">
          <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{block.text}</p>
        </div>
        {hasChildren && (
          <div className="space-y-2 border-s border-border/70 ps-4">
            {block.children?.map((child, childIndex) => (
              <FeedbackDetailBlockView
                key={child.id}
                block={child}
                depth={depth + 1}
                index={childIndex}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', baseSpacing)}>
      <div className="flex items-start">
        <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm leading-6 text-foreground">
          {block.text}
        </p>
      </div>
      {hasChildren && (
        <div className="space-y-2 border-s border-border/70 ps-4">
          {block.children?.map((child, childIndex) => (
            <FeedbackDetailBlockView
              key={child.id}
              block={child}
              depth={depth + 1}
              index={childIndex}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AttachmentCard({ attachment }: { attachment: FeedbackDetailAttachment }) {
  return (
    <a
      href={attachment.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-start gap-3 rounded-lg border border-border/80 bg-card px-3.5 py-3.5 shadow-xs shadow-black/5 transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-primary/30 hover:shadow-md"
    >
      <FileTypeIcon
        fileType="FILE"
        mimeType={attachment.type}
        fileName={attachment.name}
        className="size-10"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{attachment.name}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {attachment.caption || attachment.type}
        </p>
      </div>
      <ExternalLink className="mt-1 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

export function FeedbackDetailView({
  feedbackId,
  open,
  onBack,
  onNotionUrlReady,
}: FeedbackDetailViewProps) {
  const detailQuery = useFeedbackDetailQuery(feedbackId, open);

  useEffect(() => {
    onNotionUrlReady(detailQuery.data?.url ?? null);

    return () => onNotionUrlReady(null);
  }, [detailQuery.data?.url, onNotionUrlReady]);

  if (detailQuery.isLoading || !feedbackId) {
    return <DetailSkeleton />;
  }

  if (detailQuery.isError) {
    return (
      <QueryErrorState
        title="Feedback detail unavailable"
        description="The selected feedback could not be loaded."
        onRetry={() => void detailQuery.refetch()}
      />
    );
  }

  const feedback = detailQuery.data;
  if (!feedback) {
    return null;
  }

  // Both timestamps are the same until someone edits the page in Notion, and
  // printing an identical date twice under a title says nothing twice.
  const created = feedback.createdAt ? formatDateTime(feedback.createdAt) : null;
  const updated = feedback.updatedAt ? formatDateTime(feedback.updatedAt) : null;
  const showUpdated = Boolean(updated && updated !== created);

  return (
    <div className="max-w-3xl space-y-6">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onBack}
        className="-ms-2 gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back
      </Button>

      {/*
        No card, no icon tile, no panel headings restating themselves —
        "Details / Feedback notes and context" over a box inside a box was
        three frames around one paragraph of prose. A page with one thing on it
        does not need to announce what the thing is.
      */}
      <header className="min-w-0 space-y-1.5">
        <h2 className="break-words text-xl font-semibold tracking-tight text-foreground">
          {feedback.title}
        </h2>
        {created && (
          <p className="text-xs text-muted-foreground">
            {created}
            {showUpdated && ` · edited ${updated}`}
          </p>
        )}
      </header>

      {feedback.content.length > 0 ? (
        <div className="min-w-0 space-y-3">
          {feedback.content.map((block, index) => (
            <FeedbackDetailBlockView key={block.id} block={block} index={index} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No written details.</p>
      )}

      {/* Only when there are some. An empty state for files nobody attached is
          a paragraph explaining that nothing happened. */}
      {feedback.attachments.length > 0 && (
        <section className="min-w-0 space-y-2">
          <h3 className="text-[13px] font-semibold text-foreground">
            {feedback.attachments.length === 1
              ? '1 attachment'
              : `${feedback.attachments.length} attachments`}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {feedback.attachments.map((attachment) => (
              <AttachmentCard
                key={`${attachment.url}-${attachment.name}`}
                attachment={attachment}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
