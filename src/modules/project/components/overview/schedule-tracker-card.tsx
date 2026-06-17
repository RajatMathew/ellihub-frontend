import { useMemo, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import {
  FilePreviewDialog,
  type FilePreviewItem,
} from '@/modules/files/components/file-preview-dialog';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { useUploadFileMutation } from '@/modules/files/hooks/files.hooks';
import type { FileUploadInput } from '@/modules/files/schemas/file.schema';
import { ScheduleTrackerContractDates } from '@/modules/project/components/overview/schedule-tracker-contract-dates';
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
  usePrimeChangeOrdersQuery,
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
  const [previewFile, setPreviewFile] = useState<FilePreviewItem | null>(null);

  const createMutation = useCreateScheduleEntryMutation();
  const updateMutation = useUpdateScheduleEntryMutation();
  const deleteMutation = useDeleteScheduleEntryMutation();
  const uploadMutation = useUploadFileMutation();
  const primeChangeOrdersQuery = usePrimeChangeOrdersQuery({
    projectId,
    page: 1,
    size: 100,
  });

  const primeChangeOrderOptions = useMemo<ScheduleTrackerPrimeChangeOrderOption[]>(() => {
    const options = new Map<string, string>();

    for (const primeChangeOrder of primeChangeOrdersQuery.data?.data ?? []) {
      options.set(primeChangeOrder.id, formatSchedulePrimeChangeOrderLabel(primeChangeOrder));
    }

    for (const entry of entries) {
      if (entry.primeChangeOrderId && entry.primeChangeOrder) {
        options.set(
          entry.primeChangeOrderId,
          formatSchedulePrimeChangeOrderLabel(entry.primeChangeOrder)
        );
      }
    }

    return Array.from(options, ([value, label]) => ({ value, label }));
  }, [entries, primeChangeOrdersQuery.data?.data]);

  const resetNewEntry = () => {
    setNewEntry(createEmptyScheduleTrackerDraft());
    setIsAdding(false);
  };

  const handleAddEntry = async () => {
    if (!newEntry.date || !newEntry.description) return;

    await createMutation.mutateAsync({
      projectId,
      date: newEntry.date,
      description: newEntry.description,
      adjustedFinishDate: newEntry.adjustedFinishDate || undefined,
      notes: newEntry.notes || undefined,
      fileId: newEntry.fileId || undefined,
      primeChangeOrderId: newEntry.primeChangeOrderId || undefined,
    });
    resetNewEntry();
  };

  const handleSaveEdit = async () => {
    if (!editingEntry) return;

    await updateMutation.mutateAsync({
      id: editingEntry.id,
      projectId,
      date: editingEntry.draft.date || undefined,
      description: editingEntry.draft.description || undefined,
      adjustedFinishDate: editingEntry.draft.adjustedFinishDate || undefined,
      notes: editingEntry.draft.notes || undefined,
      fileId: editingEntry.draft.fileId || undefined,
      primeChangeOrderId: editingEntry.draft.primeChangeOrderId || null,
    });
    setEditingEntry(null);
  };

  const handleUploadSubmit = async (payload: { file: File; data: FileUploadInput }) => {
    const fileItem = await uploadMutation.mutateAsync(payload);

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
  };

  const handlePreviewFile = (file: ScheduleFile) => {
    if (file.deletedAt) {
      toast.error('This file no longer exists or has been deleted.');
      return;
    }

    setPreviewFile(file);
  };

  return (
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
              disabled={isAdding}
              onClick={() => setIsAdding(true)}
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
        isAdding={isAdding}
        editingEntry={editingEntry}
        newEntry={newEntry}
        parentFolderId={parentFolderId}
        primeChangeOrderOptions={primeChangeOrderOptions}
        isCreating={createMutation.isPending}
        isUpdating={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        isLoadingPrimeChangeOrders={primeChangeOrdersQuery.isLoading}
        isReadOnly={!canManage}
        onAttach={setUploadTarget}
        onCancelAdd={resetNewEntry}
        onCancelEdit={() => setEditingEntry(null)}
        onChangeAdd={setNewEntry}
        onChangeEdit={(id, draft) => setEditingEntry({ id, draft })}
        onDelete={(id) => void deleteMutation.mutateAsync({ projectId, id })}
        onEdit={(entry) =>
          setEditingEntry({
            id: entry.id,
            draft: createScheduleTrackerDraftFromEntry(entry),
          })
        }
        onPreview={handlePreviewFile}
        onSaveAdd={() => void handleAddEntry()}
        onSaveEdit={() => void handleSaveEdit()}
      />

      {canManage && parentFolderId && (
        <UploadFileDialog
          open={uploadTarget !== null}
          onOpenChange={(open) => {
            if (!open) setUploadTarget(null);
          }}
          parentId={parentFolderId}
          onSubmit={(payload) => void handleUploadSubmit(payload)}
          isSubmitting={uploadMutation.isPending}
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
  );
}
