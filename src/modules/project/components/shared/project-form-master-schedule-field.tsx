import { Button } from '@/app/components/ui/button';
import { FileDropZone } from '@/app/components/ui/file-drop-zone';
import { formatFileSize } from '@/modules/files/constants/files.constants';
import type { ProjectMasterSchedule } from '@/modules/project/schemas/project-master-schedule.schema';
import { FileText, Loader2, X } from 'lucide-react';

interface ProjectFormMasterScheduleFieldProps {
  selectedFile: File | null;
  existingMasterSchedule?: ProjectMasterSchedule | null;
  onSelectFile: (file: File) => void;
  onRemoveSelectedFile: () => void;
  onRemoveExisting?: () => void;
  disabled?: boolean;
  isRemovingExisting?: boolean;
}

function getMasterScheduleName(masterSchedule: ProjectMasterSchedule): string {
  return (
    masterSchedule.file?.displayName ||
    masterSchedule.file?.name ||
    masterSchedule.displayName ||
    masterSchedule.fileName ||
    'Master schedule'
  );
}

function DocumentRow({
  name,
  size,
  label,
  onRemove,
  disabled,
  isRemoving,
}: {
  name: string;
  size?: number | null;
  label: string;
  onRemove?: () => void;
  disabled?: boolean;
  isRemoving?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border bg-card/60 p-2.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <FileText className="size-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-medium text-foreground">{name}</span>
            <span className="rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {label}
            </span>
          </div>
          <span className="text-xs text-muted-foreground">{formatFileSize(size)}</span>
        </div>
      </div>
      {onRemove && (
        <Button
          variant="ghost"
          mode="icon"
          size="sm"
          type="button"
          aria-label={`Remove ${name}`}
          className="self-end sm:self-auto"
          disabled={disabled || isRemoving}
          onClick={onRemove}
        >
          {isRemoving ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-3.5" />}
        </Button>
      )}
    </div>
  );
}

export function ProjectFormMasterScheduleField({
  selectedFile,
  existingMasterSchedule,
  onSelectFile,
  onRemoveSelectedFile,
  onRemoveExisting,
  disabled = false,
  isRemovingExisting = false,
}: ProjectFormMasterScheduleFieldProps) {
  const existingFile = existingMasterSchedule?.file;
  const hasExisting = !!existingMasterSchedule;

  return (
    <div className="space-y-4">
      <div>
        <h3 className="mb-1 text-base font-semibold text-foreground">Master Schedule</h3>
        <p className="text-sm text-muted-foreground">
          Optional project schedule document. Removing it here keeps the file in Project Files.
        </p>
      </div>

      <div className="space-y-2">
        {hasExisting && (
          <DocumentRow
            name={getMasterScheduleName(existingMasterSchedule)}
            size={existingFile?.size ?? existingMasterSchedule.size}
            label="Current"
            onRemove={onRemoveExisting}
            disabled={disabled}
            isRemoving={isRemovingExisting}
          />
        )}
        {selectedFile && (
          <DocumentRow
            name={selectedFile.name}
            size={selectedFile.size}
            label={hasExisting ? 'Replacement' : 'Selected'}
            onRemove={onRemoveSelectedFile}
            disabled={disabled}
          />
        )}
      </div>

      <FileDropZone
        value={null}
        onChange={(file) => {
          if (file) onSelectFile(file);
        }}
        disabled={disabled}
        showSelectedPreview={false}
      />
    </div>
  );
}