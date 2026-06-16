import { expect, test, type Page } from '@playwright/test';

const PROJECT_ID = 'project-edit-prefill';
const NOW = '2026-06-11T00:00:00.000Z';

const projectDetail = {
  id: PROJECT_ID,
  name: 'PS 101 Renovation',
  description: 'Interior renovation and closeout scope.',
  jobNumber: 'P-2026-101',
  contractNumber: 'C000080829',
  fieldwireProjectId: null,
  fieldwireProjectName: null,
  stageId: 'stage-installation',
  stage: {
    id: 'stage-installation',
    type: 'PROJECT_STAGE',
    name: 'INSTALLATION',
    label: 'Installation',
  },
  divisionId: 'division-sca',
  division: {
    id: 'division-sca',
    type: 'PROJECT_DIVISION',
    name: 'SCA',
    label: 'SCA',
  },
  status: 'ACTIVE',
  statusRef: null,
  statusId: null,
  gcId: 'gc-navillus',
  gc: {
    id: 'gc-navillus',
    name: 'Navillus Contracting',
    email: 'gc@example.com',
    phone: '2125550100',
  },
  leadPMId: 'employee-pm',
  leadPM: {
    id: 'employee-pm',
    name: 'Avery PM',
    email: 'avery@example.com',
    phoneNumber: '2125550101',
  },
  streetAddress: '123 Test Ave',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  contractValue: 1234567.89,
  contractType: 'Lump Sum',
  retainagePercent: 7.5,
  targetBudgetPercent: 12.25,
  taxRate: 8.875,
  paymentTerms: 'NET_45',
  estimatedStartDate: '2026-01-15T00:00:00.000Z',
  estimatedEndDate: '2026-12-20T00:00:00.000Z',
  actualStartDate: '2026-01-18T00:00:00.000Z',
  actualCompletionDate: '2026-12-22T00:00:00.000Z',
  setInactiveDate: '2027-01-10T00:00:00.000Z',
  tcoDate: '2026-12-31T00:00:00.000Z',
  primeContract: null,
  projectScheduleEntries: [],
  teamMembers: [],
  currentUserProjectRole: 'admin',
  capabilities: {
    canManage: true,
    canEdit: true,
    canCreateProjectDocuments: true,
    canManageTeam: true,
    actions: {
      projectTeam: {
        add: true,
        remove: true,
        promote: true,
        'assign-role': true,
        'transfer-lead': true,
      },
      primeContract: {
        read: true,
        pin: true,
        unpin: true,
        primary: true,
      },
      rfq: {},
      purchaseOrder: {},
      subChangeOrder: {},
      invoice: {},
    },
  },
  deletedAt: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const lookups = [
  {
    id: 'stage-installation',
    type: 'PROJECT_STAGE',
    name: 'INSTALLATION',
    label: 'Installation',
    code: 'INSTALLATION',
    color: '#16a34a',
    order: 1,
    isDefault: false,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: 'division-sca',
    type: 'PROJECT_DIVISION',
    name: 'SCA',
    label: 'SCA',
    order: 1,
    isDefault: false,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  },
];

const gcList = {
  data: [
    {
      id: 'gc-navillus',
      name: 'Navillus Contracting',
      status: 'ACTIVE',
      paymentTerms: 'NET_30',
      retainagePercent: 10,
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    totalItems: 1,
    itemsPerPage: 1000,
  },
};

const employeeList = {
  data: [
    {
      id: 'employee-pm',
      name: 'Avery PM',
      email: 'avery@example.com',
      authRole: 'pm',
      createdAt: NOW,
      updatedAt: NOW,
    },
  ],
  pagination: {
    totalItems: 1,
    totalPages: 1,
    currentPage: 1,
    pageSize: 1000,
  },
};

async function mockProjectEditApi(
  page: Page,
  options: { onUpdate?: (payload: Record<string, unknown>) => void } = {}
) {
  await page.route('**/api/v1/**', async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: {
            id: 'session-1',
            userId: 'user-admin',
            expiresAt: '2026-12-31T00:00:00.000Z',
          },
          user: {
            id: 'user-admin',
            name: 'Admin User',
            email: 'admin@elli.com',
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/users/me/access') {
      await route.fulfill({
        json: {
          data: {
            userId: 'user-admin',
            role: 'admin',
            isDev: false,
            isAdmin: true,
            employeeId: 'employee-pm',
            projectScope: 'all',
            permissions: {
              project: ['create', 'update', 'view-all'],
              projectTeam: ['add', 'remove', 'assign-role', 'transfer-lead'],
              primeContract: ['read', 'pin', 'unpin', 'primary'],
            },
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === `/api/v1/project/${PROJECT_ID}`) {
      await route.fulfill({ json: { data: projectDetail } });
      return;
    }

    if (method === 'PUT' && path === '/api/v1/project') {
      options.onUpdate?.(JSON.parse(request.postData() ?? '{}'));
      await route.fulfill({ json: { data: projectDetail } });
      return;
    }

    if (method === 'PATCH' && path === '/api/v1/project/schedule/add') {
      await route.fulfill({
        json: {
          data: {
            id: 'schedule-1',
            projectId: PROJECT_ID,
            date: projectDetail.estimatedStartDate,
            description: 'Project scheduled start',
            adjustedFinishDate: projectDetail.estimatedEndDate,
            createdAt: NOW,
            updatedAt: NOW,
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/lookup') {
      await route.fulfill({ json: { data: lookups } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/lookup/type/PROJECT_DIVISION') {
      await route.fulfill({
        json: { data: lookups.filter((item) => item.type === 'PROJECT_DIVISION') },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/gc') {
      await route.fulfill({ json: gcList });
      return;
    }

    if (method === 'GET' && path === '/api/v1/hr/employee') {
      await route.fulfill({ json: employeeList });
      return;
    }

    await route.fulfill({
      status: 404,
      json: { message: `Unhandled test API route: ${method} ${path}` },
    });
  });
}

async function openProjectEditForm(page: Page) {
  await page.goto(`/app/project/${PROJECT_ID}/edit`);
  await expect(page.getByRole('heading', { name: 'Contract' })).toBeVisible();
}

test.describe('project edit form', () => {
  test('prefills contract and date fields from project detail', async ({ page }) => {
    await mockProjectEditApi(page);
    await openProjectEditForm(page);

    const contractSection = page.locator('#contract');

    await expect(page.getByTestId('project-contract-number-input')).toHaveValue('C000080829');
    await expect(page.getByTestId('project-contract-type-input')).toHaveValue('Lump Sum');
    await expect(contractSection.getByText('SCA', { exact: true })).toBeVisible();
    await expect(page.getByTestId('project-payment-terms-select')).toContainText('Net 45');
    await expect(page.getByTestId('project-contract-value-input')).toHaveValue('1234567.89');
    await expect(page.getByTestId('project-retainage-percent-input')).toHaveValue('7.5');
    await expect(page.getByTestId('project-target-budget-percent-input')).toHaveValue('12.25');
    await expect(page.getByTestId('project-tax-rate-input')).toHaveValue('8.875');
    await expect(page.getByTestId('project-estimated-start-date-input')).toHaveValue('2026-01-15');
    await expect(page.getByTestId('project-estimated-end-date-input')).toHaveValue('2026-12-20');
    await expect(page.getByTestId('project-inactive-date-input')).toHaveValue('2027-01-10');
    await expect(page.getByTestId('project-tco-date-input')).toHaveValue('2026-12-31');
    await expect(page.getByTestId('project-actual-start-date-input')).toHaveValue('2026-01-18');
    await expect(page.getByTestId('project-actual-completion-date-input')).toHaveValue(
      '2026-12-22'
    );
  });

  test('submits project detail contract values when the form is unchanged', async ({ page }) => {
    let updatePayload: Record<string, unknown> | undefined;

    await mockProjectEditApi(page, {
      onUpdate: (payload) => {
        updatePayload = payload;
      },
    });
    await openProjectEditForm(page);

    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => updatePayload?.id).toBe(PROJECT_ID);
    expect(updatePayload).toMatchObject({
      id: PROJECT_ID,
      contractNumber: 'C000080829',
      contractValue: 1234567.89,
      contractType: 'Lump Sum',
      retainagePercent: 7.5,
      targetBudgetPercent: 12.25,
      taxRate: 8.875,
      paymentTerms: 'NET_45',
      estimatedStartDate: '2026-01-15',
      estimatedEndDate: '2026-12-20',
      actualStartDate: '2026-01-18',
      actualCompletionDate: '2026-12-22',
      setInactiveDate: '2027-01-10',
      tcoDate: '2026-12-31',
    });
  });
});
