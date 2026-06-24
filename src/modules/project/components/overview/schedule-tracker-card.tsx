import { useMemo, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { useUploadManager } from '@/modules/files/uploads/upload-manager';
import type { FileUploadInput } from '@/modules/files/schemas/file.schema';
import { ScheduleTrackerContractDates } from '@/modules/project/components/overview/schedule-tracker-contract-dates';
import { ScheduleTrackerEntryDialog } from '@/modules/project/components/overview/schedule-tracker-entry-dialog';
import { ScheduleTrackerEntryTable } from '@/modules/project/components/overview/schedule-tracker-entry-table';
import {
  createEmptyScheduleTrackerDraft,
  createScheduleTrackerDraftFromEntry,
  formatSchedulePrimeChangeOrderLabel,
  type ScheduleTrackerEditingEntry,
  type ScheduleTrackerPrimeChangeOrderOption,
  type ScheduleTrackerUploadTarget,
} from '@/modules/project/components/overview/schedule-tracker-types';
import {
  useCreateScheduleEntryMutation,
  useDeleteScheduleEntryMutation,
  usePrimeChangeOrderPickerOptions,
  useUpdateScheduleEntryMutation,
} from '@/modules/project/hooks';
import type { PrimeContract } from '@/modules/project/schemas/project-contract.schema';
import type {
  ProjectScheduleEntry,
  ScheduleFile,
} from '@/modules/project/schemas/project-schedule.schema';
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';

interface ScheduleTrackerCardProps {
  project: ProjectDetail;
  projectId: string;
  contract: PrimeContract | undefined;
  entries: ProjectScheduleEntry[];
  isLoading: boolean;
  parentFolderId?: string;
  canManage?: boolean;
}

export function ScheduleTrackerCard({
  project,
  projectId,
  contract,
  entries,
  isLoading,
  parentFolderId,
  canManage = false,
}: ScheduleTrackerCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState(createEmptyScheduleTrackerDraft);
  const [editingEntry, setEditingEntry] = useState<ScheduleTrackerEditingEntry | null>(null);
  const [uploadTarget, setUploadTarget] = useState<ScheduleTrackerUploadTarget>(null);
  const [isScheduleUploadPending, setIsScheduleUploadPending] = useState(false);
  const [previewFile, setPreviewFile] = useState<FilePreviewItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    description: string | null;
  } | null>(null);
  const [primeChangeOrderSearch, setPrimeChangeOrderSearch] = useState('');
  const isEntrySaveInFlightRef = useRef(false);

  const createMutation = useCreateScheduleEntryMutation();
  const updateMutation = useUpdateScheduleEntryMutation();
  const deleteMutation = useDeleteScheduleEntryMutation();
  const uploadManager = useUploadManager();
  const selectedPrimeChangeOrderOptions = useMemo<ScheduleTrackerPrimeChangeOrderOption[]>(() => {
    const options = new Map<string, string>();

    for (const entry of entries) {
      if (entry.primeChangeOrderId && entry.primeChangeOrder) {
        options.set(
          entry.primeChangeOrderId,
          formatSchedulePrimeChangeOrderLabel(entry.primeChangeOrder)
        );
      }
    }

    return Array.from(options, ([value, label]) => ({ value, label }));
  }, [entries]);
  const primeChangeOrderPicker = usePrimeChangeOrderPickerOptions({
    projectId,
    search: primeChangeOrderSearch,
    selectedOptions: selectedPrimeChangeOrderOptions,
    queryScope: 'schedule-tracker-picker',
  });
  const primeChangeOrderOptions = primeChangeOrderPicker.options;
  const entryDialogMode = editingEntry ? 'edit' : 'add';
  const entryDialogOpen = isAdding || editingEntry !== null;

  const resetNewEntry = () => {
    setNewEntry(createEmptyScheduleTrackerDraft());
    setIsAdding(false);
    setPrimeChangeOrderSearch('');
  };

  const resetEditingEntry = () => {
    setEditingEntry(null);
    setPrimeChangeOrderSearch('');
  };

  const openAddEntryDialog = () => {
    setEditingEntry(null);
    setNewEntry(createEmptyScheduleTrackerDraft());
    setPrimeChangeOrderSearch('');
    setIsAdding(true);
  };

  const handleAddEntry = async () => {
    if (isEntrySaveInFlightRef.current || !newEntry.date || !newEntry.description.trim()) return;

    isEntrySaveInFlightRef.current = true;

    try {
      await createMutation.mutateAsync({
        projectId,
        date: newEntry.date,
        description: newEntry.description.trim(),
        adjustedFinishDate: newEntry.adjustedFinishDate || undefined,
        notes: newEntry.notes || undefined,
        fileId: newEntry.fileId || undefined,
        primeChangeOrderId: newEntry.primeChangeOrderId || undefined,
      });
      resetNewEntry();
    } finally {
      isEntrySaveInFlightRef.current = false;
    }
  };

  const handleSaveEdit = async () => {
    if (
      isEntrySaveInFlightRef.current ||
      !editingEntry ||
      !editingEntry.draft.date ||
      !editingEntry.draft.description.trim()
    ) {
      return;
    }

    isEntrySaveInFlightRef.current = true;

    try {
      await updateMutation.mutateAsync({
        id: editingEntry.id,
        projectId,
        date: editingEntry.draft.date,
        description: editingEntry.draft.description.trim(),
        adjustedFinishDate: editingEntry.draft.adjustedFinishDate || undefined,
        notes: editingEntry.draft.notes || undefined,
        fileId: editingEntry.draft.fileId || undefined,
        primeChangeOrderId: editingEntry.draft.primeChangeOrderId || null,
      });
      resetEditingEntry();
    } finally {
      isEntrySaveInFlightRef.current = false;
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    await deleteMutation.mutateAsync({ projectId, id: deleteTarget.id });
    setDeleteTarget(null);
  };

  const handleUploadSubmit = async (payload: { file: File; data: FileUploadInput }) => {
    setIsScheduleUploadPending(true);

    try {
      const [fileItem] = await uploadManager.enqueueUploadsAndWait([payload], {
        label: 'Schedule attachment',
      });

      if (!fileItem) return;

      if (uploadTarget === 'add') {
        setNewEntry((prev) => ({
          ...prev,
          fileId: fileItem.id,
          fileName: fileItem.name ?? '',
        }));
      }

      if (uploadTarget === 'edit') {
        setEditingEntry((prev) =>
          prev
            ? {
                ...prev,
                draft: {
                  ...prev.draft,
                  fileId: fileItem.id,
                  fileName: fileItem.name ?? '',
                },
              }
            : prev
        );
      }

      setUploadTarget(null);
    } catch {
      // Upload manager shows upload and cancellation errors in the tray.
    } finally {
      setIsScheduleUploadPending(false);
    }
  };

  const handlePreviewFile = (file: ScheduleFile) => {
    if (file.deletedAt) {
      toast.error('This file no longer exists or has been deleted.');
      return;
    }

    setPreviewFile(file);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xs font-semibold tracking-[0.18em] uppercase">
            Schedule Tracker
          </CardTitle>
          {canManage && (
            <CardToolbar>
              <Button
                size="sm"
                variant="outline"
                disabled={entryDialogOpen}
                onClick={openAddEntryDialog}
              >
                <Plus className="size-4" />
                Add Entry
              </Button>
            </CardToolbar>
          )}
        </CardHeader>

        <ScheduleTrackerContractDates project={project} contract={contract} />

        <ScheduleTrackerEntryTable
          entries={entries}
          isLoading={isLoading}
          isDeleting={deleteMutation.isPending}
          isReadOnly={!canManage}
          onDelete={(id) => {
            const entry = entries.find((item) => item.id === id);
            setDeleteTarget({ id, description: entry?.description ?? null });
          }}
          onEdit={(entry) => {
            setIsAdding(false);
            setPrimeChangeOrderSearch('');
            setEditingEntry({
              id: entry.id,
              draft: createScheduleTrackerDraftFromEntry(entry),
            });
          }}
          onPreview={handlePreviewFile}
        />

        {canManage && (
          <ScheduleTrackerEntryDialog
            open={entryDialogOpen}
            mode={entryDialogMode}
            draft={editingEntry?.draft ?? newEntry}
            isSaving={
              entryDialogMode === 'edit' ? updateMutation.isPending : createMutation.isPending
            }
            parentFolderId={parentFolderId}
            primeChangeOrderOptions={primeChangeOrderOptions}
            primeChangeOrderSearch={primeChangeOrderSearch}
            onPrimeChangeOrderSearchChange={setPrimeChangeOrderSearch}
            isPrimeChangeOrderFetchingNextPage={primeChangeOrderPicker.isFetchingNextPage}
            hasMorePrimeChangeOrders={primeChangeOrderPicker.hasNextPage}
            onFetchMorePrimeChangeOrders={primeChangeOrderPicker.fetchNextPage}
            isLoadingPrimeChangeOrders={primeChangeOrderPicker.isLoading}
            onAttach={() => setUploadTarget(entryDialogMode)}
            onCancel={entryDialogMode === 'edit' ? resetEditingEntry : resetNewEntry}
            onChange={(draft) => {
              if (editingEntry) {
                setEditingEntry((current) => (current ? { ...current, draft } : current));
                return;
              }

              setNewEntry(draft);
            }}
            onSave={() => {
              if (entryDialogMode === 'edit') {
                void handleSaveEdit();
                return;
              }

              void handleAddEntry();
            }}
          />
        )}

        {canManage && parentFolderId && (
          <UploadFileDialog
            open={uploadTarget !== null}
            onOpenChange={(open) => {
              if (!open) setUploadTarget(null);
            }}
            parentId={parentFolderId}
            onSubmit={(payload) => void handleUploadSubmit(payload)}
            isSubmitting={isScheduleUploadPending}
          />
        )}

        <FilePreviewDialog
          open={!!previewFile}
          onOpenChange={(open) => {
            if (!open) setPreviewFile(null);
          }}
          file={previewFile}
        />
      </Card>

      <ConfirmDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete Schedule Entry"
        description={
          <>
            Delete <strong>{deleteTarget?.description || 'this schedule entry'}</strong> from the
            tracker?
          </>
        }
        confirmLabel="Delete"
        onConfirm={() => void handleConfirmDelete()}
        variant="destructive"
        isPending={deleteMutation.isPending}
      />
    </>
  );
}
