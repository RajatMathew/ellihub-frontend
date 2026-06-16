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
  fileFolderRenameInputSchema,
  type FileFolderRenameInput,
} from '@/modules/files/schemas/file.schema';
import { zodResolver } from '@hookform/resolvers/zod';
import { Controller, useForm } from 'react-hook-form';

interface RenameDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: { id: string; name?: string | null; displayName?: string | null } | null;
  onSubmit: (data: FileFolderRenameInput) => void;
  isSubmitting: boolean;
}

export function RenameDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  isSubmitting,
}: RenameDialogProps) {
  const { control, handleSubmit, reset } = useForm<FileFolderRenameInput>({
    resolver: zodResolver(fileFolderRenameInputSchema),
    defaultValues: { id: '', name: '' },
  });

  useEffect(() => {
    if (open && item) {
      reset({ id: item.id, name: item.displayName || item.name || '' });
    }
  }, [open, item, reset]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename</DialogTitle>
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
                <FieldLabel htmlFor="rename-input">Name</FieldLabel>
                <Input
                  id="rename-input"
                  {...field}
                  placeholder="Enter new name"
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
              {isSubmitting ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
