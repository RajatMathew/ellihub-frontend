/**
 * The Calendar tab's project filter (elli-ui#1381). An event has no project of
 * its own: it takes the projects of the threads it is linked to, as a task
 * does, so "PS 082K" shows the meetings made from that project's mail.
 */

export type CalendarProject = { id: string; name: string };

/**
 * What the dropdown offers: every project an event on screen belongs to, plus
 * any already chosen — paging to a week without one of them must not drop it
 * from the list while it is still filtering, or the filter would hide every
 * event with nothing on screen to say why.
 */
export function calendarProjectOptions(
  events: readonly { projects: readonly CalendarProject[] }[],
  chosen: readonly CalendarProject[] = []
): CalendarProject[] {
  const byId = new Map<string, CalendarProject>();
  for (const event of events) for (const project of event.projects) byId.set(project.id, project);
  for (const project of chosen) if (!byId.has(project.id)) byId.set(project.id, project);
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** The events in any of `projectIds`; every event when none are chosen. */
export function eventsInProjects<T extends { projects: readonly CalendarProject[] }>(
  events: readonly T[],
  projectIds: readonly string[]
): T[] {
  if (projectIds.length === 0) return [...events];
  const wanted = new Set(projectIds);
  return events.filter((event) => event.projects.some((project) => wanted.has(project.id)));
}
