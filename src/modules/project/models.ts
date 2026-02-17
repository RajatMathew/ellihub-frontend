import z from 'zod';

export const ProjectCreateSchema = z.object({
    gcId: z.ulid(),
    leadPMId: z.ulid(),
    name: z.string().min(3),
    description: z.string().min(3),
    stage: z.enum(['INSTALLATION', 'FABRICATION', 'SUBMITTALS', 'BUYOUT', 'CLOSEOUT', 'PUNCHLIST']),
    division: z.enum(['SCA', 'DDC', 'CIVIL', 'INSTITUTIONAL']),
    contractValue: z.number(),
    budgetPercentage: z.number(),
    startDate: z.date(),
    endDate: z.date(),
});

export type ProjectCreateRequest = z.infer<typeof ProjectCreateSchema>;
