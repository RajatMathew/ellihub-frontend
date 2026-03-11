import { Button } from '@app/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardToolbar,
} from '@app/components/ui/card';

export function PaymentsCard() {
  return (
    <Card>
      <CardHeader className="bg-foreground text-background rounded-t-xl border-l-4 border-l-success">
        <CardTitle className="text-xs font-bold tracking-widest uppercase text-background">
          Payments
        </CardTitle>
        <CardToolbar>
          <Button size="sm" className="bg-success hover:bg-success/90 text-white" disabled>
            + Add
          </Button>
        </CardToolbar>
      </CardHeader>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground text-center py-6">
          Payment tracking will be available in a future update.
        </p>
      </CardContent>
    </Card>
  );
}
