import { useState, type MouseEvent, type ReactElement, type ReactNode } from 'react';

import {
  SaveToFilesDialog,
  type SaveToFilesDialogProps,
} from '@/modules/files/save-to-files/save-to-files-dialog';
import { Slot as SlotPrimitive } from 'radix-ui';

type TriggerElement = ReactElement<{ onClick?: (event: MouseEvent<HTMLElement>) => void }>;

export interface SaveToFilesTriggerProps extends Omit<
  SaveToFilesDialogProps,
  'open' | 'onOpenChange'
> {
  /**
   * Render the child as the trigger instead of wrapping it in a button — the
   * child keeps its own type, so a Button, Link, DropdownMenuItem or plain div
   * all work as long as it accepts `onClick`.
   */
  asChild?: boolean;
  disabled?: boolean;
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
}

export function SaveToFilesTrigger({
  asChild = false,
  disabled = false,
  children,
  onOpenChange,
  ...dialogProps
}: SaveToFilesTriggerProps) {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };

  const openDialog = (event: MouseEvent<HTMLElement>) => {
    if (disabled) {
      event.preventDefault();
      return;
    }

    handleOpenChange(true);
  };

  const Trigger = asChild ? SlotPrimitive.Slot : 'button';
  const triggerProps = asChild
    ? { onClick: openDialog }
    : { type: 'button' as const, onClick: openDialog, disabled };

  return (
    <>
      <Trigger {...triggerProps}>{children as TriggerElement}</Trigger>
      <SaveToFilesDialog {...dialogProps} open={open} onOpenChange={handleOpenChange} />
    </>
  );
}
