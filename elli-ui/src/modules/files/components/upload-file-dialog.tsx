/* eslint-disable react-hooks/set-state-in-effect -- reset() is a dialog lifecycle helper, not external synchronization */

import { useCallback, useEffect, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldLabel } from '@/app/components/ui/field';
import { FileDropZone } from '@/app/components/ui/file-drop-zone';
import { Input } from '@/app/components/ui/input';
import type { FileUploadInput } from '@/modules/files/schemas/file.schema';

interface UploadFileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string;
  onSubmit: (payload: { file: File; data: FileUploadInput }) => void;
  isSubmitting: boolean;
}

export function UploadFileDialog({
  open,
  onOpenChange,
  parentId,
  onSubmit,
  isSubmitting,
}: UploadFileDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState('');

  const reset = () => {
    setSelectedFile(null);
    setCustomName('');
  };

  // Reset state whenever the dialog opens or closes
  useEffect(() => {
    if (open) reset();
  }, [open]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFileChange = useCallback((file: File | null) => {
    setSelectedFile(file);
    if (file) {
      // Pre-fill name from file name (without extension for easy editing)
      const dotIdx = file.name.lastIndexOf('.');
      setCustomName(dotIdx > 0 ? file.name.slice(0, dotIdx) : file.name);
    } else {
      setCustomName('');
    }
  }, []);

  const handleUpload = useCallback(() => {
    if (!selectedFile) return;
    const finalName = customName.trim() || selectedFile.name;
    onSubmit({
      file: selectedFile,
      data: {
        name: finalName,
        parentId,
        mimeType: selectedFile.type || undefined,
        size: selectedFile.size,
      },
    });
  }, [selectedFile, customName, parentId, onSubmit]);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload File</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <FileDropZone value={selectedFile} onChange={handleFileChange} disabled={isSubmitting} />

          {selectedFile && (
            <Field>
              <FieldLabel htmlFor="upload-doc-name">Document Name</FieldLabel>
              <Input
                id="upload-doc-name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Enter document name"
              />
            </Field>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !customName.trim() || isSubmitting}
          >
            {isSubmitting ? 'Uploading...' : 'Upload'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
