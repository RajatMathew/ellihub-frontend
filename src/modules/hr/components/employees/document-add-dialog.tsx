import { useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldLabel } from '@/app/components/ui/field';
import { FileDropZone } from '@/app/components/ui/file-drop-zone';
import { Input } from '@/app/components/ui/input';
import { useRootFolderQuery } from '@/modules/files/hooks/files.hooks';
import { useUploadManager } from '@/modules/files/uploads/upload-manager-context';
import { useAddEmployeeDocumentMutation } from '@/modules/hr/hooks/employees.hooks';

interface DocumentAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
}

export function DocumentAddDialog({ open, onOpenChange, employeeId }: DocumentAddDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [expiresOn, setExpiresOn] = useState<string>('');

  const { data: rootFolder } = useRootFolderQuery();
  const uploadManager = useUploadManager();
  const linkMutation = useAddEmployeeDocumentMutation();

  const isPending = linkMutation.isPending;

  const handleUpload = () => {
    if (!file || !rootFolder) return;

    const selectedFile = file;
    const selectedExpiresOn = expiresOn || undefined;

    uploadManager.enqueueUpload(
      {
        file: selectedFile,
        data: {
          name: selectedFile.name,
          parentId: rootFolder.id,
          size: selectedFile.size,
          mimeType: selectedFile.type,
        },
      },
      {
        label: 'Employee document',
        onUploaded: async (uploadedFile) => {
          await linkMutation.mutateAsync({
            employeeId,
            fileId: uploadedFile.id,
            expiresOn: selectedExpiresOn,
          });
        },
      }
    );

    onOpenChange(false);
    setFile(null);
    setExpiresOn('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xs font-bold uppercase tracking-widest">
            Attach Document
          </DialogTitle>
          <DialogDescription className="text-xs">
            Upload and link a document to this employee's profile.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <Field>
            <FieldLabel className="text-xs font-bold uppercase tracking-widest">
              Document File
            </FieldLabel>
            <FileDropZone value={file} onChange={setFile} disabled={isPending} />
          </Field>

          <Field>
            <FieldLabel className="text-xs font-bold uppercase tracking-widest">
              Expiry Date (Optional)
            </FieldLabel>
            <Input
              type="date"
              value={expiresOn}
              onChange={(e) => setExpiresOn(e.target.value)}
              disabled={isPending}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button size="sm" onClick={handleUpload} disabled={!file || !rootFolder || isPending}>
            {isPending ? 'Processing...' : 'Link Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
