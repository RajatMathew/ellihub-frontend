/**
 * Local sandbox seed data — transcribed from Peter's real ElliHub screenshots
 * (2026-06-16). This stands in for cofound's backend so the whole app is
 * clickable offline. KPI/stat cards use the real totals (e.g. 381 vendors);
 * list pages paginate honestly over the seeded rows.
 *
 * Only loaded when DEV_AUTH_BYPASS is on (see mock/adapter.ts), so it never
 * affects a production build.
 */

export const makePagination = (totalItems: number, page = 1, itemsPerPage = 25) => {
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  return {
    currentPage: page,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
    totalItems,
    itemsPerPage,
  };
};

/* ------------------------------------------------------------------ lookups */

export const lookupsByType: Record<string, any[]> = {
  TRADE_CATEGORY: [
    { id: 'tc-1', type: 'TRADE_CATEGORY', label: 'Casework', name: 'Casework', order: 0, isDefault: true, isActive: true },
    { id: 'tc-2', type: 'TRADE_CATEGORY', label: 'Millwork', name: 'Millwork', order: 1, isActive: true },
    { id: 'tc-3', type: 'TRADE_CATEGORY', label: 'Finish Carpentry', name: 'Finish Carpentry', order: 2, isActive: true },
    { id: 'tc-4', type: 'TRADE_CATEGORY', label: 'Hardware', name: 'Hardware', order: 3, isActive: true },
    { id: 'tc-5', type: 'TRADE_CATEGORY', label: 'Countertops', name: 'Countertops', order: 4, isActive: true },
  ],
  PROJECT_STATUS: [
    { id: 'ps-active', type: 'PROJECT_STATUS', label: 'Active', name: 'Active', color: '#22c55e', order: 0, isDefault: true, isActive: true },
    { id: 'ps-inactive', type: 'PROJECT_STATUS', label: 'Inactive', name: 'Inactive', color: '#6b7280', order: 1, isActive: true },
    { id: 'ps-closed', type: 'PROJECT_STATUS', label: 'Closed', name: 'Closed', color: '#ef4444', order: 2, isActive: true },
    { id: 'ps-completed', type: 'PROJECT_STATUS', label: 'Completed', name: 'Completed', color: '#3b82f6', order: 3, isActive: true },
  ],
  PROJECT_DIVISION: [
    { id: 'div-sca', type: 'PROJECT_DIVISION', label: 'SCA', name: 'SCA', order: 0, isActive: true },
    { id: 'div-inst', type: 'PROJECT_DIVISION', label: 'INSTITUTIONAL', name: 'INSTITUTIONAL', order: 1, isActive: true },
    { id: 'div-public', type: 'PROJECT_DIVISION', label: 'PUBLIC', name: 'PUBLIC', order: 2, isActive: true },
    { id: 'div-state', type: 'PROJECT_DIVISION', label: 'PUBLIC / STATE', name: 'PUBLIC / STATE', order: 3, isActive: true },
  ],
  PROJECT_STAGE: [
    { id: 'stage-fabrication', type: 'PROJECT_STAGE', label: 'Fabrication', name: 'Fabrication', order: 0, isActive: true },
    { id: 'stage-installation', type: 'PROJECT_STAGE', label: 'Installation', name: 'Installation', order: 1, isActive: true },
    { id: 'stage-submittals', type: 'PROJECT_STAGE', label: 'Submittals', name: 'Submittals', order: 2, isActive: true },
  ],
  PROJECT_CONTRACT_TYPE: [
    { id: 'ct-1', type: 'PROJECT_CONTRACT_TYPE', label: 'Lump Sum', name: 'Lump Sum', order: 0, isActive: true },
    { id: 'ct-2', type: 'PROJECT_CONTRACT_TYPE', label: 'GMP', name: 'GMP', order: 1, isActive: true },
  ],
  GC_TYPE: [
    { id: 'gct-private', type: 'GC_TYPE', label: 'Private', name: 'Private', code: 'PRIVATE', order: 0, isActive: true },
    { id: 'gct-public', type: 'GC_TYPE', label: 'Public', name: 'Public', code: 'PUBLIC', order: 1, isActive: true },
  ],
  PROFESSIONAL_ROLE: [
    { id: 'pr-pm', type: 'PROFESSIONAL_ROLE', label: 'Project Manager', name: 'Project Manager', order: 0, isActive: true },
    { id: 'pr-est', type: 'PROFESSIONAL_ROLE', label: 'Estimator', name: 'Estimator', order: 1, isActive: true },
    { id: 'pr-super', type: 'PROFESSIONAL_ROLE', label: 'Superintendent', name: 'Superintendent', order: 2, isActive: true },
  ],
  VENDOR_TYPE: [
    { id: 'vt-material', type: 'VENDOR_TYPE', label: 'Material', name: 'Material', code: 'MATERIAL', order: 0, isActive: true },
    { id: 'vt-fabrication', type: 'VENDOR_TYPE', label: 'Fabrication', name: 'Fabrication', code: 'FABRICATION', order: 1, isActive: true },
    { id: 'vt-installation', type: 'VENDOR_TYPE', label: 'Installation', name: 'Installation', code: 'INSTALLATION', order: 2, isActive: true },
  ],
  PAYMENT_METHOD: [
    { id: 'pmth-check', type: 'PAYMENT_METHOD', label: 'Check', name: 'Check', order: 0, isActive: true },
    { id: 'pmth-ach', type: 'PAYMENT_METHOD', label: 'ACH', name: 'ACH', order: 1, isActive: true },
  ],
  UNIT_OF_MEASURE: [
    { id: 'uom-ea', type: 'UNIT_OF_MEASURE', label: 'Each', name: 'EA', order: 0, isActive: true },
    { id: 'uom-lf', type: 'UNIT_OF_MEASURE', label: 'Linear Foot', name: 'LF', order: 1, isActive: true },
  ],
};

