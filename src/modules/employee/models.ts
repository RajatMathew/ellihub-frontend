import z from 'zod';

export const EmployeeCreateSchema = z.object({
    name: z.string().min(2),
    email: z.email(),
    phoneNumber: z.string().min(7),
    roleId: z.string().min(3).optional(),
    createAccount: z.boolean(),
});

export type EmployeeCreateRequest = z.infer<typeof EmployeeCreateSchema>;

export const EmployeeUpdateSchema = z
    .object({
        name: z.string().min(2),
        email: z.email(),
        phoneNumber: z.string().min(5),
    })
    .partial();

export type EmployeeUpdateRequest = z.infer<typeof EmployeeUpdateSchema>;
