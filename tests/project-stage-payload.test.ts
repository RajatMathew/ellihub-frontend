import { describe, expect, test } from 'bun:test';

import { buildProjectStagePayload } from '../src/modules/project/lib/project-stage-payload';
import type { ProjectDetail } from '../src/modules/project/schemas/project.schema';

/**
 * Changing a project's stage resends the whole project (`PUT /project` is a
 * full replace). It used to leave the actual start and completion dates out,
 * which the API saved as empty, and to write the estimated end date into an
 * empty TCO.
 */

const project = {
  id: 'Proj0001',
  name: 'PS 101',
  description: 'Interior renovation',
  stageId: 'stage-fabrication',
  divisionId: 'division-sca',
  gcId: 'gc-1',
  leadPMId: 'pm-1',
  contractValue: 1000,
  estimatedStartDate: '2026-01-15T00:00:00.000Z',
  estimatedEndDate: '2026-12-20T00:00:00.000Z',
  actualStartDate: '2026-01-18T00:00:00.000Z',
  actualCompletionDate: '2026-12-22T00:00:00.000Z',
  setInactiveDate: null,
  tcoDate: '2027-01-01T00:00:00.000Z',
} as unknown as ProjectDetail;

describe('moving a project to another stage', () => {
  test('keeps every date the project has, the actual ones included', () => {
    expect(buildProjectStagePayload(project, 'stage-installation')).toMatchObject({
      stageId: 'stage-installation',
      estimatedStartDate: '2026-01-15',
      estimatedEndDate: '2026-12-20',
      actualStartDate: '2026-01-18',
      actualCompletionDate: '2026-12-22',
      tcoDate: '2027-01-01',
    });
  });

  test('never invents a TCO from the estimated end date', () => {
    expect(
      buildProjectStagePayload({ ...project, tcoDate: null } as ProjectDetail, 'stage-installation')
    ).toBeNull();
  });
});