/* ----------------------------------------------------------------- projects */

const TCO = '2026-12-31T12:00:00.000Z';
const stage = (label: string) => ({ id: `stage-${label.toLowerCase()}`, label, name: label });
const div = (label: string) => ({ id: `div-${label.replace(/\W/g, '').toLowerCase()}`, name: label, label });

export const projects: any[] = [
  // SCA
  { id: 'prj-30000', jobNumber: '30000', name: 'PS 082K', stageId: 'stage-fabrication', stage: stage('Fabrication'), description: 'Architectural casework & millwork.', status: 'ACTIVE', division: div('SCA'), divisionId: 'div-sca', gc: { id: 'gc-technico', name: 'Technico Construction' }, leadPM: { id: 'pm-mahavir', name: 'Mahavir S.', email: 'mahavir@ellicorp.com' }, contractValue: 435000, totalSpent: 82242.25, budgetRemaining: 178757.75, spendUtilization: 32, tcoDate: TCO },
  { id: 'prj-30100', jobNumber: '30100', name: 'PS 515X', stageId: 'stage-fabrication', stage: stage('Fabrication'), description: 'Casework fabrication.', status: 'ACTIVE', division: div('SCA'), divisionId: 'div-sca', gc: { id: 'gc-technico', name: 'Technico' }, leadPM: { id: 'pm-mahavir', name: 'Mahavir S.' }, contractValue: 570000, totalSpent: 18718.94, budgetRemaining: 551281.06, spendUtilization: 3, tcoDate: TCO },
  { id: 'prj-32000', jobNumber: '32000', name: 'P.S. 512Q', stageId: 'stage-submittals', stage: stage('Submittals'), description: 'Submittals phase.', status: 'ACTIVE', division: div('SCA'), divisionId: 'div-sca', gc: { id: 'gc-mpcc', name: 'MPCC Corp.' }, leadPM: { id: 'pm-mahavir', name: 'Mahavir S.' }, contractValue: 495000, totalSpent: 0, budgetRemaining: 495000, spendUtilization: 0, tcoDate: TCO },
  { id: 'prj-31900', jobNumber: '31900', name: 'P.S. 508Q', stageId: 'stage-submittals', stage: stage('Submittals'), description: 'Submittals phase.', status: 'ACTIVE', division: div('SCA'), divisionId: 'div-sca', gc: { id: 'gc-citnalta', name: 'Citnalta Construction' }, leadPM: { id: 'pm-mahavir', name: 'Mahavir S.' }, contractValue: 437400, totalSpent: 0, budgetRemaining: 437400, spendUtilization: 0, tcoDate: TCO },
  // INSTITUTIONAL
  { id: 'prj-31300', jobNumber: '31300', name: 'Creedmoor P187', stageId: 'stage-installation', stage: stage('Installation'), description: 'Installation phase.', status: 'ACTIVE', division: div('INSTITUTIONAL'), divisionId: 'div-inst', gc: { id: 'gc-prismatic', name: 'Prismatic Developments' }, leadPM: { id: 'pm-mahavir', name: 'Mahavir S.' }, contractValue: 135000, totalSpent: 163724.40, budgetRemaining: -28723.42, spendUtilization: 121, tcoDate: TCO },
  { id: 'prj-28100', jobNumber: '28100-25', name: 'Brooklyn Animal Care Center', stageId: 'stage-fabrication', stage: stage('Fabrication'), description: 'Casework fabrication.', status: 'ACTIVE', division: div('INSTITUTIONAL'), divisionId: 'div-inst', gc: { id: 'gc-mpcc', name: 'MPCC Corp.' }, leadPM: { id: 'pm-sebastian', name: 'Sebastian W.' }, contractValue: 120000, totalSpent: 2470, budgetRemaining: 117530, spendUtilization: 2, tcoDate: TCO },
  // PUBLIC / STATE
  { id: 'prj-31700', jobNumber: '31700', name: 'JFK NTO Turkish Airlines', stageId: 'stage-submittals', stage: stage('Submittals'), description: 'Submittals phase.', status: 'ACTIVE', division: div('PUBLIC / STATE'), divisionId: 'div-state', gc: { id: 'gc-vrh', name: 'VRH Construction' }, leadPM: { id: 'pm-mahavir', name: 'Mahavir S.' }, contractValue: 671310, totalSpent: 5310.38, budgetRemaining: 665999.62, spendUtilization: 1, tcoDate: TCO },
  { id: 'prj-31200', jobNumber: '31200', name: 'JFK T1- Korean Air Lounge', stageId: 'stage-installation', stage: stage('Installation'), description: 'Installation phase.', status: 'ACTIVE', division: div('PUBLIC / STATE'), divisionId: 'div-state', gc: { id: 'gc-holt', name: 'Holt Construction' }, leadPM: { id: 'pm-sebastian', name: 'Sebastian W.' }, contractValue: 840000, totalSpent: 22905.57, budgetRemaining: 817094.43, spendUtilization: 3, tcoDate: TCO },
  { id: 'prj-31500', jobNumber: '31500', name: 'Eastern Parkway Library', stageId: 'stage-submittals', stage: stage('Submittals'), description: 'Submittals phase.', status: 'ACTIVE', division: div('PUBLIC / STATE'), divisionId: 'div-state', gc: { id: 'gc-mpcc', name: 'MPCC Corp.' }, leadPM: { id: 'pm-sebastian', name: 'Sebastian W.' }, contractValue: 480000, totalSpent: 73135, budgetRemaining: 406865, spendUtilization: 15, tcoDate: TCO },
  { id: 'prj-30400', jobNumber: '30400', name: 'Brooklyn Public Library - CP2', stageId: 'stage-fabrication', stage: stage('Fabrication'), description: 'Casework fabrication.', status: 'ACTIVE', division: div('PUBLIC / STATE'), divisionId: 'div-state', gc: { id: 'gc-gilbane', name: 'Gilbane Building Co.' }, leadPM: { id: 'pm-juan', name: 'Juan M.' }, contractValue: 2205614.69, totalSpent: 6730, budgetRemaining: 2198884.69, spendUtilization: 0, tcoDate: TCO },
];

