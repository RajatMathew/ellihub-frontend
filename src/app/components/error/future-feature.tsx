import { ArrowLeft, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Button } from '@app/components/ui/button';

export default function FutureFeature() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="flex items-center justify-center size-16 rounded-full bg-primary/10 mb-6">
        <Sparkles className="size-7 text-primary" />
      </div>

      <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold tracking-widest uppercase rounded-full bg-primary/10 text-primary mb-4">
        Coming Soon
      </span>
      <h1 className="text-2xl font-bold tracking-tight text-foreground mb-2">
        Feature in development
      </h1>
      <p className="text-sm text-muted-foreground max-w-md mb-8">
        This feature is currently under development and will be available in a future release.
        Access will be enabled automatically.
      </p>

      <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4" />
        Go back
      </Button>
    </div>
  );
}
