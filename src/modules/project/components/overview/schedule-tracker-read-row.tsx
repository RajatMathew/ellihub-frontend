import { Button } from '@/app/components/ui/button';
import { TableCell, TableRow } from '@/app/components/ui/table';
import { formatDate } from '@/app/lib/helpers';
import { FileTypeIcon } from '@/modules/files/components/file-type-icon';
import { formatSchedulePrimeChangeOrderLabel } from '@/modules/project/components/overview/schedule-tracker-types';
import type {
  ProjectScheduleEntry,
  ScheduleFile,
} from '@/modules/project/schemas/project-schedule.schema';
import { Pencil, Trash2 } from 'lucide-react';

interface ScheduleTrackerReadRowProps {
  entry: ProjectScheduleEntry;
  isDeleting: boolean;
  isReadOnly?: boolean;
  onDelete: (entryId: string) => void;
  onEdit: (entry: ProjectScheduleEntry) => void;
  onPreview: (file: ScheduleFile) => void;
}

export function ScheduleTrackerReadRow({
  entry,
  isDeleting,
  isReadOnly = false,
  onDelete,
  onEdit,
  onPreview,
}: ScheduleTrackerReadRowProps) {
  const file = entry.file;
  const isFileDeleted = !!file?.deletedAt;
  const fileName = file?.displayName || file?.name || 'Document';
  const primeChangeOrderLabel = entry.primeChangeOrder
    ? formatSchedulePrimeChangeOrderLabel(entry.primeChangeOrder)
    : entry.primeChangeOrderId
      ? 'Linked Prime CO'
      : '-';

  return (
    <TableRow
      className={isReadOnly ? undefined : 'cursor-pointer'}
      onClick={() => !isReadOnly && onEdit(entry)}
    >
      <TableCell className="whitespace-nowrap">
        {entry.date ? formatDate(entry.date) : '-'}
      </TableCell>
      <TableCell className="font-medium">{entry.description}</TableCell>
      <TableCell className="whitespace-nowrap">
        {entry.adjustedFinishDate ? formatDate(entry.adjustedFinishDate) : '-'}
      </TableCell>
      <TableCell className="max-w-64">
        <span
          className={
            entry.primeChangeOrderId ? 'line-clamp-2 text-xs font-medium' : 'text-muted-foreground'
          }
          title={primeChangeOrderLabel}
        >
          {primeChangeOrderLabel}
        </span>
      </TableCell>
      <TableCell>
        {file?.id ? (
          <button
            type="button"
            className={`inline-flex max-w-full items-center gap-1.5 text-xs hover:underline ${
              isFileDeleted ? 'text-destructive' : 'text-primary'
            }`}
            aria-label={`Open preview for ${fileName}`}
            title={
              isFileDeleted ? 'This file no longer exists or has been deleted.' : 'Open preview'
            }
            onClick={(event) => {
              event.stopPropagation();
              onPreview(file);
            }}
          >
            <FileTypeIcon
              fileType={file.type ?? 'FILE'}
              mimeType={file.mimeType}
              fileName={fileName}
              className="size-3.5 shrink-0"
            />
            <span className="truncate">{fileName}</span>
          </button>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground">{entry.notes || '-'}</TableCell>
      <TableCell>
        {!isReadOnly && (
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
        )}
      </TableCell>
    </TableRow>
  );
}
