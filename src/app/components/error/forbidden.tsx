import { ArrowLeft, ShieldX } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@app/components/ui/button';

export function Forbidden() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="flex items-center justify-center size-16 rounded-full bg-destructive/10 mb-6">
        <ShieldX className="size-7 text-destructive" />
      </div>

      <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-2">
        403
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Access denied
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        You don&apos;t have permission to access this page. Contact your administrator if you
        believe this is a mistake.
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
