---
paths:
  - "**/*.tsx"
  - "**/*.ts"
---

# Routing (React Router v7)

## Architecture

- The global router lives in `src/app/router.tsx` and uses `createBrowserRouter()`.
- Each module exports its routes from `src/modules/{name}/routes/index.tsx` as a `RouteObject[]`.
- The global router imports and spreads all module routes inside the root layout route.

```tsx
// src/app/router.tsx
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [...dashboardRoutes, ...projectRoutes, ...settingsRoutes],
  },
]);
```

## Module route file

```tsx
// src/modules/projects/routes/index.tsx
import type { RouteObject } from "react-router-dom";
import { ProjectsListPage } from "@/modules/projects/pages/ProjectsListPage";
import { ProjectDetailPage } from "@/modules/projects/pages/ProjectDetailPage";

export const projectRoutes: RouteObject[] = [
  { path: "projects", element: <ProjectsListPage /> },
  { path: "projects/:id", element: <ProjectDetailPage /> },
];
```

## Rules

- **All routes MUST be defined in a module's `routes/` directory**, not scattered in pages or components.
- Use the **Data Mode** API (`createBrowserRouter`, `RouteObject`). Do not use `<BrowserRouter>` + `<Routes>`.
- Layout routes use `<Outlet />` from `react-router-dom` to render children.
- Prefer `index: true` for default/home routes rather than `path: ""`.
- Use `useParams()` for path parameters and `useSearchParams()` for query strings.
- Use `<Link>` from `react-router-dom` for navigation, never `window.location` or `<a href>`.
- Lazy load pages with `React.lazy()` when the module is large and not immediately needed.

## Naming

- Route file: `modules/{name}/routes/index.tsx`
- Page file: `modules/{name}/pages/{PageName}Page.tsx`
- Always suffix page components with `Page` (e.g., `DashboardPage`, `ProjectsListPage`).
