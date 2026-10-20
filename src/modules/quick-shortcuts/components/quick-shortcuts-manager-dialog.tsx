import { useState } from 'react';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Skeleton } from '@/app/components/ui/skeleton';
import type { AccessContextValue } from '@/app/contexts/access-context';
import { getQuickShortcutDestination } from '@/modules/quick-shortcuts/constants/quick-shortcut-destinations';
import {
  useCreateQuickShortcutMutation,
  useDeleteQuickShortcutMutation,
  useQuickShortcutsQuery,
  useReorderQuickShortcutsMutation,
  useUpdateQuickShortcutMutation,
} from '@/modules/quick-shortcuts/hooks/quick-shortcuts.hooks';
import {
  MAX_QUICK_SHORTCUTS,
  type QuickShortcut,
  type QuickShortcutWriteInput,
} from '@/modules/quick-shortcuts/schemas/quick-shortcut.schema';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ExternalLink,
  Link2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import { QuickShortcutForm } from './quick-shortcut-form';

type QuickShortcutsManagerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  access: AccessContextValue;
};

function getDestinationDescription(shortcut: QuickShortcut) {
  if (shortcut.destinationType === 'INTERNAL') {
    return (
      getQuickShortcutDestination(shortcut.internalPath)?.label ??
      shortcut.internalPath ??
      'Unavailable Elli page'
    );
  }

  try {
    return new URL(shortcut.externalUrl ?? '').hostname;
  } catch {
    return shortcut.externalUrl ?? 'Invalid link';
  }
}

