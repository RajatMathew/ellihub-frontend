import { TableHead, TableHeader, TableRow } from '@/app/components/ui/table';

export function ScheduleTrackerTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Date</TableHead>
        <TableHead>Description</TableHead>
        <TableHead>Adj. Finish</TableHead>
        <TableHead>Prime CO</TableHead>
        <TableHead>File</TableHead>
        <TableHead>Notes</TableHead>
        <TableHead className="w-20" />
      </TableRow>
    </TableHeader>
  );
}
