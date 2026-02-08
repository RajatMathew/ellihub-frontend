import { lazy, Suspense, useEffect, useState } from 'react';

import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { Button } from '@app/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from '@app/components/ui/sheet';
import { useLayout } from '@app/hooks/use-layout';

const Sidebar = lazy(() => import('@app/components/sidebar/sidebar'));

export function HeaderMenu() {
  const { pathname } = useLocation();
  const { isMobile } = useLayout();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Close sheet when route changes
  useEffect(() => {
    return () => {
      setIsSheetOpen(false);
    };
  }, [pathname]);

  return (
    <div className="flex items-center">
      {/* Mobile sidebar toggle */}
      {isMobile && (
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" mode="icon" size="sm">
              <Menu className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent
            className="p-0 gap-0 w-60 lg:w-(--sidebar-width) dark"
            side="left"
            close={false}
          >
            <SheetHeader className="p-0 space-y-0" />
            <SheetBody className="flex grow p-0">
              <Suspense fallback={null}>
                <Sidebar />
              </Suspense>
            </SheetBody>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
