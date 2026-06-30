import { PaymentTerms, VendorStatus, GCStatus } from '@db/enums';
import { LookupType } from '@modules/lookup/models';

export const adminSeed = {
    email: 'admin@elli.com',
    password: 'password123',
    name: 'Elli Admin',
    role: 'admin',
    organizationName: 'Default',
    organizationSlug: 'default',
} as const;

export const rootSubFolders = [
    { name: 'projects', displayName: 'Projects' },
    { name: 'employees', displayName: 'Employees' },
    { name: 'gc', displayName: 'General Contractors' },
    { name: 'vendor', displayName: 'Vendors' },
    { name: 'temp', displayName: 'Temp' },
] as const;

export const lookupSeeds = {
    [LookupType.PROFESSIONAL_ROLE]: [
        'Project Manager',
        'Senior Project Manager',
        'Accountant',
        'Estimator',
        'Supervisor',
        'A/R',
        'A/P',
    ],
    [LookupType.CONTACT_PROFESSIONAL_ROLE]: [
        'Project Manager',
        'Assistant Project Manager',
        'Superintendent',
        'Estimator',
        'Project Engineer',
        'Coordinator',
        'Sales Representative',
        'Accounts Payable',
        'Accounts Receivable',
        'Billing Contact',
        'Contracts Administrator',
    ],
    [LookupType.VENDOR_TYPE]: ['MATERIAL', 'FABRICATION', 'INSTALLATION'],
    [LookupType.GC_TYPE]: ['SCA', 'Civil', 'Institutional', 'Public / State', 'Public', 'Private'],
    [LookupType.PROJECT_DIVISION]: ['SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL'],
    [LookupType.PROJECT_STAGE]: [
        'ONBOARDING',
        'SUBMITTALS',
        'BUYOUT',
        'INSTALLATION',
        'FABRICATION',
        'PUNCHLIST',
        'CLOSEOUT',
    ],
    [LookupType.PROJECT_CONTRACT_TYPE]: ['Lump Sum', 'GMP'],
    [LookupType.TRADE_CATEGORY]: ['MATERIAL', 'FABRICATION', 'INSTALLATION', 'LABOR', 'EQUIPMENT'],
    [LookupType.UNIT]: [
        'EACH',
        'PIECE',
        'PAIR',
        'SET',
        'BOX',
        'PALLET',
        'ROLL',
        'BUNDLE',
        'MM',
        'CM',
        'M',
        'KM',
        'INCH',
        'FOOT',
        'YARD',
        'SQ_M',
        'SQ_FT',
        'SQ_YD',
        'CU_M',
        'CU_FT',
        'CU_YD',
        'LITRE',
        'GALLON',
        'ML',
        'MG',
        'GRAM',
        'KG',
        'TON',
        'METRIC_TON',
        'POUND',
        'OUNCE',
        'HOUR',
        'DAY',
        'WEEK',
        'MONTH',
        'LUMP_SUM',
    ],
    [LookupType.PTO_TYPE]: ['Vacation', 'Sick', 'Maternity / Paternity', 'Personal', 'Bereavement'],
    [LookupType.SCO_CHANGE_TYPE]: [
        'Unforeseen Conditions',
        'Design Change',
        'Quantity Adjustment',
        'Material Substitution',
        'Labor Adjustment',
        'Equipment Rental',
        'Credit',
        'Backcharge',
        'Schedule Acceleration',
        'Other',
    ],
} as const;

export const costCodeCategorySeeds = [
    { name: 'Labor', description: 'Labor and workforce costs' },
    { name: 'Material', description: 'Raw materials and supplies' },
    { name: 'Subcontractor', description: 'Subcontractor services' },
    { name: 'Equipment', description: 'Equipment rental and purchases' },
] as const;

