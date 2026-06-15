import { CardTable } from '@/app/components/ui/card';
import { Table, TableBody } from '@/app/components/ui/table';
import { ScheduleTrackerEmptyRow } from '@/modules/project/components/overview/schedule-tracker-empty-row';
import { ScheduleTrackerFormRow } from '@/modules/project/components/overview/schedule-tracker-form-row';
import { ScheduleTrackerLoading } from '@/modules/project/components/overview/schedule-tracker-loading';
import { ScheduleTrackerReadRow } from '@/modules/project/components/overview/schedule-tracker-read-row';
import { ScheduleTrackerTableHeader } from '@/modules/project/components/overview/schedule-tracker-table-header';
import type {
  ScheduleTrackerDraft,
  ScheduleTrackerEditingEntry,
  ScheduleTrackerPrimeChangeOrderOption,
  ScheduleTrackerUploadTarget,
} from '@/modules/project/components/overview/schedule-tracker-types';
import type {
  ProjectScheduleEntry,
  ScheduleFile,
} from '@/modules/project/schemas/project-schedule.schema';

interface ScheduleTrackerEntryTableProps {
  entries: ProjectScheduleEntry[];
  isLoading: boolean;
  isAdding: boolean;
  editingEntry: ScheduleTrackerEditingEntry | null;
  newEntry: ScheduleTrackerDraft;
  parentFolderId?: string;
  primeChangeOrderOptions: ScheduleTrackerPrimeChangeOrderOption[];
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isLoadingPrimeChangeOrders: boolean;
  isReadOnly?: boolean;
  onAttach: (target: Exclude<ScheduleTrackerUploadTarget, null>) => void;
  onCancelAdd: () => void;
  onCancelEdit: () => void;
  onChangeAdd: (draft: ScheduleTrackerDraft) => void;
  onChangeEdit: (entryId: string, draft: ScheduleTrackerDraft) => void;
  onDelete: (entryId: string) => void;
  onEdit: (entry: ProjectScheduleEntry) => void;
  onPreview: (file: ScheduleFile) => void;
  onSaveAdd: () => void;
  onSaveEdit: () => void;
}

export function ScheduleTrackerEntryTable({
  entries,
  isLoading,
  isAdding,
  editingEntry,
  newEntry,
  parentFolderId,
  primeChangeOrderOptions,
  isCreating,
  isUpdating,
  isDeleting,
  isLoadingPrimeChangeOrders,
  isReadOnly = false,
  onAttach,
  onCancelAdd,
  onCancelEdit,
  onChangeAdd,
  onChangeEdit,
  onDelete,
  onEdit,
  onPreview,
  onSaveAdd,
  onSaveEdit,
}: ScheduleTrackerEntryTableProps) {
  if (isLoading) {
    return (
      <CardTable>
        <ScheduleTrackerLoading />
      </CardTable>
    );
  }

  return (
    <CardTable>
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <ScheduleTrackerTableHeader />
          <TableBody>
            {entries.map((entry) =>
              editingEntry?.id === entry.id ? (
                <ScheduleTrackerFormRow
                  key={entry.id}
                  draft={editingEntry.draft}
                  isSaving={isUpdating}
                  parentFolderId={parentFolderId}
                  primeChangeOrderOptions={primeChangeOrderOptions}
                  isLoadingPrimeChangeOrders={isLoadingPrimeChangeOrders}
                  onAttach={() => onAttach('edit')}
                  onCancel={onCancelEdit}
                  onChange={(draft) => onChangeEdit(entry.id, draft)}
                  onSave={onSaveEdit}
                />
              ) : (
                <ScheduleTrackerReadRow
                  key={entry.id}
                  entry={entry}
                  isDeleting={isDeleting}
                  isReadOnly={isReadOnly}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  onPreview={onPreview}
                />
              )
            )}

            {isAdding && !isReadOnly && (
              <ScheduleTrackerFormRow
                draft={newEntry}
                isSaving={isCreating}
                parentFolderId={parentFolderId}
                primeChangeOrderOptions={primeChangeOrderOptions}
                isLoadingPrimeChangeOrders={isLoadingPrimeChangeOrders}
                onAttach={() => onAttach('add')}
                onCancel={onCancelAdd}
                onChange={onChangeAdd}
                onSave={onSaveAdd}
              />
            )}

            {entries.length === 0 && !isAdding && <ScheduleTrackerEmptyRow />}
          </TableBody>
        </Table>
      </div>
    </CardTable>
  );
}
