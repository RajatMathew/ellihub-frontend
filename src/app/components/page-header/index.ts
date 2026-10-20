/**
 * The page-header system.
 *
 * Modules import from here and nowhere else. Reaching for the `Toolbar`
 * primitives directly is what produced ten hand-rolled detail headers, so the
 * primitives are treated as internal to this directory.
 *
 * Pick a preset:
 * - `ListPageHeader`   — a page listing records
 * - `DetailPageHeader` — a single record
 * - `FormPageHeader`   — a create or edit form, inside `FormPageShell`
 *
 * Drop to `PageHeader` only for a header no preset describes.
 */
export { DetailPageHeader, type DetailPageHeaderProps } from './detail-page-header';
export { DetailTitleRow } from './detail-title-row';
export { FormPageHeader, type FormPageHeaderProps } from './form-page-header';
export { formatSummary } from './format-summary';
export { ListPageHeader, type ListPageHeaderProps } from './list-page-header';
export { PageHeader, type PageHeaderProps } from './page-header';
export { PageHeaderSkeleton, type PageHeaderSkeletonProps } from './page-header-skeleton';
export type {
  ActionDef,
  BadgeDef,
  ActionPlacement,
  CapabilityRef,
  EnabledCondition,
  MetaItem,
  PageHeaderTabs,
  PanelDef,
  ReferenceDef,
  StatusDef,
  SummaryDef,
} from './page-header.types';
