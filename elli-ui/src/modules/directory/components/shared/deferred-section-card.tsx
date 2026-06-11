import type { ComponentType } from 'react';

import { Card, CardContent } from '@/app/components/ui/card';
import { Separator } from '@/app/components/ui/separator';

interface DeferredSectionCardProps {
  id: string;
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  message: string;
}

export function DeferredSectionCard({
  id,
  title,
  description,
  icon: Icon,
  message,
}: DeferredSectionCardProps) {
  return (
    <Card id={id}>
      <CardContent className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Separator />

        <div className="flex flex-col items-center gap-2 py-6 text-center">
          <Icon className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{message}</p>
        </div>
      </CardContent>
    </Card>
  );
}
