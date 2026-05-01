import { useState } from 'react';

import { Plus } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Card, CardHeader, CardTitle, CardToolbar } from '@/app/components/ui/card';
import { UploadFileDialog } from '@/modules/files/components/upload-file-dialog';
import { useDownloadFile, useUploadFileMutation } from '@/modules/files/hooks/files.hooks';
import type { FileUploadInput } from '@/modules/files/schemas/file.schema';
import { ScheduleTrackerContractDates } from '@/modules/project/components/overview/schedule-tracker-contract-dates';
import { ScheduleTrackerEntryTable } from '@/modules/project/components/overview/schedule-tracker-entry-table';
import {
  createEmptyScheduleTrackerDraft,
  createScheduleTrackerDraftFromEntry,
  type ScheduleTrackerEditingEntry,
  type ScheduleTrackerUploadTarget,
} from '@/modules/project/components/overview/schedule-tracker-types';
import {
  useCreateScheduleEntryMutation,
  useDeleteScheduleEntryMutation,
  useUpdateScheduleEntryMutation,
} from '@/modules/project/hooks';
import type { PrimeContract } from '@/modules/project/schemas/project-contract.schema';
import type { ProjectScheduleEntry } from '@/modules/project/schemas/project-schedule.schema';

interface ScheduleTrackerCardProps {
  projectId: string;
  contract: PrimeContract | undefined;
  entries: ProjectScheduleEntry[];
  isLoading: boolean;
  parentFolderId?: string;
}

export function ScheduleTrackerCard({
  projectId,
  contract,
  entries,
  isLoading,
  parentFolderId,
}: ScheduleTrackerCardProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [newEntry, setNewEntry] = useState(createEmptyScheduleTrackerDraft);
  const [editingEntry, setEditingEntry] = useState<ScheduleTrackerEditingEntry | null>(null);
  const [uploadTarget, setUploadTarget] = useState<ScheduleTrackerUploadTarget>(null);

  const createMutation = useCreateScheduleEntryMutation();
  const updateMutation = useUpdateScheduleEntryMutation();
  const deleteMutation = useDeleteScheduleEntryMutation();
  const uploadMutation = useUploadFileMutation();
  const downloadFile = useDownloadFile();

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
          : prev,
      );
    }

    setUploadTarget(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-widest uppercase">
          Schedule Tracker
        </CardTitle>
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
      </CardHeader>

      <ScheduleTrackerContractDates contract={contract} />

      <ScheduleTrackerEntryTable
        entries={entries}
        isLoading={isLoading}
        isAdding={isAdding}
        editingEntry={editingEntry}
        newEntry={newEntry}
        parentFolderId={parentFolderId}
        isCreating={createMutation.isPending}
        isUpdating={updateMutation.isPending}
        isDeleting={deleteMutation.isPending}
        onAttach={setUploadTarget}
        onCancelAdd={resetNewEntry}
        onCancelEdit={() => setEditingEntry(null)}
        onChangeAdd={setNewEntry}
        onChangeEdit={(id, draft) => setEditingEntry({ id, draft })}
        onDelete={(id) => void deleteMutation.mutateAsync({ projectId, id })}
        onDownload={(file) => downloadFile.mutate(file)}
        onEdit={(entry) =>
          setEditingEntry({
            id: entry.id,
            draft: createScheduleTrackerDraftFromEntry(entry),
          })
        }
        onSaveAdd={() => void handleAddEntry()}
        onSaveEdit={() => void handleSaveEdit()}
      />

      {parentFolderId && (
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
    </Card>
  );
}
