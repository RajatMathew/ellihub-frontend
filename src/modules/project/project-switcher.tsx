import { SidebarSwitcher } from "@app/components/sidebar/sidebar-switcher";
import { useProjectNavigation } from "@app/hooks/use-project-hook";

export function ProjectSwitcher() {
  const { changeProject, projectId } = useProjectNavigation();
  return (
    <SidebarSwitcher
      value={projectId}
      onChange={(project) => {
        changeProject(project.id, { replace: true });
      }}
    />
  );
}
