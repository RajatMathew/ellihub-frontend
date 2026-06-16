import { expect, test, type Page } from '@playwright/test';

const PROJECT_ID = 'project-invoice-forms';
const INVOICE_ID = 'invoice-existing';
const PO_ID = 'po-issued';
const VENDOR_ID = 'vendor-invoice';
const NOW = '2026-06-11T00:00:00.000Z';

const pagination = {
  currentPage: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  totalItems: 1,
  itemsPerPage: 25,
};

const vendor = {
  id: VENDOR_ID,
  name: 'Invoice Vendor',
  status: 'ACTIVE',
  paymentTerms: 'NET_30',
  createdAt: NOW,
  updatedAt: NOW,
};

const projectDetail = {
  id: PROJECT_ID,
  name: 'Invoice Form Project',
  description: 'Invoice form regression coverage.',
  jobNumber: 'P-INV-001',
  stageId: 'stage-active',
  gcId: 'gc-main',
  status: 'ACTIVE',
  capabilities: {
    canManage: true,
    canEdit: true,
    actions: {
      invoice: { create: true, update: true },
      purchaseOrder: {},
      rfq: {},
      subChangeOrder: {},
      projectTeam: {},
      primeContract: {},
    },
  },
  projectScheduleEntries: [],
  teamMembers: [],
  createdAt: NOW,
  updatedAt: NOW,
};

