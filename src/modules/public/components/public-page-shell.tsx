import type { ReactNode } from 'react';

import { Link } from 'react-router-dom';

import { useSession } from '@/app/api';
import { cn } from '@/app/lib/utils';

export const publicContainerClass = 'mx-auto w-full px-5 sm:px-6 lg:px-10 2xl:px-12';

export function PublicContainer({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn(publicContainerClass, className)}>{children}</div>;
}

export function PublicPageShell({ children }: { children: ReactNode }) {
  const { data } = useSession();
  const isSignedIn = Boolean(data?.session);
  const authPath = isSignedIn ? '/app' : '/sign-in';
  const authLabel = isSignedIn ? 'Go to app' : 'Sign in';

  return (
    <div className="min-h-screen w-full min-w-0 bg-background text-foreground">
      <header className="border-b bg-background">
        <PublicContainer className="flex min-h-16 items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3 text-sm font-semibold">
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              EH
            </span>
            <span>ElliHub</span>
          </Link>

          <Link
            to={authPath}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            {authLabel}
          </Link>
        </PublicContainer>
      </header>

      {children}
    </div>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/40">
      <PublicContainer className="space-y-4 py-8 text-sm text-muted-foreground">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="font-medium text-foreground">ElliHub</div>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link to="/privacy-policy" className="hover:text-foreground">
              Privacy Policy
            </Link>
            <Link to="/end-user-license-agreement" className="hover:text-foreground">
              End User License Agreement
            </Link>
            <a href="mailto:support@ellihub.com" className="hover:text-foreground">
              support@ellihub.com
            </a>
          </div>
        </div>
        <p>ElliHub is a private construction operations and project finance workspace.</p>
      </PublicContainer>
    </footer>
  );
}
