import { TasksWorkspaceView } from '@/modules/tasks/components/tasks-workspace-view';

/**
 * Standalone /app/tasks route. The board's home in the design is the Tasks tab
 * of a mailbox; this is the same view without the mailbox chrome around it.
 */
export function TasksPage() {
  return <TasksWorkspaceView />;
}

export default TasksPage;
