import { useState, type KeyboardEvent, type ReactNode } from 'react';

import type { ActivityFieldDiffDetails } from '@/app/api/activity-log.api';
import { ActivityChangeDetailsButton } from '@/app/components/activity-change-details-dialog';
import {
  ActivityRevisionBadge,
  stripActivityRevisionSuffix,
} from '@/app/components/activity-revision-badge';
import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Textarea } from '@/app/components/ui/textarea';
import { cn } from '@/app/lib/utils';
import {
  AlertCircle,
  Check,
  History,
  MoreHorizontal,
  Pencil,
  RefreshCcw,
  Send,
  Trash2,
  X,
} from 'lucide-react';

export interface ActivityPanelItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  icon: ReactNode;
  toneClassName: string;
  actionType?: string;
  revision?: number | null;
  details?: ActivityFieldDiffDetails | null;
  note?: string | null;
  editedAt?: string | null;
  canManage?: boolean;
}

export interface ActivityPanelCommentControls {
  canComment?: boolean;
  isCreatingComment?: boolean;
  isUpdatingComment?: boolean;
  isDeletingComment?: boolean;
  onCreateComment?: (note: string) => Promise<unknown> | unknown;
  onUpdateComment?: (commentId: string, note: string) => Promise<unknown> | unknown;
  onDeleteComment?: (commentId: string) => Promise<unknown> | unknown;
}

export interface ActivityPanelProps extends ActivityPanelCommentControls {
  items: ActivityPanelItem[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  emptyMessage?: string;
}

const COMMENT_MAX_LENGTH = 2000;

export function ActivityPanel({
  items,
  isLoading,
  isError,
  onRetry,
  emptyMessage = 'No activity recorded yet.',
  canComment = false,
  isCreatingComment = false,
  isUpdatingComment = false,
  isDeletingComment = false,
  onCreateComment,
  onUpdateComment,
  onDeleteComment,
}: ActivityPanelProps) {
  const [composerOpen, setComposerOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<ActivityPanelItem | null>(null);

  const canSubmitComment = commentText.trim().length > 0 && !isCreatingComment;
  const canSaveEdit = editingText.trim().length > 0 && !isUpdatingComment;

  async function handleCreateComment() {
    const note = commentText.trim();
    if (!note || !onCreateComment) return;

    try {
      await onCreateComment(note);
      setCommentText('');
      setComposerOpen(false);
    } catch {
      // API errors are surfaced by the activity hook.
    }
  }

  async function handleUpdateComment(commentId: string) {
    const note = editingText.trim();
    if (!note || !onUpdateComment) return;

    try {
      await onUpdateComment(commentId, note);
      setEditingId(null);
      setEditingText('');
    } catch {
      // API errors are surfaced by the activity hook.
    }
  }

  async function handleDeleteComment() {
    if (!deleteTarget || !onDeleteComment) return;

    try {
      await onDeleteComment(deleteTarget.id);
      setDeleteTarget(null);
    } catch {
      // API errors are surfaced by the activity hook.
    }
  }

  function handleComposerKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleCreateComment();
    }
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLTextAreaElement>, commentId: string) {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      void handleUpdateComment(commentId);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={'activity-loader-' + index} className="flex gap-3">
            <Skeleton className="size-9 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <AlertCircle className="size-8 text-destructive/70" />
        <p className="text-sm font-medium">Unable to load activity.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCcw className="size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-4 p-4">
      {canComment && onCreateComment && (
        <div className="rounded-md border border-border bg-muted/25 p-3">
          {composerOpen ? (
            <div className="space-y-2">
              <Textarea
                autoFocus
                value={commentText}
                maxLength={COMMENT_MAX_LENGTH}
                placeholder="Leave a comment"
                className="min-h-24 resize-none bg-background"
                onChange={(event) => setCommentText(event.target.value)}
                onKeyDown={handleComposerKeyDown}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-xs text-muted-foreground">
                  {commentText.length}/{COMMENT_MAX_LENGTH}
                </span>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setComposerOpen(false);
                      setCommentText('');
                    }}
                  >
                    <X className="size-3.5" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    disabled={!canSubmitComment}
                    onClick={() => void handleCreateComment()}
                  >
                    <Send className="size-3.5" />
                    {isCreatingComment ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="block w-full rounded-md bg-background px-3 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              onClick={() => setComposerOpen(true)}
            >
              Leave a comment
            </button>
          )}
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <History className="size-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-5">
          {items.map((item, index) => {
            const isComment = item.actionType === 'comment';
            const isEditing = editingId === item.id;
            const showConnector = index < items.length - 1;
            const displayAction = stripActivityRevisionSuffix(item.action, item.revision);

            return (
              <div key={item.id} className="flex min-w-0 gap-3">
                <div className="relative flex shrink-0 flex-col items-center">
                  <div
                    className={cn(
                      'relative z-10 flex size-9 items-center justify-center rounded-full border',
                      item.toneClassName
                    )}
                  >
                    {item.icon}
                  </div>
                  {showConnector ? (
                    <div
                      aria-hidden="true"
                      className="absolute top-9 -bottom-5 left-1/2 w-px -translate-x-1/2 bg-border"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="break-words text-sm font-medium text-foreground">{item.user}</p>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-1.5">
                        <span className="min-w-0 break-words text-sm text-muted-foreground">
                          {displayAction}
                        </span>
                        <ActivityRevisionBadge revision={item.revision} />
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {item.timestamp}
                      </span>
                      {isComment && item.canManage && !isEditing && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              mode="icon"
                              className="size-7"
                              aria-label="Comment actions"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingId(item.id);
                                setEditingText(item.note ?? '');
                              }}
                            >
                              <Pencil className="size-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => setDeleteTarget(item)}
                            >
                              <Trash2 className="size-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>

                  {!isComment && item.details && (
                    <ActivityChangeDetailsButton
                      details={item.details}
                      summary={displayAction}
                      actor={item.user}
                      timestamp={item.timestamp}
                    />
                  )}

                  {isComment && (
                    <div className="mt-2">
                      {isEditing ? (
                        <div className="space-y-2">
                          <Textarea
                            autoFocus
                            value={editingText}
                            maxLength={COMMENT_MAX_LENGTH}
                            className="min-h-24 resize-none bg-background"
                            onChange={(event) => setEditingText(event.target.value)}
                            onKeyDown={(event) => handleEditKeyDown(event, item.id)}
                          />
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <span className="text-xs text-muted-foreground">
                              {editingText.length}/{COMMENT_MAX_LENGTH}
                            </span>
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingId(null);
                                  setEditingText('');
                                }}
                              >
                                <X className="size-3.5" />
                                Cancel
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                disabled={!canSaveEdit}
                                onClick={() => void handleUpdateComment(item.id)}
                              >
                                <Check className="size-3.5" />
                                {isUpdatingComment ? 'Saving...' : 'Save'}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          {item.note && (
                            <div className="whitespace-pre-wrap break-words rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground shadow-xs">
                              {item.note}
                            </div>
                          )}
                          {item.editedAt && (
                            <div className="mt-1 text-xs text-muted-foreground">Edited</div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete comment"
        description="This comment will be removed from the activity timeline."
        confirmLabel="Delete"
        variant="destructive"
        isPending={isDeletingComment}
        onConfirm={() => void handleDeleteComment()}
      />
    </div>
  );
}
