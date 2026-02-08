import { Outlet } from "react-router-dom";

/**
 * Project layout: renders nested project routes (overview, contracts, etc.) via Outlet.
 */
export default function ProjectLayout() {
  return <Outlet />;
}
