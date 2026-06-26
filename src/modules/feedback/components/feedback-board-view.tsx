import { useEffect } from 'react';

import { QueryErrorState } from '@/app/components/query-error-state';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/app/lib/utils';
import { useFeedbackBoardQuery } from '@/modules/feedback/hooks/use-submit-feedback';
import type { FeedbackBoardColumn } from '@/modules/feedback/schemas/feedback.schema';
import {
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  HelpCircle,
  MessageSquarePlus,
  Plus,
  type LucideIcon,
} from 'lucide-react';

interface FeedbackBoardViewProps {
  open: boolean;
  onAddFeedback: () => void;
  onRefreshReady: (refresh: (() => void) | null) => void;
}

interface ColumnTone {
  icon: LucideIcon;
  headerClassName: string;
  iconClassName: string;
  badgeVariant: 'info' | 'warning' | 'success' | 'outline';
  emptyIconClassName: string;
}

function getColumnTone(column: FeedbackBoardColumn): ColumnTone {
  const key = `${column.id} ${column.status}`.toLowerCase();

  if (key.includes('clarification') || key.includes('ongoing')) {
    return {
      icon: HelpCircle,
      headerClassName: 'bg-warning-soft/60 border-warning-alpha',
      iconClassName: 'bg-warning-soft text-warning-soft-foreground',
      badgeVariant: 'warning',
      emptyIconClassName: 'text-warning-soft-foreground',
    };
  }

  if (key.includes('complete')) {
    return {
      icon: CheckCircle2,
      headerClassName: 'bg-success-soft/60 border-success-alpha',
      iconClassName: 'bg-success-soft text-success-soft-foreground',
      badgeVariant: 'success',
      emptyIconClassName: 'text-success-soft-foreground',
    };
  }

  return {
    icon: MessageSquarePlus,
    headerClassName: 'bg-info-soft/60 border-info-alpha',
    iconClassName: 'bg-info-soft text-info-soft-foreground',
    badgeVariant: 'info',
    emptyIconClassName: 'text-info-soft-foreground',
  };
}

function FeedbackCard({ title, url }: { title: string; url?: string }) {
  const content = (
    <div className="group rounded-md border border-border bg-card p-3 text-sm shadow-xs shadow-black/5 transition-[border-color,box-shadow] hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="line-clamp-2 font-medium leading-5 text-foreground">{title}</p>
        {url && (
          <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </div>
    </div>
  );

  if (!url) return content;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {content}
    </a>
  );
}

function FeedbackColumn({
  column,
  canAdd,
  onAddFeedback,
}: {
  column: FeedbackBoardColumn;
  canAdd: boolean;
  onAddFeedback: () => void;
}) {
  const tone = getColumnTone(column);
  const Icon = tone.icon;

  return (
    <section className="flex min-h-72 flex-col overflow-hidden rounded-md border border-border bg-card shadow-xs shadow-black/5 md:min-h-[32rem]">
      <div
        className={cn('flex items-center justify-between gap-3 border-b p-3', tone.headerClassName)}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className={cn(
              'flex size-8 shrink-0 items-center justify-center rounded-md',
              tone.iconClassName
            )}
          >
            <Icon className="size-4" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold">{column.title}</h3>
            <p className="truncate text-xs text-muted-foreground">{column.status}</p>
          </div>
        </div>
        <Badge variant={tone.badgeVariant} appearance="light" size="sm">
          {column.items.length}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3 md:max-h-[27rem]">
        {canAdd && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onAddFeedback}
            className="w-full"
          >
            <Plus className="size-4" />
            New feedback
          </Button>
        )}

        {column.items.length > 0 ? (
          column.items.map((item) => (
            <FeedbackCard key={item.id} title={item.title} url={item.url} />
          ))
        ) : (
          <div className="flex min-h-52 flex-1 flex-col items-center justify-center rounded-md border border-dashed bg-card p-5 text-center text-xs text-muted-foreground md:min-h-80">
            <CircleDashed className={cn('mb-2 size-6', tone.emptyIconClassName)} />
            <span>No feedback here</span>
          </div>
        )}
      </div>
    </section>
  );
}

function BoardSkeleton() {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-md border bg-card p-3">
          <Skeleton className="mb-4 h-5 w-24" />
          <div className="space-y-2">
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FeedbackBoardView({ open, onAddFeedback, onRefreshReady }: FeedbackBoardViewProps) {
  const boardQuery = useFeedbackBoardQuery(open);

  useEffect(() => {
    onRefreshReady(open ? () => void boardQuery.refetch() : null);

    return () => onRefreshReady(null);
  }, [boardQuery, onRefreshReady, open]);

  if (boardQuery.isLoading) {
    return <BoardSkeleton />;
  }

  if (boardQuery.isError) {
    return (
      <QueryErrorState
        title="Feedback board unavailable"
        description="The board could not be loaded."
        onRetry={() => void boardQuery.refetch()}
      />
    );
  }

  const columns = boardQuery.data?.columns ?? [];

  return (
    <div className="pb-1">
      <div className="grid gap-3 md:grid-cols-3">
        {columns.map((column, index) => (
          <FeedbackColumn
            key={column.id}
            column={column}
            canAdd={index === 0}
            onAddFeedback={onAddFeedback}
          />
        ))}
      </div>
    </div>
  );
}
