import { useMemo } from 'react';

import { useAccess } from '@/app/contexts/access-context';

import type { ActionDef, EnabledCondition } from './page-header.types';

export interface ResolvedActions {
  primary: ActionDef[];
  inline: ActionDef[];
  overflow: ActionDef[];
  /** True when nothing survived the capability filter. */
  isEmpty: boolean;
}

/**
 * Filters actions by capability, then splits them by placement.
 *
 * This is the single place the header decides what a user may do, which is why
 * presets take `ActionDef[]` rather than pre-rendered buttons: a page that
 * forgets to gate an action cannot exist.
 */
export function usePageHeaderActions(actions: ActionDef[] | undefined): ResolvedActions {
  const { can } = useAccess();

  return useMemo(() => {
    const isMet = (condition: EnabledCondition) =>
      typeof condition === 'boolean' ? condition : can(condition.resource, condition.action);

    const visible = (actions ?? []).filter((action) => {
      if (action.enabled === undefined) return true;
      return Array.isArray(action.enabled) ? action.enabled.every(isMet) : isMet(action.enabled);
    });

    const primary = visible.filter((action) => action.placement === 'primary');
    const inline = visible.filter((action) => (action.placement ?? 'inline') === 'inline');
    const overflow = visible.filter((action) => action.placement === 'overflow');

    return {
      primary,
      inline,
      overflow,
      isEmpty: visible.length === 0,
    };
  }, [actions, can]);
}
