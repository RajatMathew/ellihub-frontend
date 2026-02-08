import SidebarBuilder from "@app/components/sidebar/sidebar-builder";
import { SidebarSwitcher } from "@app/components/sidebar/sidebar-switcher";
import type { MenuConfig } from "@app/config/types";
import { useProjectNavigation } from "@app/hooks/use-project-hook";
import { ArrowLeft } from "lucide-react";
import { Outlet, Route, Routes } from "react-router-dom";

const MainSidebarConfig = () => {
  const MENU_SIDEBAR: MenuConfig = [
    {
      type: "menu",
      children: [
        {
          title: "Projects",
          path: "../projects",
        },
      ],
    },
    {
      type: "separator",
    },
    {
      type: "group-collapsed",
      title: "Catalog",
      children: [
        {
          title: "Cost Codes",
          path: "../catalog/cost-codes",
        },
      ],
    },
    {
      type: "separator",
    },
    {
      type: "group-collapsed",
      title: "Directory",
      children: [
        {
          title: "Contacts",
          path: "../directory/contacts",
        },
        {
          title: "General Contracts",
          path: "../directory/general-contracts",
        },
        {
          title: "Vendors",
          path: "../directory/vendors",
        },
      ],
    },
    {
      type: "separator",
    },
    {
      type: "menu",
      children: [
        {
          title: "HR",
          path: "../hr",
        },
        {
          title: "Files",
          path: "../files",
        },
      ],
    },
  ];
  return <SidebarBuilder menuConfig={MENU_SIDEBAR} />;
};

const ProjectSwitcher = () => {
  const { changeProject, projectId } = useProjectNavigation();
  return (
    <SidebarSwitcher
      value={projectId}
      onChange={(project) => {
        console.log("ProjectSwitcher onChange", project);
        changeProject(project.id, {
          replace: true,
        });
      }}
    />
  );
};

const ProjectSidebarConfig = () => {
  const PROJECT_MENU: MenuConfig = [
    {
      type: "menu",
      children: [
        {
          title: "Back to Projects",
          path: "../../projects",
          icon: ArrowLeft,
        },
      ],
    },
    {
      type: "separator",
    },
    {
      type: "custom",

      render: () => <ProjectSwitcher />,
    },
    {
      type: "separator",
    },
    {
      type: "menu",
      children: [
        {
          title: "Overview",
          path: "../overview",
        },
      ],
    },
    {
      type: "separator",
    },
    {
      title: "GC",
      type: "group-collapsed",
      children: [
        {
          title: "Prime Contracts",
          path: "../contracts",
        },
        {
          title: "Prime Change Orders",
          path: "../change-orders",
        },
      ],
    },
    {
      type: "separator",
    },
    {
      type: "group-collapsed",
      title: "Vendor",
      children: [
        {
          title: "RFQs",
          path: "../rfqs",
        },
        {
          title: "Purchase Orders",
          path: "../vendors/purchase-orders",
        },
        {
          title: "Change Orders",
          path: "../vendors/change-orders",
        },
        {
          title: "Invoices",
          path: "../vendors/invoices",
        },
      ],
    },
    {
      type: "separator",
    },
    {
      type: "menu",
      children: [
        {
          title: "Files",
          path: "../files",
        },
      ],
    },
  ];
  return <SidebarBuilder menuConfig={PROJECT_MENU} />;
};

export function SidebarRoutingSetup() {
  return (
    <Routes>
      <Route
        path="project/:projectId/*"
        element={
          <>
            <Outlet />
          </>
        }
      >
        <Route path="*" element={<ProjectSidebarConfig />} />
      </Route>
      <Route index path="/*" element={<MainSidebarConfig />} />
    </Routes>
  );
}
