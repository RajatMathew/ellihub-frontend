/**
 * Shared faker-based sample data generators for fill-sample / fill-random buttons.
 *
 */

/* ─── Helpers ─── */

export function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function fakeDateInputBetween(minDaysFromToday: number, maxDaysFromToday: number): string {
  const date = new Date();
  date.setDate(date.getDate() + randInt(minDaysFromToday, maxDaysFromToday));
  return date.toISOString().split('T')[0];
}

const FIRST_NAMES = [
  'Avery',
  'Blake',
  'Camila',
  'Drew',
  'Elena',
  'Jordan',
  'Kai',
  'Morgan',
  'Priya',
  'Riley',
  'Sam',
  'Taylor',
] as const;

const LAST_NAMES = [
  'Bennett',
  'Chen',
  'Diaz',
  'Foster',
  'Garcia',
  'Hayes',
  'Kim',
  'Patel',
  'Reyes',
  'Singh',
  'Turner',
  'Walker',
] as const;

const DOMAIN_NAMES = [
  'buildwise.com',
  'fieldstone.co',
  'northlinebuild.com',
  'sitecraft.net',
  'urbanworks.com',
] as const;

function fakePersonName(): string {
  return `${pickRandom(FIRST_NAMES)} ${pickRandom(LAST_NAMES)}`;
}

function fakeDomainName(): string {
  return pickRandom(DOMAIN_NAMES);
}

/* ─── Vendor / GC ─── */

const VENDOR_COMPANY_SUFFIXES = [
  'Supply Co.',
  'Materials Inc.',
  'Industries',
  'Contractors',
  'Services LLC',
  'Group',
  'Partners',
  'Solutions',
] as const;

export function fakeVendorName(): string {
  return `${pickRandom(LAST_NAMES)} ${pickRandom(VENDOR_COMPANY_SUFFIXES)}`;
}

export function fakeVendorEmail(vendorName: string): string {
  const slug = vendorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  return `info@${slug}.com`;
}

export function fakeVendorWebsite(vendorName: string): string {
  const slug = vendorName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
  return `https://${slug}.com`;
}

export function fakeTaxId(): string {
  return `${randInt(10, 99)}-${randInt(1000000, 9999999)}`;
}

export function fakeGCName(): string {
  return `${pickRandom(LAST_NAMES)} ${pickRandom(['Construction', 'Builders', 'Development', 'General Contracting'])}`;
}

/* ─── Contact ─── */

export function fakeContactName(): string {
  return fakePersonName();
}

export function fakeContactEmail(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, '.');
  return `${slug}@${fakeDomainName()}`;
}

export function fakePhone(): string {
  return `(${randInt(200, 999)}) ${randInt(200, 999)}-${randInt(1000, 9999)}`;
}

/* ─── Employee ─── */

export function fakeEmployeeName(): string {
  return fakePersonName();
}

export function fakeEmployeeEmail(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, '.');
  return `${slug}@contractor-corp.com`;
}

export function fakeStreetAddress(): string {
  return `${randInt(100, 9999)} ${pickRandom(['Cedar', 'Grand', 'Harbor', 'Maple', 'Riverside', 'Summit'])} ${pickRandom(['Ave', 'Blvd', 'Dr', 'Ln', 'St'])}`;
}

/* ─── Department ─── */

const DEPARTMENT_NAMES = [
  'Engineering',
  'Field Operations',
  'Preconstruction',
  'Safety & Compliance',
  'Estimating',
  'Project Controls',
  'Quality Assurance',
  'Procurement',
  'Design & Architecture',
  'Site Management',
  'Human Resources',
  'Finance & Accounting',
] as const;

export function fakeDepartmentName(): string {
  return pickRandom(DEPARTMENT_NAMES);
}

export function fakeDepartmentDescription(name: string): string {
  return `Coordinates planning, field execution, reporting, and handoffs for the ${name} team.`;
}

/* ─── Project ─── */

const PROJECT_NAME_PREFIXES = [
  'Riverside',
  'Greenfield',
  'Harbor Point',
  'Midtown',
  'Oakwood',
  'Skyline',
  'Lakeside',
  'Cedar Creek',
  'Summit',
  'Westgate',
] as const;

const PROJECT_NAME_SUFFIXES = [
  'Tower',
  'Plaza',
  'Residences',
  'Medical Center',
  'Office Campus',
  'Mixed-Use Development',
  'Retail Center',
  'Renovation',
  'Parking Structure',
  'Community Center',
] as const;

