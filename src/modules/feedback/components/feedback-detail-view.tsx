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
import {
  ArrowLeft,
  CheckSquare2,
  Clock3,
  ExternalLink,
  FileStack,
  List,
  MessageSquareText,
  PanelTop,
  Paperclip,
} from 'lucide-react';

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
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/60">
        <FileTypeIcon
          fileType="FILE"
          mimeType={attachment.type}
          fileName={attachment.name}
          className="size-4"
        />
      </div>
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
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
      </div>

      <section className="rounded-xl border border-border/80 bg-card px-5 py-5 shadow-xs shadow-black/5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/8 text-primary">
                <MessageSquareText className="size-4.5" />
              </div>
              <div className="min-w-0">
                <h2 className="break-words text-xl font-semibold tracking-tight text-foreground">
                  {feedback.title}
                </h2>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
              {feedback.createdAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" />
                  Created {formatDateTime(feedback.createdAt)}
                </span>
              )}
              {feedback.updatedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock3 className="size-3.5" />
                  Updated {formatDateTime(feedback.updatedAt)}
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border/80 bg-card px-5 py-5 shadow-xs shadow-black/5">
        <div className="mb-4 flex items-center gap-3">
          <PanelTop className="size-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Details</h3>
            <p className="text-xs text-muted-foreground">Feedback notes and context</p>
          </div>
        </div>

        {feedback.content.length > 0 ? (
          <div className="space-y-3 rounded-lg border border-border/70 bg-muted/10 px-4 py-4">
            {feedback.content.map((block, index) => (
              <FeedbackDetailBlockView key={block.id} block={block} index={index} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-10 text-center">
            <MessageSquareText className="mx-auto mb-3 size-8 text-muted-foreground/35" />
            <p className="text-sm font-medium text-muted-foreground">No written details</p>
            <p className="mt-1 text-xs text-muted-foreground">
              This feedback was submitted without additional notes.
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-border/80 bg-card px-5 py-5 shadow-xs shadow-black/5">
        <div className="mb-4 flex items-center gap-3">
          <FileStack className="size-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Attachments</h3>
            <p className="text-xs text-muted-foreground">Files added with this feedback</p>
          </div>
        </div>

        {feedback.attachments.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {feedback.attachments.map((attachment) => (
              <AttachmentCard
                key={`${attachment.url}-${attachment.name}`}
                attachment={attachment}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-10 text-center">
            <Paperclip className="mx-auto mb-3 size-8 text-muted-foreground/35" />
            <p className="text-sm font-medium text-muted-foreground">No attachments</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No files were added to this feedback.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
