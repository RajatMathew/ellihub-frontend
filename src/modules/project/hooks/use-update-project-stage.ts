import { useUpdateProjectMutation } from '@/modules/project/hooks';
import type { ProjectDetail, UpdateProjectInput } from '@/modules/project/schemas/project.schema';
import { toast } from 'sonner';

const formatDate = (value?: string | null) => (value ? value.split('T')[0] : undefined);
const optionalString = (value?: string | null) => value ?? undefined;

/**
 * Moves a project to another stage.
 *
 * `PUT /project` is a full replace, so changing one field means resending every
 * required one. That rebuild lived inside the project header, which made a
 * presentational component responsible for the shape of a write.
 */
export function useUpdateProjectStage(project: ProjectDetail | undefined) {
  const mutation = useUpdateProjectMutation();

  const updateStage = (stageId: string) => {
    if (!project || stageId === project.stageId) return;

    const tcoDate = formatDate(project.tcoDate ?? project.estimatedEndDate);

    if (!tcoDate) {
      toast.error('TCO date is required before updating the project stage.');
      return;
    }

    const payload: UpdateProjectInput = {
      name: project.name,
      description: project.description,
      jobNumber: optionalString(project.jobNumber),
      contractNumber: optionalString(project.contractNumber),
      fieldwireProjectId: project.fieldwireProjectId ?? null,
      fieldwireProjectName: project.fieldwireProjectName ?? null,
      divisionId: optionalString(project.divisionId),
      gcId: optionalString(project.gcId),
      leadPMId: optionalString(project.leadPMId),
      stageId,
      status: project.status ?? undefined,
      streetAddress: optionalString(project.streetAddress),
      city: optionalString(project.city),
      state: optionalString(project.state),
      zipCode: optionalString(project.zipCode),
      contractValue: project.contractValue,
      contractType: optionalString(project.contractType ?? project.primeContract?.contractType),
      retainagePercent: project.retainagePercent,
      targetBudgetPercent: project.targetBudgetPercent,
      taxRate: project.taxRate,
      paymentTerms: optionalString(project.paymentTerms ?? project.primeContract?.paymentTerms),
      estimatedStartDate: formatDate(project.estimatedStartDate),
      estimatedEndDate: formatDate(project.estimatedEndDate),
      setInactiveDate: formatDate(project.setInactiveDate),
      tcoDate,
    };

    mutation.mutate({ id: project.id, data: payload });
  };

  return { updateStage, isPending: mutation.isPending };
}
