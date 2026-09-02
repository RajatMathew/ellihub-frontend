import type { ComponentType, LazyExoticComponent } from 'react';

export type LayoutType = 'app' | 'minimal'; // "app" = header + sidebar; "minimal" = none

export interface BreadcrumbMeta {
  /** Override the humanized path segment. */
  label?: string;
  /** Omit this segment from the trail. */
  hide?: boolean;
  /**
   * Singular name of the record a dynamic child segment stands for, e.g.
   * `Vendor` under `vendors`. Shown while the record's own name is loading, and
   * the source for the `Create X` / `Edit X` document titles.
   */
  entityLabel?: string;
}

export interface RouteDef {
  path: string;
  /** Lazy component or static import */
  component?: ComponentType<unknown> | LazyExoticComponent<ComponentType<unknown>>;
  /** Default: "app" */
  layout?: LayoutType;
  /** For document title and breadcrumb */
  title?: string;
  breadcrumb?: BreadcrumbMeta;
  access?: 'admin' | 'dev' | { resource: string; action: string };
  /** Nested routes (e.g. project children) */
  children?: RouteDef[];
}