export const projectStats = {
  totalProjects: 11,
  totalContractValue: 10948876.12,
  statusSummary: [
    { id: 'ACTIVE', label: 'Active', count: 11, totalContractValue: 10948876.12 },
    { id: 'INACTIVE', label: 'Inactive', count: 0, totalContractValue: 0 },
    { id: 'CLOSED', label: 'Closed', count: 0, totalContractValue: 0 },
    { id: 'COMPLETED', label: 'Completed', count: 0, totalContractValue: 0 },
  ],
  divisionSummary: [
    { id: 'div-sca', label: 'SCA', count: 5, totalContractValue: 1937400 },
    { id: 'div-inst', label: 'INSTITUTIONAL', count: 2, totalContractValue: 255000 },
    { id: 'div-public', label: 'PUBLIC', count: 0, totalContractValue: 0 },
    { id: 'div-state', label: 'PUBLIC / STATE', count: 4, totalContractValue: 4196924.69 },
  ],
};

export function buildProjectDetail(id: string) {
  const p = projects.find((x) => x.id === id) ?? projects[0];
  const contractValue = p.contractValue ?? 0;
  const totalSpent = p.totalSpent ?? 0;
  const budgetLimit = Math.round(contractValue * 0.6);
  const retainagePercent = 5;
  return {
    ...p,
    gcId: p.gc?.id ?? 'gc-technico',
    leadPMId: p.leadPM?.id ?? null,
    divisionId: p.divisionId,
    revisedContractValue: contractValue,
    approvedChangeOrdersTotal: 0,
    approvedChangeOrdersCount: 0,
    targetBudgetPercent: 60,
    budgetLimit,
    retainagePercent,
    retainageAmount: Math.round(contractValue * (retainagePercent / 100) * 100) / 100,
    paidToDate: 0,
    balanceDue: contractValue,
    primeContract: { id: `pc-${p.id}`, projectId: p.id, contractValue, retainagePercent },
    gc: { ...p.gc, email: 'info@gc.com', phone: '(212) 555-0100' },
    leadPM: p.leadPM,
    streetAddress: '123 Project Ave',
    city: 'New York',
    state: 'NY',
    zipCode: '10001',
    projectScheduleEntries: [
      { id: `sch-${p.id}`, projectId: p.id, date: '2026-06-15', description: `${p.name} contract schedule`, notes: 'Seeded from local project document' },
    ],
    teamMembers: [],
    capabilities: { canManage: true, canEdit: true, canCreateProjectDocuments: true, canManageTeam: true, actions: {} },
  };
}

