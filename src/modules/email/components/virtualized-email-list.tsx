import type { RefObject } from 'react';

import { EmailRowCard, type EmailListItem } from '@/modules/email/components/email-row-card';
import { useVirtualizer } from '@tanstack/react-virtual';

interface VirtualizedEmailListProps {
  emails: EmailListItem[];
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  selectedEmailId?: string;
  onSelectEmail?: (emailId: string) => void;
}

const ESTIMATED_EMAIL_ROW_HEIGHT = 132;

export function VirtualizedEmailList({
  emails,
  scrollContainerRef,
  selectedEmailId,
  onSelectEmail,
}: VirtualizedEmailListProps) {
  // TanStack Virtual owns mutable measurement state; React Compiler must not memoize this hook.
  // eslint-disable-next-line react-hooks/incompatible-library
  const virtualizer = useVirtualizer({
    count: emails.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => ESTIMATED_EMAIL_ROW_HEIGHT,
    getItemKey: (index) => emails[index]?.id ?? index,
    overscan: 6,
  });
  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div
      role="list"
      aria-label="Emails"
      className="relative w-full"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualRows.map((virtualRow) => {
        const email = emails[virtualRow.index];
        if (!email) return null;

        return (
          <div
            key={virtualRow.key}
            ref={virtualizer.measureElement}
            data-index={virtualRow.index}
            role="listitem"
            className="absolute left-0 top-0 w-full"
            style={{ transform: `translateY(${virtualRow.start}px)` }}
          >
            <EmailRowCard
              email={email}
              selected={email.id === selectedEmailId}
              onSelect={() => onSelectEmail?.(email.id)}
            />
          </div>
        );
      })}
    </div>
  );
}
