import { useEffect } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/app/components/ui/field';
import { Input } from '@/app/components/ui/input';
import { onInvalidFormSubmit } from '@/app/lib/form-error-toast';
import {
  folderCreateInputSchema,
  type FolderCreateInput,
} from '@/modules/files/schemas/file.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parentId: string;
  onSubmit: (data: FolderCreateInput) => void;
  isSubmitting: boolean;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  parentId,
  onSubmit,
  isSubmitting,
}: CreateFolderDialogProps) {
  const { control, handleSubmit, reset } = useForm<FolderCreateInput>({
    resolver: zodResolver(folderCreateInputSchema),
    defaultValues: { name: '', parentId },
  });

  useEffect(() => {
    if (open) {
      reset({ name: '', parentId });
    }
  }, [open, parentId, reset]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Folder</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((data) => onSubmit(data), onInvalidFormSubmit)}
          className="space-y-4"
        >
          <Controller
            name="name"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="folder-name">Folder Name</FieldLabel>
                <Input
                  id="folder-name"
                  {...field}
                  placeholder="Enter folder name"
                  autoFocus
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