/* ----------------------------------------------------------- monthly bills */

const ven = (id: string, name: string) => ({ id, name, email: null, phone: null, quickBooksMapping: null });
const bill = (poId: string, poNumber: string, vendor: any, original: number) => ({
  purchaseOrder: { id: poId, poNumber, vendor, issuedAt: '2026-05-01', subChangeOrders: [] },
  original,
  balance: original,
  totalPaid: 0,
  plannedPayment: null,
  payments: [],
});

export const monthlyBills: any[] = [
  {
    project: { id: 'prj-28100', name: 'Brooklyn Animal Care Center', jobNumber: '28100-25' },
    bills: [
      bill('po-23108', 'PO-23108', ven('v-mcline', 'McLine Studios'), 1900),
      bill('po-25287', 'PO-25287', ven('v-mcline', 'McLine Studios'), 540),
      bill('po-25321', 'PO-25321', ven('v-caesar', 'Caesarstone'), 30),
    ],
  },
  {
    project: { id: 'prj-30400', name: 'Brooklyn Public Library - CP2', jobNumber: '30400' },
    bills: [
      bill('po-25248', 'PO-25248', ven('v-tect', 'Tecticonism Studio'), 2100),
      bill('po-25353', 'PO-25353', ven('v-tect', 'Tecticonism Studio'), 4630),
      bill('po-25474', 'PO-25474', ven('v-ernest', 'Ernest and Neuman Studios LLC'), 150400),
    ],
  },
  {
    project: { id: 'prj-31300', name: 'Creedmoor P187', jobNumber: '31300' },
    bills: [
      bill('po-26001', 'PO-26001', ven('v-atlantic', 'Atlantic Architectural Millwork'), 120000),
      bill('po-26002', 'PO-26002', ven('v-precision', 'Precision Casework Installers'), 43724.4),
    ],
  },
];

/* ---------------------------------------------------------------- vendors */

