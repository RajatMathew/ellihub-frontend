import type { ReactNode } from 'react';

import { ConfirmDialog } from '@/app/components/ui/confirm-dialog';

interface ResourceDeleteDialogProps {
  open: boolean;
  title: string;
  confirmLabel?: string;
  isPending: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  children: ReactNode;
}

export function ResourceDeleteDialog({
  open,
  title,
  confirmLabel = 'Delete',
  isPending,
  onOpenChange,
  onConfirm,
  confirmDisabled = false,
  children,
}: ResourceDeleteDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={<>{children}</>}
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
      variant="destructive"
      isPending={isPending}
      confirmDisabled={confirmDisabled}
    />
  );
}
