import type { ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { useIsMobile } from '@/app/hooks/use-mobile';
import { cn } from '@/app/lib/utils';
import { Clock, PanelRightClose } from 'lucide-react';

interface DetailSidebarProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  activityChildren?: ReactNode;
  desktopClassName?: string;
}

export function DetailSidebar({
  open,
  onClose,
  children,
  activityChildren,
  desktopClassName,
}: DetailSidebarProps) {
  const isMobile = useIsMobile();

  if (!open) return null;

  if (isMobile) {
    return (
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            onClose();
          }
        }}
      >
        <SheetContent
          side="right"
          close={false}
          className="w-[min(24rem,calc(100vw-1rem))] max-w-none gap-0 overflow-hidden border-s border-border bg-background p-0 shadow-xl sm:w-96"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Details panel</SheetTitle>
            <SheetDescription>Supplemental details and activity for this record.</SheetDescription>
          </SheetHeader>
          <SheetBody className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-0">
            <DetailSidebarContent onClose={onClose} activityChildren={activityChildren}>
              {children}
            </DetailSidebarContent>
          </SheetBody>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'hidden min-w-0 shrink-0 overflow-hidden lg:sticky lg:top-4 lg:block lg:h-[calc(100dvh-var(--header-height)-2rem)] lg:w-72 lg:overflow-y-auto xl:w-80',
        desktopClassName
      )}
    >
      <DetailSidebarContent onClose={onClose} activityChildren={activityChildren}>
        {children}
      </DetailSidebarContent>
    </aside>
  );
}

interface DetailSidebarContentProps {
  onClose: () => void;
  children: ReactNode;
  activityChildren?: ReactNode;
}

function DetailSidebarContent({ onClose, children, activityChildren }: DetailSidebarContentProps) {
  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col overflow-hidden rounded-xl border border-card-border bg-white p-4 shadow-xs shadow-black/5">
      <Tabs defaultValue="details" className="flex min-h-0 flex-1 flex-col">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <TabsList variant="line">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <Button
            variant="ghost"
            size="sm"
            mode="icon"
            className="size-7"
            onClick={onClose}
            aria-label="Close details panel"
          >
            <PanelRightClose className="size-3.5" />
          </Button>
        </div>

        <TabsContent value="details" className="min-h-0 min-w-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </TabsContent>

        <TabsContent value="activity" className="min-h-0 min-w-0 max-w-full flex-1 overflow-y-auto overflow-x-hidden">
          {activityChildren || (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <Clock className="size-10 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">Activity Log</p>
              <p className="text-xs text-muted-foreground">
                Activity tracking will be available in a future update.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
