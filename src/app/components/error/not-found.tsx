import { ArrowLeft, Search } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@app/components/ui/button';

export function NotFound() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="flex items-center justify-center size-16 rounded-full bg-muted mb-6">
        <Search className="size-7 text-muted-foreground" />
      </div>

      <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-2">
        404
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Page not found
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mb-1">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <p className="text-xs text-muted-foreground/60 font-mono mb-8">
        {location.pathname}
      </p>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" />
          Go back
        </Button>
        <Button size="sm" asChild>
          <Link to="/app">Home</Link>
        </Button>
      </div>
    </div>
  );
}
