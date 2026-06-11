import type { ReactNode } from 'react';

import { Button } from '@/app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/app/components/ui/tabs';
import { Clock, PanelRightClose } from 'lucide-react';

interface DetailSidebarProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  activityChildren?: ReactNode;
}

export function DetailSidebar({ open, onClose, children, activityChildren }: DetailSidebarProps) {
  if (!open) return null;

  return (
    <div className="w-full min-w-0 shrink-0 overflow-hidden lg:sticky lg:top-4 lg:max-h-screen lg:w-72 lg:overflow-y-auto xl:w-80">
      <Tabs defaultValue="details">
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

        <TabsContent value="details" className="min-w-0 overflow-hidden">
          {children}
        </TabsContent>

        <TabsContent value="activity" className="min-w-0 overflow-hidden">
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
