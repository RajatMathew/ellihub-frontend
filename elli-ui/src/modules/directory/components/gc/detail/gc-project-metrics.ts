import type {
  GCProject,
  GeneralContractorDetail,
} from '@/modules/directory/schemas/gc.schema';

export function getProjectMetricsFromProjects(projects: GCProject[]) {
  return projects.reduce(
    (metrics, project) => {
      if (project.status.toUpperCase() !== 'ACTIVE') {
        return metrics;
      }

      return {
        activeProjects: metrics.activeProjects + 1,
        totalCommitted: metrics.totalCommitted + project.contractValue,
      };
    },
    { activeProjects: 0, totalCommitted: 0 }
  );
}

export function getGCProjectMetrics(gc: GeneralContractorDetail) {
  const projectMetrics = getProjectMetricsFromProjects(gc.projects);

  return {
    totalProjects: gc.projects.length,
    activeProjects: gc.activeProjects ?? projectMetrics.activeProjects,
    totalCommitted: gc.totalCommitted ?? projectMetrics.totalCommitted,
  };
}
