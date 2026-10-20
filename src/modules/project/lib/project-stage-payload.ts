import type { ProjectDetail, UpdateProjectInput } from '@/modules/project/schemas/project.schema';

const dateOf = (value?: string | null) => (value ? value.split('T')[0] : undefined);
const optionalString = (value?: string | null) => value ?? undefined;

/**
 * The update that moves a project to another stage.
 *
 * `PUT /project` is a full replace, so changing one field means resending the
 * rest. A date left out was saved as empty — changing the stage erased the
 * actual start and completion dates — so every date the project has goes back.
 *
 * Null when the project has no TCO, which the API requires: the estimated end
 * date used to be written into the TCO without anyone choosing it.
 */
export function buildProjectStagePayload(
  project: ProjectDetail,
  stageId: string
): UpdateProjectInput | null {
  const tcoDate = dateOf(project.tcoDate);
  if (!tcoDate) return null;

  return {
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
    estimatedStartDate: dateOf(project.estimatedStartDate),
    estimatedEndDate: dateOf(project.estimatedEndDate),
    actualStartDate: dateOf(project.actualStartDate),
    actualCompletionDate: dateOf(project.actualCompletionDate),
    setInactiveDate: dateOf(project.setInactiveDate),
    tcoDate,
  };
}