export function QuickShortcutsManagerDialog({
  open,
  onOpenChange,
  access,
}: QuickShortcutsManagerDialogProps) {
  const shortcutsQuery = useQuickShortcutsQuery();
  const createMutation = useCreateQuickShortcutMutation();
  const updateMutation = useUpdateQuickShortcutMutation();
  const deleteMutation = useDeleteQuickShortcutMutation();
  const reorderMutation = useReorderQuickShortcutsMutation();
  const [editingShortcut, setEditingShortcut] = useState<QuickShortcut | null | undefined>();
  const [deletingShortcut, setDeletingShortcut] = useState<QuickShortcut | null>(null);

  const shortcuts = shortcutsQuery.data ?? [];
  const isEditing = editingShortcut !== undefined;
  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isListMutationPending = reorderMutation.isPending || deleteMutation.isPending;
  const isAnyMutationPending = isSubmitting || isListMutationPending;

  const handleSubmit = (input: QuickShortcutWriteInput) => {
    if (editingShortcut) {
      updateMutation.mutate(
        { id: editingShortcut.id, input },
        { onSuccess: () => setEditingShortcut(undefined) }
      );
      return;
    }
    createMutation.mutate(input, { onSuccess: () => setEditingShortcut(undefined) });
  };

  const moveShortcut = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= shortcuts.length) return;
    const next = [...shortcuts];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    reorderMutation.mutate(next.map((shortcut) => shortcut.id));
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && isAnyMutationPending) return;
          if (!next) {
            setEditingShortcut(undefined);
            setDeletingShortcut(null);
          }
          onOpenChange(next);
        }}
      >
        <DialogContent className="max-h-dvh max-w-2xl overflow-hidden p-0 sm:max-h-[85dvh]">
          <DialogHeader className="border-b border-border px-6 py-5 pe-14">
            <div className="flex items-start gap-3">
              {isEditing ? (
                <Button
                  type="button"
                  variant="ghost"
                  mode="icon"
                  size="sm"
                  aria-label="Back to shortcuts"
                  disabled={isSubmitting}
                  onClick={() => setEditingShortcut(undefined)}
                >
                  <ArrowLeft />
                </Button>
              ) : null}
              <div className="min-w-0">
                <DialogTitle>
                  {isEditing
                    ? editingShortcut
                      ? 'Edit shortcut'
                      : 'Add shortcut'
                    : 'Quick Shortcuts'}
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {isEditing
                    ? 'Choose where this shared shortcut should take everyone.'
                    : 'Shared sidebar links for everyone using Elli.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <DialogBody className="min-h-0 overflow-y-auto px-6 py-5">
            {isEditing ? (
              <QuickShortcutForm
                key={editingShortcut?.id ?? 'new'}
                shortcut={editingShortcut ?? null}
                access={access}
                isSubmitting={isSubmitting}
                onCancel={() => setEditingShortcut(undefined)}
                onSubmit={handleSubmit}
              />
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    {shortcutsQuery.isLoading
                      ? 'Loading shortcuts...'
                      : shortcutsQuery.isError
                        ? 'Shortcuts unavailable'
                        : `${shortcuts.length} of ${MAX_QUICK_SHORTCUTS} shortcuts`}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setEditingShortcut(null)}
                    disabled={
                      !shortcutsQuery.isSuccess ||
                      shortcuts.length >= MAX_QUICK_SHORTCUTS ||
                      isAnyMutationPending
                    }
                  >
                    <Plus />
                    Add shortcut
                  </Button>
                </div>

                {shortcutsQuery.isLoading ? (
                  <div className="space-y-2" aria-label="Loading shortcuts">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : shortcutsQuery.isError ? (
                  <div className="rounded-md border border-dashed border-border p-6 text-center">
                    <p className="text-sm font-medium">Shortcuts could not be loaded</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Check the connection and try again.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      disabled={shortcutsQuery.isFetching}
                      onClick={() => void shortcutsQuery.refetch()}
                    >
                      {shortcutsQuery.isFetching ? 'Retrying...' : 'Try again'}
                    </Button>
                  </div>
                ) : shortcuts.length === 0 ? (
                  <div className="rounded-md border border-dashed border-border p-8 text-center">
                    <Link2 className="mx-auto size-5 text-muted-foreground" />
                    <p className="mt-3 text-sm font-medium">No shortcuts yet</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Add an Elli page or a useful web link for everyone.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2" aria-label="Shared quick shortcuts">
                    {shortcuts.map((shortcut, index) => {
                      const destination = getQuickShortcutDestination(shortcut.internalPath);
                      const unavailable =
                        shortcut.destinationType === 'INTERNAL' && destination === undefined;
                      return (
                        <li
                          key={shortcut.id}
                          className="flex flex-col gap-3 rounded-md border border-border p-3 sm:flex-row sm:items-center"
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            <span className="mt-0.5 rounded-md bg-muted p-2 text-muted-foreground">
                              {shortcut.destinationType === 'EXTERNAL' ? (
                                <ExternalLink className="size-4" />
                              ) : (
                                <Link2 className="size-4" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-medium">{shortcut.name}</p>
                                {shortcut.openInNewTab ? (
                                  <Badge size="sm" variant="secondary">
                                    New tab
                                  </Badge>
                                ) : null}
                                {unavailable ? (
                                  <Badge size="sm" variant="destructive">
                                    Unavailable
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {getDestinationDescription(shortcut)}
                              </p>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              mode="icon"
                              size="sm"
                              aria-label={`Move ${shortcut.name} up`}
                              disabled={index === 0 || isAnyMutationPending}
                              onClick={() => moveShortcut(index, -1)}
                            >
                              <ArrowUp />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              mode="icon"
                              size="sm"
                              aria-label={`Move ${shortcut.name} down`}
                              disabled={index === shortcuts.length - 1 || isAnyMutationPending}
                              onClick={() => moveShortcut(index, 1)}
                            >
                              <ArrowDown />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              mode="icon"
                              size="sm"
                              aria-label={`Edit ${shortcut.name}`}
                              disabled={isAnyMutationPending}
                              onClick={() => setEditingShortcut(shortcut)}
                            >
                              <Pencil />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              mode="icon"
                              size="sm"
                              aria-label={`Delete ${shortcut.name}`}
                              disabled={isAnyMutationPending}
                              onClick={() => setDeletingShortcut(shortcut)}
                            >
                              <Trash2 />
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deletingShortcut !== null}
        onOpenChange={(next) => {
          if (!next && !deleteMutation.isPending) setDeletingShortcut(null);
        }}
        title="Delete shortcut?"
        description={
          deletingShortcut
            ? `"${deletingShortcut.name}" will be removed from everyone's sidebar.`
            : ''
        }
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        variant="destructive"
        isPending={deleteMutation.isPending}
        keepOpenOnConfirm
        onConfirm={() => {
          if (!deletingShortcut) return;
          deleteMutation.mutate(deletingShortcut.id, {
            onSuccess: () => setDeletingShortcut(null),
          });
        }}
      />
    </>
  );
}
