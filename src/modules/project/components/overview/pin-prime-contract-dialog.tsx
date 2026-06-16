import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { FileText } from 'lucide-react';

interface PinPrimeContractDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidates: FileItem[];
  isLoading?: boolean;
  isSubmitting?: boolean;
  onPin: (fileIds: string[]) => void;
}

function getFileName(file: FileItem) {
  return file.displayName || file.name || 'Untitled document';
}

export function PinPrimeContractDialog({
  open,
  onOpenChange,
  candidates,
  isLoading = false,
  isSubmitting = false,
  onPin,
}: PinPrimeContractDialogProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const toggleFile = (fileId: string, checked: boolean) => {
    setSelectedIds((current) =>
      checked ? [...current, fileId] : current.filter((id) => id !== fileId)
    );
  };

  const handlePin = () => {
    if (selectedIds.length === 0) return;
    onPin(selectedIds);
    setSelectedIds([]);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (isSubmitting) return;
    if (!nextOpen) setSelectedIds([]);
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Pin Prime Contracts</DialogTitle>
          <DialogDescription>
            Select documents from this project's Prime Contract folder to show on the overview.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-80 overflow-y-auto rounded-md border">
          {isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Loading documents...</div>
          ) : candidates.length > 0 ? (
            <div className="divide-y">
              {candidates.map((file) => {
                const checked = selectedIds.includes(file.id);

                return (
                  <label
                    key={file.id}
                    className="flex cursor-pointer items-center gap-3 p-3 hover:bg-muted/50"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleFile(file.id, value === true)}
                    />
                    <FileText className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {getFileName(file)}
                    </span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-sm text-muted-foreground">
              No unpinned Prime Contract files are available.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={handlePin}
            disabled={isSubmitting || selectedIds.length === 0 || candidates.length === 0}
          >
            {isSubmitting ? 'Pinning...' : `Pin ${selectedIds.length || ''}`.trim()}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