const vendorRow = (id: string, name: string, email: string | null, type = 'MATERIAL') => ({
  id, name, status: 'ACTIVE', type, typeId: `vt-${type.toLowerCase()}`,
  contactCount: 0, documentCount: 0, totalCommitted: 0, currentBalance: 0,
  email, phone: null,
  contacts: email ? [{ id: `${id}-c`, fullName: name, email: [{ email, isPrimary: true }], isPrimary: true }] : [],
});

export const vendors: any[] = [
  vendorRow('v-212', '212 Renovations Group', 'bg@212renovations.com'),
  vendorRow('v-3bro', '3 Brothers Masonry Concrete Corp', null),
  vendorRow('v-3form', '3 Form', 'info@3form.com'),
  vendorRow('v-abbot', 'Abbot Paint and Varnish', 'info@abbotpaint.com'),
  vendorRow('v-abet', 'Abet Laminati', 'sales@abetlaminati.com'),
  vendorRow('v-abmill', 'AB Millwork and Glass Design LLC', null),
  vendorRow('v-accuride', 'Accuride', 'websupport@accuride.com'),
  vendorRow('v-acoustics', 'Acoustics America', null),
  vendorRow('v-acoustimac', 'AcoustiMac', 'darius@acousticmac.com'),
  vendorRow('v-adatoe', 'ADA Toe Kick', null),
];

export const vendorStats = {
  totalVendors: 381,
  totalCommitted: 886843.54,
  totalPaid: 251018.97,
  outstandingBalance: 0,
  currentBalance: 0,
};

export function buildVendorDetail(id: string) {
  const v = vendors.find((x) => x.id === id) ?? vendors[0];
  return {
    ...v,
    paymentTerms: 'NET_30',
    address: '284 Meserole Street, Brooklyn, NY 11206',
    phone: '212-328-0136',
    taxId: null,
    establishedDate: '2026-06-15',
    lastReviewDate: '2026-06-15',
    contactLinks: [],
    documents: [],
  };
}

/* --------------------------------------------------------------- contacts */

const gcRef = (id: string, name: string) => ({ id, name });
const contactRow = (id: string, fullName: string, gc: any, email: string, phone: string | null) => ({
  id, fullName, professionalRoleId: null, professionalRole: null,
  email: [{ email, label: 'Work', isPrimary: true }],
  phoneNumber: phone ? [{ number: phone, label: 'Work', isPrimary: true }] : [],
  generalContractor: gc, generalContractorId: gc.id,
  tags: ['GC seed'], vendorLinks: [], gcLinks: [],
});

export const contacts: any[] = [
  contactRow('c-akash', 'Akash Darji', gcRef('gc-hunter', 'Hunter Roberts Construction Group'), 'adarji@hrcg.com', '917-576-5107'),
  contactRow('c-alexc', 'Alex Cardinale', gcRef('gc-mpcc', 'MPCC Corp.'), 'alex@mpcccorp.com', null),
  contactRow('c-ana', 'Ana Hermsdorf', gcRef('gc-prismatic', 'Prismatic Development Corporation'), 'ahermsdorf@prisdev.com', '974 882 1133'),
  contactRow('c-andrew', 'Andrew Smith', gcRef('gc-structuretone', 'Structuretone'), 'andrew.smith@structuretone.com', null),
  contactRow('c-anna', 'Anna Lawrence', gcRef('gc-gilbane', 'Gilbane Building Company'), 'alawrence@gilbaneco.com', '646-315-1883'),
  contactRow('c-anthony', 'Anthony Gallo', gcRef('gc-citnalta', 'Citnalta Construction'), 'AnthonyG@citnalta.com', '631.563.1110'),
  contactRow('c-brian', 'Brian Troast', gcRef('gc-prismatic2', 'Prismatic Development'), 'bdtroast@prisdev.com', '973-349-9706'),
  contactRow('c-charlie', 'Charlie Ucciferri', gcRef('gc-mpcc', 'MPCC Corp.'), 'charlie@mpcccorp.com', null),
  contactRow('c-chris', 'Chris Romano', gcRef('gc-prismatic', 'Prismatic Development Corporation'), 'cromano@prisdev.com', '977 882 1133'),
  contactRow('c-christine', 'Christine Schultz', gcRef('gc-ewhowell', 'E.W. Howell Construction Group'), 'cschultz@ewhowell.com', '516-921-7410'),
];

