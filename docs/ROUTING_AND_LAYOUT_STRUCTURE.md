# Routing & Layout — Target Structure

A single, scalable structure for routes, layout, sidebar, and breadcrumbs.

---

## 1. Directory structure

```
src/
├── app/
│   ├── index.tsx                    # App root (unchanged)
│   ├── components/
│   │   ├── layouts/                 # AppLayout, LayoutProvider
│   │   ├── header/
│   │   ├── sidebar/
│   │   └── error/
│   ├── routing/
│   │   ├── index.tsx                # AppRouting (shell: loading bar, header, sidebar, main)
│   │   ├── app-main.tsx             # Content <Routes> — built from route config
│   │   ├── app-sidebar.tsx          # Sidebar <Routes> — uses routing/config/sidebar
│   │   ├── app-header.tsx           # Optional route-specific header from config
│   │   └── config/
│   │       ├── index.ts             # Re-export config + types
│   │       ├── types.ts             # RouteDef, LayoutType, BreadcrumbMeta
│   │       ├── routes.ts            # Single source: route tree (paths, components, meta)
│   │       └── sidebar.ts           # Main + project sidebar menu config (paths match routes)
│   ├── pages/                       # Page components used by route config
│   │   ├── demo/
│   │   ├── projects/
│   │   └── ...
│   ├── providers/
│   ├── hooks/
│   └── ...
├── modules/                         # Domain modules (own routes + pages)
│   ├── files/
│   │   ├── index.tsx                # Entry / router for files/*
│   │   └── routes.ts                # Optional: nested routes for files
│   └── project/
│       ├── index.tsx                # Project layout + <Outlet /> for project/:projectId/*
│       ├── routes.tsx               # Nested route definitions (overview, contracts, ...)
│       ├── sidebar.tsx              # ProjectSidebarConfig (or import from app/routing/config/sidebar)
│       └── pages/
│           ├── overview.tsx
│           ├── contracts.tsx
│           └── ...
└── main.tsx, index.tsx
```

---

## 2. Config types (`app/routing/config/types.ts`)

```ts
import type { ComponentType, LazyExoticComponent } from "react";

export type LayoutType = "app" | "minimal"; // "app" = header + sidebar; "minimal" = none

export interface BreadcrumbMeta {
  label?: string;        // Override path segment for breadcrumb
  hide?: boolean;        // Hide this segment in breadcrumbs
}

export interface RouteDef {
  path: string;
  /** Lazy component or static import */
  component: ComponentType<unknown> | LazyExoticComponent<ComponentType<unknown>>;
  /** Default: "app" */
  layout?: LayoutType;
  /** For document title and breadcrumb */
  title?: string;
  breadcrumb?: BreadcrumbMeta;
  /** Nested routes (e.g. project children) */
  children?: RouteDef[];
}

/** Flattened route for runtime (path, element, layout) — derived from RouteDef tree */
export interface ResolvedRoute {
  path: string;
  fullPath: string;      // e.g. "project/:projectId/overview"
  element: React.ReactNode;
  layout: LayoutType;
  title?: string;
  breadcrumb?: BreadcrumbMeta;
}
```

---

## 3. Route config (`app/routing/config/routes.ts`)

Single source of truth: build the route tree here. Use `lazy()` for code-splitting.

```ts
import { lazy } from "react";
import type { RouteDef } from "./types";

// Lazy pages
const DemoPage = lazy(() => import("@app/pages/demo/page"));
const FutureFeature = lazy(() => import("@app/components/error/future-feature"));
const FilesModule = lazy(() => import("@modules/files"));
const ProjectLayout = lazy(() => import("@modules/project"));
const ProjectOverview = lazy(() => import("@modules/project/pages/overview"));
// ... etc.

export const routeTree: RouteDef[] = [
  {
    path: "/",
    component: () => null, // index handled by redirect
    children: [
      {
        path: "projects",
        component: DemoPage,
        title: "Projects",
      },
      {
        path: "hr/*",
        component: FutureFeature,
        title: "HR",
      },
      {
        path: "files/*",
        component: FilesModule,
        title: "Files",
      },
      {
        path: "project/:projectId",
        component: ProjectLayout,
        title: "Project",
        breadcrumb: { label: "Project" },
        children: [
          { path: "", component: NavigateToOverview }, // redirect to overview
          { path: "overview", component: ProjectOverview, title: "Overview" },
          { path: "contracts", component: ProjectContracts, title: "Prime Contracts" },
          { path: "change-orders", component: ProjectChangeOrders, title: "Prime Change Orders" },
          { path: "rfqs", component: ProjectRfqs, title: "RFQs" },
          { path: "vendors/purchase-orders", component: ProjectPOs, title: "Purchase Orders" },
          { path: "vendors/change-orders", component: ProjectVendorCOs, title: "Change Orders" },
          { path: "vendors/invoices", component: ProjectInvoices, title: "Invoices" },
          { path: "files", component: ProjectFiles, title: "Files" },
        ],
      },
    ],
  },
];
```

