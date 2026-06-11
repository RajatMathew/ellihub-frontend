import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { SearchableSelect } from '@/app/components/ui/searchable-select';
import { TableCell, TableRow } from '@/app/components/ui/table';
import type {
  ScheduleTrackerDraft,
  ScheduleTrackerPrimeChangeOrderOption,
} from '@/modules/project/components/overview/schedule-tracker-types';
import { Paperclip, X } from 'lucide-react';

interface ScheduleTrackerFormRowProps {
  draft: ScheduleTrackerDraft;
  isSaving: boolean;
  parentFolderId?: string;
  primeChangeOrderOptions: ScheduleTrackerPrimeChangeOrderOption[];
  isLoadingPrimeChangeOrders: boolean;
  onAttach: () => void;
  onCancel: () => void;
  onChange: (draft: ScheduleTrackerDraft) => void;
  onSave: () => void;
}

export function ScheduleTrackerFormRow({
  draft,
  isSaving,
  parentFolderId,
  primeChangeOrderOptions,
  isLoadingPrimeChangeOrders,
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
          onChange={(event) => onChange({ ...draft, description: event.target.value })}
        />
      </TableCell>
      <TableCell>
        <Input
          type="date"
          variant="sm"
          value={draft.adjustedFinishDate}
          onChange={(event) => onChange({ ...draft, adjustedFinishDate: event.target.value })}
        />
      </TableCell>
      <TableCell>
        <div className="flex min-w-64 items-center gap-1.5">
          <SearchableSelect
            options={primeChangeOrderOptions}
            value={draft.primeChangeOrderId || null}
            onValueChange={(value) => {
              const selected = primeChangeOrderOptions.find((option) => option.value === value);
              onChange({
                ...draft,
                primeChangeOrderId: value ?? '',
                primeChangeOrderLabel: selected?.label ?? '',
              });
            }}
            placeholder="Prime CO"
            searchPlaceholder="Search Prime CO..."
            emptyMessage={
              isLoadingPrimeChangeOrders ? 'Loading Prime COs...' : 'No Prime COs found.'
            }
            disabled={isSaving}
            className="min-w-0"
          />
          {draft.primeChangeOrderId && (
            <Button
              variant="ghost"
              mode="icon"
              size="sm"
              type="button"
              aria-label="Clear prime change order"
              disabled={isSaving}
              onClick={() =>
                onChange({
                  ...draft,
                  primeChangeOrderId: '',
                  primeChangeOrderLabel: '',
                })
              }
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
      </TableCell>
      <TableCell>
        {draft.fileName ? (
          <span className="inline-block max-w-full truncate text-xs">{draft.fileName}</span>
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
      <TableCell className="whitespace-nowrap">
        <div className="flex items-center justify-end gap-2">
          <Button variant="primary" size="sm" type="button" onClick={onSave} disabled={!canSave}>
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