export const contactStats = { totalContacts: 53, primaryContacts: 17, gcLinks: 53, vendorLinks: 0 };

export function buildContactDetail(id: string) {
  const c = contacts.find((x) => x.id === id) ?? contacts[0];
  return { ...c };
}

/* ------------------------------------------------------ general contractors */

const gcType = { id: 'gct-private', label: 'Private', name: 'Private', code: 'PRIVATE' };
const gcRow = (id: string, name: string, primary: { name: string; email: string }, activeProjects: number) => ({
  id, name, status: 'ACTIVE', gcTypeId: 'gct-private', gcType,
  paymentTerms: 'NET_45', retainagePercent: 10, activeProjects, totalCommitted: 729000,
  email: primary.email, phone: '631.563.1110',
  contacts: [{ id: `${id}-pc`, fullName: primary.name, email: [{ email: primary.email, isPrimary: true }], isPrimary: true }],
  contactLinks: [],
});

export const generalContractors: any[] = [
  gcRow('gc-citnalta', 'Citnalta Construction', { name: 'Anthony Gallo', email: 'AnthonyG@citnalta.com' }, 1),
  gcRow('gc-citnalta-corp', 'Citnalta Construction Corp.', { name: 'Steve Pitarresi', email: 'stevep@citnalta.com' }, 0),
  gcRow('gc-ewhowell', 'E.W. Howell Construction Group', { name: 'Denise Santiago', email: 'dsanginario@ewhowell.com' }, 0),
  gcRow('gc-gilbane', 'Gilbane Building Company', { name: 'Roy Escobar', email: 'rescobar@gilbaneco.com' }, 1),
  gcRow('gc-holt', 'Holt Construction', { name: 'Madelyne Grabowski', email: 'mgrabowski@holtcc.com' }, 1),
  gcRow('gc-hunter', 'Hunter Roberts Construction Group', { name: 'Akash Darji', email: 'adarji@hrcg.com' }, 0),
  gcRow('gc-leon', 'Leon DeMatteis Construction Corp.', { name: 'Kate Senastiana', email: 'ks@dematteisorg.com' }, 0),
  gcRow('gc-mpcc', 'MPCC Corp.', { name: 'Alex Cardinale', email: 'alex@mpcccorp.com' }, 3),
  gcRow('gc-navillus', 'Navillus', { name: 'Michael Walsh', email: 'mwalsh@navillusinc.com' }, 1),
  gcRow('gc-ogs', 'Office of the General Services', { name: 'Nicole Prewitt', email: 'nicole.prewitt@ogs.ny.gov' }, 0),
];

export const gcStats = { totalGCs: 17, activeProjects: 11, totalCommitted: 10948876.12, complianceAlerts: 0 };

export function buildGcDetail(id: string) {
  const g = generalContractors.find((x) => x.id === id) ?? generalContractors[0];
  return { ...g, teamContacts: g.contacts, projects: [], documents: [] };
}

/* ------------------------------------------------------------- cost codes */

const cc = (id: string, code: string, name: string, description: string, cat: { id: string; name: string }) => ({
  id, code, name, description, costCodeCategoryId: cat.id, costCodeCategory: cat,
});
const catLabor = { id: 'cat-labor', name: 'Labor' };
const catMaterial = { id: 'cat-material', name: 'Material' };
const catSub = { id: 'cat-sub', name: 'Subcontractor' };
const catEquip = { id: 'cat-equip', name: 'Equipment' };

export const costCodes: any[] = [
  cc('cc-01100', '01-100', 'General Labor', 'General labor costs', catLabor),
  cc('cc-01200', '01-200', 'Skilled Labor', 'Skilled trade labor', catLabor),
  cc('cc-01300', '01-300', 'Overtime Labor', 'Overtime labor costs', catLabor),
  cc('cc-02100', '02-100', 'Concrete', 'Concrete materials', catMaterial),
  cc('cc-02200', '02-200', 'Steel', 'Structural steel', catMaterial),
  cc('cc-02300', '02-300', 'Lumber', 'Wood and lumber', catMaterial),
  cc('cc-03100', '03-100', 'Electrical Sub', 'Electrical subcontractor', catSub),
  cc('cc-03200', '03-200', 'Plumbing Sub', 'Plumbing subcontractor', catSub),
  cc('cc-04100', '04-100', 'Crane Rental', 'Crane equipment rental', catEquip),
  cc('cc-04200', '04-200', 'Excavator Rental', 'Excavator equipment rental', catEquip),
];