export function fakeProjectName(): string {
  return `${pickRandom(PROJECT_NAME_PREFIXES)} ${pickRandom(PROJECT_NAME_SUFFIXES)}`;
}

export function fakeProjectDescription(): string {
  return pickRandom([
    'Ground-up commercial build with phased site logistics, coordinated procurement, and tenant turnover milestones.',
    'Renovation project covering selective demolition, core upgrades, finish packages, and closeout documentation.',
    'Mixed-use construction scope with active field coordination, long-lead materials, and staged inspections.',
  ]);
}

export function fakeJobNumber(): string {
  const year = new Date().getFullYear();
  return `P-${year}-${randInt(1000, 9999)}`;
}

export function fakeContractNumber(): string {
  return `C-CON-${randInt(1000, 9999)}`;
}

export function fakeCity(): string {
  return pickRandom(['Austin', 'Burbank', 'Denver', 'Irvine', 'Phoenix', 'San Diego', 'Seattle']);
}

export function fakeState(): string {
  return pickRandom(['AZ', 'CA', 'CO', 'TX', 'WA']);
}

export function fakeZipCode(): string {
  return String(randInt(10000, 99999));
}

/* ─── RFQ ─── */

const RFQ_TITLES = [
  'Structural steel supply — Phase 2',
  'HVAC equipment for floors 3-5',
  'Exterior cladding materials',
  'Electrical switchgear & panels',
  'Plumbing fixtures and rough-in materials',
  'Concrete formwork and pour — foundation',
  'Fire protection sprinkler system',
  'Elevator installation — 2 cabs',
  'Roofing membrane and insulation',
  'Window and curtain wall fabrication',
  'Demolition and hazmat abatement',
  'Landscaping and site work',
] as const;

const RFQ_DELIVERABLES = [
  { description: 'W14x30 steel beams, ASTM A992', unit: 'LF', qtyRange: [50, 500] as const },
  { description: 'RTU HVAC units, 15-ton capacity', unit: 'EA', qtyRange: [2, 8] as const },
  { description: 'Aluminum curtain wall panels', unit: 'SF', qtyRange: [500, 5000] as const },
  { description: '200A electrical distribution panel', unit: 'EA', qtyRange: [4, 20] as const },
  { description: 'PVC Schedule 40 pipe, 4"', unit: 'LF', qtyRange: [100, 1000] as const },
  { description: '5000 PSI concrete, delivered', unit: 'CY', qtyRange: [20, 200] as const },
  { description: 'Fire sprinkler heads, pendant type', unit: 'EA', qtyRange: [50, 500] as const },
  { description: 'Passenger elevator cab, 3500 lb', unit: 'EA', qtyRange: [1, 4] as const },
  { description: 'TPO roofing membrane, 60 mil', unit: 'SF', qtyRange: [2000, 15000] as const },
  { description: 'Double-pane insulated glass units', unit: 'EA', qtyRange: [20, 200] as const },
  { description: 'Asbestos abatement, contained area', unit: 'SF', qtyRange: [500, 3000] as const },
  { description: 'Topsoil and grading', unit: 'CY', qtyRange: [50, 500] as const },
  { description: 'Rebar #4, Grade 60', unit: 'TON', qtyRange: [2, 20] as const },
  { description: 'Drywall, 5/8" Type X fire-rated', unit: 'SF', qtyRange: [1000, 10000] as const },
] as const;

export function fakeInvoiceNumber(): string {
  return `INV-${randInt(10000, 99999)}`;
}

export function fakeRFQTitle(): string {
  return pickRandom(RFQ_TITLES);
}

export function fakeRFQDeliverables(units?: { id: string }[], count?: number) {
  const numDeliverables = count ?? randInt(2, 5);
  const used = new Set<number>();

  return Array.from({ length: numDeliverables }, () => {
    let idx: number;
    do {
      idx = Math.floor(Math.random() * RFQ_DELIVERABLES.length);
    } while (used.has(idx) && used.size < RFQ_DELIVERABLES.length);
    used.add(idx);

    const item = RFQ_DELIVERABLES[idx];
    return {
      description: item.description,
      quantity: randInt(item.qtyRange[0], item.qtyRange[1]),
      unitId: units && units.length > 0 ? pickRandom(units).id : '',
    };
  });
}
