import { nanoIdSchema } from '@utils/zod';
import z from 'zod';

export const LookupCreateSchema = z.object({
    type: z.string().min(1),
    label: z.string().min(1),
});

export type LookupCreateRequest = z.infer<typeof LookupCreateSchema>;

export const LookupUpdateSchema = LookupCreateSchema.extend({ id: nanoIdSchema });

export type LookupUpdateRequest = z.infer<typeof LookupUpdateSchema>;

export enum LookupType {
    PROFESSIONAL_ROLE = 'PROFESSIONAL_ROLE',
    CONTACT_PROFESSIONAL_ROLE = 'CONTACT_PROFESSIONAL_ROLE',
    VENDOR_TYPE = 'VENDOR_TYPE',
    GC_TYPE = 'GC_TYPE',
    PROJECT_DIVISION = 'PROJECT_DIVISION',
    PROJECT_STAGE = 'PROJECT_STAGE',
    PROJECT_CONTRACT_TYPE = 'PROJECT_CONTRACT_TYPE',
    TRADE_CATEGORY = 'TRADE_CATEGORY',
    UNIT = 'UNIT',
    PTO_TYPE = 'PTO_TYPE',
    SCO_CHANGE_TYPE = 'SCO_CHANGE_TYPE',
}
