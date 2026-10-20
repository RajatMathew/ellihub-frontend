import { useUpdateProjectMutation } from '@/modules/project/hooks';
import { buildProjectStagePayload } from '@/modules/project/lib/project-stage-payload';
import type { ProjectDetail } from '@/modules/project/schemas/project.schema';
import { toast } from 'sonner';

/**
 * Moves a project to another stage.
 *
 * `PUT /project` is a full replace, so changing one field means resending every
 * required one; `buildProjectStagePayload` owns that shape, so a presentational
 * component is not responsible for it.
 */
export function useUpdateProjectStage(project: ProjectDetail | undefined) {
  const mutation = useUpdateProjectMutation();

  const updateStage = (stageId: string) => {
    if (!project || stageId === project.stageId) return;

    const payload = buildProjectStagePayload(project, stageId);
    if (!payload) {
      toast.error('TCO date is required before updating the project stage.');
      return;
    }

    mutation.mutate({ id: project.id, data: payload });
  };

  return { updateStage, isPending: mutation.isPending };
}
