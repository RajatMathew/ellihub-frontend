import type { CalendarEvent } from '@/modules/email/components/calendar/email-calendar-types';

/** Anything with a start and an end — an event, or one day's piece of one. */
interface Span {
  start: Date;
  end: Date;
  allDay?: boolean;
}

export interface LaidOutEvent<E extends Span = CalendarEvent> {
  event: E;
  /** 0-indexed column within the cluster. */
  column: number;
  /** How many columns the cluster is split into. */
  totalColumns: number;
}

/**
 * Group overlapping events into "clusters" and lay them out side-by-side. The
 * strategy is the classic Google-Calendar approach:
 *
 *   1. Sort events by start time.
 *   2. Sweep left-to-right. Anything that begins before the current cluster's
 *      max-end stays in the cluster; the moment we hit a gap the cluster is
 *      closed and columns are assigned greedily inside it.
 *   3. Within a cluster, each event picks the first column whose "active end
 *      time" is not still after this event's start. The cluster width is the
 *      maximum column index reached.
 *
 * Callers render each event with `left: column / totalColumns` and
 * `width: 1 / totalColumns`. All-day events skip this pipeline — they live in
 * a banner row above the timeline.
 */
export function layoutOverlappingEvents<E extends Span = CalendarEvent>(
  events: readonly E[]
): Array<LaidOutEvent<E>> {
  const timed = events
    .filter((event) => !event.allDay)
    .slice()
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const result: Array<LaidOutEvent<E>> = [];
  let cluster: E[] = [];
  let clusterEnd = 0;

  const flush = () => {
    if (cluster.length === 0) return;
    // Greedy column assignment: each column tracks the "current end" of the
    // event occupying it. The next event slots into the first column whose
    // current end is <= this event's start.
    const columnEnds: number[] = [];
    const assignments: Array<{ column: number }> = [];
    for (const event of cluster) {
      let placed = false;
      for (let index = 0; index < columnEnds.length; index += 1) {
        if (columnEnds[index]! <= event.start.getTime()) {
          columnEnds[index] = event.end.getTime();
          assignments.push({ column: index });
          placed = true;
          break;
        }
      }
      if (!placed) {
        assignments.push({ column: columnEnds.length });
        columnEnds.push(event.end.getTime());
      }
    }
    const totalColumns = columnEnds.length;
    for (let index = 0; index < cluster.length; index += 1) {
      result.push({
        event: cluster[index]!,
        column: assignments[index]!.column,
        totalColumns,
      });
    }
    cluster = [];
    clusterEnd = 0;
  };

  for (const event of timed) {
    const start = event.start.getTime();
    if (cluster.length > 0 && start >= clusterEnd) {
      flush();
    }
    cluster.push(event);
    clusterEnd = Math.max(clusterEnd, event.end.getTime());
  }
  flush();
  return result;
}
