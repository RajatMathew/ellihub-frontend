import { DollarSign } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';

export function PaymentsPlaceholderCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-[0.18em] uppercase">
          Payments
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <DollarSign className="size-8 text-muted-foreground/40" />
          <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
          <p className="text-xs text-muted-foreground">
            Payment tracking will be available here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
