import { DatabaseZap } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Button } from '@/app/components/ui/button';
import { CardContent } from '@/app/components/ui/card';

interface PrimeChangeOrderNotConnectedProps {
  projectId: string;
}

export function PrimeChangeOrderNotConnected({ projectId }: PrimeChangeOrderNotConnectedProps) {
  return (
    <CardContent>
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <DatabaseZap className="size-10 text-muted-foreground/60" />
        <p className="text-sm font-medium">Fieldwire is not connected for this project</p>
        <p className="max-w-md text-xs text-muted-foreground">
          Add the Fieldwire Project ID on the project edit screen before syncing change orders.
        </p>
        <Button variant="outline" size="sm" asChild>
          <Link to={`/app/project/${projectId}/edit`}>Edit Project</Link>
        </Button>
      </div>
    </CardContent>
  );
}
