import { Clock } from 'lucide-react';

import { cn } from '@app/lib/utils';

export interface ActivityItem {
  id: string;
  user: string;
  action: string;
  timestamp: string;
  icon?: React.ReactNode;
}

export interface ActivityFeedProps {
  items: ActivityItem[];
  className?: string;
}

export function ActivityFeed({ items, className }: ActivityFeedProps) {
  return (
    <div className={cn('space-y-5', className)}>
      {items.map((item) => (
        <div key={item.id} className="flex gap-3">
          {/* Icon */}
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-gray-200">
            {item.icon || <Clock className="size-4 text-gray-400" />}
          </div>

          {/* Content */}
          <div className="flex-1 space-y-1">
            {/* User and Date */}
            <div className="flex items-start justify-between gap-2">
              <div className="text-[13px] font-bold text-gray-900">{item.user}</div>
              <div className="text-[12px] text-gray-400">{item.timestamp}</div>
            </div>

            {/* Action Description */}
            <div className="text-[13px] leading-relaxed text-gray-600">{item.action}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
