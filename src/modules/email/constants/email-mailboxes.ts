export const EMAIL_MAILBOXES = [
  {
    key: 'procurement',
    label: 'Procurement',
    address: 'procurement@ellicorp.com',
  },
  {
    key: 'requisitions',
    label: 'Requisitions',
    address: 'requisitions@ellicorp.com',
  },
  {
    key: 'contracts',
    label: 'Contracts',
    address: 'contracts@ellicorp.com',
  },
] as const;

export type EmailMailboxKey = (typeof EMAIL_MAILBOXES)[number]['key'];

