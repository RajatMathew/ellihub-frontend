import { ServerCrash } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@app/components/ui/button';

export function ServerError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="flex items-center justify-center size-16 rounded-full bg-warning/10 mb-6">
        <ServerCrash className="size-7 text-warning" />
      </div>

      <p className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mb-2">
        500
      </p>
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Something went wrong
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        An unexpected error occurred on the server. Please try again later or contact support if the
        problem persists.
      </p>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
          Try again
        </Button>
        <Button size="sm" asChild>
          <Link to="/app">Home</Link>
        </Button>
      </div>
    </div>
  );
}
