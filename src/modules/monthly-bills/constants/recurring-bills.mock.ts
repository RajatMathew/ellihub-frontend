import type {
  QuickBooksBankAccount,
  QuickBooksLineItemCategory,
  QuickBooksPayee,
} from '@/modules/integrations/schemas/quickbooks.schema';

interface RecurringBillReferenceSeed {
  vendors?: QuickBooksPayee[];
  categories?: QuickBooksLineItemCategory[];
  bankAccounts?: QuickBooksBankAccount[];
}

const fallbackBankAccount = {
  qbId: 'qb-bank-operating',
  name: 'Operating Checking',
  fullyQualifiedName: 'Operating Checking',
};

const fallbackVendors = [
  { qbId: 'qb-vendor-cedar-park', displayName: 'Cedar Park Properties' },
  { qbId: 'qb-vendor-payroll', displayName: 'Company Payroll' },
  { qbId: 'qb-vendor-hartford', displayName: 'Hartford Insurance' },
  { qbId: 'qb-vendor-austin-energy', displayName: 'Austin Energy' },
  { qbId: 'qb-vendor-fieldwire', displayName: 'Fieldwire' },
  { qbId: 'qb-vendor-state-tax', displayName: 'State Tax Department' },
];

const fallbackCategories = [
  { qbId: 'qb-cat-rent', name: 'Rent Expense', fullyQualifiedName: 'Rent Expense' },
  { qbId: 'qb-cat-payroll', name: 'Payroll Expense', fullyQualifiedName: 'Payroll Expense' },
  { qbId: 'qb-cat-insurance', name: 'Insurance', fullyQualifiedName: 'Insurance' },
  { qbId: 'qb-cat-utilities', name: 'Utilities', fullyQualifiedName: 'Utilities' },
  {
    qbId: 'qb-cat-software',
    name: 'Software Subscriptions',
    fullyQualifiedName: 'Software Subscriptions',
  },
  { qbId: 'qb-cat-tax', name: 'Taxes and Licenses', fullyQualifiedName: 'Taxes and Licenses' },
];

const recurringBillTemplates = [
  {
    id: 'rule-1',
    name: 'Office rent',
    vendorTerms: ['rent', 'property', 'lease', 'cedar'],
    categoryTerms: ['rent', 'lease'],
    frequency: 'monthly',
    amountMode: 'fixed',
    defaultAmount: 8500,
    dueDay: 1,
    isActive: true,
  },
  {
    id: 'rule-2',
    name: 'Office salaries',
    vendorTerms: ['payroll', 'salary', 'wage'],
    categoryTerms: ['payroll', 'salary', 'wage'],
    frequency: 'biweekly',
    amountMode: 'fixed',
    defaultAmount: 18600,
    dueDay: 5,
    isActive: true,
  },
  {
    id: 'rule-3',
    name: 'General liability insurance',
    vendorTerms: ['insurance', 'hartford', 'liability'],
    categoryTerms: ['insurance', 'liability'],
    frequency: 'monthly',
    amountMode: 'fixed',
    defaultAmount: 4200,
    dueDay: 10,
    isActive: true,
  },
  {
    id: 'rule-4',
    name: 'Electricity bill',
    vendorTerms: ['energy', 'electric', 'utility', 'power'],
    categoryTerms: ['utilities', 'utility', 'electric'],
    frequency: 'monthly',
    amountMode: 'variable',
    defaultAmount: 780,
    dueDay: 3,
    isActive: true,
  },
  {
    id: 'rule-5',
    name: 'Field management software',
    vendorTerms: ['software', 'fieldwire', 'subscription'],
    categoryTerms: ['software', 'subscription', 'saas'],
    frequency: 'monthly',
    amountMode: 'fixed',
    defaultAmount: 1299,
    dueDay: 22,
    isActive: true,
  },
  {
    id: 'rule-6',
    name: 'Quarterly tax payment',
    vendorTerms: ['tax', 'state', 'department'],
    categoryTerms: ['tax', 'license'],
    frequency: 'quarterly',
    amountMode: 'fixed',
    defaultAmount: 18500,
    dueDay: 15,
    isActive: false,
  },
];

export function buildRecurringBillRulesMock({
  vendors,
  categories,
  bankAccounts,
}: RecurringBillReferenceSeed = {}): any[] {
  const activeVendors = vendors?.filter((vendor) => vendor.active !== false && !vendor.deletedAt);
  const activeCategories = categories?.filter((category) => category.active && !category.deletedAt);
  const activeBankAccounts = bankAccounts?.filter((account) => account.active && !account.deletedAt);
  const bankAccount = activeBankAccounts?.[0] ?? fallbackBankAccount;

  return recurringBillTemplates.map((template, index) => {
    const vendor = findPayee(activeVendors, template.vendorTerms) ?? fallbackVendors[index];
    const category =
      findCategory(activeCategories, template.categoryTerms) ?? fallbackCategories[index];

    return {
      id: template.id,
      name: template.name,
      vendorId: vendor.qbId,
      vendorName: vendor.displayName,
      categoryId: category.qbId,
      categoryName: category.fullyQualifiedName ?? category.name,
      bankAccountId: bankAccount.qbId,
      bankAccountName: bankAccount.fullyQualifiedName ?? bankAccount.name,
      frequency: template.frequency,
      amountMode: template.amountMode,
      defaultAmount: template.defaultAmount,
      dueDay: template.dueDay,
      isActive: template.isActive,
    };
  });
}

export const recurringBillRulesMock: any[] = buildRecurringBillRulesMock();

function findPayee(payees: QuickBooksPayee[] | undefined, terms: string[]) {
  return payees?.find((payee) => includesAny(payee.displayName, terms));
}

function findCategory(categories: QuickBooksLineItemCategory[] | undefined, terms: string[]) {
  return categories?.find((category) =>
    includesAny([category.fullyQualifiedName, category.name].filter(Boolean).join(' '), terms)
  );
}

function includesAny(value: string, terms: string[]) {
  const normalized = value.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}