function makePO() {
  return {
    id: PO_ID,
    projectId: PROJECT_ID,
    vendorId: VENDOR_ID,
    vendor,
    poNumber: 'PO-INV-001',
    description: 'Issued invoice PO',
    status: 'ISSUED',
    total: '2500.00',
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeUploadedFile(name = 'invoice-backup.txt') {
  return {
    id: 'document-uploaded',
    name,
    displayName: name,
    mimeType: 'text/plain',
    size: 20,
    parentId: 'folder-invoice',
    type: 'FILE',
    isDeletable: true,
    private: true,
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: INVOICE_ID,
    projectId: PROJECT_ID,
    vendorId: VENDOR_ID,
    purchaseOrderId: PO_ID,
    invoiceNumber: 'INV-EXISTING-001',
    invoiceDate: '2026-06-01T00:00:00.000Z',
    dueDate: '2026-07-01T00:00:00.000Z',
    totalAmount: 1200,
    taxAmount: 106.5,
    taxRate: 8.875,
    notes: 'Existing invoice notes',
    relatedSCOIds: [],
    vendor,
    purchaseOrder: { id: PO_ID, poNumber: 'PO-INV-001', vendorId: VENDOR_ID, status: 'ISSUED' },
    project: { id: PROJECT_ID, name: projectDetail.name, jobNumber: projectDetail.jobNumber },
    attachments: [
      {
        id: 'invoice-attachment-1',
        documentId: 'document-existing',
        document: {
          id: 'document-existing',
          name: 'existing-invoice.pdf',
          mimeType: 'application/pdf',
          size: 128,
        },
      },
    ],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

type MockHandlers = {
  onCreate?: (payload: Record<string, unknown>) => void;
  onUpdate?: (payload: Record<string, unknown>) => void;
};

async function mockInvoiceApi(page: Page, handlers: MockHandlers = {}) {
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
            permissions: { invoice: ['create', 'update', 'read'] },
          },
        },
      });
      return;
    }

    if (method === 'GET' && path === `/api/v1/project/${PROJECT_ID}`) {
      await route.fulfill({ json: { data: projectDetail } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/vendor') {
      await route.fulfill({ json: { data: [vendor], pagination: { ...pagination, itemsPerPage: 1000 } } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/purchase-order') {
      await route.fulfill({ json: { data: [makePO()], pagination } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/sub-change-order') {
      await route.fulfill({ json: { data: [], pagination } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/invoice/${INVOICE_ID}`) {
      await route.fulfill({ json: { data: makeInvoice() } });
      return;
    }

    if (
      method === 'GET' &&
      (path === '/api/v1/invoice/invoice-created' || path === `/api/v1/invoice/${INVOICE_ID}`)
    ) {
      await route.fulfill({ json: { data: makeInvoice() } });
      return;
    }

    if (method === 'POST' && path === '/api/v1/invoice') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onCreate?.(payload);
      await route.fulfill({ json: { data: makeInvoice({ id: 'invoice-created', ...payload }) } });
      return;
    }

    if (method === 'PUT' && path === '/api/v1/invoice') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onUpdate?.(payload);
      await route.fulfill({ json: { data: makeInvoice(payload) } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/file/project/${PROJECT_ID}/folder`) {
      await route.fulfill({ json: { data: 'folder-project' } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/file/project/${PROJECT_ID}/folder/INVOICE`) {
      await route.fulfill({ json: { data: 'folder-invoice' } });
      return;
    }

    if (method === 'POST' && path === '/api/v1/file/upload') {
      await route.fulfill({ json: { data: null } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/file/folder/folder-invoice') {
      await route.fulfill({
        json: {
          data: {
            id: 'folder-invoice',
            name: 'Invoices',
            type: 'FOLDER',
            isDeletable: false,
            private: true,
            children: [makeUploadedFile()],
            createdAt: NOW,
            updatedAt: NOW,
          },
        },
      });
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

test.describe('invoice create and edit form', () => {
  test('creates an invoice with an uploaded attachment', async ({ page }) => {
    let createPayload: Record<string, unknown> | undefined;
    await mockInvoiceApi(page, { onCreate: (payload) => (createPayload = payload) });

    await page.goto(`/app/project/${PROJECT_ID}/invoices/create`);
    await expect(page.getByRole('heading', { name: 'Invoice Details' })).toBeVisible();

    await chooseOption(page, 'invoice-purchase-order-select', 'PO-INV-001');
    await expect(page.getByTestId('invoice-vendor-select')).toContainText(vendor.name);
    await page.getByTestId('invoice-number-input').fill('INV-CREATED-001');
    await page.getByTestId('invoice-date-input').fill('2026-06-15');
    await page.getByTestId('invoice-due-date-input').fill('2026-07-15');
    await page.getByTestId('invoice-notes-input').fill('Created invoice notes');
    await page.getByTestId('invoice-total-amount-input').fill('1000');
    await page.getByTestId('invoice-tax-rate-input').fill('8.875');
    await page.getByTestId('invoice-file-input').setInputFiles({
      name: 'invoice-backup.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invoice backup file'),
    });

    await page.getByRole('button', { name: 'Create Invoice' }).click();

    await expect.poll(() => createPayload?.invoiceNumber).toBe('INV-CREATED-001');
    expect(createPayload).toMatchObject({
      projectId: PROJECT_ID,
      vendorId: VENDOR_ID,
      purchaseOrderId: PO_ID,
      invoiceNumber: 'INV-CREATED-001',
      invoiceDate: '2026-06-15',
      dueDate: '2026-07-15',
      totalAmount: 1000,
      taxAmount: 88.75,
      taxRate: 8.875,
      notes: 'Created invoice notes',
      relatedSCOIds: [],
      attachments: ['document-uploaded'],
    });
  });

  test('prefills and preserves invoice fields on edit submit', async ({ page }) => {
    let updatePayload: Record<string, unknown> | undefined;
    await mockInvoiceApi(page, { onUpdate: (payload) => (updatePayload = payload) });

    await page.goto(`/app/project/${PROJECT_ID}/invoices/${INVOICE_ID}/edit`);
    await expect(page.getByRole('heading', { name: 'Invoice Details' })).toBeVisible();

    await expect(page.getByTestId('invoice-purchase-order-select')).toContainText('PO-INV-001');
    await expect(page.getByTestId('invoice-vendor-select')).toContainText(vendor.name);
    await expect(page.getByTestId('invoice-number-input')).toHaveValue('INV-EXISTING-001');
    await expect(page.getByTestId('invoice-date-input')).toHaveValue('2026-06-01');
    await expect(page.getByTestId('invoice-due-date-input')).toHaveValue('2026-07-01');
    await expect(page.getByTestId('invoice-total-amount-input')).toHaveValue('1200');
    await expect(page.getByTestId('invoice-tax-rate-input')).toHaveValue('8.875');
    await expect(page.getByTestId('invoice-notes-input')).toHaveValue('Existing invoice notes');

    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => updatePayload?.id).toBe(INVOICE_ID);
    expect(updatePayload).toMatchObject({
      id: INVOICE_ID,
      projectId: PROJECT_ID,
      vendorId: VENDOR_ID,
      purchaseOrderId: PO_ID,
      invoiceNumber: 'INV-EXISTING-001',
      invoiceDate: '2026-06-01',
      dueDate: '2026-07-01',
      totalAmount: 1200,
      taxAmount: 106.5,
      taxRate: 8.875,
      notes: 'Existing invoice notes',
      relatedSCOIds: [],
    });
  });
});
