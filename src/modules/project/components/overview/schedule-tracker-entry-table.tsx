import { CardTable } from '@/app/components/ui/card';
import { Table, TableBody } from '@/app/components/ui/table';
import { ScheduleTrackerEmptyRow } from '@/modules/project/components/overview/schedule-tracker-empty-row';
import { ScheduleTrackerLoading } from '@/modules/project/components/overview/schedule-tracker-loading';
import { ScheduleTrackerReadRow } from '@/modules/project/components/overview/schedule-tracker-read-row';
import { ScheduleTrackerTableHeader } from '@/modules/project/components/overview/schedule-tracker-table-header';
import type {
  ProjectScheduleEntry,
  ScheduleFile,
} from '@/modules/project/schemas/project-schedule.schema';

interface ScheduleTrackerEntryTableProps {
  entries: ProjectScheduleEntry[];
  isLoading: boolean;
  isDeleting: boolean;
  isReadOnly?: boolean;
  onDelete: (entryId: string) => void;
  onEdit: (entry: ProjectScheduleEntry) => void;
  onPreview: (file: ScheduleFile) => void;
}

export function ScheduleTrackerEntryTable({
  entries,
  isLoading,
  isDeleting,
  isReadOnly = false,
  onDelete,
  onEdit,
  onPreview,
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
      <Table className="min-w-[860px]">
        <ScheduleTrackerTableHeader />
        <TableBody>
          {entries.map((entry) => (
            <ScheduleTrackerReadRow
              key={entry.id}
              entry={entry}
              isDeleting={isDeleting}
              isReadOnly={isReadOnly}
              onDelete={onDelete}
              onEdit={onEdit}
              onPreview={onPreview}
            />
          ))}

          {entries.length === 0 && <ScheduleTrackerEmptyRow />}
        </TableBody>
      </Table>
    </CardTable>
  );
}
