'use client';

import { createContext, useContext, type ReactNode } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/app/components/ui/drawer';
import { useIsMobile } from '@/app/hooks/use-mobile';
import { cn } from '@/app/lib/utils';

/**
 * Renders a centered Dialog on desktop and a bottom Drawer on mobile while
 * exposing a single API. Both branches keep Radix/vaul focus management, so
 * every consumer still gets focus trapping, Escape-to-close and a real title.
 */

interface ResponsiveDialogContextValue {
  isMobile: boolean;
}

const ResponsiveDialogContext = createContext<ResponsiveDialogContextValue | null>(null);

function useResponsiveDialogContext(): ResponsiveDialogContextValue {
  const context = useContext(ResponsiveDialogContext);

  if (!context) {
    throw new Error('ResponsiveDialog parts must be used inside <ResponsiveDialog>');
  }

  return context;
}

interface ResponsiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}

export function ResponsiveDialog({ open, onOpenChange, children }: ResponsiveDialogProps) {
  const isMobile = useIsMobile();

  return (
    <ResponsiveDialogContext.Provider value={{ isMobile }}>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          {children}
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      )}
    </ResponsiveDialogContext.Provider>
  );
}

interface ResponsiveDialogContentProps {
  children: ReactNode;
  /** Applied on the desktop dialog surface. */
  className?: string;
  /** Applied on the mobile drawer surface. */
  drawerClassName?: string;
}

export function ResponsiveDialogContent({
  children,
  className,
  drawerClassName,
}: ResponsiveDialogContentProps) {
  const { isMobile } = useResponsiveDialogContext();

  if (isMobile) {
    return (
      <DrawerContent className={cn('max-h-[88vh] min-h-0', drawerClassName)}>
        {children}
      </DrawerContent>
    );
  }

  return (
    <DialogContent
      className={cn('flex max-h-[85vh] w-[calc(100vw-2rem)] flex-col sm:max-w-lg', className)}
    >
      {children}
    </DialogContent>
  );
}

interface ResponsiveDialogSectionProps {
  children: ReactNode;
  className?: string;
}

export function ResponsiveDialogHeader({ children, className }: ResponsiveDialogSectionProps) {
  const { isMobile } = useResponsiveDialogContext();
  const Header = isMobile ? DrawerHeader : DialogHeader;

  return (
    <Header className={cn('shrink-0 text-start', isMobile && 'pb-2', className)}>{children}</Header>
  );
}

export function ResponsiveDialogTitle({ children, className }: ResponsiveDialogSectionProps) {
  const { isMobile } = useResponsiveDialogContext();
  const Title = isMobile ? DrawerTitle : DialogTitle;

  return <Title className={className}>{children}</Title>;
}

export function ResponsiveDialogDescription({ children, className }: ResponsiveDialogSectionProps) {
  const { isMobile } = useResponsiveDialogContext();
  const Description = isMobile ? DrawerDescription : DialogDescription;

  return <Description className={className}>{children}</Description>;
}

/** Scrollable middle region. Keeps the header and footer pinned in both modes. */
export function ResponsiveDialogBody({ children, className }: ResponsiveDialogSectionProps) {
  const { isMobile } = useResponsiveDialogContext();

  return (
    <div className={cn('min-h-0 flex-1 overflow-y-auto', isMobile && 'px-4', className)}>
      {children}
    </div>
  );
}

export function ResponsiveDialogFooter({ children, className }: ResponsiveDialogSectionProps) {
  const { isMobile } = useResponsiveDialogContext();
  const Footer = isMobile ? DrawerFooter : DialogFooter;

  return <Footer className={cn('shrink-0', className)}>{children}</Footer>;
}