export const costCodeSeeds = [
    {
        code: '01-100',
        name: 'General Labor',
        description: 'General labor costs',
        category: 'Labor',
    },
    {
        code: '01-200',
        name: 'Skilled Labor',
        description: 'Skilled trade labor',
        category: 'Labor',
    },
    {
        code: '01-300',
        name: 'Overtime Labor',
        description: 'Overtime labor costs',
        category: 'Labor',
    },
    { code: '02-100', name: 'Concrete', description: 'Concrete materials', category: 'Material' },
    { code: '02-200', name: 'Steel', description: 'Structural steel', category: 'Material' },
    { code: '02-300', name: 'Lumber', description: 'Wood and lumber', category: 'Material' },
    {
        code: '03-100',
        name: 'Electrical Sub',
        description: 'Electrical subcontractor',
        category: 'Subcontractor',
    },
    {
        code: '03-200',
        name: 'Plumbing Sub',
        description: 'Plumbing subcontractor',
        category: 'Subcontractor',
    },
    {
        code: '04-100',
        name: 'Crane Rental',
        description: 'Crane equipment rental',
        category: 'Equipment',
    },
    {
        code: '04-200',
        name: 'Excavator Rental',
        description: 'Excavator equipment rental',
        category: 'Equipment',
    },
] as const;

export type EmployeeSeed = {
    name: string;
    email: string;
    password: string;
    authRole: 'pm' | 'accountant' | 'user' | 'admin';
    professionalRole: string;
    department?: string;
    phoneNumber: string;
};

export const employeeSeeds: EmployeeSeed[] = [
    {
        name: 'Shalini S.',
        email: 'shalini@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'pm',
        professionalRole: 'Project Manager',
        department: 'Project Management',
        phoneNumber: '718-418-9002',
    },
    {
        name: 'Steven B.',
        email: 'steven@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'pm',
        professionalRole: 'Project Manager',
        department: 'Project Management',
        phoneNumber: '718-418-9002',
    },
    {
        name: 'Mahavir S.',
        email: 'mahavir@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'pm',
        professionalRole: 'Project Manager',
        department: 'Project Management',
        phoneNumber: '718-418-9002',
    },
    {
        name: 'Sebastian W.',
        email: 'sebastian@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'pm',
        professionalRole: 'Project Manager',
        department: 'Project Management',
        phoneNumber: '718-418-9002',
    },
    {
        name: 'Juan M.',
        email: 'juan@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'pm',
        professionalRole: 'Project Manager',
        department: 'Project Management',
        phoneNumber: '718-418-9002',
    },
    {
        name: 'Lucas C.',
        email: 'lucas@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'pm',
        professionalRole: 'Project Manager',
        department: 'Project Management',
        phoneNumber: '718-418-9002',
    },
    {
        name: 'Piotr B.',
        email: 'piotr@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'pm',
        professionalRole: 'Project Manager',
        department: 'Project Management',
        phoneNumber: '718-418-9002',
    },
    {
        name: 'Tomasz B.',
        email: 'tomasz@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'pm',
        professionalRole: 'Senior Project Manager',
        department: 'Project Management',
        phoneNumber: '718-418-9002',
    },
    {
        name: 'Alejandra C.',
        email: 'alejandra@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'accountant',
        professionalRole: 'A/P',
        department: 'Accounts Payable',
        phoneNumber: '718-418-9002',
    },
    {
        name: 'Cari S.',
        email: 'cari@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'accountant',
        professionalRole: 'A/P',
        department: 'Accounts Payable',
        phoneNumber: '718-418-9002',
    },
    {
        name: 'lilibell S.',
        email: 'lilibell@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'accountant',
        professionalRole: 'A/R',
        department: 'Accounts Receivable',
        phoneNumber: '718-418-9002',
    },
    {
        name: 'peter L.',
        email: 'peter@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'admin',
        professionalRole: 'Supervisor',
        department: 'Senior Management',
        phoneNumber: '718-418-9002',
    },
    {
        name: 'lissette O.',
        email: 'lissette@ellicorp.com',
        password: 'elli@5jr990',
        authRole: 'admin',
        professionalRole: 'Supervisor',
        department: 'Senior Management',
        phoneNumber: '718-418-9002',
    },
];

export type VendorSeedRow = {
    name: string;
    typeId: string | null;
    categoryTags: string[];
    taxId: string | null;
    status: VendorStatus;
    address: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    fax: string | null;
    paymentTerms: PaymentTerms;
    notes: string | null;
};

export type GcSeedRow = {
    name: string;
    gcTypeId: string | null;
    status: GCStatus;
    address: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    fax: string | null;
    paymentTerms: PaymentTerms;
    retainagePercent: number;
};

export type GcContactSeedRow = {
    generalContractorName: string;
    fullName: string;
    professionalRoleId: string | null;
    email: string | null;
    phoneNumber: string | null;
    tags: string[];
    isPrimary: boolean;
};
