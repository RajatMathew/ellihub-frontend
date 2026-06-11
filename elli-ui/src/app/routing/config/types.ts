import type { ComponentType, LazyExoticComponent } from 'react';

export type LayoutType = 'app' | 'minimal'; // "app" = header + sidebar; "minimal" = none

export interface BreadcrumbMeta {
  label?: string; // Override path segment for breadcrumb
  hide?: boolean; // Hide this segment in breadcrumbs
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
