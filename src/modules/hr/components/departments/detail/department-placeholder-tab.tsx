import { Card, CardContent } from '@/app/components/ui/card';

interface DepartmentPlaceholderTabProps {
  label: string;
}

export function DepartmentPlaceholderTab({ label }: DepartmentPlaceholderTabProps) {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
          {label} coming soon
        </p>
      </CardContent>
    </Card>
  );
}
