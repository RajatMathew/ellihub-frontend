import z from 'zod';

export const EmployeeCreateSchema = z.object({
    name: z.string().min(2),
    email: z.email(),
    phoneNumber: z.string().min(7),
    address: z.string().optional(),
    startDate: z.coerce.date().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().optional(),
    emergencyContactRelation: z.string().optional(),
    roleId: z.ulid().optional(),
    createAccount: z.boolean(),
});

export type EmployeeCreateRequest = z.infer<typeof EmployeeCreateSchema>;

export const EmployeeUpdateSchema = EmployeeCreateSchema.omit({
    roleId: true,
    createAccount: true,
}).extend({ id: z.ulid() });

export type EmployeeUpdateRequest = z.infer<typeof EmployeeUpdateSchema>;

export const AddEmployeeDocumentSchema = z.object({
    employeeId: z.ulid(),
    fileId: z.ulid(),
    expiresOn: z.iso.date().optional().nullable(),
});

export type AddEmployeeDocumentRequest = z.infer<typeof AddEmployeeDocumentSchema>;

export const RemoveEmployeeDocumentSchema = z.object({
    employeeId: z.ulid(),
    fileId: z.ulid(),
});

export type RemoveEmployeeDocumentRequest = z.infer<typeof RemoveEmployeeDocumentSchema>;
