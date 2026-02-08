const demoElement = (
  <div className="p-4 h-screen bg-muted rounded-lg">
    <div className="text-lg font-semibold mb-3">Demo Page</div>
    <p>This is a demo page for testing the layout and routing.</p>
    <p>You can add your content here.</p>
  </div>
);

type RouteConfig = {
  title: string;
  path: string;
  element: React.ReactNode;
  sidebar?: React.ReactNode;
  header?: React.ReactNode;
};

export const routes: RouteConfig[] = [
  {
    title: "Demo",
    path: "demo",
    element: demoElement,
    sidebar: <div>Demo Sidebar</div>,
    header: <div>Demo Header</div>,
  },
  {
    title: "Project",
    path: "project",
    element: <div>Project Page</div>,
    sidebar: <div>Project Sidebar</div>,
    header: <div>Project Header</div>,
  },
  {
    title: "Projects",
    path: "projects",
    element: <div>Projects Page</div>,
    sidebar: <div>Projects Sidebar</div>,
    header: <div>Projects Header</div>,
  },
];
