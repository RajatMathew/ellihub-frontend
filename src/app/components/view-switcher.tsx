/**
 * ViewSwitcher — Universe Platform V6.2 view toggle (List | Pipeline | Board…).
 *
 * Visual spec: a pill group with a hairline border. The active view gets a
 * navy chip with cream text; inactive views are dark ink on transparent.
 * Selection persists per `storageKey` so each module remembers the view
 * Peter last used.
 */
import { useEffect, useState } from 'react';

import { cn } from '@/app/lib/utils';

export interface ViewOption<K extends string = string> {
  key: K;
  label: string;
}

export function useViewMode<K extends string>(
  // `storageKey` retained in the signature for call-site compatibility; we
  // intentionally don't persist anymore so every page load returns to the
  // module's original developer default. Users can still flip the view
  // within a session.
  _storageKey: string,
  fallback: K,
): [K, (next: K) => void] {
  const [mode, setMode] = useState<K>(fallback);
  return [mode, setMode];
}

interface ViewSwitcherProps<K extends string> {
  views: ReadonlyArray<ViewOption<K>>;
  active: K;
  onChange: (key: K) => void;
  className?: string;
}

export function ViewSwitcher<K extends string>({
  views,
  active,
  onChange,
  className,
}: ViewSwitcherProps<K>) {
  return (
    <div
      role="tablist"
      aria-label="View"
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-sm border border-[#6b6359]/40 bg-card p-0.5',
        className,
      )}
    >
      {views.map((v) => {
        const isActive = v.key === active;
        return (
          <button
            key={v.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(v.key)}
            className={cn(
              'rounded-[2px] px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors',
              isActive
                ? 'bg-primary text-[#E0A94D]'
                : 'text-foreground/70 hover:text-foreground',
            )}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}
