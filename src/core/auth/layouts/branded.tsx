import { Link, Outlet } from 'react-router-dom';

import { Card, CardContent } from '@app/components/ui/card';
import { SidebarLogo } from '@app/components/sidebar/sidebar-logo';

export function BrandedLayout() {
  return (
    <div
      className="flex w-full flex-col items-center min-h-screen bg-muted/40 p-8 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:24px_24px]"
    >
      <Link to="/" className="pt-4 text-foreground">
        <SidebarLogo
          className="w-48 shrink-0 justify-center"
          svgClassName="w-full h-auto"
          wordmarkColor="var(--foreground)"
        />
      </Link>

      <div className="flex grow items-center justify-center w-full max-w-md">
        <Card className="w-full">
          <CardContent className="p-10">
            <Outlet />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
