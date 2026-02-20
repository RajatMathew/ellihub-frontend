import type { ReactNode } from 'react';

import { Clock, PanelRightClose } from 'lucide-react';

import { Button } from '@app/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@app/components/ui/tabs';

export function DetailSidebar({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="hidden w-80 shrink-0 lg:block">
      <Tabs defaultValue="details">
        <div className="flex items-center justify-between">
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
          >
            <PanelRightClose className="size-3.5" />
          </Button>
        </div>

        <TabsContent value="details">{children}</TabsContent>

        <TabsContent value="activity">
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <Clock className="size-10 text-muted-foreground/40" />
            <p className="text-sm font-medium text-muted-foreground">Activity Log</p>
            <p className="text-xs text-muted-foreground">
              Activity tracking will be available in a future update.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
