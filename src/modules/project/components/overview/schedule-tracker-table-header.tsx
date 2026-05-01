import {
  TableHead,
  TableHeader,
  TableRow,
} from '@/app/components/ui/table';

export function ScheduleTrackerTableHeader() {
  return (
    <TableHeader>
      <TableRow>
        <TableHead>Date</TableHead>
        <TableHead>Description</TableHead>
        <TableHead>Adj. Finish</TableHead>
        <TableHead>File</TableHead>
        <TableHead>Notes</TableHead>
        <TableHead className="w-10" />
      </TableRow>
    </TableHeader>
  );
}
