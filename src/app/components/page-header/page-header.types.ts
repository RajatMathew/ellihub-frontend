import type { ReactNode } from 'react';

import type { PageTabItem, PageTabValue } from '@/app/components/page-tabs';
import type { StatusTone } from '@/app/components/status-tone';
import type { BadgeProps } from '@/app/components/ui/badge';
import type { LucideIcon } from 'lucide-react';

type BadgeVariant = NonNullable<BadgeProps['variant']>;

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

/**
 * A record's lifecycle state — the one badge carrying a colour *meaning*.
 *
 * Give `options` and the badge becomes an inline editor. Two headers had built
 * that by hand: RFQ's draft/published select and the project stage dropdown.
 */
export interface StatusDef {
  /** Vocabulary key. `StatusBadge` resolves the tone from it. */
  value: string | null | undefined;
  /** Overrides the humanised `value`. */
  label?: string;
  /** Per-module vocabulary additions, forwarded to `StatusBadge`. */
  tones?: Record<string, StatusTone>;
  /** Present ⇒ editable. Omit for a read-only badge. */
  options?: { id: string; label: string }[];
  /** Which option is selected, when the id differs from `value`. */
  selectedId?: string;
  onChange?: (id: string) => void;
  pending?: boolean;
}

/**
 * A qualifier beside the title: a type, a category, a flag.
 *
 * Not the lifecycle state — that is {@link StatusDef}, which is styled
 * differently on purpose.
 */
export interface BadgeDef {
  label: string;
  variant?: BadgeVariant;
  icon?: LucideIcon;
}

/** A link from this record to a related one, e.g. a PO back to its RFQ. */
export interface ReferenceDef {
  label: string;
  to: string;
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

/**
 * The tab strip inside the header bar.
 *
 * Mirrors `PageTabs`: items carrying a `to` navigate, and items carrying a
 * `value` report through `onValueChange`. Both live here so a page never
 * reaches for a second tab mechanism.
 */
export interface PageHeaderTabs {
  items: PageTabItem[];
  ariaLabel: string;
  /** For value-driven tabs — omit when the items navigate. */
  activeValue?: PageTabValue;
  onValueChange?: (value: PageTabValue) => void;
}
