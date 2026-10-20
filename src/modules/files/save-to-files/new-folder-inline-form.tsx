import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { useCreateFolderMutation } from '@/modules/files/hooks/files.hooks';
import { getUploadNameError } from '@/modules/files/lib/file-upload-policy';
import type { FileItem } from '@/modules/files/schemas/file.schema';
import { Loader2 } from 'lucide-react';

interface NewFolderInlineFormProps {
  parentId: string;
  /** Fires with the created folder so the picker can navigate into it. */
  onCreated: (folder: FileItem) => void;
  /** Cancel, Escape, or after a successful create. */
  onClose: () => void;
}

/**
 * Inline rather than a nested dialog: stacking another Radix layer inside the
 * mobile drawer breaks focus return and feels broken on touch. The button that
 * opens it lives in the picker's location bar, beside search.
 */
export function NewFolderInlineForm({ parentId, onCreated, onClose }: NewFolderInlineFormProps) {
  const [name, setName] = useState('');
  const createFolder = useCreateFolderMutation();
  const error = name.length > 0 ? getUploadNameError(name, 'Folder name') : null;

  const close = () => {
    setName('');
    onClose();
  };

  const submit = () => {
    if (error || !name.trim() || createFolder.isPending) return;

    createFolder.mutate(
      { name: name.trim(), parentId },
      {
        onSuccess: (folder) => {
          close();
          onCreated(folder);
        },
      }
    );
  };

  return (
    <div className="space-y-2 rounded-md border border-dashed p-3">
      <Label htmlFor="save-to-files-new-folder" className="text-xs text-muted-foreground">
        New folder name
      </Label>
      <Input
        id="save-to-files-new-folder"
        value={name}
        autoFocus
        placeholder="e.g. Submittals"
        aria-invalid={!!error}
        disabled={createFolder.isPending}
        onChange={(event) => setName(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            submit();
          }
          if (event.key === 'Escape') {
            event.preventDefault();
            close();
          }
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={close}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={!name.trim() || !!error || createFolder.isPending}
          onClick={submit}
        >
          {createFolder.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Create
        </Button>
      </div>
    </div>
  );
}
