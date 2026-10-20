import { expect, test, type Page } from '@playwright/test';

/**
 * Regression cover for the shared detail header.
 *
 * The second test is the one that matters: before the header owned gating, HR
 * detail pages rendered Edit and Delete to anyone who could read the record.
 */

const EMPLOYEE_ID = 'employee-existing';
const EMPLOYEE = {
  id: EMPLOYEE_ID,
  name: 'Dana Whitfield',
  email: 'dana@example.com',
  phoneNumber: '(212) 555-0100',
  address: '100 Broadway, New York, NY',
  startDate: '2024-03-14T00:00:00.000Z',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRelation: '',
  roleId: 'role-1',
  role: { id: 'role-1', name: 'PM', label: 'Project Manager' },
  departmentId: 'dept-1',
  status: 'ACTIVE',
  documents: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

async function mock(page: Page, permissions: Record<string, string[]>) {
  await page.route('**/api/v1/**', async (route, request) => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/v1/auth/')) {
      await route.fulfill({
        json: {
          session: { id: 's1', userId: 'u1', expiresAt: '2026-12-31T00:00:00Z' },
          user: { id: 'u1', name: 'A', email: 'a@e.com' },
        },
      });
      return;
    }
    if (path === '/api/v1/users/me/access') {
      await route.fulfill({
        json: {
          data: {
            userId: 'u1',
            role: 'admin',
            isDev: false,
            isAdmin: true,
            employeeId: 'e1',
            projectScope: 'all',
            permissions,
          },
        },
      });
      return;
    }
    if (path === `/api/v1/hr/employee/${EMPLOYEE_ID}`) {
      await route.fulfill({ json: { data: EMPLOYEE } });
      return;
    }
    await route.fulfill({ json: { data: [], pagination: { totalItems: 0, page: 1, limit: 10 } } });
  });
}

test('detail header renders title, meta, back link and overflow', async ({ page }) => {
  test.setTimeout(90_000);
  await mock(page, { employee: ['read', 'update', 'delete'] });
  await page.goto(`/app/hr/employees/${EMPLOYEE_ID}`);
  await expect(page.getByRole('heading', { name: 'Dana Whitfield' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText('Project Manager')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Edit Profile' })).toBeVisible();
  await page.getByRole('button', { name: 'More actions', exact: true }).click();
  await expect(page.getByRole('menuitem', { name: 'Deactivate Account' })).toBeVisible();
});

test('F8: detail actions hide without update/delete permission', async ({ page }) => {
  test.setTimeout(90_000);
  await mock(page, { employee: ['read'] });
  await page.goto(`/app/hr/employees/${EMPLOYEE_ID}`);
  await expect(page.getByRole('heading', { name: 'Dana Whitfield' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByRole('link', { name: 'Edit Profile' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'More actions', exact: true })).toHaveCount(0);
});
