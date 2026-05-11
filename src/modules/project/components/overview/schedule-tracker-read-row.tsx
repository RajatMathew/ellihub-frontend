import { Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { TableCell, TableRow } from '@/app/components/ui/table';
import { formatDate } from '@/app/lib/helpers';
import type {
  ProjectScheduleEntry,
  ScheduleFile,
} from '@/modules/project/schemas/project-schedule.schema';

interface ScheduleTrackerReadRowProps {
  entry: ProjectScheduleEntry;
  isDeleting: boolean;
  onDelete: (entryId: string) => void;
  onDownload: (file: ScheduleFile) => void;
  onEdit: (entry: ProjectScheduleEntry) => void;
}

export function ScheduleTrackerReadRow({
  entry,
  isDeleting,
  onDelete,
  onDownload,
  onEdit,
}: ScheduleTrackerReadRowProps) {
  const file = entry.file;

  return (
    <TableRow className="cursor-pointer" onClick={() => onEdit(entry)}>
      <TableCell className="whitespace-nowrap">
        {entry.date ? formatDate(entry.date) : '-'}
      </TableCell>
      <TableCell className="font-medium">{entry.description}</TableCell>
      <TableCell className="whitespace-nowrap">
        {entry.adjustedFinishDate ? formatDate(entry.adjustedFinishDate) : '-'}
      </TableCell>
      <TableCell>
        {file?.name ? (
          <button
            type="button"
            className="inline-block max-w-full truncate text-xs text-primary hover:underline"
            title={file.name}
            onClick={(event) => {
              event.stopPropagation();
              onDownload(file);
            }}
          >
            {file.name}
          </button>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{entry.notes || '-'}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            mode="icon"
            size="sm"
            aria-label="Edit schedule entry"
            title="Edit schedule entry"
            onClick={(event) => {
              event.stopPropagation();
              onEdit(entry);
            }}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            mode="icon"
            size="sm"
            aria-label="Delete schedule entry"
            title="Delete schedule entry"
            disabled={isDeleting}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(entry.id);
            }}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
