import { expect, test, type Page } from '@playwright/test';

const NOW = '2026-06-11T00:00:00.000Z';
const GC_ID = 'gc-existing';
const VENDOR_ID = 'vendor-existing';
const CONTACT_ID = 'contact-existing';

const gcType = {
  id: 'gc-type-cm',
  type: 'GC_TYPE',
  name: 'CM',
  label: 'Construction Manager',
  order: 1,
  isDefault: false,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const vendorType = {
  id: 'vendor-type-material',
  type: 'VENDOR_TYPE',
  name: 'MATERIAL',
  label: 'Material Supplier',
  order: 1,
  isDefault: false,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const role = {
  id: 'role-pm',
  type: 'PROFESSIONAL_ROLE',
  name: 'PROJECT_MANAGER',
  label: 'Project Manager',
  order: 1,
  isDefault: false,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const pagination = {
  currentPage: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  totalItems: 1,
  itemsPerPage: 1000,
};
const routeLoadTimeout = 15_000;

function makeGC(overrides: Record<string, unknown> = {}) {
  return {
    id: GC_ID,
    name: 'Existing GC',
    gcTypeId: gcType.id,
    gcType,
    status: 'ACTIVE',
    email: 'existing.gc@example.com',
    phone: '(212) 555-0100',
    address: '10 GC Ave',
    website: 'https://existing-gc.example.com',
    paymentTerms: 'NET_45',
    retainagePercent: 7.5,
    contactLinks: [],
    contacts: [],
    projects: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeVendor(overrides: Record<string, unknown> = {}) {
  return {
    id: VENDOR_ID,
    name: 'Existing Vendor',
    typeId: vendorType.id,
    type: vendorType,
    status: 'ACTIVE',
    email: 'existing.vendor@example.com',
    taxId: '12-3456789',
    website: 'https://existing-vendor.example.com',
    paymentTerms: 'NET_60',
    categoryTags: [],
    contactLinks: [],
    contacts: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeContact(overrides: Record<string, unknown> = {}) {
  return {
    id: CONTACT_ID,
    fullName: 'Existing Contact',
    professionalRoleId: role.id,
    professionalRole: role,
    email: [{ email: 'existing.contact@example.com', label: 'Work', isPrimary: true }],
    phoneNumber: [{ number: '(212) 555-0111', label: 'Office', isPrimary: true }],
    tags: [],
    vendorLinks: [],
    gcLinks: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

type MockHandlers = {
  onCreateGC?: (payload: Record<string, unknown>) => void;
  onUpdateGC?: (payload: Record<string, unknown>) => void;
  onCreateVendor?: (payload: Record<string, unknown>) => void;
  onUpdateVendor?: (payload: Record<string, unknown>) => void;
  onCreateContact?: (payload: Record<string, unknown>) => void;
  onUpdateContact?: (payload: Record<string, unknown>) => void;
};

async function mockDirectoryApi(page: Page, handlers: MockHandlers = {}) {
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
            employeeId: 'employee-admin',
            projectScope: 'all',
            permissions: {
              gc: ['create', 'update', 'read'],
              vendor: ['create', 'update', 'read'],
              contact: ['create', 'update', 'read'],
            },
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === '/api/v1/lookup/type/GC_TYPE') {
      await route.fulfill({ json: { data: [gcType] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/lookup/type/VENDOR_TYPE') {
      await route.fulfill({ json: { data: [vendorType] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/lookup/type/PROFESSIONAL_ROLE') {
      await route.fulfill({ json: { data: [role] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/contact') {
      await route.fulfill({ json: { data: [makeContact()], pagination } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/contact/${CONTACT_ID}`) {
      await route.fulfill({ json: { data: makeContact() } });
      return;
    }

    if (method === 'POST' && path === '/api/v1/contact') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onCreateContact?.(payload);
      await route.fulfill({ json: { data: makeContact({ id: 'contact-created', ...payload }) } });
      return;
    }

    if (method === 'PUT' && path === '/api/v1/contact') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onUpdateContact?.(payload);
      await route.fulfill({ json: { data: makeContact(payload) } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/gc') {
      await route.fulfill({ json: { data: [makeGC()], pagination } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/gc/${GC_ID}`) {
      await route.fulfill({ json: { data: makeGC() } });
      return;
    }

    if (method === 'POST' && path === '/api/v1/gc') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onCreateGC?.(payload);
      await route.fulfill({ json: { data: makeGC({ id: 'gc-created', ...payload }) } });
      return;
    }

    if (method === 'PUT' && path === '/api/v1/gc') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onUpdateGC?.(payload);
      await route.fulfill({ json: { data: makeGC(payload) } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/vendor') {
      await route.fulfill({ json: { data: [makeVendor()], pagination } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/vendor/${VENDOR_ID}`) {
      await route.fulfill({ json: { data: makeVendor() } });
      return;
    }

    if (method === 'POST' && path === '/api/v1/vendor') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onCreateVendor?.(payload);
      await route.fulfill({ json: { data: makeVendor({ id: 'vendor-created', ...payload }) } });
      return;
    }

    if (method === 'PUT' && path === '/api/v1/vendor') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onUpdateVendor?.(payload);
      await route.fulfill({ json: { data: makeVendor(payload) } });
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

test.describe('directory create and edit forms', () => {
  test('creates a general contractor', async ({ page }) => {
    let createPayload: Record<string, unknown> | undefined;
    await mockDirectoryApi(page, { onCreateGC: (payload) => (createPayload = payload) });
    await page.goto('/app/directory/general-contractors/create');
    await expect(page.getByRole('heading', { name: 'General Information' })).toBeVisible({
      timeout: routeLoadTimeout,
    });

    await page.getByTestId('gc-name-input').fill('New GC');
    await chooseOption(page, 'gc-type-select', gcType.label);
    await page.getByTestId('gc-website-input').fill('https://new-gc.example.com');
    await page.getByTestId('gc-email-input').fill('new.gc@example.com');
    await page.getByTestId('gc-phone-input').fill('(212) 555-0199');
    await page.getByTestId('gc-address-input').fill('20 GC Ave');
    await chooseOption(page, 'gc-payment-terms-select', 'Net 45');
    await page.getByTestId('gc-retainage-percent-input').fill('5');
    await page.getByRole('button', { name: 'Create GC' }).click();

    await expect.poll(() => createPayload?.name).toBe('New GC');
    expect(createPayload).toMatchObject({
      name: 'New GC',
      gcTypeId: gcType.id,
      website: 'https://new-gc.example.com',
      email: 'new.gc@example.com',
      phone: '(212) 555-0199',
      address: '20 GC Ave',
      paymentTerms: 'NET_45',
      retainagePercent: 5,
      status: 'ACTIVE',
    });
  });

  test('prefills and preserves a general contractor on edit submit', async ({ page }) => {
    let updatePayload: Record<string, unknown> | undefined;
    await mockDirectoryApi(page, { onUpdateGC: (payload) => (updatePayload = payload) });
    await page.goto(`/app/directory/general-contractors/${GC_ID}/edit`);
    await expect(page.getByRole('heading', { name: 'General Information' })).toBeVisible({
      timeout: routeLoadTimeout,
    });

    await expect(page.getByTestId('gc-name-input')).toHaveValue('Existing GC');
    await expect(page.getByTestId('gc-type-select')).toContainText(gcType.label);
    await expect(page.getByTestId('gc-website-input')).toHaveValue('https://existing-gc.example.com');
    await expect(page.getByTestId('gc-payment-terms-select')).toContainText('Net 45');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => updatePayload?.id).toBe(GC_ID);
    expect(updatePayload).toMatchObject({
      id: GC_ID,
      name: 'Existing GC',
      gcTypeId: gcType.id,
      paymentTerms: 'NET_45',
      retainagePercent: 7.5,
      status: 'ACTIVE',
    });
  });

  test('creates a vendor', async ({ page }) => {
    let createPayload: Record<string, unknown> | undefined;
    await mockDirectoryApi(page, { onCreateVendor: (payload) => (createPayload = payload) });
    await page.goto('/app/directory/vendors/create');
    await expect(page.getByRole('heading', { name: 'Info' })).toBeVisible({
      timeout: routeLoadTimeout,
    });

    await page.getByTestId('vendor-name-input').fill('New Vendor');
    await page.getByTestId('vendor-email-input').fill('new.vendor@example.com');
    await chooseOption(page, 'vendor-type-select', vendorType.label);
    await page.getByTestId('vendor-tax-id-input').fill('98-7654321');
    await page.getByTestId('vendor-website-input').fill('https://new-vendor.example.com');
    await chooseOption(page, 'vendor-payment-terms-select', 'Net 60');
    await page.getByRole('button', { name: 'Create Vendor' }).click();

    await expect.poll(() => createPayload?.name).toBe('New Vendor');
    expect(createPayload).toMatchObject({
      name: 'New Vendor',
      email: 'new.vendor@example.com',
      typeId: vendorType.id,
      taxId: '98-7654321',
      website: 'https://new-vendor.example.com',
      paymentTerms: 'NET_60',
      status: 'ACTIVE',
    });
  });

  test('prefills and preserves a vendor on edit submit', async ({ page }) => {
    let updatePayload: Record<string, unknown> | undefined;
    await mockDirectoryApi(page, { onUpdateVendor: (payload) => (updatePayload = payload) });
    await page.goto(`/app/directory/vendors/${VENDOR_ID}/edit`);
    await expect(page.getByRole('heading', { name: 'Info' })).toBeVisible({
      timeout: routeLoadTimeout,
    });

    await expect(page.getByTestId('vendor-name-input')).toHaveValue('Existing Vendor');
    await expect(page.getByTestId('vendor-email-input')).toHaveValue('existing.vendor@example.com');
    await expect(page.getByTestId('vendor-type-select')).toContainText(vendorType.label);
    await expect(page.getByTestId('vendor-payment-terms-select')).toContainText('Net 60');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => updatePayload?.id).toBe(VENDOR_ID);
    expect(updatePayload).toMatchObject({
      id: VENDOR_ID,
      name: 'Existing Vendor',
      email: 'existing.vendor@example.com',
      typeId: vendorType.id,
      taxId: '12-3456789',
      website: 'https://existing-vendor.example.com',
      paymentTerms: 'NET_60',
      status: 'ACTIVE',
    });
  });

  test('creates a contact', async ({ page }) => {
    let createPayload: Record<string, unknown> | undefined;
    await mockDirectoryApi(page, { onCreateContact: (payload) => (createPayload = payload) });
    await page.goto('/app/directory/contacts/create');
    await expect(page.getByRole('heading', { name: 'Contact Info' })).toBeVisible({
      timeout: routeLoadTimeout,
    });

    await page.getByTestId('contact-full-name-input').fill('New Contact');
    await chooseOption(page, 'contact-role-select', role.label);
    await page.getByTestId('contact-email-input').fill('new.contact@example.com');
    await page.getByTestId('contact-phone-input').fill('(212) 555-0188');
    await page.getByRole('button', { name: 'Create Contact' }).click();

    await expect.poll(() => createPayload?.fullName).toBe('New Contact');
    expect(createPayload).toMatchObject({
      fullName: 'New Contact',
      professionalRoleId: role.id,
      email: 'new.contact@example.com',
      phoneNumber: '(212) 555-0188',
      tags: [],
    });
  });

  test('prefills and preserves a contact on edit submit', async ({ page }) => {
    let updatePayload: Record<string, unknown> | undefined;
    await mockDirectoryApi(page, { onUpdateContact: (payload) => (updatePayload = payload) });
    await page.goto(`/app/directory/contacts/${CONTACT_ID}/edit`);
    await expect(page.getByRole('heading', { name: 'Contact Info' })).toBeVisible({
      timeout: routeLoadTimeout,
    });

    await expect(page.getByTestId('contact-full-name-input')).toHaveValue('Existing Contact');
    await expect(page.getByTestId('contact-role-select')).toContainText(role.label);
    await expect(page.getByTestId('contact-email-input')).toHaveValue('existing.contact@example.com');
    await expect(page.getByTestId('contact-phone-input')).toHaveValue('(212) 555-0111');
    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => updatePayload?.id).toBe(CONTACT_ID);
    expect(updatePayload).toMatchObject({
      id: CONTACT_ID,
      fullName: 'Existing Contact',
      professionalRoleId: role.id,
      email: 'existing.contact@example.com',
      phoneNumber: '(212) 555-0111',
      tags: [],
    });
  });
});
