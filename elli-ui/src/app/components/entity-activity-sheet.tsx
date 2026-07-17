import { ActivityPanel } from '@/app/components/activity-panel';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/app/components/ui/sheet';
import { useActivityPanelItems } from '@/app/hooks/use-activity-log';

interface EntityActivitySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  entityId: string | undefined;
  entityName?: string;
  title?: string;
  description?: string;
  emptyMessage?: string;
}

export function EntityActivitySheet({
  open,
  onOpenChange,
  entityType,
  entityId,
  entityName,
  title = 'Activity',
  description,
  emptyMessage = 'No activity recorded yet.',
}: EntityActivitySheetProps) {
  const activity = useActivityPanelItems(entityType, entityId, {
    entityName,
    enabled: open,
    size: 75,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        close
        className="w-[min(30rem,calc(100vw-1rem))] max-w-none gap-0 overflow-hidden border-s border-border bg-background p-0 shadow-xl sm:w-[30rem]"
      >
        <SheetHeader className="border-b border-border px-5 py-4 pe-12 text-start">
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <SheetBody className="min-h-0 flex-1 overflow-y-auto p-0">
          <ActivityPanel
            items={activity.items}
            isLoading={activity.isLoading}
            isError={activity.isError}
            onRetry={() => void activity.refetch()}
            emptyMessage={emptyMessage}
            {...activity.commentControls}
          />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
