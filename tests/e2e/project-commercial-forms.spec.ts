import { expect, test, type Page } from '@playwright/test';

const PROJECT_ID = 'project-commercial-forms';
const PO_ID = 'po-existing';
const RFQ_ID = 'rfq-existing';
const SCO_ID = 'sco-existing';
const NOW = '2026-06-11T00:00:00.000Z';

const tradeCategory = {
  id: 'trade-structural',
  type: 'TRADE_CATEGORY',
  name: 'STRUCTURAL',
  label: 'Structural Steel',
  order: 1,
  isDefault: false,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const unit = {
  id: 'unit-ea',
  type: 'UNIT',
  name: 'EA',
  label: 'EA',
  order: 1,
  isDefault: false,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const scoChangeType = {
  id: 'sco-change-owner',
  type: 'SCO_CHANGE_TYPE',
  name: 'OWNER_DIRECTED',
  label: 'Owner Directed',
  order: 1,
  isDefault: false,
  isActive: true,
  createdAt: NOW,
  updatedAt: NOW,
};

const costCode = {
  id: 'cost-general',
  name: 'General Requirements',
  code: '01-100',
  costCodeCategoryId: 'category-general',
  createdAt: NOW,
  updatedAt: NOW,
};

const vendor = {
  id: 'vendor-steel',
  name: 'Steel Supply Co',
  typeId: 'vendor-type-material',
  status: 'ACTIVE',
  paymentTerms: 'NET_45',
  address: '44 Fabrication Way',
  createdAt: NOW,
  updatedAt: NOW,
};

const projectDetail = {
  id: PROJECT_ID,
  name: 'Commercial Forms Project',
  description: 'Form regression coverage.',
  jobNumber: 'P-COM-001',
  contractNumber: 'C-COM-001',
  stageId: 'stage-active',
  divisionId: 'division-sca',
  status: 'ACTIVE',
  gcId: 'gc-main',
  leadPMId: 'employee-pm',
  contractValue: 1000000,
  streetAddress: '100 Site Road',
  city: 'New York',
  state: 'NY',
  zipCode: '10001',
  projectScheduleEntries: [],
  teamMembers: [],
  currentUserProjectRole: 'admin',
  capabilities: {
    canManage: true,
    canEdit: true,
    canCreateProjectDocuments: true,
    canManageTeam: true,
    actions: {
      purchaseOrder: { create: true, update: true },
      rfq: { create: true, update: true },
      subChangeOrder: { create: true, update: true },
      projectTeam: {},
      primeContract: {},
      invoice: {},
    },
  },
  createdAt: NOW,
  updatedAt: NOW,
};

const pagination = {
  currentPage: 1,
  totalPages: 1,
  hasNextPage: false,
  hasPreviousPage: false,
  totalItems: 1,
  itemsPerPage: 25,
};

function makePODetail(overrides: Record<string, unknown> = {}) {
  return {
    id: PO_ID,
    projectId: PROJECT_ID,
    vendorId: vendor.id,
    tradeCategoryId: tradeCategory.id,
    rfqId: null,
    poNumber: 'PO-00042',
    description: 'Existing structural steel package',
    status: { id: 'ISSUED', name: 'ISSUED', label: 'Issued', color: 'green' },
    leadTime: '21',
    expectedDate: '2026-08-15T00:00:00.000Z',
    shipToAddress: '100 Site Road, New York, NY 10001',
    address: vendor.address,
    subtotal: '2500.00',
    negotiatedDiscount: '0.00',
    shippingHandlingFee: '0.00',
    taxPercent: '8.875',
    taxAmount: '221.88',
    total: '2721.88',
    retainagePercent: '5',
    paymentTerms: 'NET_45',
    notes: 'Existing PO notes',
    vendor,
    project: { id: PROJECT_ID, name: projectDetail.name, jobNumber: projectDetail.jobNumber },
    lineItems: [
      {
        id: 'po-line-1',
        purchaseOrderId: PO_ID,
        lineNumber: 1,
        description: 'Existing steel beams',
        quantity: '10',
        unitId: unit.id,
        unit,
        unitPrice: '250',
        amount: '2500',
        costCodeId: costCode.id,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    attachments: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makePOListItem(overrides: Record<string, unknown> = {}) {
  return {
    id: PO_ID,
    projectId: PROJECT_ID,
    vendorId: vendor.id,
    tradeCategoryId: tradeCategory.id,
    rfqId: null,
    poNumber: 'PO-00042',
    description: 'Existing structural steel package',
    status: 'ISSUED',
    vendor,
    project: { id: PROJECT_ID, name: projectDetail.name, jobNumber: projectDetail.jobNumber },
    subtotal: '2500.00',
    negotiatedDiscount: '0.00',
    shippingHandlingFee: '0.00',
    taxPercent: '8.875',
    taxAmount: '221.88',
    total: '2721.88',
    paymentTerms: 'NET_45',
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeRFQDetail(overrides: Record<string, unknown> = {}) {
  return {
    id: RFQ_ID,
    projectId: PROJECT_ID,
    rfqNumber: 'RFQ-00017',
    title: 'Existing steel RFQ',
    description: 'Existing request for structural steel pricing',
    status: { id: 'DRAFT', name: 'DRAFT', label: 'Draft' },
    typeId: tradeCategory.id,
    type: tradeCategory,
    bidDeadline: '2026-07-20T00:00:00.000Z',
    project: { id: PROJECT_ID, name: projectDetail.name, jobNumber: projectDetail.jobNumber },
    deliverables: [
      {
        id: 'rfq-deliverable-1',
        rfqId: RFQ_ID,
        sequenceNumber: 1,
        name: 'Existing beam takeoff',
        description: 'Existing beam takeoff',
        specifications: '',
        quantity: 12,
        unitId: unit.id,
        unit,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ],
    invites: [],
    quotes: [],
    attachments: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeSCODetail(overrides: Record<string, unknown> = {}) {
  return {
    id: SCO_ID,
    scoNumber: 'SCO-00009',
    projectId: PROJECT_ID,
    purchaseOrderId: PO_ID,
    purchaseOrder: { id: PO_ID, poNumber: 'PO-00042', status: 'ISSUED', total: '2721.88' },
    title: 'Existing owner-directed change',
    description: 'Existing change description',
    date: '2026-09-01T00:00:00.000Z',
    amount: 700,
    status: { id: 'DRAFT', name: 'DRAFT', label: 'Draft', color: 'gray' },
    changeTypeId: scoChangeType.id,
    changeType: scoChangeType,
    negotiatedDiscount: 0,
    shippingHandlingFee: 0,
    taxPercent: 8.875,
    taxAmount: 62.13,
    lineItems: [
      {
        id: 'sco-line-1',
        lineNumber: 1,
        description: 'Existing added bracing',
        quantity: 2,
        unitId: unit.id,
        unit,
        unitPrice: 350,
        amount: 700,
        costCodeId: costCode.id,
      },
    ],
    attachments: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

type MockHandlers = {
  onCreatePO?: (payload: Record<string, unknown>) => void;
  onUpdatePO?: (payload: Record<string, unknown>) => void;
  onCreateRFQ?: (payload: Record<string, unknown>) => void;
  onUpdateRFQ?: (payload: Record<string, unknown>) => void;
  onCreateSCO?: (payload: Record<string, unknown>) => void;
  onUpdateSCO?: (payload: Record<string, unknown>) => void;
};

async function mockCommercialFormsApi(page: Page, handlers: MockHandlers = {}) {
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
            employeeId: 'employee-pm',
            projectScope: 'all',
            permissions: {
              project: ['view-all'],
              purchaseOrder: ['create', 'update'],
              rfq: ['create', 'update'],
              subChangeOrder: ['create', 'update'],
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

    if (method === 'GET' && path === `/api/v1/project/${PROJECT_ID}/cost-codes`) {
      await route.fulfill({ json: { data: [costCode] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/vendor') {
      await route.fulfill({ json: { data: [vendor], pagination: { ...pagination, itemsPerPage: 1000 } } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/lookup/type/TRADE_CATEGORY') {
      await route.fulfill({ json: { data: [tradeCategory] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/lookup/type/UNIT') {
      await route.fulfill({ json: { data: [unit] } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/lookup/type/SCO_CHANGE_TYPE') {
      await route.fulfill({ json: { data: [scoChangeType] } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/file/project/${PROJECT_ID}/folder`) {
      await route.fulfill({ json: { data: 'folder-project' } });
      return;
    }

    if (method === 'GET' && path.startsWith(`/api/v1/file/project/${PROJECT_ID}/folder/`)) {
      await route.fulfill({ json: { data: 'folder-subsection' } });
      return;
    }

    if (method === 'POST' && path === `/api/v1/file/project/${PROJECT_ID}/entity-folder`) {
      await route.fulfill({ json: { data: 'folder-entity' } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/rfq') {
      await route.fulfill({
        json: {
          data: [{ ...makeRFQDetail(), status: { id: 'AWARDED', name: 'AWARDED', label: 'Awarded' } }],
          pagination,
        },
      });
      return;
    }

    if (method === 'GET' && path === `/api/v1/rfq/${RFQ_ID}`) {
      await route.fulfill({ json: { data: makeRFQDetail() } });
      return;
    }

    if (method === 'POST' && path === '/api/v1/rfq') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onCreateRFQ?.(payload);
      await route.fulfill({ json: { data: makeRFQDetail({ id: 'rfq-created', ...payload }) } });
      return;
    }

    if (method === 'PUT' && path === '/api/v1/rfq') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onUpdateRFQ?.(payload);
      await route.fulfill({ json: { data: makeRFQDetail(payload) } });
      return;
    }

    if (method === 'GET' && path === '/api/v1/purchase-order') {
      await route.fulfill({ json: { data: [makePOListItem()], pagination } });
      return;
    }

    if (
      method === 'GET' &&
      (path === `/api/v1/purchase-order/${PO_ID}` || path === '/api/v1/purchase-order/po-created')
    ) {
      await route.fulfill({ json: { data: makePODetail() } });
      return;
    }

    if (method === 'POST' && path === '/api/v1/purchase-order') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onCreatePO?.(payload);
      await route.fulfill({ json: { data: makePODetail({ id: 'po-created', ...payload }) } });
      return;
    }

    if (method === 'PUT' && path === '/api/v1/purchase-order') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onUpdatePO?.(payload);
      await route.fulfill({ json: { data: makePODetail(payload) } });
      return;
    }

    if (method === 'GET' && path === `/api/v1/sub-change-order/${SCO_ID}`) {
      await route.fulfill({ json: { data: makeSCODetail() } });
      return;
    }

    if (method === 'POST' && path === '/api/v1/sub-change-order') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onCreateSCO?.(payload);
      await route.fulfill({ json: { data: makeSCODetail({ id: 'sco-created', ...payload }) } });
      return;
    }

    if (method === 'PUT' && path === '/api/v1/sub-change-order') {
      const payload = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
      handlers.onUpdateSCO?.(payload);
      await route.fulfill({ json: { data: makeSCODetail(payload) } });
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

async function openPOCreate(page: Page) {
  await page.goto(`/app/project/${PROJECT_ID}/purchase-orders/create`);
  await expect(page.getByRole('heading', { name: 'PO Details' })).toBeVisible();
}

async function openPOEdit(page: Page) {
  await page.goto(`/app/project/${PROJECT_ID}/purchase-orders/${PO_ID}/edit`);
  await expect(page.getByRole('heading', { name: 'PO Details' })).toBeVisible();
}

async function openRFQCreate(page: Page) {
  await page.goto(`/app/project/${PROJECT_ID}/rfqs/create`);
  await expect(page.getByRole('heading', { name: 'RFQ Details' })).toBeVisible();
}

async function openRFQEdit(page: Page) {
  await page.goto(`/app/project/${PROJECT_ID}/rfqs/${RFQ_ID}/edit`);
  await expect(page.getByRole('heading', { name: 'RFQ Details' })).toBeVisible();
}

async function openSCOCreate(page: Page) {
  await page.goto(`/app/project/${PROJECT_ID}/sub-change-order/create`);
  await expect(page.getByRole('heading', { name: 'Sub Change Order Details' })).toBeVisible();
}

async function openSCOEdit(page: Page) {
  await page.goto(`/app/project/${PROJECT_ID}/sub-change-order/${SCO_ID}/edit`);
  await expect(page.getByRole('heading', { name: 'Sub Change Order Details' })).toBeVisible();
}

test.describe('project commercial create and update forms', () => {
  test('creates a purchase order with required details and line item fields', async ({ page }) => {
    let createPayload: Record<string, unknown> | undefined;
    await mockCommercialFormsApi(page, { onCreatePO: (payload) => (createPayload = payload) });
    await openPOCreate(page);

    await chooseOption(page, 'po-vendor-select', vendor.name);
    await chooseOption(page, 'po-trade-category-select', tradeCategory.label);
    await page.getByTestId('po-description-input').fill('New steel package');
    await page.getByTestId('po-expected-date-input').fill('2026-08-01');
    await chooseOption(page, 'po-payment-terms-select', 'Net 45');
    await page.getByTestId('po-lead-time-input').fill('14');
    await page.getByTestId('po-retainage-percent-input').fill('5');
    await page.getByTestId('po-address-input').fill(vendor.address);
    await page.getByTestId('po-ship-to-address-input').fill('100 Site Road');
    await page.getByTestId('lineItems-0-description-input').fill('Wide flange beams');
    await chooseOption(page, 'lineItems-0-cost-code-select', '01-100 - General Requirements');
    await page.getByTestId('lineItems-0-quantity-input').fill('2.55');
    await chooseOption(page, 'lineItems-0-unit-select', unit.label);
    await page.getByTestId('lineItems-0-unit-price-input').fill('19.995');

    await page.getByRole('button', { name: 'Create PO' }).click();

    await expect.poll(() => createPayload?.projectId).toBe(PROJECT_ID);
    expect(createPayload).toMatchObject({
      projectId: PROJECT_ID,
      vendorId: vendor.id,
      tradeCategoryId: tradeCategory.id,
      description: 'New steel package',
      expectedDate: '2026-08-01',
      paymentTerms: 'NET_45',
      leadTime: '14',
      retainagePercent: 5,
      lineItems: [
        {
          description: 'Wide flange beams',
          costCodeId: costCode.id,
          quantity: 2.55,
          unitId: unit.id,
          unitPrice: 19.995,
        },
      ],
    });
  });

  test('prefills and preserves purchase order fields on edit submit', async ({ page }) => {
    let updatePayload: Record<string, unknown> | undefined;
    await mockCommercialFormsApi(page, { onUpdatePO: (payload) => (updatePayload = payload) });
    await openPOEdit(page);

    await expect(page.getByTestId('po-vendor-select')).toContainText(vendor.name);
    await expect(page.getByTestId('po-trade-category-select')).toContainText(tradeCategory.label);
    await expect(page.getByTestId('po-description-input')).toHaveValue('Existing structural steel package');
    await expect(page.getByTestId('po-expected-date-input')).toHaveValue('2026-08-15');
    await expect(page.getByTestId('po-payment-terms-select')).toContainText('Net 45');
    await expect(page.getByTestId('lineItems-0-description-input')).toHaveValue('Existing steel beams');
    await expect(page.getByTestId('lineItems-0-cost-code-select')).toContainText('01-100 - General Requirements');
    await expect(page.getByTestId('lineItems-0-unit-select')).toContainText(unit.label);

    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => updatePayload?.id).toBe(PO_ID);
    expect(updatePayload).toMatchObject({
      id: PO_ID,
      projectId: PROJECT_ID,
      vendorId: vendor.id,
      tradeCategoryId: tradeCategory.id,
      expectedDate: '2026-08-15',
      paymentTerms: 'NET_45',
      lineItems: [
        {
          description: 'Existing steel beams',
          costCodeId: costCode.id,
          quantity: 10,
          unitId: unit.id,
          unitPrice: 250,
        },
      ],
    });
  });

  test('creates an RFQ with required details and deliverables', async ({ page }) => {
    let createPayload: Record<string, unknown> | undefined;
    await mockCommercialFormsApi(page, { onCreateRFQ: (payload) => (createPayload = payload) });
    await openRFQCreate(page);

    await page.getByTestId('rfq-bid-deadline-input').fill('2026-07-30');
    await chooseOption(page, 'rfq-type-select', tradeCategory.label);
    await page.getByTestId('rfq-title-input').fill('New structural RFQ');
    await page.getByTestId('rfq-description-input').fill('Quote the structural steel scope.');
    await page.getByTestId('deliverables-0-description-input').fill('Beam takeoff');
    await page.getByTestId('deliverables-0-quantity-input').fill('3.125');
    await chooseOption(page, 'deliverables-0-unit-select', unit.label);

    await page.getByRole('button', { name: 'Create RFQ' }).click();

    await expect.poll(() => createPayload?.projectId).toBe(PROJECT_ID);
    expect(createPayload).toMatchObject({
      projectId: PROJECT_ID,
      title: 'New structural RFQ',
      description: 'Quote the structural steel scope.',
      typeId: tradeCategory.id,
      bidDeadline: '2026-07-30',
      deliverables: [
        {
          description: 'Beam takeoff',
          name: 'Beam takeoff',
          quantity: 3.125,
          unitId: unit.id,
        },
      ],
    });
  });

  test('prefills and preserves RFQ fields on edit submit', async ({ page }) => {
    let updatePayload: Record<string, unknown> | undefined;
    await mockCommercialFormsApi(page, { onUpdateRFQ: (payload) => (updatePayload = payload) });
    await openRFQEdit(page);

    await expect(page.getByTestId('rfq-bid-deadline-input')).toHaveValue('2026-07-20');
    await expect(page.getByTestId('rfq-type-select')).toContainText(tradeCategory.label);
    await expect(page.getByTestId('rfq-title-input')).toHaveValue('Existing steel RFQ');
    await expect(page.getByTestId('rfq-description-input')).toHaveValue(
      'Existing request for structural steel pricing'
    );
    await expect(page.getByTestId('deliverables-0-description-input')).toHaveValue(
      'Existing beam takeoff'
    );
    await expect(page.getByTestId('deliverables-0-unit-select')).toContainText(unit.label);

    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => updatePayload?.id).toBe(RFQ_ID);
    expect(updatePayload).toMatchObject({
      id: RFQ_ID,
      title: 'Existing steel RFQ',
      description: 'Existing request for structural steel pricing',
      typeId: tradeCategory.id,
      bidDeadline: '2026-07-20',
      deliverables: [
        {
          description: 'Existing beam takeoff',
          name: 'Existing beam takeoff',
          quantity: 12,
          unitId: unit.id,
        },
      ],
    });
  });

  test('creates an SCO against an issued PO', async ({ page }) => {
    let createPayload: Record<string, unknown> | undefined;
    await mockCommercialFormsApi(page, { onCreateSCO: (payload) => (createPayload = payload) });
    await openSCOCreate(page);

    await chooseOption(page, 'sco-purchase-order-select', 'PO-00042');
    await page.getByTestId('sco-date-input').fill('2026-09-15');
    await chooseOption(page, 'sco-change-type-select', scoChangeType.label);
    await page.getByTestId('sco-title-input').fill('New added bracing');
    await page.getByTestId('sco-description-input').fill('Add bracing per field direction.');
    await page.getByTestId('lineItems-0-description-input').fill('Added bracing');
    await chooseOption(page, 'lineItems-0-cost-code-select', '01-100 - General Requirements');
    await page.getByTestId('lineItems-0-quantity-input').fill('2.55');
    await chooseOption(page, 'lineItems-0-unit-select', unit.label);
    await page.getByTestId('lineItems-0-unit-price-input').fill('19.995');

    await page.getByRole('button', { name: 'Create SCO' }).click();

    await expect.poll(() => createPayload?.projectId).toBe(PROJECT_ID);
    expect(createPayload).toMatchObject({
      projectId: PROJECT_ID,
      purchaseOrderId: PO_ID,
      date: '2026-09-15',
      changeTypeId: scoChangeType.id,
      title: 'New added bracing',
      description: 'Add bracing per field direction.',
      lineItems: [
        {
          description: 'Added bracing',
          costCodeId: costCode.id,
          quantity: 2.55,
          unitId: unit.id,
          unitPrice: 19.995,
        },
      ],
    });
  });

  test('prefills and preserves SCO fields on edit submit', async ({ page }) => {
    let updatePayload: Record<string, unknown> | undefined;
    await mockCommercialFormsApi(page, { onUpdateSCO: (payload) => (updatePayload = payload) });
    await openSCOEdit(page);

    await expect(page.getByTestId('sco-purchase-order-select')).toContainText('PO-00042');
    await expect(page.getByTestId('sco-date-input')).toHaveValue('2026-09-01');
    await expect(page.getByTestId('sco-change-type-select')).toContainText(scoChangeType.label);
    await expect(page.getByTestId('sco-title-input')).toHaveValue('Existing owner-directed change');
    await expect(page.getByTestId('sco-description-input')).toHaveValue('Existing change description');
    await expect(page.getByTestId('lineItems-0-description-input')).toHaveValue(
      'Existing added bracing'
    );
    await expect(page.getByTestId('lineItems-0-cost-code-select')).toContainText(
      '01-100 - General Requirements'
    );
    await expect(page.getByTestId('lineItems-0-unit-select')).toContainText(unit.label);

    await page.getByRole('button', { name: 'Save Changes' }).click();

    await expect.poll(() => updatePayload?.id).toBe(SCO_ID);
    expect(updatePayload).toMatchObject({
      id: SCO_ID,
      projectId: PROJECT_ID,
      purchaseOrderId: PO_ID,
      date: '2026-09-01',
      changeTypeId: scoChangeType.id,
      title: 'Existing owner-directed change',
      description: 'Existing change description',
      taxPercent: 8.875,
      lineItems: [
        {
          description: 'Existing added bracing',
          costCodeId: costCode.id,
          quantity: 2,
          unitId: unit.id,
          unitPrice: 350,
        },
      ],
    });
  });
});
