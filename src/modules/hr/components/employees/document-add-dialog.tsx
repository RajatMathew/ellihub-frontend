import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@app/components/ui/dialog';
import { Button } from '@app/components/ui/button';
import { Field, FieldLabel } from '@app/components/ui/field';
import { Input } from '@app/components/ui/input';
import { FileDropZone } from '@app/components/ui/file-drop-zone';
import { useUploadFileMutation, useRootFolderQuery } from '@modules/files/hooks/files.hooks';
import { useAddEmployeeDocumentMutation } from '../../hooks/employees.hooks';

interface DocumentAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
}

export function DocumentAddDialog({
  open,
  onOpenChange,
  employeeId,
}: DocumentAddDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [expiresOn, setExpiresOn] = useState<string>('');
  
  const { data: rootFolder } = useRootFolderQuery();
  const uploadMutation = useUploadFileMutation();
  const linkMutation = useAddEmployeeDocumentMutation();

  const isPending = uploadMutation.isPending || linkMutation.isPending;

  const handleUpload = async () => {
    if (!file || !rootFolder) return;

    try {
      // 1. Upload the file to the root folder
      const uploadedFile = await uploadMutation.mutateAsync({
        file,
        data: {
          name: file.name,
          parentId: rootFolder.id,
          size: file.size,
          mimeType: file.type,
        },
      });

      // 2. Link the uploaded file to the employee
      await linkMutation.mutateAsync({
        employeeId,
        fileId: uploadedFile.id,
        expiresOn: expiresOn || undefined,
      });

      onOpenChange(false);
      setFile(null);
      setExpiresOn('');
    } catch (error) {
      // Errors are handled by mutation callbacks
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
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
            <FieldLabel className="text-[10px] font-bold uppercase tracking-widest">
              Document File
            </FieldLabel>
            <FileDropZone 
              value={file} 
              onChange={setFile} 
              disabled={isPending}
            />
          </Field>

          <Field>
            <FieldLabel className="text-[10px] font-bold uppercase tracking-widest">
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
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            size="sm" 
            onClick={handleUpload} 
            disabled={!file || !rootFolder || isPending}
          >
            {isPending ? 'Processing...' : 'Link Document'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
