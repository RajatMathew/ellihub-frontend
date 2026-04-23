import { Clock } from 'lucide-react';
import { cn } from '@app/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@app/components/ui/avatar';

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  icon?: React.ReactNode;
  avatar?: string;
  color?: string;
}

export interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
}

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  return (
    <div className={cn('relative space-y-0 pb-4', className)}>
      {/* Timeline vertical line */}
      <div className="absolute left-[15px] top-2 bottom-6 w-0.5 bg-border lg:left-[19px]" />

      {items.map((item) => (
        <div key={item.id} className="relative flex gap-4 pb-8 last:pb-0">
          {/* Avatar / Icon container */}
          <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full bg-background ring-4 ring-background lg:size-10">
            {item.avatar ? (
              <Avatar className="size-full">
                <AvatarImage src={item.avatar} />
                <AvatarFallback className="text-[10px] font-bold">
                  {item.user.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ) : (
              <div className={cn(
                "flex size-full items-center justify-center rounded-full border",
                item.color || "border-muted-foreground/20 bg-muted/30"
              )}>
                {item.icon || <Clock className="size-3.5 text-muted-foreground lg:size-4" />}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pt-1 lg:pt-2">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold text-foreground leading-none">
                  {item.user}
                </span>
                <span className="text-[11px] font-medium text-muted-foreground shrink-0 uppercase tracking-tight">
                  {item.timestamp}
                </span>
              </div>
              <p className="text-[13px] text-muted-foreground/90 leading-relaxed font-medium">
                {item.action}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
