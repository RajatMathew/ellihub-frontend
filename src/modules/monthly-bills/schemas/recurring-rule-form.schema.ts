import { z } from 'zod';

export const recurringRuleFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Bill name is required'),
    vendorId: z.string().trim().min(1, 'Vendor is required'),
    vendorName: z.string().trim().min(1),
    frequency: z.enum(['weekly', 'monthly', 'custom']),
    scheduleTiming: z.enum(['start', 'date', 'end']),
    weeklyDay: z.number().int().min(1).max(7),
    customIntervalMonths: z.number().int().min(2).max(24),
    amountMode: z.enum(['fixed', 'variable']),
    amount: z.number().min(0),
    dueDay: z.number().int().min(1).max(28),
    categoryId: z.string().optional(),
    categoryName: z.string().optional(),
    bankAccountId: z.string().optional(),
    bankAccountName: z.string().optional(),
  });

export type RecurringRuleFormData = z.infer<typeof recurringRuleFormSchema>;

export const recurringRuleFormDefaultValues: RecurringRuleFormData = {
  name: 'Office rent',
  vendorId: '',
  vendorName: '',
  frequency: 'monthly',
  scheduleTiming: 'start',
  weeklyDay: 1,
  customIntervalMonths: 6,
  amountMode: 'fixed',
  amount: 8500,
  dueDay: 1,
  categoryId: '',
  categoryName: '',
  bankAccountId: '',
  bankAccountName: '',
};
