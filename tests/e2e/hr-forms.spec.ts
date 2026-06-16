import { expect, test, type Page } from '@playwright/test';

const NOW = '2026-06-11T00:00:00.000Z';
const EMPLOYEE_ID = 'employee-existing';
const DEPARTMENT_ID = 'department-existing';
const PTO_ID = 'pto-existing';
const ROLE_ID = 'role-project-manager';
const PTO_TYPE_ID = 'pto-type-vacation';

const routeLoadTimeout = 15_000;

const professionalRole = {
  id: ROLE_ID,
  type: 'PROFESSIONAL_ROLE',
  name: 'PROJECT_MANAGER',
  label: 'Project Manager',
  order: 1,
  isDefault: false,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const ptoType = {
  id: PTO_TYPE_ID,
  type: 'PTO_TYPE',
  name: 'VACATION',
  label: 'Vacation',
  order: 1,
  isDefault: false,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const employeePagination = {
  totalItems: 1,
  totalPages: 1,
  currentPage: 1,
  pageSize: 100,
};

const departmentPagination = {
  currentPage: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  totalItems: 1,
  itemsPerPage: 25,
};

const ptoPagination = {
  currentPage: 1,
  totalPages: 1,
  totalItems: 1,
  hasNextPage: false,
  hasPreviousPage: false,
};

function makeEmployee(overrides: Record<string, unknown> = {}) {
  return {
    id: EMPLOYEE_ID,
    name: 'Existing Employee',
    email: 'existing.employee@example.com',
    phoneNumber: '(212) 555-0100',
    address: '100 Broadway, New York, NY',
    startDate: '2026-01-05T00:00:00.000Z',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelation: '',
    roleId: ROLE_ID,
    role: professionalRole,
    departmentId: DEPARTMENT_ID,
    status: 'ACTIVE',
    documents: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeDepartment(overrides: Record<string, unknown> = {}) {
  return {
    id: DEPARTMENT_ID,
    name: 'Existing Department',
    description: 'Existing department description',
    employeeCount: 1,
    employees: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makePTO(overrides: Record<string, unknown> = {}) {
  return {
    id: PTO_ID,
    employeeId: EMPLOYEE_ID,
    employee: makeEmployee(),
    typeId: PTO_TYPE_ID,
    type: ptoType,
    startDate: '2026-07-01T00:00:00.000Z',
    endDate: '2026-07-05T00:00:00.000Z',
    reason: 'Existing vacation request',
    status: 'PENDING',
    reviewNote: null,
    reviewedAt: null,
    reviewedById: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

type MockHandlers = {
  onCreateEmployee?: (payload: Record<string, unknown>) => void;
  onUpdateEmployee?: (payload: Record<string, unknown>) => void;
  onCreateDepartment?: (payload: Record<string, unknown>) => void;
  onUpdateDepartment?: (payload: Record<string, unknown>) => void;
  onCreatePTO?: (payload: Record<string, unknown>) => void;
  onUpdatePTO?: (payload: Record<string, unknown>) => void;
};

async function mockHRApi(page: Page, handlers: MockHandlers = {}) {
  await page.route('**/api/v1/**', async (route, request) => {
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();

    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 'session-1', userId: 'user-admin', expiresAt: '2026-12-31T00:00:00Z' },
          user: { id: 'user-admin', name: 'Admin User', email: 'admin@elli.com' },
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
            employeeId: EMPLOYEE_ID,
            projectScope: 'all',
            permissions: {
              employee: ['create', 'update', 'read'],
              department: ['create', 'update', 'read'],
              pto: ['create', 'update', 'read'],
            },
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/lookup/type/PROFESSIONAL_ROLE') {
      await route.fulfill({ json: { data: [professionalRole] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/lookup/type/PTO_TYPE') {
      await route.fulfill({ json: { data: [ptoType] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/hr/employee') {
      await route.fulfill({
        json: { data: [makeEmployee()], pagination: employeePagination },
      });
      return;
    }

    if (method === 'GET' && path === `/api/v1/hr/employee/${EMPLOYEE_ID}`) {
      await route.fulfill({ json: { data: makeEmployee() } });
      return;
    }

    if (method === 'POST' && path === '/api/v1/hr/employee') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onCreateEmployee?.(payload);
      await route.fulfill({
        json: { data: makeEmployee({ id: 'employee-created', ...payload }) },
      });
      return;
    }

    if (method === 'PUT' && path === '/api/v1/hr/employee') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onUpdateEmployee?.(payload);
      await route.fulfill({ json: { data: makeEmployee(payload) } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/hr/department') {
      await route.fulfill({
        json: { data: [makeDepartment()], pagination: departmentPagination },
      });
      return;
    }

    if (method === 'GET' && path === `/api/v1/hr/department/${DEPARTMENT_ID}`) {
      await route.fulfill({ json: { data: makeDepartment() } });
      return;
    }

    if (method === 'POST' && path === '/api/v1/hr/department') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onCreateDepartment?.(payload);
      await route.fulfill({
        json: { data: makeDepartment({ id: 'department-created', ...payload }) },
      });
      return;
    }

    if (method === 'PUT' && path === '/api/v1/hr/department') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onUpdateDepartment?.(payload);
      await route.fulfill({ json: { data: makeDepartment(payload) } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/hr/pto') {
      await route.fulfill({ json: { data: [makePTO()], pagination: ptoPagination } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/hr/pto/${PTO_ID}`) {
      await route.fulfill({ json: { data: makePTO() } });
      return;
    }

    if (method === 'POST' && path === '/api/v1/hr/pto') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onCreatePTO?.(payload);
      await route.fulfill({ json: { data: makePTO({ id: 'pto-created', ...payload }) } });
      return;
    }

    if (method === 'PUT' && path === '/api/v1/hr/pto') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onUpdatePTO?.(payload);
      await route.fulfill({ json: { data: makePTO(payload) } });
      return;
    }

    await route.fulfill({
      status: 404,
      json: { message: `Unhandled test API route: ${method} ${path}` },
    });
  });
}

async function chooseOption(page: Page, testId: string, label: string) {
  await page.getByTestId(testId).click();
  await page.getByText(label, { exact: true }).last().click();
}

test.describe('HR create and edit forms', () => {
  test('creates an employee', async ({ page }) => {
    let createPayload: Record<string, unknown> | undefined;
    await mockHRApi(page, { onCreateEmployee: (payload) => (createPayload = payload) });

    await page.goto('/app/hr/employees/create');
    await expect(page.getByRole('heading', { name: 'Personal Identity' })).toBeVisible({
      timeout: routeLoadTimeout,
    });

    await page.getByTestId('employee-name-input').fill('Created Employee');
    await page.getByTestId('employee-email-input').fill('created.employee@example.com');
    await page.getByTestId('employee-phone-input').fill('(212) 555-0199');
    await page.getByTestId('employee-address-input').fill('200 Hudson St, New York, NY');
    await page.getByTestId('employee-start-date-input').fill('2026-03-15');
    await chooseOption(page, 'employee-role-select', 'Project Manager');
    await page.getByRole('button', { name: 'Create Employee' }).click();

    await expect.poll(() => createPayload).toBeDefined();
    expect(createPayload).toMatchObject({
      name: 'Created Employee',
      email: 'created.employee@example.com',
      phoneNumber: '(212) 555-0199',
      address: '200 Hudson St, New York, NY',
      startDate: '2026-03-15',
      roleId: ROLE_ID,
      createAccount: false,
    });
    expect(createPayload).not.toHaveProperty('password');
  });

  test('prefills and updates an employee', async ({ page }) => {
    let updatePayload: Record<string, unknown> | undefined;
    await mockHRApi(page, { onUpdateEmployee: (payload) => (updatePayload = payload) });

    await page.goto(`/app/hr/employees/${EMPLOYEE_ID}/edit`);
    await expect(page.getByRole('heading', { name: 'Personal Identity' })).toBeVisible({
      timeout: routeLoadTimeout,
    });

    await expect(page.getByTestId('employee-name-input')).toHaveValue('Existing Employee');
    await expect(page.getByTestId('employee-email-input')).toHaveValue(
      'existing.employee@example.com'
    );
    await expect(page.getByTestId('employee-role-select')).toContainText('Project Manager');

    await page.getByTestId('employee-name-input').fill('Updated Employee');
    await page.getByTestId('employee-phone-input').fill('(212) 555-0111');
    await page.getByRole('button', { name: 'Save Profile' }).click();

    await expect.poll(() => updatePayload).toBeDefined();
    expect(updatePayload).toMatchObject({
      id: EMPLOYEE_ID,
      name: 'Updated Employee',
      email: 'existing.employee@example.com',
      phoneNumber: '(212) 555-0111',
      roleId: ROLE_ID,
    });
    expect(updatePayload).not.toHaveProperty('createAccount');
  });

  test('creates a department', async ({ page }) => {
    let createPayload: Record<string, unknown> | undefined;
    await mockHRApi(page, { onCreateDepartment: (payload) => (createPayload = payload) });

    await page.goto('/app/hr/departments/create');
    await expect(page.getByRole('heading', { name: 'General Information' })).toBeVisible({
      timeout: routeLoadTimeout,
    });

    await page.getByTestId('department-name-input').fill('Created Department');
    await page
      .getByTestId('department-description-input')
      .fill('Created department description');
    await page.getByRole('button', { name: 'Create Department' }).click();

    await expect.poll(() => createPayload).toBeDefined();
    expect(createPayload).toEqual({
      name: 'Created Department',
      description: 'Created department description',
    });
  });

  test('prefills and updates a department', async ({ page }) => {
    let updatePayload: Record<string, unknown> | undefined;
    await mockHRApi(page, { onUpdateDepartment: (payload) => (updatePayload = payload) });

    await page.goto(`/app/hr/departments/${DEPARTMENT_ID}/edit`);
    await expect(page.getByRole('heading', { name: 'General Information' })).toBeVisible({
      timeout: routeLoadTimeout,
    });

    await expect(page.getByTestId('department-name-input')).toHaveValue('Existing Department');
    await expect(page.getByTestId('department-description-input')).toHaveValue(
      'Existing department description'
    );

    await page.getByTestId('department-name-input').fill('Updated Department');
    await page
      .getByTestId('department-description-input')
      .fill('Updated department description');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => updatePayload).toBeDefined();
    expect(updatePayload).toEqual({
      id: DEPARTMENT_ID,
      name: 'Updated Department',
      description: 'Updated department description',
    });
  });

  test('creates a PTO request', async ({ page }) => {
    let createPayload: Record<string, unknown> | undefined;
    await mockHRApi(page, { onCreatePTO: (payload) => (createPayload = payload) });

    await page.goto('/app/hr/pto/create');
    await expect(page.getByRole('heading', { name: 'Leave Configuration' })).toBeVisible({
      timeout: routeLoadTimeout,
    });

    await expect(page.getByTestId('pto-employee-select')).toContainText('Existing Employee');
    await chooseOption(page, 'pto-type-select', 'Vacation');
    await page.getByTestId('pto-start-date-input').fill('2026-08-10');
    await page.getByTestId('pto-end-date-input').fill('2026-08-12');
    await page.getByTestId('pto-reason-input').fill('Family trip');
    await page.getByRole('button', { name: 'Submit Request' }).click();

    await expect.poll(() => createPayload).toBeDefined();
    expect(createPayload).toEqual({
      employeeId: EMPLOYEE_ID,
      typeId: PTO_TYPE_ID,
      startDate: '2026-08-10',
      endDate: '2026-08-12',
      reason: 'Family trip',
    });
  });

  test('prefills and updates a PTO request without changing the employee', async ({ page }) => {
    let updatePayload: Record<string, unknown> | undefined;
    await mockHRApi(page, { onUpdatePTO: (payload) => (updatePayload = payload) });

    await page.goto(`/app/hr/pto/${PTO_ID}/edit`);
    await expect(page.getByRole('heading', { name: 'Leave Configuration' })).toBeVisible({
      timeout: routeLoadTimeout,
    });

    await expect(page.getByTestId('pto-employee-select')).toContainText('Existing Employee');
    await expect(page.getByTestId('pto-type-select')).toContainText('Vacation');
    await expect(page.getByTestId('pto-start-date-input')).toHaveValue('2026-07-01');
    await expect(page.getByTestId('pto-end-date-input')).toHaveValue('2026-07-05');
    await expect(page.getByTestId('pto-reason-input')).toHaveValue('Existing vacation request');

    await page.getByTestId('pto-start-date-input').fill('2026-07-02');
    await page.getByTestId('pto-reason-input').fill('Updated vacation request');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => updatePayload).toBeDefined();
    expect(updatePayload).toEqual({
      id: PTO_ID,
      typeId: PTO_TYPE_ID,
      startDate: '2026-07-02',
      endDate: '2026-07-05',
      reason: 'Updated vacation request',
    });
    expect(updatePayload).not.toHaveProperty('employeeId');
  });
});
