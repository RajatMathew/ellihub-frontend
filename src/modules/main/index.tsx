import { Outlet } from 'react-router-dom';

/**
 * Main (top-level) layout: renders main area routes via Outlet.
 * Used when not inside a project (e.g. /projects, /catalog/*, /directory/*, /hr, /files).
 */
export default function MainLayout() {
  return <Outlet />;
}
