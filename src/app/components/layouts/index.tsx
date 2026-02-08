import { Helmet } from "react-helmet-async";
// import { useLocation } from "react-router-dom";

// import { useMenu } from "@app/hooks/use-menu";
import { LayoutProvider } from "@app/providers/layout";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  // const { pathname } = useLocation();
  // const { getCurrentItem } = useMenu(pathname);

  // const item = getCurrentItem(MENU_SIDEBAR_MAIN);

  return (
    <>
      <Helmet>{/* <title>{item?.title}</title> */}</Helmet>
      <LayoutProvider
        bodyClassName="lg:bg-muted lg:[&_.container-fluid]:px-7.5 lg:overflow-hidden"
        style={
          {
            "--page-margin": "0px",
            "--sidebar-width": "240px",
            "--sidebar-collapsed-width": "0px",
            "--sidebar-header-height": "54px",
            "--header-height": "60px",
            "--header-height-mobile": "60px",
          } as React.CSSProperties
        }
      >
        {children}
      </LayoutProvider>
    </>
  );
}