export const costCodeStats = {
  totalCostCodes: 10,
  totalCategories: 4,
  categories: [
    { id: 'cat-labor', name: 'Labor', count: 3 },
    { id: 'cat-material', name: 'Material', count: 3 },
    { id: 'cat-sub', name: 'Subcontractor', count: 2 },
    { id: 'cat-equip', name: 'Equipment', count: 2 },
  ],
};

export const costCodeCategories: any[] = [
  { id: 'cat-labor', name: 'Labor', description: 'Labor and workforce costs' },
  { id: 'cat-material', name: 'Material', description: 'Raw materials and supplies' },
  { id: 'cat-sub', name: 'Subcontractor', description: 'Subcontractor services' },
  { id: 'cat-equip', name: 'Equipment', description: 'Equipment rental and purchases' },
];

/* --------------------------------------------------------------------- HR */

const empRole = (id: string, label: string) => ({ id, name: label.toLowerCase().replace(/\s/g, '_'), label, type: 'professional' });
const employee = (id: string, name: string, email: string, deptId: string, deptName: string, role: any, status = 'active') => ({
  id, name, email, phoneNumber: '+1-718-555-0100', startDate: '2021-01-01T00:00:00.000Z',
  departmentId: deptId, department: { id: deptId, name: deptName }, roleId: role.id, role, status,
  documents: [], createdAt: '2021-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
});

export const employees: any[] = [
  employee('emp-peter', 'Peter Ligas', 'peter@ellicorp.com', 'dept-pm', 'Project Management', empRole('role-pm', 'Project Manager')),
  employee('emp-mahavir', 'Mahavir S.', 'mahavir@ellicorp.com', 'dept-pm', 'Project Management', empRole('role-pm', 'Project Manager')),
  employee('emp-sebastian', 'Sebastian W.', 'sebastian@ellicorp.com', 'dept-pm', 'Project Management', empRole('role-pm', 'Project Manager')),
  employee('emp-juan', 'Juan M.', 'juan@ellicorp.com', 'dept-field', 'Field Operations', empRole('role-field', 'Field Supervisor')),
  employee('emp-maria', 'Maria Gonzalez', 'maria@ellicorp.com', 'dept-est', 'Estimating', empRole('role-est', 'Estimator')),
  employee('emp-david', 'David Chen', 'david@ellicorp.com', 'dept-acct', 'Accounting', empRole('role-acct', 'Accountant')),
];

export const employeeStats = { totalEmployees: 6, activeEmployees: 6, onLeaveEmployees: 0, linkedUsers: 3, unlinkedEmployees: 3, assignedToDepartment: 6, withoutDepartment: 0 };

