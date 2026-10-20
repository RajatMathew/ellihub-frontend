import { useEffect, useState } from 'react';

import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { Button } from '@app/components/ui/button';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@app/components/ui/sheet';
import type { MenuConfig } from '@app/config/types';
import { useLayout } from '@app/hooks/use-layout';

import Sidebar from '../sidebar/sidebar';

export function HeaderMenu({ menuConfig }: { menuConfig?: MenuConfig }) {
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
            className="h-dvh max-h-dvh w-full max-w-72 gap-0 overflow-hidden border-sidebar-border bg-sidebar-bg p-0 text-sidebar-foreground lg:w-(--sidebar-width) [&_[data-slot=separator]]:bg-sidebar-border"
            side="left"
            close={false}
          >
            <SheetHeader className="p-0 space-y-0">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            </SheetHeader>
            <SheetBody className="flex min-h-0 min-w-0 flex-1 p-0">
              {menuConfig && <Sidebar menuConfig={menuConfig} />}
            </SheetBody>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
