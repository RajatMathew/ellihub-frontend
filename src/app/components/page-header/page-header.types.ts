import type { ReactNode } from 'react';

import type { PageTabItem } from '@/app/components/page-tabs';
import type { LucideIcon } from 'lucide-react';

/**
 * A capability the header resolves itself against the access context.
 *
 * Gating lives on the action, not on the page, so a page cannot forget to
 * gate one: an action whose capability is unmet is never rendered.
 */
export interface CapabilityRef {
  resource: string;
  action: string;
}

/**
 * One requirement for showing an action: a boolean for state the caller already
 * knows, or a capability the header resolves itself.
 */
export type EnabledCondition = boolean | CapabilityRef;

/**
 * Where an action sits in the header.
 *
 * - `primary` — the rightmost, filled call to action. At most one per header.
 * - `inline` — an outline button in the action row. The default.
 * - `overflow` — an item in the "…" menu.
 */
export type ActionPlacement = 'primary' | 'inline' | 'overflow';

export interface ActionDef {
  /** Also the accessible name — every action is labelled, icon or not. */
  label: string;
  icon?: LucideIcon;
  /** Router destination. Mutually exclusive with `onClick`. */
  to?: string;
  onClick?: () => void;
  placement?: ActionPlacement;
  /** Renders in the destructive style, and last in the overflow menu. */
  destructive?: boolean;
  disabled?: boolean;
  /** Why the action is disabled. Surfaced as a tooltip, so the block is explained. */
  disabledReason?: string;
  /** Spins the icon while the action is in flight. */
  pending?: boolean;
  /**
   * Visibility. Omit for "always visible".
   *
   * A boolean covers entity-scoped capabilities the server returns per record
   * (`project.capabilities.actions.rfq.create`) and record state. A
   * {@link CapabilityRef} is resolved against the access context by the header
   * itself. An array requires **every** condition — which is how an action gated
   * on both record state and a permission is expressed.
   */
  enabled?: EnabledCondition | EnabledCondition[];
}

/** One `LABEL: value` pair in a detail header's metadata row. */
export interface MetaItem {
  label: string;
  value: ReactNode;
  icon?: LucideIcon;
}

/** The result-set descriptor every list page carries under its title. */
export interface SummaryDef {
  total: number;
  /** True when a search or filter is narrowing the result set. */
  filtered: boolean;
  /** Plural resource name, e.g. `Vendors`. Falls back to a generic total. */
  label?: string;
}

/** The "View Details" side-panel toggle on detail pages. */
export interface PanelDef {
  open: boolean;
  onOpen: () => void;
  /** Defaults to `View Details`. */
  label?: string;
}

export interface PageHeaderTabs {
  items: PageTabItem[];
  ariaLabel: string;
}