export const departments: any[] = [
  { id: 'dept-est', name: 'Estimating', description: 'Takeoffs, scope sheets, and bid proposals', employeeCount: 1, createdAt: '2018-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null },
  { id: 'dept-pm', name: 'Project Management', description: 'Field coordination and project delivery', employeeCount: 3, createdAt: '2018-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null },
  { id: 'dept-acct', name: 'Accounting', description: 'AP/AR, payroll, and financial reporting', employeeCount: 1, createdAt: '2018-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null },
  { id: 'dept-field', name: 'Field Operations', description: 'On-site installation and supervision', employeeCount: 1, createdAt: '2018-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z', deletedAt: null },
];

export const departmentStats = { totalDepartments: 4, assignedEmployees: 6, unassignedEmployees: 0, emptyDepartments: 0 };

export const ptoRequests: any[] = [
  { id: 'pto-1', employeeId: 'emp-mahavir', employee: { id: 'emp-mahavir', name: 'Mahavir S.', email: 'mahavir@ellicorp.com', department: { id: 'dept-pm', name: 'Project Management' }, role: { id: 'role-pm', label: 'Project Manager', name: 'project_manager' } }, typeId: 'ptotype-vac', type: { id: 'ptotype-vac', label: 'Vacation', name: 'vacation' }, startDate: '2026-07-06T00:00:00.000Z', endDate: '2026-07-10T00:00:00.000Z', reason: 'Family trip', status: 'APPROVED', reviewNote: null, reviewedAt: '2026-06-01T14:00:00.000Z', reviewedById: 'emp-peter', createdAt: '2026-05-20T10:00:00.000Z', updatedAt: '2026-06-01T14:00:00.000Z' },
  { id: 'pto-2', employeeId: 'emp-maria', employee: { id: 'emp-maria', name: 'Maria Gonzalez', email: 'maria@ellicorp.com', department: { id: 'dept-est', name: 'Estimating' }, role: { id: 'role-est', label: 'Estimator', name: 'estimator' } }, typeId: 'ptotype-sick', type: { id: 'ptotype-sick', label: 'Sick Leave', name: 'sick' }, startDate: '2026-06-18T00:00:00.000Z', endDate: '2026-06-19T00:00:00.000Z', reason: 'Medical appointment', status: 'PENDING', reviewNote: null, reviewedAt: null, reviewedById: null, createdAt: '2026-06-10T08:30:00.000Z', updatedAt: '2026-06-10T08:30:00.000Z' },
];

export const ptoStats = { totalRequests: 2, pendingRequests: 1, approvedRequests: 1, rejectedRequests: 0, upcomingApprovedRequests: 1 };

/* ------------------------------------------------------------------- files */

export const rootFolder = { id: 'root', name: 'Files', displayName: 'Files', type: 'FOLDER', isDeletable: false, private: false, parentId: null };

export const folderChildren: any[] = [
  { id: 'folder-projects', name: 'Projects', displayName: 'Projects', type: 'FOLDER', isDeletable: false, private: false, parentId: 'root' },
  { id: 'file-1', name: 'PS 082K Prime Contract.pdf', displayName: 'PS 082K Prime Contract.pdf', type: 'FILE', isDeletable: true, private: false, parentId: 'root', mimeType: 'application/pdf', size: 482300, createdAt: '2026-05-31T14:02:00.000Z' },
  { id: 'file-2', name: 'Scope Sheet.xlsx', displayName: 'Scope Sheet.xlsx', type: 'FILE', isDeletable: true, private: false, parentId: 'root', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', size: 182000, createdAt: '2026-06-01T09:15:00.000Z' },
];

/* ------------------------------------------------------------ activity log */

export const activityLog: any[] = [
  { id: 'al-1', entityType: 'PROJECT', entityId: 'prj-30000', action: 'CREATED', description: 'Created project PS 082K', createdAt: '2026-06-16T13:45:00.000Z', user: { id: 'u-peter', name: 'Peter Ligas', email: 'peter@ellicorp.com' } },
  { id: 'al-2', entityType: 'PURCHASE_ORDER', entityId: 'po-23108', action: 'CREATED', description: 'Created PO-23108 for McLine Studios', createdAt: '2026-06-16T11:20:00.000Z', user: { id: 'u-mahavir', name: 'Mahavir S.' } },
  { id: 'al-3', entityType: 'CONTACT', entityId: 'c-akash', action: 'CREATED', description: 'Added contact Akash Darji', createdAt: '2026-06-15T16:05:00.000Z', user: { id: 'u-peter', name: 'Peter Ligas' } },
];

/* ----------------------------------------------------- integration status */

export const quickbooksReferenceSyncStatus = {
  provider: 'quickbooks', connected: false, autoDailySyncEnabled: false,
  lastSyncedAt: null, lastSyncStatus: null, lastSyncError: null,
  totals: { totalReceived: 0, createdCount: 0, updatedCount: 0, deletedCount: 0 },
  entities: [],
};

export const fieldwireSyncStatus = {
  provider: 'fieldwire', mappedProjectCount: 0,
  lastSyncedAt: null, lastSyncStatus: null, lastSyncError: null,
  totals: { totalReceived: 0, createdCount: 0, updatedCount: 0, deletedCount: 0 },
  projects: [],
};
