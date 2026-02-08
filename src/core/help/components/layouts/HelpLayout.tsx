// src/pages/help/HelpLayout.tsx
import { NavLink, Outlet } from "react-router-dom";
import { sidebar } from "@core/help/components/sidebar";

export function HelpLayout() {
  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-72 border-r p-4 space-y-1">
        <h2 className="mb-2 text-sm font-semibold text-muted">Help</h2>

        {sidebar.map((item) => (
          <NavLink
            key={item.slug}
            to={item.slug === "index" ? "/help" : `/help/${item.slug}`}
            className={({ isActive }) =>
              `block rounded px-3 py-2 text-sm ${
                isActive ? "bg-muted font-medium" : "hover:bg-muted/50"
              }`
            }
          >
            {item.text}
          </NavLink>
        ))}
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-8">
        <Outlet />
      </main>
    </div>
  );
}
