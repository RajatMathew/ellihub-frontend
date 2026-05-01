import { Paperclip } from 'lucide-react';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { TableCell, TableRow } from '@/app/components/ui/table';
import type { ScheduleTrackerDraft } from '@/modules/project/components/overview/schedule-tracker-types';

interface ScheduleTrackerFormRowProps {
  draft: ScheduleTrackerDraft;
  isSaving: boolean;
  parentFolderId?: string;
  onAttach: () => void;
  onCancel: () => void;
  onChange: (draft: ScheduleTrackerDraft) => void;
  onSave: () => void;
}

export function ScheduleTrackerFormRow({
  draft,
  isSaving,
  parentFolderId,
  onAttach,
  onCancel,
  onChange,
  onSave,
}: ScheduleTrackerFormRowProps) {
  const canSave = !!draft.date && !!draft.description && !isSaving;

  return (
    <TableRow>
      <TableCell>
        <Input
          type="date"
          variant="sm"
          value={draft.date}
          onChange={(event) => onChange({ ...draft, date: event.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          variant="sm"
          placeholder="Description"
          value={draft.description}
          onChange={(event) =>
            onChange({ ...draft, description: event.target.value })
          }
        />
      </TableCell>
      <TableCell>
        <Input
          type="date"
          variant="sm"
          value={draft.adjustedFinishDate}
          onChange={(event) =>
            onChange({ ...draft, adjustedFinishDate: event.target.value })
          }
        />
      </TableCell>
      <TableCell>
        {draft.fileName ? (
          <span className="inline-block max-w-full truncate text-xs">
            {draft.fileName}
          </span>
        ) : parentFolderId ? (
          <Button variant="ghost" size="sm" type="button" onClick={onAttach}>
            <Paperclip className="size-3.5" />
            Attach
          </Button>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        )}
      </TableCell>
      <TableCell>
        <Input
          variant="sm"
          placeholder="Notes"
          value={draft.notes}
          onChange={(event) => onChange({ ...draft, notes: event.target.value })}
        />
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          <Button
            variant="primary"
            size="sm"
            type="button"
            onClick={onSave}
            disabled={!canSave}
          >
            Save
          </Button>
          <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
