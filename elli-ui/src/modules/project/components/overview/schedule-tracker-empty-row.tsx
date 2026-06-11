import { TableCell, TableRow } from '@/app/components/ui/table';

export function ScheduleTrackerEmptyRow() {
  return (
    <TableRow>
      <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
        No schedule entries. Add an entry to start tracking dates.
      </TableCell>
    </TableRow>
  );
}
