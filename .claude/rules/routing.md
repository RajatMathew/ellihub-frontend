# Routing (React Router v7)

## Architecture

The app uses **declarative mode** (`<BrowserRouter>` + `<Routes>`), not data mode. There is no `createBrowserRouter` and no `RouteObject[]`.

Routing is three tiers:

1. **Top shell** — `src/index.tsx` mounts `<BrowserRouter>`. Public routes sit at the root, auth routes under `BrandedLayout`, and the whole application under `ProtectedLayout` at `app/*`.
2. **Central registry** — `src/app/routing/config/routes.tsx` exports `routeTree: RouteDef[]`. This is the single place a top-level route is registered.
3. **Module routers** — most `routeTree` entries use a splat path (`'vendors/*'`) and delegate to `src/modules/{name}/routes/{name}.route.tsx`, which renders its own nested `<Routes>`.

`routeTreeToRoutes()` in `src/app/routing/setup/app-main.tsx` walks `routeTree` and emits the `<Route>` elements.

## RouteDef

```ts
// src/app/routing/config/types.ts
interface RouteDef {
  path: string;
  component?: ComponentType<unknown> | LazyExoticComponent<ComponentType<unknown>>;
  layout?: 'app' | 'minimal'; // default "app"
  title?: string; // document title + breadcrumb label
  breadcrumb?: BreadcrumbMeta;
  access?: 'admin' | 'dev' | { resource: string; action: string };
  children?: RouteDef[];
}
```

A child **without** a `component` is not rendered as a route — it exists only to supply a title for a path the module router owns. `formRouteTitles(resourceName)` generates the `create` / `:id/edit` title pair.

## Rules

- **Register every top-level route in `routeTree`.** A route that only exists inside a module router gets no document title, no breadcrumb metadata, and no sidebar entry.
- **When you add a route inside a module router, add a matching title-only child** to that module's `routeTree` entry. Without it the page silently inherits the parent's title.
- Module route files live at `src/modules/{name}/routes/{name}.route.tsx` and export a component rendering `<Routes>`, not a `RouteObject[]`.
- Every module router ends with `<Route path="*" element={<NotFound />} />`.
- Guard with `access` on the `RouteDef` where possible — `AccessRoute` interprets it. Use `PermissionRoute` / `AdminRoute` inline only when the check needs data the route tree cannot express.
- Layout routes use `<Outlet />`.
- Use `useParams()` for path params, `useSearchParams()` for query strings.
- Navigate with `<Link>` / `useNavigate()`, never `window.location` or `<a href>`.
- Lazy load page components with `React.lazy()`.

## Titles and breadcrumbs

- Document titles resolve at runtime via `getTitleForPathname()` (`src/app/routing/config/route-title.ts`), which flattens `routeTree` and regex-matches the pathname. Longest match wins.
- The app is mounted at `ROUTER_BASE_PATH = '/app'`.
- The breadcrumb trail is rendered once, globally, by `HeaderBreadcrumbs` (`src/app/components/header/header-breadcrumbs.tsx`). **Pages must not render their own breadcrumb trail.**
- A page that needs a dynamic crumb label (an entity name, an open folder) registers it with `useBreadcrumbLabel(path, label)` rather than rendering its own trail.

## Naming

- Route file: `src/modules/{name}/routes/{name}.route.tsx`
- Page file: `src/modules/{name}/pages/{page-name}.tsx` (kebab-case)
- Page components are suffixed `Page` (`VendorListPage`, `VendorDetailPage`), except where an existing module has established another convention.