You then either:
- **A)** Walk this tree and render `<Route>` / `<Route element={<Outlet />}>` in `app-main.tsx`, or  
- **B)** Flatten it to a list of `ResolvedRoute` and generate routes from that.

---

## 4. Sidebar config (`app/routing/config/sidebar.ts`)

Paths must match the route tree. Use relative paths from current location (e.g. `../projects`, `../overview`).

```ts
import type { MenuConfig } from "@app/config/types";

export const mainSidebarMenu: MenuConfig = [
  { type: "menu", children: [{ title: "Projects", path: "../projects" }] },
  { type: "separator" },
  { type: "group-collapsed", title: "Catalog", children: [...] },
  { type: "separator" },
  { type: "group-collapsed", title: "Directory", children: [...] },
  { type: "separator" },
  {
    type: "menu",
    children: [
      { title: "HR", path: "../hr" },
      { title: "Files", path: "../files" },
    ],
  },
];

export const projectSidebarMenu: MenuConfig = [
  { type: "menu", children: [{ title: "Back to Projects", path: "../../projects", icon: ArrowLeft }] },
  { type: "separator" },
  { type: "custom", render: () => <ProjectSwitcher /> },
  { type: "separator" },
  { type: "menu", children: [{ title: "Overview", path: "../overview" }] },
  { type: "separator" },
  { type: "group-collapsed", title: "GC", children: [...] },
  { type: "group-collapsed", title: "Vendor", children: [...] },
  { type: "menu", children: [{ title: "Files", path: "../files" }] },
];
```

`app-sidebar.tsx` keeps the same nested `<Routes>` (main vs `project/:projectId/*`) but imports `mainSidebarMenu` and `projectSidebarMenu` from here.

---

## 5. How the pieces connect

| Piece | Responsibility | Uses |
|-------|----------------|------|
| **config/types.ts** | RouteDef, LayoutType, BreadcrumbMeta | routes.ts, app-main, breadcrumbs |
| **config/routes.ts** | Single route tree (paths, components, meta) | app-main.tsx (and optionally breadcrumb/helmet) |
| **config/sidebar.ts** | Main + project menu config | app-sidebar.tsx |
| **app-main.tsx** | Renders `<Routes>` from route tree; wraps in Suspense | config/routes.ts |
| **app-sidebar.tsx** | Renders sidebar by path (main vs project) | config/sidebar.ts |
| **app-header.tsx** | Optional: route-specific header component | Can map path → header from config later |
| **Breadcrumbs** | Build list from current path + route meta | Match pathname to route tree; use title/breadcrumb from config |

---

## 6. Implementation order

1. **Add `app/routing/config/types.ts`** — Define `RouteDef`, `LayoutType`, `BreadcrumbMeta`.
2. **Add `app/routing/config/routes.ts`** — Move current routes into a route tree; add `project/:projectId` and children (stub components OK).
3. **Refactor `app-main.tsx`** — Build `<Route>` from `routeTree` (helper: `routeTreeToRoutes(routeTree)` returning JSX).
4. **Add `app/routing/config/sidebar.ts`** — Move main and project menu config from `app-sidebar.tsx` here; keep paths in sync with `routes.ts`.
5. **Update `app-sidebar.tsx`** — Import sidebar config from `config/sidebar.ts`; keep existing `<Routes>` structure.
6. **Remove or replace old `app/routing/config.tsx`** — Delete the unused `routes` array or replace it with re-export from `config/routes.ts`.
7. **Breadcrumbs** — Add a `useRouteMatch(pathname)` (or walk route tree by path) and use `title` / `breadcrumb` from matched route.
8. **Optional** — Route-level layout: in shell, resolve layout from matched route and conditionally render header/sidebar (e.g. only when `layout === "app"`).

---

## 7. Config index (`app/routing/config/index.ts`)

```ts
export * from "./types";
export { routeTree } from "./routes";
export { mainSidebarMenu, projectSidebarMenu } from "./sidebar";
```

This gives you one place to import route and sidebar config and keeps the rest of the app independent of file layout.

---

## 8. Route tree → `<Routes>` (sketch)

Use a small helper that walks the tree and renders `<Route>` / `<Route element={<Outlet />}>` so `app-main.tsx` stays thin:

- **Leaf route:** `<Route path={def.path} element={<def.component />} />`
- **Branch (has children):** `<Route path={def.path} element={<Outlet />}>` with children from `routeTreeToRoutes(def.children)` (child `path` is relative to parent).

Then in `app-main.tsx` wrap in Suspense and add index + catch-all:

```tsx
<Suspense fallback={...} key={location.pathname}>
  <Routes>
    <Route index element={<Navigate to="projects" replace />} />
    {routeTreeToRoutes(routeTree)}
    <Route path="*" element={isDev ? <DebugViteConfig /> : <NotFound />} />
  </Routes>
</Suspense>
```

For `project/:projectId`, the layout component should render `<Outlet />` so nested routes (overview, contracts, …) render inside it.
